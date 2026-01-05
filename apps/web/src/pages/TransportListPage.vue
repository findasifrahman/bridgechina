<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50">
    <!-- Hero Banner -->
    <div class="relative bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 overflow-hidden">
      <div class="absolute inset-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3"
          alt="Transport"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex-1 text-center md:text-left text-white">
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
              Transport Services
            </h1>
            <p class="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md">
              Safe, reliable, and comfortable transportation across China
            </p>
            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🚗 Airport Pickup
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🚕 Point to Point
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🚙 Full Day Charter
              </Badge>
            </div>
          </div>
          <div class="flex-shrink-0">
            <div class="relative w-32 h-32 md:w-40 md:h-40">
              <Car class="w-full h-full text-white drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Filter Bar -->
      <Card class="mb-8 shadow-lg border-2 border-blue-200">
        <CardBody class="p-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Filter by City</label>
                <Select
                  v-model="selectedCityId"
                  :options="cityOptions"
                  placeholder="All Cities"
                  class="w-full"
                  @update:model-value="loadTransports"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Vehicle Type</label>
                <Select
                  v-model="selectedType"
                  :options="typeOptions"
                  placeholder="All Types"
                  class="w-full"
                  @update:model-value="loadTransports"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                <Select
                  v-model="sortBy"
                  :options="sortOptions"
                  placeholder="Sort by"
                  class="w-full"
                  @update:model-value="loadTransports"
                />
              </div>
            </div>
            <div v-if="transports.length > 0" class="text-sm text-slate-600 whitespace-nowrap">
              {{ transports.length }} {{ transports.length === 1 ? 'service' : 'services' }} found
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader v-for="i in 6" :key="i" class="h-80" />
      </div>

      <!-- Empty State -->
      <div v-else-if="transports.length === 0" class="text-center py-12">
        <EmptyState
          title="No transport services found"
          description="Try adjusting your filters or check back later"
        />
      </div>

      <!-- Transport List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          v-for="transport in transports"
          :key="transport.id"
          class="cursor-pointer group hover:shadow-xl transition-all duration-300"
          @click="router.push(`/services/transport/${transport.id}`)"
        >
          <div class="relative aspect-[4/3] bg-slate-200 rounded-t-2xl overflow-hidden">
            <img
              v-if="getTransportImageUrl(transport)"
              :src="getTransportImageUrl(transport)"
              :alt="transport.name || transport.type"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              @error="handleImageError"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
              <Car class="h-16 w-16 text-blue-400" />
            </div>
            <div v-if="transport.verified" class="absolute top-2 right-2">
              <Badge variant="success" size="sm">Verified</Badge>
            </div>
            <div v-if="transport.rating" class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
              <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
              <span class="text-sm font-semibold">{{ transport.rating.toFixed(1) }}</span>
            </div>
          </div>
          <CardBody class="p-4">
            <h3 class="font-semibold text-lg text-slate-900 mb-2">{{ transport.name || transport.type || 'Transport Service' }}</h3>
            <p v-if="transport.description" class="text-sm text-slate-600 mb-3 line-clamp-2">{{ transport.description }}</p>
            <div class="flex items-center justify-between mb-3">
              <div v-if="transport.city" class="flex items-center gap-1 text-sm text-slate-500">
                <MapPin class="h-4 w-4" />
                <span>{{ transport.city.name }}</span>
              </div>
              <div v-if="transport.price_per_km" class="text-sm font-semibold text-blue-600">
                ¥{{ transport.price_per_km }}/km
              </div>
            </div>
            <div v-if="transport.vehicle_type" class="mb-3">
              <Badge variant="secondary" size="sm">{{ transport.vehicle_type }}</Badge>
            </div>
            <Button variant="primary" size="sm" class="w-full" @click.stop="router.push(`/services/transport/${transport.id}`)">
              View Details
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Car, MapPin, Star } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Select,
  Button,
  Badge,
  SkeletonLoader,
  EmptyState,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const router = useRouter();

const transports = ref<any[]>([]);
const cities = ref<any[]>([]);
const loading = ref(true);
const selectedCityId = ref('');
const selectedType = ref('');
const sortBy = ref('name');

const cityOptions = computed(() => [
  { value: '', label: 'All Cities' },
  ...cities.value.map(c => ({ value: c.id, label: c.name })),
]);

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'bus', label: 'Bus' },
  { value: 'luxury', label: 'Luxury' },
];

const sortOptions = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'rating', label: 'Rating (High to Low)' },
  { value: 'price', label: 'Price (Low to High)' },
];

function getTransportImageUrl(transport: any): string | null {
  if (transport.coverAsset?.thumbnail_url) return transport.coverAsset.thumbnail_url;
  if (transport.coverAsset?.public_url) return transport.coverAsset.public_url;
  return null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

async function loadCities() {
  try {
    const response = await axios.get('/api/public/catalog/cities');
    cities.value = response.data || [];
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
}

async function loadTransports() {
  loading.value = true;
  try {
    const params: any = {};
    if (selectedCityId.value) params.city_id = selectedCityId.value;
    if (selectedType.value) params.type = selectedType.value;
    
    const response = await axios.get('/api/public/catalog/transport', { params });
    let data = response.data || [];
    
    // Sort
    if (sortBy.value === 'name') {
      data.sort((a: any, b: any) => (a.name || a.type || '').localeCompare(b.name || b.type || ''));
    } else if (sortBy.value === 'rating') {
      data.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy.value === 'price') {
      data.sort((a: any, b: any) => (a.price_per_km || 0) - (b.price_per_km || 0));
    }
    
    transports.value = data;
  } catch (error) {
    console.error('Failed to load transports:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadCities();
  await loadTransports();
});
</script>



