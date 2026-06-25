<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <!-- Login Page Loaded -->
    <Card class="w-full max-w-md">
      <CardHeader>
        <h2 class="text-2xl font-bold text-center">Sign In</h2>
      </CardHeader>
      <CardBody>
        <Button type="button" variant="ghost" full-width class="mb-4 border border-slate-200 bg-white" @click="startGoogleLogin">
          Continue with Google
        </Button>

        <div class="mb-4 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
          <button
            type="button"
            class="rounded-lg px-3 py-2"
            :class="loginMode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
            @click="loginMode = 'password'"
          >
            Password
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2"
            :class="loginMode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
            @click="loginMode = 'email'"
          >
            Email code
          </button>
        </div>

        <form v-if="loginMode === 'password'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email or Phone</label>
            <Input
              v-model="emailOrPhone"
              type="text"
              placeholder="your@email.com or +1234567890"
              required
            />
            <p class="text-xs text-slate-500 mt-1">You can sign in with either your email address or phone number</p>
          </div>
          <Input
            v-model="password"
            label="Password"
            type="password"
            required
          />
          <Button type="submit" variant="primary" :loading="loading" full-width>
            Sign In
          </Button>
          <div class="text-center text-sm space-y-2">
            <div>
              <router-link to="/register" class="text-teal-600 hover:text-teal-700">
                Don't have an account? Register
              </router-link>
            </div>
            <div>
              <router-link to="/forgot-password" class="text-slate-600 hover:text-teal-600 text-xs">
                Forgot password?
              </router-link>
            </div>
          </div>
        </form>

        <form v-else @submit.prevent="handleEmailCodeLogin" class="space-y-4">
          <Input
            v-model="emailCodeForm.email"
            label="Gmail or email"
            type="email"
            placeholder="your@email.com"
            required
          />
          <div class="flex gap-2">
            <Input
              v-model="emailCodeForm.code"
              label="6-digit code"
              placeholder="123456"
              class="flex-1"
            />
            <Button type="button" variant="ghost" class="self-end" :loading="sendingCode" @click="sendEmailCode">
              Send code
            </Button>
          </div>
          <Button type="submit" variant="primary" :loading="loading" full-width>
            Continue with email
          </Button>
          <p class="text-center text-xs text-slate-500">
            New customers are created automatically after code verification.
          </p>
        </form>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@bridgechina/ui';
import { Card, CardHeader, CardBody, Input, Button } from '@bridgechina/ui';
import { buildApiUrl } from '@/utils/api-url';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const emailOrPhone = ref('');
const password = ref('');
const loading = ref(false);
const sendingCode = ref(false);
const loginMode = ref<'password' | 'email'>('password');
const emailCodeForm = ref({
  email: '',
  code: '',
});

onMounted(() => {
  // Pre-fill email/phone if provided in query
  if (route.query.email) {
    emailOrPhone.value = route.query.email as string;
  } else if (route.query.phone) {
    emailOrPhone.value = route.query.phone as string;
  }
});

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login(emailOrPhone.value, password.value);
    
    // Determine redirect based on user role
    let redirect = (route.query.redirect as string);
    
    if (!redirect) {
      const userRoles = authStore.user?.roles || [];
      if (userRoles.includes('ADMIN') || userRoles.includes('EDITOR')) {
        redirect = '/admin';
      } else if (userRoles.includes('OPS')) {
        redirect = '/ops/inbox';
      } else if (userRoles.includes('SELLER')) {
        redirect = '/seller';
      } else if (userRoles.includes('SERVICE_PROVIDER') && !userRoles.some((role: string) => ['ADMIN', 'OPS'].includes(role))) {
        redirect = '/provider';
      } else {
        redirect = '/user';
      }
    }
    
    router.push(redirect);
    toast.success('Welcome back!');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Login failed. Please check your credentials.');
  } finally {
    loading.value = false;
  }
}

function startGoogleLogin() {
  const redirect = String(route.query.redirect || '/user');
  window.location.href = buildApiUrl(`/api/auth/google/start?redirect=${encodeURIComponent(redirect)}`);
}

function redirectAfterAuth() {
  let redirect = (route.query.redirect as string);
  if (!redirect) {
    const userRoles = authStore.user?.roles || [];
    if (userRoles.includes('ADMIN') || userRoles.includes('EDITOR')) {
      redirect = '/admin';
    } else if (userRoles.includes('OPS')) {
      redirect = '/ops/inbox';
    } else if (userRoles.includes('SELLER')) {
      redirect = '/seller';
    } else if (userRoles.includes('SERVICE_PROVIDER') && !userRoles.some((role: string) => ['ADMIN', 'OPS'].includes(role))) {
      redirect = '/provider';
    } else {
      redirect = '/user';
    }
  }
  router.push(redirect);
}

async function sendEmailCode() {
  if (!emailCodeForm.value.email.trim()) {
    toast.error('Enter your email first');
    return;
  }
  sendingCode.value = true;
  try {
    await authStore.requestEmailCode(emailCodeForm.value.email.trim(), 'auth');
    toast.success('Verification code sent');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to send code');
  } finally {
    sendingCode.value = false;
  }
}

async function handleEmailCodeLogin() {
  if (!emailCodeForm.value.email.trim() || !emailCodeForm.value.code.trim()) {
    toast.error('Enter your email and code');
    return;
  }
  loading.value = true;
  try {
    await authStore.verifyEmailCode({
      email: emailCodeForm.value.email.trim(),
      code: emailCodeForm.value.code.trim(),
    });
    redirectAfterAuth();
    toast.success('Welcome back!');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Email verification failed');
  } finally {
    loading.value = false;
  }
}
</script>

