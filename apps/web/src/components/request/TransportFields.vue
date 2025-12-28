<template>
  <div class="space-y-4">
    <Select
      v-model="localData.type"
      label="Transport Type"
      :options="typeOptions"
      required
    />
    <Input
      v-model="localData.pickup_text"
      label="Pickup Location"
      required
    />
    <Input
      v-model="localData.dropoff_text"
      label="Drop-off Location"
      required
    />
    <Input
      v-model="localData.pickup_time"
      label="Pickup Time"
      type="datetime-local"
    />
    <Input
      v-model.number="localData.passengers"
      label="Number of Passengers"
      type="number"
      min="1"
      required
    />
    <Input
      v-model.number="localData.luggage"
      label="Number of Luggage Pieces"
      type="number"
      min="0"
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

const typeOptions = [
  { value: 'pickup', label: 'Airport Pickup' },
  { value: 'point_to_point', label: 'Point to Point' },
  { value: 'daily_charter', label: 'Daily Charter' },
];

const localData = ref({
  type: props.modelValue?.type || 'pickup',
  pickup_text: props.modelValue?.pickup_text || '',
  dropoff_text: props.modelValue?.dropoff_text || '',
  pickup_time: props.modelValue?.pickup_time || '',
  passengers: props.modelValue?.passengers || 1,
  luggage: props.modelValue?.luggage || 0,
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

