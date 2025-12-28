<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="fixed top-4 right-4 z-50 space-y-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="toastClasses(toast.type)"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <component :is="iconComponent(toast.type)" class="h-5 w-5" />
          </div>
          <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium">{{ toast.message }}</p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              class="inline-flex text-slate-400 hover:text-slate-500 focus:outline-none"
              @click="removeToast(toast.id)"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-vue-next';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface Props {
  toasts: Toast[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  remove: [id: string];
}>();

const toastClasses = (type: string) => {
  const base = 'max-w-sm w-full rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden';
  const types = {
    success: 'bg-green-50 text-green-800',
    error: 'bg-red-50 text-red-800',
    warning: 'bg-amber-50 text-amber-800',
    info: 'bg-blue-50 text-blue-800',
  };
  return [base, types[type as keyof typeof types]].join(' ');
};

const iconComponent = (type: string) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };
  return icons[type as keyof typeof icons] || Info;
};

const removeToast = (id: string) => {
  emit('remove', id);
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>

