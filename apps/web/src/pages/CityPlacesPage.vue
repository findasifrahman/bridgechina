<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50">
    <!-- Hero Banner with Pandas and Chinese Buildings -->
    <div class="relative bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 overflow-hidden">
      <div class="absolute inset-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Chinese Architecture"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex-1 text-center md:text-left text-white">
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
              Discover Amazing Places
            </h1>
            <p class="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md">
              Explore China's most beautiful attractions and cultural sites
            </p>
            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🐼 Family Friendly
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🏛️ Cultural Sites
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                📸 Photo Spots
              </Badge>
            </div>
          </div>
          <div class="flex-shrink-0">
            <div class="relative w-32 h-32 md:w-40 md:h-40">
              <img
                src="https://images.unsplash.com/photo-1528164344700-43e30c1a156c?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3"
                alt="Panda"
                class="w-full h-full object-contain drop-shadow-2xl"
                @error="handlePandaImageError"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Filter Bar -->
      <Card class="mb-8 shadow-lg border-2 border-teal-200">
        <CardBody class="p-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Filter by City</label>
                <Select
                  v-model="selectedCityId"
                  :options="cityOptions"
                  placeholder="All Cities"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                <Select
                  v-model="sortBy"
                  :options="sortOptions"
                  placeholder="Sort by"
                  class="w-full"
                />
              </div>
            </div>
            <div v-if="places.length > 0" class="text-sm text-slate-600 whitespace-nowrap">
              {{ places.length }} {{ places.length === 1 ? 'place' : 'places' }} found
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader v-for="i in 6" :key="i" class="h-96" />
      </div>

      <!-- Empty State -->
      <div v-else-if="places.length === 0" class="text-center py-16">
        <EmptyState
          title="No places found"
          description="Try selecting a different city or check back later."
        >
          <template #action>
            <Button variant="primary" @click="selectedCityId = ''">View All Places</Button>
          </template>
        </EmptyState>
      </div>

      <!-- Places Grid - Wider Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CityPlaceCard
          v-for="place in sortedPlaces"
          :key="place.id"
          :place="place"
          @view="(p) => router.push(`/places/${p.slug || p.id}`)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Select,
  SkeletonLoader,
  EmptyState,
  Button,
  Card,
  CardBody,
  Badge,
} from '@bridgechina/ui';
import CityPlaceCard from '@/components/CityPlaceCard.vue';

const router = useRouter();
const toast = useToast();

const places = ref<any[]>([]);
const cities = ref<any[]>([]);
const loading = ref(true);
const selectedCityId = ref<string>('');
const sortBy = ref<string>('popular');

const cityOptions = computed(() => [
  { value: '', label: 'All Cities' },
  ...cities.value.map(c => ({ value: c.id, label: c.name })),
]);

const sortOptions = [
  { value: 'popular', label: 'Popular (Rating)' },
  { value: 'newest', label: 'Newest' },
  { value: 'family', label: 'Family Friendly' },
];

const city = computed(() => {
  if (!selectedCityId.value) return null;
  return cities.value.find(c => c.id === selectedCityId.value);
});

const sortedPlaces = computed(() => {
  let result = [...places.value];
  
  switch (sortBy.value) {
    case 'popular':
      result.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));
      break;
    case 'newest':
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'family':
      result = result.filter(p => p.is_family_friendly);
      result.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));
      break;
  }
  
  return result;
});

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data;
  } catch (error) {
    console.error('Failed to load cities', error);
  }
}

async function loadPlaces() {
  loading.value = true;
  try {
    const params: any = {};
    if (selectedCityId.value) {
      params.city_id = selectedCityId.value;
    }
    const response = await axios.get('/api/public/catalog/cityplaces', { params });
    places.value = response.data;
  } catch (error) {
    console.error('Failed to load places', error);
    toast.error('Failed to load places');
  } finally {
    loading.value = false;
  }
}

watch(selectedCityId, () => {
  loadPlaces();
});

function handlePandaImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  // Fallback to a different panda image or emoji
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjgwIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iMTAwIiB5PSIxMjAiIGZvbnQtc2l6ZT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfkYQ8L3RleHQ+PC9zdmc+';
}

onMounted(async () => {
  await loadCities();
  await loadPlaces();
});
</script>






