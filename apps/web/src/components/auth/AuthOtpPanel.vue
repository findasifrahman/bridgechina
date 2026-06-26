<template>
  <div class="rounded-[1.5rem] bg-white" :class="framed ? 'border border-slate-200 p-6 shadow-sm' : ''">
    <div v-if="showLogo" class="text-center">
      <img src="/logo_verticle.png" alt="ChinaBuyBD" class="mx-auto h-20 w-auto object-contain" />
    </div>

    <div :class="showLogo ? 'mt-5' : ''">
      <h2 class="text-2xl font-black text-slate-950">{{ title }}</h2>
      <p class="mt-1 text-sm font-medium text-slate-700">{{ subtitle }}</p>
    </div>

    <Button type="button" variant="ghost" full-width class="mt-5 border border-slate-200 bg-white" @click="startGoogle">
      Continue with Google
    </Button>

    <form class="mt-5 space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="mb-2 block text-sm font-semibold text-slate-900">
          <span class="text-rose-600">*</span> Phone / Email
        </label>
        <Input
          v-model="identifier"
          type="text"
          placeholder="Email or mobile phone number"
          autocomplete="email"
          :error="identifierError"
          @input="handleIdentifierInput"
        />
        <p v-if="isPhoneInput" class="mt-1 text-xs text-slate-500">
          SMS code is planned. Please use email code for now.
        </p>
      </div>

      <div
        v-if="existingAccount"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p class="font-semibold">{{ existingAccount.message }}</p>
        <div v-if="existingAccount.authMethods.google" class="mt-3">
          <Button type="button" variant="ghost" full-width class="border border-amber-200 bg-white" @click="startGoogle">
            Sign in with Google
          </Button>
        </div>
        <div v-if="existingAccount.authMethods.password" class="mt-3 space-y-3">
          <Input
            v-model="password"
            label="Password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
          />
          <Button type="button" variant="primary" full-width class="bg-teal-700 py-3 text-white hover:bg-teal-800" :loading="passwordLoading" @click="handlePasswordLogin">
            Sign in and continue
          </Button>
        </div>
      </div>

      <div v-if="codeStep">
        <label class="mb-2 block text-sm font-semibold text-slate-900">
          <span class="text-rose-600">*</span> Verification code
        </label>
        <Input v-model="code" placeholder="6-digit code" inputmode="numeric" autocomplete="one-time-code" />
      </div>

      <Button v-if="!existingAccount" type="submit" variant="primary" full-width class="bg-teal-700 py-3 text-white hover:bg-teal-800" :loading="loading">
        {{ codeStep ? 'Verify and continue' : 'Submit' }}
      </Button>
    </form>

    <button
      type="button"
      class="mt-5 text-sm font-semibold text-slate-900 underline-offset-4 hover:text-teal-700 hover:underline"
      @click="codeStep = !codeStep"
    >
      {{ codeStep ? 'Need a new OTP? Click Here' : 'Already has an OTP ? Click Here' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Input, useToast } from '@bridgechina/ui';
import { useAuthStore } from '@/stores/auth';
import { buildApiUrl } from '@/utils/api-url';
import { contactKind, isValidEmail } from '@/utils/contact-validation';

const props = withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  redirectPath?: string;
  framed?: boolean;
  mode?: 'login' | 'register';
  showLogo?: boolean;
}>(), {
  title: 'Welcome',
  subtitle: 'Please enter your phone number / email',
  redirectPath: '/user',
  framed: true,
  mode: 'login',
  showLogo: true,
});

const emit = defineEmits<{
  authenticated: [];
}>();

const authStore = useAuthStore();
const toast = useToast();

const identifier = ref('');
const code = ref('');
const codeStep = ref(false);
const loading = ref(false);
const passwordLoading = ref(false);
const identifierError = ref('');
const password = ref('');
const existingAccount = ref<null | {
  message: string;
  authMethods: {
    google?: boolean;
    password?: boolean;
    providers?: string[];
  };
}>(null);

const isPhoneInput = computed(() => {
  const value = identifier.value.trim();
  return !!value && !value.includes('@') && /^[+\d\s-]+$/.test(value);
});

function startGoogle() {
  const params = new URLSearchParams({
    redirect: props.redirectPath,
    intent: props.mode,
  });
  window.location.href = buildApiUrl(`/api/auth/google/start?${params.toString()}`);
}

function handleIdentifierInput() {
  identifierError.value = '';
  existingAccount.value = null;
  password.value = '';
}

function setExistingAccount(error: any, fallback: string) {
  const data = error.response?.data || {};
  if (error.response?.status !== 409) return false;

  existingAccount.value = {
    message: data.error || fallback,
    authMethods: data.authMethods || { password: true },
  };
  identifierError.value = '';
  codeStep.value = false;
  return true;
}

async function handlePasswordLogin() {
  const value = identifier.value.trim();
  if (!password.value) {
    toast.error('Enter your password');
    return;
  }

  passwordLoading.value = true;
  try {
    await authStore.login(value, password.value);
    toast.success('Signed in successfully');
    emit('authenticated');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Password sign in failed');
  } finally {
    passwordLoading.value = false;
  }
}

async function handleSubmit() {
  const value = identifier.value.trim();
  const kind = contactKind(value);
  identifierError.value = '';

  if (kind === 'phone') {
    identifierError.value = 'SMS code is coming soon. Please use your email for now.';
    return;
  }

  if (kind !== 'email' || !isValidEmail(value)) {
    identifierError.value = 'Enter a valid email address.';
    return;
  }

  if (!codeStep.value) {
    loading.value = true;
    try {
      await authStore.requestEmailCode(value, 'auth', props.mode);
      codeStep.value = true;
      toast.success('Verification code sent');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send code';
      if (setExistingAccount(error, message)) {
        toast.info(message);
        return;
      }
      identifierError.value = message;
      toast.error(message);
    } finally {
      loading.value = false;
    }
    return;
  }

  if (!code.value.trim()) {
    toast.error('Enter the verification code');
    return;
  }

  loading.value = true;
  try {
    await authStore.verifyEmailCode({ email: value, code: code.value.trim(), intent: props.mode });
    toast.success('Signed in successfully');
    emit('authenticated');
  } catch (error: any) {
    const message = error.response?.data?.error || 'Verification failed';
    if (setExistingAccount(error, message)) {
      toast.info(message);
      return;
    }
    toast.error(message);
  } finally {
    loading.value = false;
  }
}
</script>
