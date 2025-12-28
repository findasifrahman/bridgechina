<template>
  <div class="space-y-4">
    <Textarea
      v-model="localData.items_description"
      label="Items You Need"
      rows="4"
      placeholder="Describe the items you want to purchase..."
    />
    <Input
      v-model.number="localData.budget"
      label="Budget (CNY)"
      type="number"
    />
    <Input
      v-model="localData.preferred_stores"
      label="Preferred Stores or Areas"
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
  items_description: props.modelValue?.items_description || '',
  budget: props.modelValue?.budget || '',
  preferred_stores: props.modelValue?.preferred_stores || '',
});

watch(localData, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });
</script>

