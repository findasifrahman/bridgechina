<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <div v-if="$slots.prefix" class="absolute left-3 top-1/2 -translate-y-1/2">
        <slot name="prefix" />
      </div>
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :class="[inputClasses, $slots.prefix ? 'pl-10' : '', $slots.suffix ? 'pr-10' : '']"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value); $emit('input', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @keyup="$emit('keyup', $event)"
      />
      <div v-if="$slots.suffix" class="absolute right-3 top-1/2 -translate-y-1/2">
        <slot name="suffix" />
      </div>
    </div>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-if="hint && !error" class="mt-1 text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  id?: string;
  label?: string;
  type?: string;
  modelValue: string | number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  size: 'md',
});

defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
  input: [event: Event];
  keyup: [event: KeyboardEvent];
}>();

const inputClasses = computed(() => {
  const base = 'w-full border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors';
  const sizeClass = props.size === 'sm' ? 'px-2 py-1.5 text-sm' : props.size === 'lg' ? 'px-4 py-3 text-base' : 'px-3 py-2';
  const errorClass = props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  return [base, sizeClass, errorClass].filter(Boolean).join(' ');
});
</script>

