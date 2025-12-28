<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium text-slate-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div :class="groupClasses">
      <label
        v-for="option in options"
        :key="option.value"
        :class="radioLabelClasses"
      >
        <input
          type="radio"
          :name="name"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="disabled"
          class="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
          @change="$emit('update:modelValue', option.value)"
        />
        <span class="ml-2">{{ option.label }}</span>
      </label>
    </div>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Option {
  value: string | number;
  label: string;
}

interface Props {
  name: string;
  label?: string;
  modelValue: string | number;
  options: Option[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  direction?: 'vertical' | 'horizontal';
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  direction: 'vertical',
});

defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const groupClasses = computed(() => {
  return props.direction === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2';
});

const radioLabelClasses = computed(() => {
  return 'flex items-center cursor-pointer text-slate-700';
});
</script>

