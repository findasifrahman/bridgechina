<template>
  <MarketingLayoutComponent
    :is-authenticated="authStore.isAuthenticated"
    :user-roles="authStore.user?.roles || []"
    @sign-out="handleSignOut"
  >
    <router-view />
  </MarketingLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import MarketingLayoutComponent from '@bridgechina/ui/src/layouts/MarketingLayout.vue';

const router = useRouter();
const authStore = useAuthStore();

const handleSignOut = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

