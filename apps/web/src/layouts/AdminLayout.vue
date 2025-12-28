<template>
  <AdminLayoutComponent @logout="handleLogout">
    <template #header-title>{{ title }}</template>
    <router-view />
  </AdminLayoutComponent>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AdminLayoutComponent from '@bridgechina/ui/src/layouts/AdminLayout.vue';

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


