<template>
  <div class="min-h-screen bg-slate-50 flex">
    <aside class="w-64 bg-slate-50/50 border-r border-slate-200 fixed h-screen overflow-y-auto">
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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>WhatsApp Inbox</span>
        </router-link>
      </nav>
    </aside>
    <div class="flex-1 ml-64">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="px-6 py-4 flex justify-between items-center">
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
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const emit = defineEmits<{
  logout: [];
}>();

const handleLogout = () => {
  emit('logout');
};
</script>

