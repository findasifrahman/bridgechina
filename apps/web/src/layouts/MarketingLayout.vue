<template>
  <MarketingLayoutComponent
    ref="layoutRef"
    :is-authenticated="authStore.isAuthenticated"
    :user-roles="authStore.user?.roles || []"
    @sign-out="handleSignOut"
    @load-offers="handleLoadOffers"
    @offer-click="handleOfferClick"
  >
    <router-view />
  </MarketingLayoutComponent>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';
import MarketingLayoutComponent from '@bridgechina/ui/src/layouts/MarketingLayout.vue';

const router = useRouter();
const authStore = useAuthStore();
const layoutRef = ref<InstanceType<typeof MarketingLayoutComponent> | null>(null);

// Provide a way for child components to register their modal handler
const offerModalHandler = ref<((offer: any) => void) | null>(null);

provide('offerModalHandler', {
  register: (handler: (offer: any) => void) => {
    offerModalHandler.value = handler;
  },
});

function handleOfferClick(offer: any) {
  if (offerModalHandler.value) {
    offerModalHandler.value(offer);
  }
}

onMounted(() => {
  console.log('[MarketingLayout] Layout mounted, isAuthenticated:', authStore.isAuthenticated);
  // Load offers on mount
  loadOffers();
});

const handleSignOut = async () => {
  await authStore.logout();
  router.push('/');
};

async function handleLoadOffers() {
  await loadOffers();
}

async function loadOffers() {
  if (!layoutRef.value) return;
  
  try {
    layoutRef.value.setLoading(true);
    const response = await axios.get('/api/public/offers');
    const offers = response.data || [];
    layoutRef.value.setOffers(offers);
  } catch (error) {
    console.error('Failed to load offers:', error);
    layoutRef.value.setOffers([]);
  }
}
</script>

