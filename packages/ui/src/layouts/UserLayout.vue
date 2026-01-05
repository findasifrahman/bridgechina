<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar - Desktop -->
    <aside class="hidden lg:block w-64 bg-teal-600 border-r border-teal-700 fixed h-screen overflow-y-auto">
      <div class="p-4 border-b border-teal-700">
        <router-link to="/" class="flex items-center space-x-2 mb-2">
          <span class="text-xl font-bold text-white">BridgeChina</span>
        </router-link>
        <h2 class="text-sm font-semibold text-teal-100">User Dashboard</h2>
      </div>
      <nav class="p-4 space-y-1">
        <router-link
          to="/"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-teal-100 hover:bg-teal-700/60 hover:text-white transition-colors"
          active-class="bg-teal-700 text-white font-semibold border-l-4 border-teal-300 shadow-sm"
        >
          <Home class="h-5 w-5" />
          <span>Home</span>
        </router-link>
        <router-link
          to="/user"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-teal-100 hover:bg-teal-700/60 hover:text-white transition-colors"
          active-class="bg-teal-700 text-white font-semibold border-l-4 border-teal-300 shadow-sm"
        >
          <LayoutDashboard class="h-5 w-5" />
          <span>Dashboard</span>
        </router-link>
        <router-link
          to="/user/requests"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-teal-100 hover:bg-teal-700/60 hover:text-white transition-colors"
          active-class="bg-teal-700 text-white font-semibold border-l-4 border-teal-300 shadow-sm"
        >
          <ClipboardList class="h-5 w-5" />
          <span>My Requests</span>
        </router-link>
        <router-link
          to="/user/orders"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-teal-100 hover:bg-teal-700/60 hover:text-white transition-colors"
          active-class="bg-teal-700 text-white font-semibold border-l-4 border-teal-300 shadow-sm"
        >
          <ShoppingBag class="h-5 w-5" />
          <span>Orders</span>
        </router-link>
        <router-link
          to="/user/profile"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-teal-100 hover:bg-teal-700/60 hover:text-white transition-colors"
          active-class="bg-teal-700 text-white font-semibold border-l-4 border-teal-300 shadow-sm"
        >
          <User class="h-5 w-5" />
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
            <button
              class="text-slate-700 hover:text-teal-600 transition-colors flex items-center gap-2"
              @click="handleLogout"
            >
              <LogOut class="h-5 w-5" />
              <span class="hidden sm:inline">Logout</span>
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
        <router-link @click="mobileMenuOpen = false" to="/" class="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">
          <Home class="h-5 w-5" />
          <span>Home</span>
        </router-link>
        <router-link @click="mobileMenuOpen = false" to="/user" class="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">
          <LayoutDashboard class="h-5 w-5" />
          <span>Dashboard</span>
        </router-link>
        <router-link @click="mobileMenuOpen = false" to="/user/requests" class="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">
          <ClipboardList class="h-5 w-5" />
          <span>My Requests</span>
        </router-link>
        <router-link @click="mobileMenuOpen = false" to="/user/orders" class="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">
          <ShoppingBag class="h-5 w-5" />
          <span>Orders</span>
        </router-link>
        <router-link @click="mobileMenuOpen = false" to="/user/profile" class="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100">
          <User class="h-5 w-5" />
          <span>Profile</span>
        </router-link>
        <button @click="handleLogout" class="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 w-full text-left">
          <LogOut class="h-5 w-5" />
          <span>Logout</span>
        </button>
      </nav>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Home, LayoutDashboard, ClipboardList, ShoppingBag, User, Menu, LogOut } from 'lucide-vue-next';
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

