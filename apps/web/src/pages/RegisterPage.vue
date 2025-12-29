<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <Card class="w-full max-w-md">
      <CardHeader>
        <h2 class="text-2xl font-bold text-center">Create Account</h2>
      </CardHeader>
      <CardBody>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <Input
            v-model="email"
            label="Email"
            type="email"
            placeholder="your@email.com"
          />
          <Input
            v-model="phone"
            label="Phone"
            type="tel"
            placeholder="+86 123 4567 8900"
          />
          <Input
            v-model="password"
            label="Password"
            type="password"
            required
          />
          <Button type="submit" variant="primary" :loading="loading" full-width>
            Register
          </Button>
          <div class="text-center text-sm">
            <router-link to="/login" class="text-teal-600 hover:text-teal-700">
              Already have an account? Sign In
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
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@bridgechina/ui';
import { Card, CardHeader, CardBody, Input, Button } from '@bridgechina/ui';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const phone = ref('');
const password = ref('');
const loading = ref(false);

async function handleRegister() {
  if (!email.value && !phone.value) {
    toast.error('Please provide either email or phone number');
    return;
  }
  
  loading.value = true;
  try {
    await authStore.register({
      email: email.value || undefined,
      phone: phone.value || undefined,
      password: password.value,
    });
    router.push('/app');
    toast.success('Account created successfully!');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Registration failed');
  } finally {
    loading.value = false;
  }
}
</script>

