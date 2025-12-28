<template>
  <div class="space-y-4">
    <Input
      v-model="localData.delivery_address_text"
      label="Delivery Address"
      required
    />
    <Input
      v-model="localData.meal_type"
      label="Meal Type (e.g., Breakfast, Lunch, Dinner)"
    />
    <Select
      v-model="localData.spicy_level"
      label="Spicy Level"
      :options="spicyOptions"
    />
    <Input
      v-model="localData.allergies"
      label="Allergies or Dietary Restrictions"
    />
    <Input
      v-model.number="localData.people_count"
      label="Number of People"
      type="number"
      min="1"
      required
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Input, Select } from '@bridgechina/ui';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const spicyOptions = [
  { value: 'none', label: 'No Spice' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
];

const localData = ref({
  delivery_address_text: props.modelValue?.delivery_address_text || '',
  meal_type: props.modelValue?.meal_type || '',
  spicy_level: props.modelValue?.spicy_level || 'mild',
  allergies: props.modelValue?.allergies || '',
  people_count: props.modelValue?.people_count || 1,
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

