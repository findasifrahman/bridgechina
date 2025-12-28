<template>
  <div class="min-h-screen bg-slate-50">
    <nav class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <router-link to="/app" class="flex items-center space-x-2">
            <span class="text-xl font-bold text-teal-600">BridgeChina</span>
          </router-link>
          <div class="flex items-center space-x-4">
            <router-link
              to="/app"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              Dashboard
            </router-link>
            <router-link
              to="/app/requests"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              My Requests
            </router-link>
            <router-link
              to="/app/orders"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              Orders
            </router-link>
            <button
              class="text-slate-700 hover:text-teal-600 transition-colors"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const emit = defineEmits<{
  logout: [];
}>();

const router = useRouter();

const handleLogout = () => {
  emit('logout');
};
</script>

