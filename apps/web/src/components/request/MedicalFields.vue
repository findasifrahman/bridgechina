<template>
  <div class="space-y-4">
    <Select
      v-model="localData.urgency"
      label="Urgency Level"
      :options="urgencyOptions"
      required
    />
    <Textarea
      v-model="localData.symptoms_text"
      label="Symptoms or Reason for Visit"
      rows="4"
    />
    <Input
      v-model="localData.preferred_language"
      label="Preferred Language"
      placeholder="e.g., English, Chinese"
    />
    <Input
      v-model="localData.appointment_time"
      label="Preferred Appointment Time"
      type="datetime-local"
    />
    <Checkbox
      v-model="localData.translator_required"
      label="Require Translator"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Input, Select, Textarea, Checkbox } from '@bridgechina/ui';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const urgencyOptions = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Within 24 hours' },
  { value: 'high', label: 'High - Urgent' },
  { value: 'emergency', label: 'Emergency - Immediate' },
];

const localData = ref({
  urgency: props.modelValue?.urgency || 'medium',
  symptoms_text: props.modelValue?.symptoms_text || '',
  preferred_language: props.modelValue?.preferred_language || 'English',
  appointment_time: props.modelValue?.appointment_time || '',
  translator_required: props.modelValue?.translator_required || false,
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

