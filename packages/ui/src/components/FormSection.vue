<template>
  <div class="space-y-4">
    <div>
      <h3 v-if="title" class="text-lg font-medium text-slate-900">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-sm text-slate-600">{{ description }}</p>
    </div>
    <div class="space-y-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
}

defineProps<Props>();
</script>

