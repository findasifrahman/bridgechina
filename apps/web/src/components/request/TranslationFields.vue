<template>
  <div class="space-y-4">
    <Textarea
      v-model="localData.context_text"
      label="Translation Context"
      rows="4"
      placeholder="What do you need translated?"
    />
    <Input
      v-model="localData.location_text"
      label="Location (if on-site translation needed)"
    />
    <Input
      v-model="localData.scheduled_time"
      label="Scheduled Time (if applicable)"
      type="datetime-local"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Input, Textarea } from '@bridgechina/ui';

const props = defineProps<{
  modelValue: any;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const localData = ref({
  context_text: props.modelValue?.context_text || '',
  location_text: props.modelValue?.location_text || '',
  scheduled_time: props.modelValue?.scheduled_time || '',
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

