<template>
  <MarketingLayoutComponent
    :is-authenticated="authStore.isAuthenticated"
    @sign-out="handleSignOut"
  >
    <router-view />
  </MarketingLayoutComponent>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import MarketingLayoutComponent from '@bridgechina/ui/src/layouts/MarketingLayout.vue';

const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  console.log('[MarketingLayout] Layout mounted, isAuthenticated:', authStore.isAuthenticated);
});

const handleSignOut = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

