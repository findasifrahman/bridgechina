<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Top Header (Sticky) -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-xl font-bold bg-gradient-to-r from-teal-600 to-amber-500 bg-clip-text text-transparent">
              BridgeChina
            </span>
          </router-link>

          <!-- Desktop Nav -->
          <nav class="hidden md:flex items-center space-x-6">
            <router-link
              to="/services"
              class="text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              Services
            </router-link>
            <router-link
              to="/cities"
              class="text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              Cities
            </router-link>
            <router-link
              to="/places"
              class="text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              Places
            </router-link>
            <router-link
              to="/blog"
              class="text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              Blog
            </router-link>
            <router-link
              to="/help"
              class="text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              Help
            </router-link>
          </nav>

          <!-- Right Actions -->
          <div class="flex items-center space-x-3">
            <!-- Mobile Hamburger -->
            <button
              @click="mobileDrawerOpen = true"
              class="md:hidden p-2 text-slate-700 hover:text-teal-600 transition-colors"
              aria-label="Open menu"
            >
              <Menu class="h-6 w-6" />
            </button>

            <!-- WhatsApp (Desktop) -->
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              class="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <MessageCircle class="h-4 w-4" />
              <span>WhatsApp</span>
            </a>

            <!-- Auth Buttons -->
            <template v-if="!isAuthenticated">
              <router-link
                to="/login"
                class="flex items-center space-x-1 text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
              >
                <LogIn class="h-4 w-4" />
                <span class="hidden sm:inline">Sign In</span>
              </router-link>
            </template>
            <template v-else>
              <router-link
                to="/app"
                class="flex items-center space-x-1 text-sm text-slate-700 hover:text-teal-600 transition-colors font-medium"
              >
                <User class="h-4 w-4" />
                <span class="hidden sm:inline">Dashboard</span>
              </router-link>
              <Button variant="ghost" size="sm" @click="$emit('signOut')" class="flex items-center space-x-1">
                <LogOut class="h-4 w-4" />
                <span class="hidden sm:inline">Sign Out</span>
              </Button>
            </template>

            <Button variant="primary" size="sm" @click="router.push('/request')" class="flex items-center space-x-1">
              <Sparkles class="h-4 w-4" />
              <span class="hidden sm:inline">Request</span>
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Layout: Sidebar + Content -->
    <div class="flex max-w-[1400px] mx-auto">
      <!-- Fixed Sidebar (Desktop) -->
      <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-slate-200 bg-white">
        <SidebarNav />
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 min-w-0">
        <slot />
      </main>

      <!-- Right Column (HomePage only, via slot) -->
      <aside v-if="$slots.right" class="hidden xl:block w-80 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-l border-slate-200 bg-white p-6">
        <slot name="right" />
      </aside>
    </div>

    <!-- Footer -->
    <footer class="text-slate-300 mt-16 border-t-2 border-teal-900/40 relative" style="background-color: rgb(2, 6, 23);">
      <!-- Gradient strip at top -->
      <div class="h-0.5 bg-gradient-to-r from-teal-500/40 via-teal-400/30 to-amber-400/40"></div>
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 class="text-teal-400 font-bold text-lg mb-4">BridgeChina</h3>
            <p class="text-sm text-slate-400">We handle China for you.</p>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-4">Services</h4>
            <ul class="space-y-2 text-sm">
              <li><router-link to="/services/hotel" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><Hotel class="h-4 w-4" /><span>Hotels</span></router-link></li>
              <li><router-link to="/services/transport" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><Car class="h-4 w-4" /><span>Transport</span></router-link></li>
              <li><router-link to="/services/halal-food" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><UtensilsCrossed class="h-4 w-4" /><span>Halal Food</span></router-link></li>
              <li><router-link to="/services/medical" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><HeartPulse class="h-4 w-4" /><span>Medical</span></router-link></li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-4">Support</h4>
            <ul class="space-y-2 text-sm">
              <li><router-link to="/help" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><HelpCircle class="h-4 w-4" /><span>Help Center</span></router-link></li>
              <li><a href="https://wa.me/1234567890" target="_blank" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><MessageCircle class="h-4 w-4" /><span>WhatsApp</span></a></li>
              <li><a href="tel:+861234567890" class="flex items-center space-x-2 text-slate-300 hover:text-amber-300 transition-colors"><Phone class="h-4 w-4" /><span>Emergency: +86 123 4567 890</span></a></li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-4">Legal</h4>
            <ul class="space-y-2 text-sm">
              <li><router-link to="/terms" class="text-slate-300 hover:text-amber-300 transition-colors">Terms</router-link></li>
              <li><router-link to="/privacy" class="text-slate-300 hover:text-amber-300 transition-colors">Privacy</router-link></li>
            </ul>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-slate-800/50 text-center text-sm text-slate-400">
          <p>&copy; {{ new Date().getFullYear() }} BridgeChina. All rights reserved.</p>
        </div>
      </div>
    </footer>

    <!-- Mobile Drawer -->
    <Drawer v-model="mobileDrawerOpen" position="left" width="sm" title="Menu">
      <SidebarNav />
      <template #footer>
        <div class="p-4 border-t border-slate-200">
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            class="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <MessageCircle class="h-5 w-5" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </template>
    </Drawer>

    <!-- Floating Chat Widget -->
    <FloatingChatWidget />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { LogIn, User, LogOut, Menu, MessageCircle, HelpCircle, Phone, Sparkles, Hotel, Car, UtensilsCrossed, HeartPulse } from 'lucide-vue-next';
import Button from '../components/Button.vue';
import SidebarNav from '../components/SidebarNav.vue';
import Drawer from '../components/Drawer.vue';
import FloatingChatWidget from '../components/FloatingChatWidget.vue';

defineProps<{
  isAuthenticated?: boolean;
}>();

const emit = defineEmits<{
  signOut: [];
}>();

const router = useRouter();
const route = useRoute();
const mobileDrawerOpen = ref(false);

// Close drawer on navigation
watch(() => route.path, () => {
  mobileDrawerOpen.value = false;
});
</script>
