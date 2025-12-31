<template>
  <div class="min-h-screen bg-white">
    <!-- Top Header (Sticky) -->
    <header class="sticky top-0 z-50 bg-gradient-to-r from-teal-50/80 to-white backdrop-blur-sm border-b border-teal-100 shadow-sm">
      <div class="w-full">
        <!-- Mobile: Simple flex layout -->
        <div class="lg:hidden flex justify-between items-center h-16 px-4 sm:px-6">
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-xl font-bold text-teal-700">BridgeChina</span>
          </router-link>
          <button
            @click="mobileDrawerOpen = true"
            class="p-2 text-slate-700 hover:text-teal-600 transition-colors"
            aria-label="Open menu"
          >
            <Menu class="h-6 w-6" />
          </button>
        </div>
        
        <!-- Desktop: Full width flex layout -->
        <div class="hidden lg:flex items-center justify-between h-16 px-6">
          <!-- Left: Brand (completely left-aligned) -->
          <router-link to="/" class="flex items-center space-x-2 flex-shrink-0">
            <span class="text-xl font-bold text-teal-700">BridgeChina</span>
          </router-link>
          
          <!-- Center: Navigation Links -->
          <nav class="flex items-center space-x-5 mx-6 flex-1 justify-center">
            <router-link
              to="/services"
              class="text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
            >
              Services
            </router-link>
            <router-link
              to="/cities"
              class="text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
            >
              Cities
            </router-link>
            <router-link
              to="/places"
              class="text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
            >
              Places
            </router-link>
            <router-link
              to="/blog"
              class="text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
            >
              Blog
            </router-link>
            <router-link
              to="/help"
              class="text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
            >
              Help
            </router-link>
            <router-link
              to="/contact"
              class="text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
            >
              Contact
            </router-link>
          </nav>
          
          <!-- Right: Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- WhatsApp (Desktop) -->
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm whitespace-nowrap"
            >
              <MessageCircle class="h-4 w-4" />
              <span>WhatsApp</span>
            </a>

            <!-- Auth Buttons -->
            <template v-if="!isAuthenticated">
              <router-link
                to="/login"
                class="flex items-center gap-1 text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
              >
                <LogIn class="h-4 w-4" />
                <span>Sign In</span>
              </router-link>
            </template>
            <template v-else>
              <router-link
                :to="userRoles.includes('ADMIN') ? '/admin' : '/app'"
                class="flex items-center gap-1 text-sm text-slate-700 hover:text-teal-700 transition-colors font-medium whitespace-nowrap"
              >
                <User class="h-4 w-4 flex-shrink-0" />
                <span>Dashboard</span>
              </router-link>
              <Button 
                variant="ghost" 
                size="sm" 
                @click="$emit('signOut')" 
                class="flex items-center gap-1 text-slate-700 hover:text-teal-700 whitespace-nowrap px-2"
              >
                <LogOut class="h-4 w-4 flex-shrink-0" />
                <span class="whitespace-nowrap">Sign Out</span>
              </Button>
            </template>

            <Button 
              variant="primary" 
              size="sm" 
              @click="router.push('/request')" 
              class="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white shadow-sm whitespace-nowrap"
            >
              <Sparkles class="h-4 w-4" />
              <span>Request</span>
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Offers Carousel -->
    <OffersCarousel v-if="offers.length > 0" :offers="offers" @click="handleOfferClick" />

    <!-- Main Layout: Sidebar + Content + Right Rail -->
    <div class="w-full">
      <div class="lg:flex lg:gap-x-6 lg:px-6 px-4 sm:px-6">
        <!-- Fixed Sidebar (Desktop) -->
        <aside class="hidden lg:block fixed left-6 top-16 w-[260px] h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar border-r border-slate-200 bg-white z-30">
          <SidebarNav />
        </aside>

        <!-- Main Content Area (with sidebar offset on desktop) -->
        <main class="lg:ml-[272px] lg:flex-1 min-w-0 py-6">
          <slot />
        </main>

        <!-- Right Offers Rail (Desktop only, xl+) -->
        <aside class="hidden xl:block w-[320px] flex-shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-hidden">
          <RightRailOffers :offers="offers" :loading="loadingOffers" @click="handleOfferClick" />
        </aside>
      </div>
    </div>

    <!-- Footer -->
    <footer class="mt-16 border-t border-slate-200 bg-slate-50">
      <div class="w-full">
        <div class="lg:flex lg:gap-x-6 lg:px-6 px-4 sm:px-6">
          <!-- Spacer for sidebar column on desktop -->
          <div class="hidden lg:block w-[260px] flex-shrink-0"></div>
          
          <!-- Footer Content (aligned with main content) -->
          <div class="lg:flex-1 py-12">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 class="text-teal-700 font-bold text-lg mb-4">BridgeChina</h3>
                <p class="text-sm text-slate-600">We handle China for you.</p>
              </div>
              <div>
                <h4 class="text-slate-900 font-semibold mb-4">Services</h4>
                <ul class="space-y-2 text-sm">
                  <li><router-link to="/services/hotel" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><Hotel class="h-4 w-4" /><span>Hotels</span></router-link></li>
                  <li><router-link to="/services/transport" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><Car class="h-4 w-4" /><span>Transport</span></router-link></li>
                  <li><router-link to="/services/halal-food" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><UtensilsCrossed class="h-4 w-4" /><span>Halal Food</span></router-link></li>
                  <li><router-link to="/services/medical" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><HeartPulse class="h-4 w-4" /><span>Medical</span></router-link></li>
                </ul>
              </div>
              <div>
                <h4 class="text-slate-900 font-semibold mb-4">Support</h4>
                <ul class="space-y-2 text-sm">
                  <li><router-link to="/help" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><HelpCircle class="h-4 w-4" /><span>Help Center</span></router-link></li>
                  <li><a href="https://wa.me/1234567890" target="_blank" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><MessageCircle class="h-4 w-4" /><span>WhatsApp</span></a></li>
                  <li><a href="tel:+861234567890" class="flex items-center space-x-2 text-slate-600 hover:text-teal-700 transition-colors"><Phone class="h-4 w-4" /><span>Emergency: +86 123 4567 890</span></a></li>
                </ul>
              </div>
              <div>
                <h4 class="text-slate-900 font-semibold mb-4">Legal</h4>
                <ul class="space-y-2 text-sm">
                  <li><router-link to="/terms" class="text-slate-600 hover:text-teal-700 transition-colors">Terms</router-link></li>
                  <li><router-link to="/privacy" class="text-slate-600 hover:text-teal-700 transition-colors">Privacy</router-link></li>
                </ul>
              </div>
            </div>
            <div class="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
              <p>&copy; {{ new Date().getFullYear() }} BridgeChina. All rights reserved.</p>
            </div>
          </div>
          
          <!-- Spacer for right rail column on desktop -->
          <div class="hidden xl:block w-[320px] flex-shrink-0"></div>
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

    <!-- WhatsApp Floating Button -->
    <a
      href="https://wa.me/1234567890"
      target="_blank"
      class="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle class="h-6 w-6" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { LogIn, User, LogOut, Menu, MessageCircle, HelpCircle, Phone, Sparkles, Hotel, Car, UtensilsCrossed, HeartPulse } from 'lucide-vue-next';
import Button from '../components/Button.vue';
import SidebarNav from '../components/SidebarNav.vue';
import Drawer from '../components/Drawer.vue';
import RightRailOffers from '../components/RightRailOffers.vue';
import OffersCarousel from '../components/OffersCarousel.vue';

const props = defineProps<{
  isAuthenticated?: boolean;
  userRoles?: string[];
}>();

const emit = defineEmits<{
  signOut: [];
  loadOffers: [];
}>();

const router = useRouter();
const route = useRoute();
const mobileDrawerOpen = ref(false);
const offers = ref<any[]>([]);
const loadingOffers = ref(false);

// Computed for user roles
const userRoles = computed(() => props.userRoles || []);

// Close drawer on navigation
watch(() => route.path, () => {
  mobileDrawerOpen.value = false;
});

// Emit event to parent to load offers (parent will use axios)
onMounted(() => {
  emit('loadOffers');
});

function handleOfferClick(offer: any) {
  emit('offerClick', offer);
}

// Expose method to set offers (called by parent)
defineExpose({
  setOffers: (newOffers: any[]) => {
    offers.value = newOffers;
    loadingOffers.value = false;
  },
  setLoading: (loading: boolean) => {
    loadingOffers.value = loading;
  },
});
</script>
