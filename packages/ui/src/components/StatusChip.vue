<template>
  <span :class="chipClasses">
    {{ statusText }}
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: string;
}

const props = defineProps<Props>();

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    new: 'New',
    in_progress: 'In Progress',
    quoted: 'Quoted',
    confirmed: 'Confirmed',
    paid: 'Paid',
    partially_paid: 'Partially Paid',
    booked: 'Booked',
    service_done: 'Service Done',
    payment_done: 'Payment Done',
    done: 'Done',
    complete: 'Complete',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[props.status] || props.status;
});

const chipClasses = computed(() => {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  
  const statusMap: Record<string, string> = {
    new: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    quoted: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
    partially_paid: 'bg-yellow-100 text-yellow-700',
    booked: 'bg-purple-100 text-purple-700',
    service_done: 'bg-emerald-100 text-emerald-700',
    payment_done: 'bg-green-100 text-green-700',
    done: 'bg-green-100 text-green-700',
    complete: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  
  return [base, statusMap[props.status] || 'bg-slate-100 text-slate-700'].join(' ');
});
</script>
