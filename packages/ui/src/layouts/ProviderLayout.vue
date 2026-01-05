<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar - Desktop -->
    <aside class="hidden lg:block w-64 bg-slate-50/50 border-r border-slate-200 fixed h-screen overflow-y-auto">
      <div class="p-4 border-b border-slate-200">
        <router-link to="/" class="flex items-center space-x-2 mb-2">
          <span class="text-xl font-bold text-teal-600">BridgeChina</span>
        </router-link>
        <h2 class="text-sm font-semibold text-slate-600">Provider Dashboard</h2>
      </div>
      <nav class="p-4 space-y-1">
        <router-link
          to="/provider"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-teal-100/60 hover:text-teal-700 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </router-link>
        <router-link
          to="/provider/inbox"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Inbox</span>
        </router-link>
        <router-link
          to="/provider/requests"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Requests</span>
        </router-link>
        <router-link
          to="/provider/profile"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Profile</span>
        </router-link>
      </nav>
    </aside>
    
    <div class="flex-1 lg:ml-64">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div class="px-4 sm:px-6 py-4 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <!-- Mobile Menu Button -->
            <button
              @click="mobileMenuOpen = true"
              class="lg:hidden p-2 text-slate-700 hover:text-teal-600 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu class="h-6 w-6" />
            </button>
            <h1 class="text-xl font-semibold text-slate-900">
              <slot name="header-title" />
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <router-link
              to="/"
              class="text-sm text-slate-700 hover:text-teal-600 transition-colors"
            >
              Home
            </router-link>
            <button
              class="text-slate-700 hover:text-teal-600 transition-colors"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main class="p-4 sm:p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile Drawer -->
    <Drawer v-model="mobileMenuOpen" position="left" width="xs" title="Menu">
      <nav class="flex flex-col space-y-2 p-4">
        <router-link @click="mobileMenuOpen = false" to="/" class="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">Home</router-link>
        <router-link @click="mobileMenuOpen = false" to="/provider" class="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">Dashboard</router-link>
        <router-link @click="mobileMenuOpen = false" to="/provider/inbox" class="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">Inbox</router-link>
        <router-link @click="mobileMenuOpen = false" to="/provider/requests" class="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">Requests</router-link>
        <router-link @click="mobileMenuOpen = false" to="/provider/profile" class="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">Profile</router-link>
      </nav>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Menu } from 'lucide-vue-next';
import Drawer from '../components/Drawer.vue';

const router = useRouter();
const mobileMenuOpen = ref(false);

const emit = defineEmits<{
  logout: [];
}>();

const handleLogout = () => {
  emit('logout');
};
</script>

