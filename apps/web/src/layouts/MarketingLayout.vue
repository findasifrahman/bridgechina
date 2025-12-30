<template>
  <MarketingLayoutComponent
    ref="layoutRef"
    :is-authenticated="authStore.isAuthenticated"
    @sign-out="handleSignOut"
    @load-offers="handleLoadOffers"
  >
    <router-view />
  </MarketingLayoutComponent>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';
import MarketingLayoutComponent from '@bridgechina/ui/src/layouts/MarketingLayout.vue';

const router = useRouter();
const authStore = useAuthStore();
const layoutRef = ref<InstanceType<typeof MarketingLayoutComponent> | null>(null);

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

