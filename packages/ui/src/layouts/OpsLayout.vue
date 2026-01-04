<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Desktop Sidebar (always visible) -->
    <aside class="hidden md:block w-64 bg-slate-50/50 border-r border-slate-200 fixed h-screen overflow-y-auto">
      <div class="p-4 border-b border-slate-200">
        <h2 class="text-xl font-bold text-teal-600">Ops Panel</h2>
      </div>
      <nav class="p-4 space-y-1">
        <router-link
          to="/ops/inbox"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-teal-100/60 hover:text-teal-700 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
                  <span>WhatsApp Inbox</span>
                </router-link>
                <router-link
                  to="/ops/offers"
                  class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-teal-100/60 hover:text-teal-700 transition-colors"
                  active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Provider Offers</span>
                </router-link>
              </nav>
            </aside>

    <!-- Mobile Drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div
          v-if="showDrawer"
          class="fixed inset-0 z-50 overflow-hidden md:hidden"
          @click.self="showDrawer = false"
        >
          <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div class="fixed left-0 top-0 bottom-0 w-64 bg-slate-50/50 border-r border-slate-200 shadow-xl overflow-y-auto">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 class="text-xl font-bold text-teal-600">Ops Panel</h2>
              <button
                @click="showDrawer = false"
                class="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav class="p-4 space-y-1">
              <router-link
                to="/ops/inbox"
                class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-teal-100/60 hover:text-teal-700 transition-colors"
                active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
                @click="showDrawer = false"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>WhatsApp Inbox</span>
              </router-link>
            </nav>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="flex-1 md:ml-64">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="px-4 md:px-6 py-4 flex justify-between items-center">
          <!-- Mobile menu button -->
          <button
            @click="showDrawer = true"
            class="md:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 class="text-xl font-semibold text-slate-900">
            <slot name="header-title" />
          </h1>
          <div class="flex items-center space-x-4">
            <button
              class="text-slate-700 hover:text-teal-600 transition-colors"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main class="p-0 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const showDrawer = ref(false);

const emit = defineEmits<{
  logout: [];
}>();

const handleLogout = () => {
  emit('logout');
};
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s;
}

.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(-100%);
}
</style>
