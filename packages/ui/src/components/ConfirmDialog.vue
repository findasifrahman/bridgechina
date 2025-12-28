<template>
  <Modal
    :model-value="modelValue"
    :title="title"
    size="sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p class="text-slate-700">{{ message }}</p>
    <template #footer>
      <div class="flex justify-end space-x-3">
        <Button variant="ghost" @click="$emit('update:modelValue', false)">
          {{ cancelText }}
        </Button>
        <Button :variant="confirmVariant" @click="$emit('confirm')">
          {{ confirmText }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue';
import Button from './Button.vue';

interface Props {
  modelValue: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

withDefaults(defineProps<Props>(), {
  title: 'Confirm',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  confirmVariant: 'primary',
});

defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
}>();
</script>

