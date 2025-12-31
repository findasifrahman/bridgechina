<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-purple-50">
    <!-- Hero Banner -->
    <div class="relative bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 overflow-hidden">
      <div class="absolute inset-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3"
          alt="Tours"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex-1 text-center md:text-left text-white">
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
              Tours & Experiences
            </h1>
            <p class="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md">
              Curated tours and unforgettable experiences across China
            </p>
            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🗺️ City Tours
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🏛️ Cultural
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🍜 Food Tours
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                📸 Photo Tours
              </Badge>
            </div>
          </div>
          <div class="flex-shrink-0">
            <div class="relative w-32 h-32 md:w-40 md:h-40">
              <MapPin class="w-full h-full text-white drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Filter Bar -->
      <Card class="mb-8 shadow-lg border-2 border-purple-200">
        <CardBody class="p-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Filter by City</label>
                <Select
                  v-model="filters.city_id"
                  :options="cityOptions"
                  placeholder="All Cities"
                  class="w-full"
                  @update:model-value="loadTours"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                <Select
                  v-model="filters.duration"
                  :options="durationOptions"
                  placeholder="Any Duration"
                  class="w-full"
                  @update:model-value="loadTours"
                />
              </div>
              <div class="flex items-end">
                <Button variant="primary" @click="loadTours" class="w-full">Search</Button>
              </div>
            </div>
            <div v-if="tours.length > 0" class="text-sm text-slate-600 whitespace-nowrap">
              {{ tours.length }} {{ tours.length === 1 ? 'tour' : 'tours' }} found
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader v-for="i in 6" :key="i" class="h-80" />
      </div>

      <!-- Empty State -->
      <div v-else-if="tours.length === 0" class="text-center py-12">
        <EmptyState
          title="No tours found"
          description="Try adjusting your filters or check back later"
        />
      </div>

      <!-- Tours List with Framed Images -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="tour in tours"
          :key="tour.id"
          class="cursor-pointer group"
          @click="router.push(`/services/tours/${tour.id}`)"
        >
          <!-- Framed Image Card -->
          <Card class="h-full hover:shadow-xl transition-all duration-300">
            <div class="relative bg-white p-3 rounded-t-2xl">
              <div class="relative aspect-video bg-slate-200 rounded-lg overflow-hidden">
                <img
                  v-if="tour.coverAsset?.thumbnail_url || tour.coverAsset?.public_url"
                  :src="tour.coverAsset?.thumbnail_url || tour.coverAsset?.public_url"
                  :alt="tour.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  @error="handleImageError"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100">
                  <MapPin class="h-16 w-16 text-purple-400" />
                </div>
                <div v-if="tour.rating" class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                  <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span class="text-sm font-semibold">{{ tour.rating.toFixed(1) }}</span>
                </div>
              </div>
            </div>
            <CardBody class="p-4">
              <h3 class="font-semibold text-lg text-slate-900 mb-2 line-clamp-2">{{ tour.name }}</h3>
              <p v-if="tour.city?.name" class="text-xs text-slate-600 mb-3 flex items-center gap-1">
                <MapPin class="h-3 w-3" />
                <span>{{ tour.city.name }}</span>
              </p>
              <div class="flex items-center justify-between mb-3">
                <div v-if="tour.duration_days" class="text-sm text-slate-600">
                  {{ tour.duration_days }} {{ tour.duration_days === 1 ? 'Day' : 'Days' }}
                </div>
                <div v-if="tour.price_from" class="text-lg font-bold text-purple-600">
                  From ¥{{ tour.price_from }}
                </div>
              </div>
              <div v-if="tour.highlights && Array.isArray(tour.highlights) && tour.highlights.length > 0" class="mb-3">
                <p class="text-xs text-slate-600 line-clamp-2">
                  {{ (tour.highlights as string[]).slice(0, 2).join(' • ') }}
                </p>
              </div>
              <Button variant="primary" size="sm" class="w-full" @click.stop="handleBookTour(tour)">
                Book Tour
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MapPin, Star } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Select,
  Badge,
  SkeletonLoader,
  EmptyState,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const router = useRouter();

const loading = ref(true);
const tours = ref<any[]>([]);
const cities = ref<any[]>([]);

const filters = ref({
  city_id: '',
  duration: '',
});

const cityOptions = ref<any[]>([]);
const durationOptions = [
  { value: '', label: 'Any Duration' },
  { value: '1', label: '1 Day' },
  { value: '2', label: '2 Days' },
  { value: '3', label: '3 Days' },
  { value: '4+', label: '4+ Days' },
];

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data || [];
    cityOptions.value = [
      { value: '', label: 'All Cities' },
      ...cities.value.map((city: any) => ({
        value: city.id,
        label: city.name,
      })),
    ];
  } catch (error) {
    console.error('Failed to load cities', error);
  }
}

async function loadTours() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    if (filters.value.duration) {
      if (filters.value.duration === '4+') {
        params.duration_min = 4;
      } else {
        params.duration_days = filters.value.duration;
      }
    }

    const response = await axios.get('/api/public/catalog/tours', { params });
    tours.value = response.data || [];
  } catch (error) {
    console.error('Failed to load tours', error);
  } finally {
    loading.value = false;
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function handleBookTour(tour: any) {
  router.push({
    path: '/request',
    query: {
      category: 'tour',
      tour_id: tour.id,
      tour_name: tour.name,
    },
  });
}

onMounted(async () => {
  await loadCities();
  await loadTours();
});
</script>
