<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div
            :class="modalClasses"
            @click.stop
          >
            <div v-if="title || $slots.header" class="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
              <h3 v-if="title" class="text-lg font-semibold text-slate-900">{{ title }}</h3>
              <slot name="header" />
              <button
                v-if="closable"
                class="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
                @click="$emit('update:modelValue', false)"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="text-slate-700">
              <slot />
            </div>
            <div v-if="$slots.footer" class="mt-6 pt-4 border-t border-slate-200">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
});

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const modalClasses = computed(() => {
  const base = 'relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md';
  
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };
  
  return [base, sizes[props.size]].join(' ');
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

