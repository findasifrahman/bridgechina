<template>
  <div class="flex items-start">
    <input
      :id="id"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :required="required"
      class="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <label v-if="label" :for="id" class="ml-2 text-sm text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
  </div>
</template>

<script setup lang="ts">
interface Props {
  id?: string;
  label?: string;
  modelValue: boolean;
  disabled?: boolean;
  required?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
});

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

