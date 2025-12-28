<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <Card class="w-full max-w-md">
      <CardHeader>
        <h2 class="text-2xl font-bold text-center">Forgot Password</h2>
      </CardHeader>
      <CardBody>
        <p class="text-slate-600 mb-6 text-center">
          Enter your email or phone number and we'll send you a reset link.
        </p>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <Input
            v-model="email"
            label="Email or Phone"
            placeholder="your@email.com or +86 123 4567 8900"
            required
          />
          <Button type="submit" variant="primary" :loading="loading" full-width>
            Send Reset Link
          </Button>
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
import { useToast } from '@bridgechina/ui';
import { Card, CardHeader, CardBody, Input, Button } from '@bridgechina/ui';

const email = ref('');
const loading = ref(false);
const toast = useToast();

async function handleSubmit() {
  loading.value = true;
  try {
    // TODO: Implement password reset endpoint
    toast.info('Password reset feature coming soon');
  } catch (error: any) {
    toast.error('Failed to send reset link');
  } finally {
    loading.value = false;
  }
}
</script>

