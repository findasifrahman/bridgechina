<template>
  <div class="min-h-screen bg-slate-50">
    <nav class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-xl font-bold text-teal-600">BridgeChina</span>
          </router-link>
          
          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-4">
            <router-link
              to="/"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              Home
            </router-link>
            <router-link
              to="/user"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              Dashboard
            </router-link>
            <router-link
              to="/user/requests"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              My Requests
            </router-link>
            <router-link
              to="/user/orders"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              Orders
            </router-link>
            <router-link
              to="/user/profile"
              class="text-slate-700 hover:text-teal-600 transition-colors"
              active-class="text-teal-600 font-medium"
            >
              Profile
            </router-link>
            <button
              class="text-slate-700 hover:text-teal-600 transition-colors"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>

          <!-- Mobile Menu Button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 text-slate-700 hover:text-teal-600 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              v-if="!mobileMenuOpen"
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg
              v-else
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Mobile Navigation Menu -->
        <div
          v-if="mobileMenuOpen"
          class="md:hidden border-t border-slate-200 py-4 space-y-2"
        >
          <router-link
            to="/"
            class="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors rounded-lg"
            active-class="bg-teal-50 text-teal-600 font-medium"
            @click="mobileMenuOpen = false"
          >
            Home
          </router-link>
          <router-link
            to="/user"
            class="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors rounded-lg"
            active-class="bg-teal-50 text-teal-600 font-medium"
            @click="mobileMenuOpen = false"
          >
            Dashboard
          </router-link>
          <router-link
            to="/user/requests"
            class="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors rounded-lg"
            active-class="bg-teal-50 text-teal-600 font-medium"
            @click="mobileMenuOpen = false"
          >
            My Requests
          </router-link>
          <router-link
            to="/user/orders"
            class="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors rounded-lg"
            active-class="bg-teal-50 text-teal-600 font-medium"
            @click="mobileMenuOpen = false"
          >
            Orders
          </router-link>
          <router-link
            to="/user/profile"
            class="block px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors rounded-lg"
            active-class="bg-teal-50 text-teal-600 font-medium"
            @click="mobileMenuOpen = false"
          >
            Profile
          </router-link>
          <button
            class="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors rounded-lg"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const emit = defineEmits<{
  logout: [];
}>();

const router = useRouter();
const mobileMenuOpen = ref(false);

const handleLogout = () => {
  emit('logout');
};
</script>
