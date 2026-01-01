<template>
  <router-link
    v-if="to"
    :to="to"
    :class="linkClasses"
    @click="$emit('click', $event)"
  >
    <slot />
  </router-link>
  <a
    v-else-if="href"
    :href="href"
    :target="target"
    :class="linkClasses"
    @click="$emit('click', $event)"
  >
    <slot />
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  to?: string | object;
  href?: string;
  target?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const linkClasses = computed(() => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800',
    secondary: 'bg-white text-teal-600 border-2 border-teal-600 hover:bg-teal-100 active:bg-teal-200',
    accent: 'bg-amber-500 text-slate-900 hover:bg-amber-600 active:bg-amber-700',
    ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return [base, variants[props.variant], sizes[props.size]].join(' ');
});
</script>

