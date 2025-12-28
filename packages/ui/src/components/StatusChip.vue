<template>
  <span :class="chipClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: 'new' | 'in_progress' | 'confirmed' | 'paid' | 'done' | 'cancelled';
}

const props = defineProps<Props>();

const chipClasses = computed(() => {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  
  const statusMap = {
    new: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-teal-100 text-teal-700',
    confirmed: 'bg-amber-100 text-amber-700',
    paid: 'bg-amber-100 text-amber-700',
    done: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  
  return [base, statusMap[props.status]].join(' ');
});
</script>

