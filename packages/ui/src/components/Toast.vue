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
        class="animate-in slide-in-from-right"
      >
        <div class="flex items-start p-4">
          <div class="flex-shrink-0">
            <component :is="iconComponent(toast.type)" class="h-6 w-6" />
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <p class="text-base font-semibold leading-5">{{ toast.message }}</p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              class="inline-flex text-slate-400 hover:text-slate-600 focus:outline-none rounded-md p-1 hover:bg-slate-100 transition-colors"
              @click="removeToast(toast.id)"
              aria-label="Close"
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
  const base = 'max-w-md w-full rounded-xl shadow-xl pointer-events-auto ring-2 ring-opacity-20 overflow-hidden border';
  const types = {
    success: 'bg-green-50 text-green-900 border-green-200 ring-green-500',
    error: 'bg-red-50 text-red-900 border-red-200 ring-red-500',
    warning: 'bg-amber-50 text-amber-900 border-amber-200 ring-amber-500',
    info: 'bg-blue-50 text-blue-900 border-blue-200 ring-blue-500',
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

