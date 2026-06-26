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
          :autocomplete="isPhoneInput ? 'tel' : 'email'"
          :error="identifierError"
          @input="handleIdentifierInput"
        />
        <p v-if="identifierHint" class="mt-1 text-xs" :class="identifierHintTone === 'error' ? 'text-rose-600' : 'text-slate-500'">
          {{ identifierHint }}
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
        <Button
          v-if="existingAccount.authMethods.phoneOtp"
          type="button"
          variant="ghost"
          full-width
          class="mt-3 border border-amber-200 bg-white"
          :loading="loading"
          @click="requestExistingPhoneOtp"
        >
          Sign in with phone OTP
        </Button>
      </div>

      <div v-if="codeStep">
        <label class="mb-2 block text-sm font-semibold text-slate-900">
          <span class="text-rose-600">*</span> Verification code
        </label>
        <Input v-model="code" :placeholder="isPhoneInput ? '4-digit code' : '6-digit code'" inputmode="numeric" autocomplete="one-time-code" />
        <div v-if="isPhoneInput" class="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>OTP expires in {{ otpSecondsLeft }}s.</span>
          <button
            type="button"
            class="font-semibold text-teal-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            :disabled="otpSecondsLeft > 0 || loading"
            @click="handleOtpToggle"
          >
            {{ otpToggleLabel }}
          </button>
        </div>
      </div>

      <div v-if="codeStep && isPhoneInput && otpIntent === 'register'">
        <Input
          v-model="optionalPassword"
          label="Password (optional)"
          type="password"
          autocomplete="new-password"
          placeholder="Set a password, or leave blank to use OTP login later"
        />
      </div>

      <Button v-if="!existingAccount" type="submit" variant="primary" full-width class="bg-teal-700 py-3 text-white hover:bg-teal-800" :loading="loading">
        {{ codeStep ? 'Verify and continue' : 'Send verification code' }}
      </Button>
    </form>

    <button
      v-if="!codeStep"
      type="button"
      class="mt-5 text-sm font-semibold text-slate-900 underline-offset-4 hover:text-teal-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
      @click="handleOtpToggle"
    >
      {{ otpToggleLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { Button, Input, useToast } from '@bridgechina/ui';
import { useAuthStore } from '@/stores/auth';
import { buildApiUrl } from '@/utils/api-url';
import { contactKind, isValidBangladeshPhone, isValidEmail } from '@/utils/contact-validation';

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
const optionalPassword = ref('');
const otpSecondsLeft = ref(0);
const otpIntent = ref<'login' | 'register'>(props.mode);
let otpTimer: ReturnType<typeof setInterval> | null = null;
const existingAccount = ref<null | {
  message: string;
  authMethods: {
    google?: boolean;
    password?: boolean;
    phoneOtp?: boolean;
    providers?: string[];
  };
}>(null);

const contactType = computed(() => contactKind(identifier.value));
const isPhoneInput = computed(() => {
  const value = identifier.value.trim();
  return !!value && !value.includes('@') && /^[+\d\s-]+$/.test(value);
});

const identifierHintTone = computed(() => {
  const value = identifier.value.trim();
  if (!value) return 'muted';
  if (value.includes('@')) return isValidEmail(value) ? 'muted' : 'error';
  if (/^[+\d\s-]+$/.test(value)) return isValidBangladeshPhone(value) ? 'muted' : 'error';
  return 'error';
});

const identifierHint = computed(() => {
  const value = identifier.value.trim();
  if (!value) return '';
  if (value.includes('@')) {
    return isValidEmail(value)
      ? 'Email detected. We will send a verification code.'
      : 'Enter a valid email address, for example name@example.com.';
  }
  if (/^[+\d\s-]+$/.test(value)) {
    return isValidBangladeshPhone(value)
      ? 'Bangladesh mobile detected. We will send a 4-digit SMS OTP.'
      : 'Enter a Bangladesh mobile number like 01XXXXXXXXX or +8801XXXXXXXXX.';
  }
  return 'Use a valid email address or Bangladesh mobile number.';
});

const otpToggleLabel = computed(() => {
  if (!codeStep.value) return 'Already has an OTP? Click Here';
  if (isPhoneInput.value && otpSecondsLeft.value > 0) return `Resend OTP in ${otpSecondsLeft.value}s`;
  return 'Need a new OTP? Click Here';
});

function startOtpTimer(seconds = 60) {
  otpSecondsLeft.value = seconds;
  if (otpTimer) clearInterval(otpTimer);
  otpTimer = setInterval(() => {
    otpSecondsLeft.value = Math.max(0, otpSecondsLeft.value - 1);
    if (otpSecondsLeft.value <= 0 && otpTimer) {
      clearInterval(otpTimer);
      otpTimer = null;
    }
  }, 1000);
}

onUnmounted(() => {
  if (otpTimer) clearInterval(otpTimer);
});

function startGoogle() {
  const params = new URLSearchParams({
    redirect: props.redirectPath,
    intent: props.mode,
  });
  sessionStorage.setItem('bc_auth_redirect_after_oauth', props.redirectPath);
  window.location.href = buildApiUrl(`/api/auth/google/start?${params.toString()}`);
}

function handleIdentifierInput() {
  identifierError.value = '';
  existingAccount.value = null;
  password.value = '';
  optionalPassword.value = '';
  code.value = '';
  codeStep.value = false;
  otpIntent.value = props.mode;
}

async function requestVerificationCode(value: string, kind: 'email' | 'phone', intent: 'login' | 'register' = props.mode) {
  otpIntent.value = intent;
  if (kind === 'phone') {
    await authStore.requestPhoneCode(value, intent);
    startOtpTimer();
    return;
  }
  await authStore.requestEmailCode(value, 'auth', intent);
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

async function requestExistingPhoneOtp() {
  const value = identifier.value.trim();
  loading.value = true;
  try {
    await requestVerificationCode(value, 'phone', 'login');
    existingAccount.value = null;
    codeStep.value = true;
    toast.success('OTP sent');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to send OTP');
  } finally {
    loading.value = false;
  }
}

async function handleOtpToggle() {
  if (!codeStep.value) {
    const value = identifier.value.trim();
    if (!value || (contactType.value !== 'email' && contactType.value !== 'phone')) {
      identifierError.value = 'Enter a valid email address or Bangladesh mobile number first.';
      return;
    }
    codeStep.value = true;
    return;
  }

  if (isPhoneInput.value && otpSecondsLeft.value > 0) return;

  const value = identifier.value.trim();
  const kind = contactKind(value);
  if (kind !== 'email' && kind !== 'phone') {
    identifierError.value = 'Enter a valid email address or Bangladesh mobile number.';
    codeStep.value = false;
    return;
  }

  loading.value = true;
  try {
    await requestVerificationCode(value, kind, otpIntent.value);
    toast.success(kind === 'phone' ? 'OTP sent' : 'Verification code sent');
  } catch (error: any) {
    const message = error.response?.data?.error || 'Failed to send code';
    if (setExistingAccount(error, message)) {
      return;
    }
    identifierError.value = message;
    toast.error(message);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  const value = identifier.value.trim();
  const kind = contactKind(value);
  identifierError.value = '';

  if (kind !== 'email' && kind !== 'phone') {
    identifierError.value = 'Enter a valid email address or Bangladesh mobile number.';
    return;
  }

  if (!codeStep.value) {
    loading.value = true;
    try {
      await requestVerificationCode(value, kind);
      codeStep.value = true;
      toast.success(kind === 'phone' ? 'OTP sent' : 'Verification code sent');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send code';
      if (setExistingAccount(error, message)) {
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
  if (kind === 'phone' && !/^\d{4}$/.test(code.value.trim())) {
    toast.error('Enter the 4-digit SMS OTP');
    return;
  }
  if (kind === 'email' && !/^\d{6}$/.test(code.value.trim())) {
    toast.error('Enter the 6-digit email code');
    return;
  }

  loading.value = true;
  try {
    if (kind === 'phone') {
      await authStore.verifyPhoneCode({
        phone: value,
        code: code.value.trim(),
        intent: otpIntent.value,
        password: optionalPassword.value || undefined,
      });
    } else {
      await authStore.verifyEmailCode({ email: value, code: code.value.trim(), intent: otpIntent.value });
    }
    toast.success('Signed in successfully');
    emit('authenticated');
  } catch (error: any) {
    const message = error.response?.data?.error || 'Verification failed';
    if (setExistingAccount(error, message)) {
      return;
    }
    toast.error(message);
  } finally {
    loading.value = false;
  }
}
</script>
