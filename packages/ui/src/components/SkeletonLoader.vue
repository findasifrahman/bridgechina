<template>
  <div :class="skeletonClasses" class="animate-pulse">
    <div class="h-full w-full bg-slate-200 rounded"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  width?: string;
  height?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1rem',
  rounded: 'md',
});

const skeletonClasses = computed(() => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };
  
  return [roundedClasses[props.rounded]].join(' ');
});
</script>

