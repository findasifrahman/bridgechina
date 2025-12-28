<template>
  <div class="space-y-4">
    <Input
      v-model="localData.date"
      label="Preferred Date"
      type="date"
    />
    <Input
      v-model.number="localData.group_size"
      label="Group Size"
      type="number"
      min="1"
    />
    <Textarea
      v-model="localData.preferences"
      label="Tour Preferences"
      rows="4"
      placeholder="Any specific interests or requirements?"
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
  date: props.modelValue?.date || '',
  group_size: props.modelValue?.group_size || 1,
  preferences: props.modelValue?.preferences || '',
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

