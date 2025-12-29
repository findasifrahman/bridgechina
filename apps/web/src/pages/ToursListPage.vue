<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Search/Filter Bar -->
    <Card class="mb-6">
      <CardBody class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">City</label>
            <Select
              v-model="filters.city_id"
              :options="cityOptions"
              placeholder="All Cities"
              @update:model-value="loadTours"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Duration</label>
            <Select
              v-model="filters.duration"
              :options="durationOptions"
              placeholder="Any Duration"
              @update:model-value="loadTours"
            />
          </div>
          <div class="flex items-end">
            <Button variant="primary" @click="loadTours" class="w-full">Search</Button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Results -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" class="h-80" />
    </div>

    <div v-else-if="tours.length === 0" class="text-center py-12">
      <EmptyState
        title="No tours found"
        description="Try adjusting your filters or check back later"
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="tour in tours"
        :key="tour.id"
        class="cursor-pointer group"
        :hover="true"
        @click="router.push(`/services/tours/${tour.id}`)"
      >
        <div class="relative aspect-video bg-slate-200 rounded-t-2xl overflow-hidden">
          <img
            v-if="tour.coverAsset?.thumbnail_url || tour.coverAsset?.public_url"
            :src="tour.coverAsset?.thumbnail_url || tour.coverAsset?.public_url"
            :alt="tour.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
            <MapPin class="h-12 w-12 text-teal-400" />
          </div>
        </div>
        <CardBody class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2">{{ tour.name }}</h3>
          <p class="text-xs text-slate-600 mb-2">{{ tour.city?.name }}</p>
          <div class="flex items-center justify-between mb-2">
            <div v-if="tour.duration_days" class="text-xs text-slate-500">
              {{ tour.duration_days }} {{ tour.duration_days === 1 ? 'Day' : 'Days' }}
            </div>
            <div v-if="tour.price_from" class="text-sm font-semibold text-teal-600">
              From ¥{{ tour.price_from }}
            </div>
          </div>
          <div v-if="tour.highlights && Array.isArray(tour.highlights) && tour.highlights.length > 0" class="mb-2">
            <p class="text-xs text-slate-600 line-clamp-2">
              {{ (tour.highlights as string[]).slice(0, 2).join(' • ') }}
            </p>
          </div>
          <Button variant="primary" size="sm" class="w-full mt-2" @click.stop="handleBookTour(tour)">
            Book Tour
          </Button>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MapPin } from 'lucide-vue-next';
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

