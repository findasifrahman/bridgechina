<template>
  <router-view />
  <Toast :toasts="toasts" @remove="removeToast" />
  <CartWidget />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Toast, useToast } from '@bridgechina/ui';
import CartWidget from '@/components/shopping/CartWidget.vue';

const toast = useToast();
const toasts = computed(() => toast.toasts.value);
const removeToast = (id: string) => toast.removeToast(id);

onMounted(() => {
  console.log('[App] Root component mounted');
});
</script>
