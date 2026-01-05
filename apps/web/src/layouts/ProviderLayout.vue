<template>
  <ProviderLayoutComponent @logout="handleLogout">
    <template #header-title>
      <slot name="header-title" />
    </template>
    <router-view />
  </ProviderLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ProviderLayoutComponent from '@bridgechina/ui/src/layouts/ProviderLayout.vue';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

