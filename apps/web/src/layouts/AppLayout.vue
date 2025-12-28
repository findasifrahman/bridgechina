<template>
  <AppLayoutComponent @logout="handleLogout">
    <router-view />
  </AppLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppLayoutComponent from '@bridgechina/ui/src/layouts/AppLayout.vue';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>


