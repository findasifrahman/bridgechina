<template>
  <Card class="text-center relative overflow-hidden">
    <div class="absolute top-0 right-0 w-32 h-32 bg-teal-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
    <div class="relative">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-600 text-white text-2xl font-bold mb-4">
        {{ number }}
      </div>
      <h3 class="text-xl font-semibold mb-2 text-slate-900">{{ title }}</h3>
      <p class="text-slate-600">{{ description }}</p>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { Card } from '@bridgechina/ui';

defineProps<{
  number: string;
  title: string;
  description: string;
}>();
</script>
