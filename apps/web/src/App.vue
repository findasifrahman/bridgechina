<template>
  <router-view />
  <Toast :toasts="toasts" @remove="removeToast" />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Toast, useToast } from '@bridgechina/ui';

const toast = useToast();
const toasts = computed(() => toast.toasts.value);
const removeToast = (id: string) => toast.removeToast(id);

onMounted(() => {
  console.log('[App] Root component mounted');
});
</script>
