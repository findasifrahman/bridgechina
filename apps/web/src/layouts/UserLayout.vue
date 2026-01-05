<template>
  <UserLayoutComponent @logout="handleLogout">
    <template #header-title>
      <slot name="header-title" />
    </template>
    <router-view />
  </UserLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import UserLayoutComponent from '@bridgechina/ui/src/layouts/UserLayout.vue';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

