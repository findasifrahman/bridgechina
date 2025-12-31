<template>
  <div>
    <div class="border-b border-slate-200">
      <nav 
        class="tabs-nav -mb-px flex space-x-4 md:space-x-8 overflow-x-auto scroll-smooth" 
        aria-label="Tabs"
      >
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="[tabButtonClasses(tab.value), 'flex-shrink-0']"
          @click="$emit('update:modelValue', tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>
    <div class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Tab {
  value: string | number;
  label: string;
}

interface Props {
  modelValue: string | number;
  tabs: Tab[];
}

const props = defineProps<Props>();

defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const tabButtonClasses = (value: string | number) => {
  const base = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors';
  const active = props.modelValue === value
    ? 'border-teal-500 text-teal-600'
    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300';
  return [base, active].join(' ');
};
</script>

<style scoped>
.tabs-nav {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.tabs-nav::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>

