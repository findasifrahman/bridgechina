<template>
  <div class="grid min-h-screen place-items-center bg-slate-50 px-4">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 class="text-xl font-bold text-slate-900">Signing you in...</h1>
      <p class="mt-2 text-sm text-slate-500">Please wait while we finish your Google login.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@bridgechina/ui';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

onMounted(async () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get('accessToken') || String(route.query.accessToken || '');
  const redirect = params.get('redirect') || String(route.query.redirect || '/user');
  if (!token) {
    toast.error('Google sign in failed');
    router.replace('/login');
    return;
  }

  try {
    await authStore.acceptOAuthAccessToken(token);
    router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/user');
  } catch {
    toast.error('Google sign in failed');
    router.replace('/login');
  }
});
</script>
