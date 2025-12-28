<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
});

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-teal-100 text-teal-700',
    accent: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };
  
  return [base, variants[props.variant], sizes[props.size]].join(' ');
});
</script>

