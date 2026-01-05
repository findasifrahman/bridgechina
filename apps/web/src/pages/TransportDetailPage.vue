<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <div v-if="loading" class="space-y-6">
      <SkeletonLoader class="h-96" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="transport" class="max-w-7xl mx-auto">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/transport" class="text-slate-500 hover:text-teal-600">Transport</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium">{{ transport.name || transport.type || 'Transport' }}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Header -->
          <Card>
            <CardBody class="p-6">
              <div class="flex items-start gap-6">
                <div class="relative">
                  <img
                    v-if="getTransportImageUrl(transport)"
                    :src="getTransportImageUrl(transport)"
                    :alt="transport.name || transport.type"
                    class="w-24 h-24 rounded-xl object-cover"
                    @error="handleImageError"
                  />
                  <div v-else class="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <Car class="h-12 w-12 text-blue-400" />
                  </div>
                  <div v-if="transport.verified" class="absolute -bottom-1 -right-1">
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                </div>
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-slate-900 mb-2">{{ transport.name || transport.type || 'Transport Service' }}</h1>
                  <div class="flex items-center gap-4 mb-3">
                    <div v-if="transport.rating" class="flex items-center gap-1">
                      <Star class="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span class="font-semibold">{{ transport.rating.toFixed(1) }}</span>
                      <span v-if="transport.review_count" class="text-sm text-slate-500">({{ transport.review_count }} reviews)</span>
                    </div>
                    <div v-if="transport.price_per_km" class="text-lg font-semibold text-blue-600">
                      ¥{{ transport.price_per_km }}/km
                    </div>
                  </div>
                  <div v-if="transport.vehicle_type" class="mb-2">
                    <Badge variant="primary">{{ transport.vehicle_type }}</Badge>
                  </div>
                  <div v-if="transport.city" class="flex items-center gap-1 text-slate-600">
                    <MapPin class="h-4 w-4" />
                    <span>{{ transport.city.name }}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Description -->
          <Card v-if="transport.description">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">About This Service</h2>
              <p class="text-slate-700 leading-relaxed">{{ transport.description }}</p>
            </CardBody>
          </Card>

          <!-- Features -->
          <Card v-if="transport.features && Object.keys(transport.features).length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Features</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(value, key) in transport.features" :key="key" class="flex items-center gap-2">
                  <Check class="h-5 w-5 text-blue-600" />
                  <span class="text-slate-700 capitalize">{{ key.replace(/_/g, ' ') }}: {{ value }}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Reviews Section -->
          <div class="mt-12">
            <ReviewsSection entity-type="transport" :entity-id="transport.id" />
          </div>
        </div>

        <!-- Right: Booking Card -->
        <div>
          <Card class="sticky top-4">
            <CardBody class="p-6">
              <h3 class="font-semibold text-slate-900 mb-4">Request This Service</h3>
              <div v-if="transport.price_per_km" class="mb-4">
                <div class="text-2xl font-bold text-blue-600">¥{{ transport.price_per_km }}</div>
                <div class="text-sm text-slate-500">per kilometer</div>
              </div>
              <Button variant="primary" full-width @click="handleRequestTransport" class="mb-4" :disabled="submitting">
                Request Transport
              </Button>
              <div class="pt-4 border-t border-slate-200">
                <h4 class="text-sm font-semibold text-slate-900 mb-2">What's Included</h4>
                <ul class="text-sm text-slate-600 space-y-1">
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-blue-600" />
                    Professional driver
                  </li>
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-blue-600" />
                    Safe and comfortable vehicle
                  </li>
                  <li v-if="transport.vehicle_type" class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-blue-600" />
                    {{ transport.vehicle_type }} vehicle
                  </li>
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-blue-600" />
                    English-speaking support
                  </li>
                </ul>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <EmptyState title="Transport service not found" description="The service you're looking for doesn't exist" />
    </div>

    <!-- Login Modal -->
    <Modal v-model="showLoginModal" title="Login Required">
      <div class="p-6 text-center">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p class="text-slate-700 mb-4">Thank you for choosing. Please log in to request this transport service.</p>
          <div class="flex gap-3 justify-center">
            <Button variant="ghost" @click="showLoginModal = false">Cancel</Button>
            <Button variant="primary" @click="router.push('/login')">Log In</Button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Confirmation Modal -->
    <Modal v-model="showConfirmModal" title="Confirm Request">
      <div class="p-6">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <p class="text-slate-700 mb-4">Thank you for choosing this transport service. Press OK and we will contact you within 1 hour.</p>
          <div class="flex gap-3">
            <Button variant="ghost" full-width @click="showConfirmModal = false" :disabled="submitting">Cancel</Button>
            <Button variant="primary" full-width @click="createTransportRequest" :loading="submitting">OK</Button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Car, Star, ChevronRight, Check, MapPin } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
  SkeletonLoader,
  EmptyState,
  Modal,
  useToast,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import ReviewsSection from '@/components/reviews/ReviewsSection.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const transport = ref<any>(null);
const showLoginModal = ref(false);
const showConfirmModal = ref(false);
const submitting = ref(false);
const cities = ref<any[]>([]);

function getTransportImageUrl(transport: any): string | null {
  if (transport?.coverAsset) {
    return transport.coverAsset.thumbnail_url || transport.coverAsset.public_url || null;
  }
  return null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

async function loadTransport() {
  loading.value = true;
  try {
    const transportId = route.params.id as string;
    const response = await axios.get(`/api/public/catalog/transport/${transportId}`);
    transport.value = response.data;
    
    // Load cities for service request
    try {
      const citiesResponse = await axios.get('/api/public/cities');
      cities.value = citiesResponse.data || [];
    } catch (e) {
      cities.value = [];
    }
  } catch (error: any) {
    console.error('Failed to load transport:', error);
    if (error.response?.status === 404) {
      transport.value = null;
    }
  } finally {
    loading.value = false;
  }
}

function handleRequestTransport() {
  if (!authStore.isAuthenticated) {
    showLoginModal.value = true;
    return;
  }
  showConfirmModal.value = true;
}

async function createTransportRequest() {
  if (!authStore.isAuthenticated || !transport.value) return;
  
  submitting.value = true;
  try {
    const cityId = cities.value.length > 0 ? cities.value[0].id : null;
    
    await axios.post('/api/public/service-request', {
      category_key: 'transport',
      city_id: cityId || transport.value.city_id,
      customer_name: authStore.user?.email?.split('@')[0] || authStore.user?.phone || 'User',
      phone: authStore.user?.phone || '',
      email: authStore.user?.email || null,
      request_payload: {
        transport_id: transport.value.id,
        transport_name: transport.value.name || transport.value.type,
        vehicle_type: transport.value.vehicle_type,
        price_per_km: transport.value.price_per_km,
      },
    });

    toast.success('Request submitted successfully! We will contact you within 1 hour.');
    showConfirmModal.value = false;
  } catch (error: any) {
    console.error('Failed to create transport request:', error);
    toast.error(error.response?.data?.error || 'Failed to submit request');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadTransport();
});
</script>



