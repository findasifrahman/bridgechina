<template>
  <div :class="headerClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  border?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  border: true,
});

const headerClasses = computed(() => {
  const base = 'mb-4';
  const borderClass = props.border ? 'pb-4 border-b border-slate-200' : '';
  return [base, borderClass].filter(Boolean).join(' ');
});
</script>

