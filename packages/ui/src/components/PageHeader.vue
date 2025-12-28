<template>
  <div class="mb-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 v-if="title" class="text-2xl font-bold tracking-tight text-slate-900">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-slate-600">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center space-x-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  subtitle?: string;
}

defineProps<Props>();
</script>

