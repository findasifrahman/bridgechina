<template>
  <div class="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
    <aside class="w-full border-b border-slate-200 bg-slate-50/50 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:overflow-y-auto">
      <div class="p-4 border-b border-slate-200">
        <h2 class="text-xl font-bold text-teal-600">Admin Panel</h2>
      </div>
      <nav class="p-4 space-y-1">
        <router-link
          to="/admin"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-teal-100/60 hover:text-teal-700 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </router-link>
        <router-link
          to="/admin/orders"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7m-7 13a9 9 0 100-18 9 9 0 000 18z" />
          </svg>
          <span>Orders</span>
        </router-link>
        <router-link
          to="/admin/payment-proofs"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Payment Proofs</span>
        </router-link>
        <router-link
          to="/admin/shopping"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Shopping</span>
        </router-link>
        <router-link
          to="/admin/pricing"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h12" />
          </svg>
          <span>Pricing</span>
        </router-link>
        <router-link
          to="/admin/homepage"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Homepage</span>
        </router-link>
        <router-link
          to="/admin/blog"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span>Blog</span>
        </router-link>
        <router-link
          to="/admin/users"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Users</span>
        </router-link>
        <router-link
          to="/admin/sellers"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Sellers</span>
        </router-link>
        <router-link
          to="/admin/media"
          class="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          active-class="bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-600 shadow-sm"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Media</span>
        </router-link>
      </nav>
    </aside>
    <div class="min-w-0 flex-1">
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

