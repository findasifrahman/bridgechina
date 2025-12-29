<template>
  <div v-if="text" class="bg-amber-500 text-slate-900 py-2 px-4 text-sm font-medium text-center">
    <div class="max-w-7xl mx-auto flex items-center justify-center space-x-2">
      <Sparkles class="h-4 w-4" />
      <span>{{ text }}</span>
      <router-link v-if="link" :to="link" class="underline hover:no-underline ml-2">
        Learn more →
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next';

defineProps<{
  text?: string;
  link?: string;
}>();
</script>

