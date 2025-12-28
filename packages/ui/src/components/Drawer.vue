<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        <div
          :class="drawerClasses"
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
          <div class="text-slate-700 overflow-y-auto">
            <slot />
          </div>
          <div v-if="$slots.footer" class="mt-6 pt-4 border-t border-slate-200">
            <slot name="footer" />
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
  position?: 'left' | 'right';
  width?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'right',
  width: 'md',
  closable: true,
});

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const drawerClasses = computed(() => {
  const base = 'fixed top-0 bottom-0 bg-white shadow-xl p-6 overflow-y-auto';
  
  const positions = {
    left: 'left-0',
    right: 'right-0',
  };
  
  const widths = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[42rem]',
  };
  
  return [base, positions[props.position], widths[props.width]].join(' ');
});
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-active .drawer-content,
.drawer-leave-active .drawer-content {
  transition: transform 0.3s ease;
}

.drawer-enter-from .drawer-content[data-position="right"],
.drawer-leave-to .drawer-content[data-position="right"] {
  transform: translateX(100%);
}

.drawer-enter-from .drawer-content[data-position="left"],
.drawer-leave-to .drawer-content[data-position="left"] {
  transform: translateX(-100%);
}
</style>

