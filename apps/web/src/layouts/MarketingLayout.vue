<template>
  <MarketingLayoutComponent
    ref="layoutRef"
    :is-authenticated="authStore.isAuthenticated"
    @sign-out="handleSignOut"
    @load-offers="loadOffers"
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
const layoutRef = ref<any>(null);

async function loadOffers() {
  if (layoutRef.value) {
    layoutRef.value.setLoading(true);
  }
  try {
    const response = await axios.get('/api/public/offers');
    if (layoutRef.value) {
      layoutRef.value.setOffers(response.data || []);
    }
  } catch (error) {
    console.error('Failed to load offers', error);
    if (layoutRef.value) {
      layoutRef.value.setOffers([]);
    }
  }
}

onMounted(() => {
  console.log('[MarketingLayout] Layout mounted, isAuthenticated:', authStore.isAuthenticated);
  loadOffers();
});

const handleSignOut = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

