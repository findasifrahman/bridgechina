<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- List Views for Hotels, Halal Food, Tours, Guide, Restaurants -->
    <HotelsListPage v-if="route.params.slug === 'hotel'" />
    <HalalFoodListPage v-else-if="route.params.slug === 'halal-food'" />
    <ToursListPage v-else-if="route.params.slug === 'tours'" />
    <GuidesListPage v-else-if="route.params.slug === 'guide'" />
    <RestaurantsListPage v-else-if="route.params.slug === 'restaurants'" />
    
    <!-- Detail View for other services -->
    <div v-else-if="!loading && service" class="max-w-7xl mx-auto">
      <PageHeader :title="service.name" :subtitle="service.description" />
      
      <div class="grid md:grid-cols-3 gap-6 mt-8">
        <div class="md:col-span-2 space-y-6">
          <Card>
            <CardBody class="p-6">
              <h3 class="font-semibold text-slate-900 mb-4">About This Service</h3>
              <div class="prose prose-sm max-w-none text-slate-700" v-html="serviceContent" />
            </CardBody>
          </Card>

          <Card v-if="service.key === 'esim'">
            <CardHeader>
              <h3 class="font-semibold text-slate-900">Available Plans</h3>
            </CardHeader>
            <CardBody>
              <div v-if="esimPlans.length === 0" class="text-center py-8 text-slate-500">
                No plans available
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="plan in esimPlans"
                  :key="plan.id"
                  class="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors"
                >
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <h4 class="font-semibold text-slate-900">{{ plan.name }}</h4>
                      <p class="text-sm text-slate-600">{{ plan.provider }} • {{ plan.region_text }}</p>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold text-teal-600">¥{{ plan.price }}</div>
                      <div class="text-xs text-slate-500">{{ plan.validity_days }} days</div>
                    </div>
                  </div>
                  <p class="text-sm text-slate-700 mb-3">{{ plan.data_text }}</p>
                  <Button variant="primary" size="sm" @click="requestEsim(plan)">
                    Request This Plan
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card class="sticky top-4">
            <CardBody class="p-6">
              <h3 class="font-semibold text-slate-900 mb-4">Request Service</h3>
              <Button variant="primary" full-width @click="$router.push('/request')">
                Get Started
              </Button>
              <div class="mt-4 pt-4 border-t border-slate-200">
                <h4 class="text-sm font-semibold text-slate-900 mb-2">Need Help?</h4>
                <Button variant="ghost" size="sm" full-width @click="openWhatsApp" class="flex items-center justify-center space-x-2">
                  <MessageCircle class="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <EmptyState title="Service not found" description="The service you're looking for doesn't exist" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MessageCircle } from 'lucide-vue-next';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  SkeletonLoader,
  EmptyState,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import HotelsListPage from './HotelsListPage.vue';
import HalalFoodListPage from './HalalFoodListPage.vue';
import ToursListPage from './ToursListPage.vue';
import GuidesListPage from './GuidesListPage.vue';
import RestaurantsListPage from './RestaurantsListPage.vue';

const route = useRoute();
const router = useRouter();

const service = ref<any>(null);
const esimPlans = ref<any[]>([]);
const loading = ref(true);

const serviceContent = computed(() => {
  const content: Record<string, string> = {
    hotel: 'Find and book verified hotels with English support. We help you find the perfect accommodation that meets your needs and budget.',
    transport: 'Reliable airport pickup and point-to-point transport. Our verified drivers ensure safe and comfortable journeys.',
    'halal-food': 'Discover verified halal restaurants and get food delivered to your location. We partner with trusted halal-certified establishments.',
    medical: 'Connect with English-speaking medical professionals. We help you navigate healthcare in China with translation support.',
    'translation-help': 'On-demand translation and local assistance. Get help with appointments, documents, and daily communication.',
    shopping: 'Shop from verified sellers with quality products. Browse our marketplace and get items delivered.',
    tours: 'Curated tours and experiences. Explore China with our recommended tour packages.',
    esim: 'Stay connected with eSIM plans. Get data plans for your trip to China without changing your SIM card.',
  };
  return content[route.params.slug as string] || 'Service information coming soon.';
});

async function loadService() {
  loading.value = true;
  try {
    // Service detail is static for now, but can be enhanced
    const services: Record<string, any> = {
      hotel: { name: 'Hotel Booking', description: 'Find verified hotels with English support' },
      transport: { name: 'Transport Services', description: 'Airport pickup and point-to-point transport' },
      'halal-food': { name: 'Halal Food', description: 'Verified halal restaurants and delivery' },
      medical: { name: 'Medical Assistance', description: 'English-speaking medical help' },
      'translation-help': { name: 'Translation & Help', description: 'On-demand translation services' },
      shopping: { name: 'Shopping', description: 'Marketplace with verified sellers' },
      tours: { name: 'Tours', description: 'Curated tours and experiences' },
      esim: { name: 'eSIM Plans', description: 'Stay connected with eSIM data plans' },
    };
    service.value = { ...services[route.params.slug as string], key: route.params.slug };

    if (route.params.slug === 'esim') {
      const res = await axios.get('/api/public/catalog/esim');
      esimPlans.value = res.data;
    }
  } catch (error) {
    console.error('Failed to load service', error);
  } finally {
    loading.value = false;
  }
}

function requestEsim(plan: any) {
  router.push({
    path: '/request',
    query: { category: 'esim', plan_id: plan.id },
  });
}

function openWhatsApp() {
  window.open('https://wa.me/1234567890', '_blank');
}

onMounted(() => {
  loadService();
});
</script>
