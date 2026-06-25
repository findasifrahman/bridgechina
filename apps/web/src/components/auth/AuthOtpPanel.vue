<template>
  <div class="rounded-[1.5rem] bg-white" :class="framed ? 'border border-slate-200 p-6 shadow-sm' : ''">
    <div class="text-center">
      <img src="/logo_verticle.png" alt="ChinaBuyBD" class="mx-auto h-20 w-auto object-contain" />
    </div>

    <div class="mt-5">
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
          @input="identifierError = ''"
        />
        <p v-if="isPhoneInput" class="mt-1 text-xs text-slate-500">
          SMS code is planned. Please use email code for now.
        </p>
      </div>

      <div v-if="codeStep">
        <label class="mb-2 block text-sm font-semibold text-slate-900">
          <span class="text-rose-600">*</span> Verification code
        </label>
        <Input v-model="code" placeholder="6-digit code" inputmode="numeric" autocomplete="one-time-code" />
      </div>

      <Button type="submit" variant="primary" full-width class="bg-teal-700 py-3 text-white hover:bg-teal-800" :loading="loading">
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
}>(), {
  title: 'Welcome',
  subtitle: 'Please enter your phone number / email',
  redirectPath: '/user',
  framed: true,
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
const identifierError = ref('');

const isPhoneInput = computed(() => {
  const value = identifier.value.trim();
  return !!value && !value.includes('@') && /^[+\d\s-]+$/.test(value);
});

function startGoogle() {
  window.location.href = buildApiUrl(`/api/auth/google/start?redirect=${encodeURIComponent(props.redirectPath)}`);
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
      await authStore.requestEmailCode(value, 'auth');
      codeStep.value = true;
      toast.success('Verification code sent');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send code');
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
    await authStore.verifyEmailCode({ email: value, code: code.value.trim() });
    toast.success('Signed in successfully');
    emit('authenticated');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Verification failed');
  } finally {
    loading.value = false;
  }
}
</script>
