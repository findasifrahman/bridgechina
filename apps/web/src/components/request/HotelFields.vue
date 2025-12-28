<template>
  <div class="space-y-4">
    <Input
      v-model="localData.checkin"
      label="Check-in Date"
      type="date"
      required
    />
    <Input
      v-model="localData.checkout"
      label="Check-out Date"
      type="date"
      required
    />
    <Input
      v-model.number="localData.guests"
      label="Number of Guests"
      type="number"
      min="1"
      required
    />
    <Input
      v-model.number="localData.rooms"
      label="Number of Rooms"
      type="number"
      min="1"
      required
    />
    <Input
      v-model.number="localData.budget_min"
      label="Budget Min (CNY)"
      type="number"
    />
    <Input
      v-model.number="localData.budget_max"
      label="Budget Max (CNY)"
      type="number"
    />
    <Input
      v-model="localData.preferred_area"
      label="Preferred Area"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Input } from '@bridgechina/ui';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const localData = ref({
  checkin: props.modelValue?.checkin || '',
  checkout: props.modelValue?.checkout || '',
  guests: props.modelValue?.guests || 1,
  rooms: props.modelValue?.rooms || 1,
  budget_min: props.modelValue?.budget_min || '',
  budget_max: props.modelValue?.budget_max || '',
  preferred_area: props.modelValue?.preferred_area || '',
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

