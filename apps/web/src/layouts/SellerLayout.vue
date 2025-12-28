<template>
  <SellerLayoutComponent @logout="handleLogout">
    <template #header-title>{{ title }}</template>
    <router-view />
  </SellerLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import SellerLayoutComponent from '@bridgechina/ui/src/layouts/SellerLayout.vue';

defineProps<{
  title?: string;
}>();

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>


