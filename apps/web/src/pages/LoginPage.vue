<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <!-- Login Page Loaded -->
    <Card class="w-full max-w-md">
      <CardHeader>
        <h2 class="text-2xl font-bold text-center">Sign In</h2>
      </CardHeader>
      <CardBody>
        <form @submit.prevent="handleLogin" class="space-y-4">
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

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const emailOrPhone = ref('');
const password = ref('');
const loading = ref(false);

onMounted(() => {
  console.log('[LoginPage] Component mounted, route:', route.path);
  console.log('[LoginPage] Component is rendering');
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
</script>

