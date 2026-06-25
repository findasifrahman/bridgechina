<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <Card class="w-full max-w-md">
      <CardHeader>
        <h2 class="text-2xl font-bold text-center">Forgot Password</h2>
      </CardHeader>
      <CardBody>
        <p class="text-slate-600 mb-6 text-center">
          Enter your email and we'll send you a 6-digit password reset code.
        </p>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <Input
            v-model="email"
            label="Email"
            type="email"
            placeholder="your@email.com"
            required
          />
          <Button type="submit" variant="primary" :loading="loading" full-width :disabled="codeSent">
            {{ codeSent ? 'Code Sent' : 'Send Reset Code' }}
          </Button>
          <div v-if="codeSent" class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Input v-model="code" label="6-digit code" placeholder="123456" required />
            <Input v-model="password" label="New password" type="password" required />
            <Input v-model="confirmPassword" label="Confirm new password" type="password" required />
            <Button type="button" variant="primary" :loading="resetting" full-width @click="handleReset">
              Reset password
            </Button>
          </div>
          <div class="text-center text-sm">
            <router-link to="/login" class="text-teal-600 hover:text-teal-700">
              Back to Sign In
            </router-link>
          </div>
        </form>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@bridgechina/ui';
import { Card, CardHeader, CardBody, Input, Button } from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const email = ref('');
const code = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const resetting = ref(false);
const codeSent = ref(false);
const toast = useToast();
const router = useRouter();
const authStore = useAuthStore();

async function handleSubmit() {
  if (!email.value.trim()) {
    toast.error('Enter your email');
    return;
  }
  loading.value = true;
  try {
    await axios.post('/api/auth/password-reset/request', { email: email.value.trim() });
    codeSent.value = true;
    toast.success('Password reset code sent');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to send reset code');
  } finally {
    loading.value = false;
  }
}

async function handleReset() {
  if (!code.value.trim() || !password.value || !confirmPassword.value) {
    toast.error('Complete all reset fields');
    return;
  }
  if (password.value !== confirmPassword.value) {
    toast.error('Passwords do not match');
    return;
  }

  resetting.value = true;
  try {
    await authStore.resetPasswordWithCode({
      email: email.value.trim(),
      code: code.value.trim(),
      password: password.value,
    });
    toast.success('Password reset successfully');
    router.push('/user');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to reset password');
  } finally {
    resetting.value = false;
  }
}
</script>

