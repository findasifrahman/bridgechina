<template>
  <div class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <div class="w-full max-w-lg">
      <AuthOtpPanel :redirect-path="redirectPath" @authenticated="handleAuthenticated" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthOtpPanel from '@/components/auth/AuthOtpPanel.vue';
import { useAuthStore } from '@/stores/auth';
import { resolveAuthRedirect } from '@/utils/auth-redirect';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const redirectPath = computed(() => String(route.query.redirect || '/user'));

function handleAuthenticated() {
  const target = route.query.redirect
    ? String(route.query.redirect)
    : resolveAuthRedirect(authStore.user?.roles || [], '/user');
  router.push(target);
}
</script>
