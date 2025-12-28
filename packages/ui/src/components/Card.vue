<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  shadow: 'md',
  hover: false,
});

const cardClasses = computed(() => {
  const base = 'bg-white rounded-2xl';
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };
  
  const hoverClass = props.hover ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-1' : '';
  
  return [base, paddings[props.padding], shadows[props.shadow], hoverClass].filter(Boolean).join(' ');
});
</script>

