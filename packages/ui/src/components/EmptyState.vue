<template>
  <div class="text-center py-12">
    <component
      v-if="icon"
      :is="icon"
      class="mx-auto h-12 w-12 text-slate-400"
    />
    <h3 v-if="title" class="mt-2 text-sm font-semibold text-slate-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 text-sm text-slate-500">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-6">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
  icon?: any;
}

defineProps<Props>();
</script>

