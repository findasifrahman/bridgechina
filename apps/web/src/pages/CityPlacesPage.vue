<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        :title="city ? `Places in ${city.name}` : 'City Places'"
        :subtitle="city ? 'Discover amazing places to visit' : 'Explore tourist attractions and places'"
      >
        <template #actions>
          <div class="flex gap-3">
            <Select
              v-model="sortBy"
              :options="sortOptions"
              placeholder="Sort by"
              class="w-40"
            />
            <Select
              v-model="selectedCityId"
              :options="cityOptions"
              placeholder="Filter by city"
              class="w-48"
            />
          </div>
        </template>
      </PageHeader>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        <SkeletonLoader v-for="i in 8" :key="i" class="h-80" />
      </div>

      <div v-else-if="places.length === 0" class="text-center py-12 mt-8">
        <EmptyState
          title="No places found"
          description="Try selecting a different city or check back later."
        >
          <template #action>
            <Button variant="primary" @click="selectedCityId = ''">View All Places</Button>
          </template>
        </EmptyState>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8 items-start">
        <CityPlaceCard
          v-for="place in sortedPlaces"
          :key="place.id"
          :place="place"
          @view="(p) => router.push(`/places/${p.id}`)"
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

onMounted(async () => {
  await loadCities();
  await loadPlaces();
});
</script>






