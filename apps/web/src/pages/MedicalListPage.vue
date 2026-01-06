<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-red-50">
    <!-- Hero Banner -->
    <div class="relative bg-gradient-to-br from-red-500 via-pink-600 to-rose-600 overflow-hidden">
      <div class="absolute inset-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3"
          alt="Medical Help"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex-1 text-center md:text-left text-white">
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
              Medical Help
            </h1>
            <p class="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md">
              Trusted medical centers with multilingual support in China
            </p>
            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🏥 Hospital
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                💊 Clinic
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🚑 Emergency
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🌐 Multilingual
              </Badge>
            </div>
          </div>
          <div class="flex-shrink-0">
            <div class="relative w-32 h-32 md:w-40 md:h-40">
              <HeartPulse class="w-full h-full text-white drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Filter Bar -->
      <Card class="mb-8 shadow-lg border-2 border-red-200">
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
                  @update:model-value="loadMedicalCenters"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Medical Type</label>
                <Select
                  v-model="selectedType"
                  :options="typeOptions"
                  placeholder="All Types"
                  class="w-full"
                  @update:model-value="loadMedicalCenters"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                <Select
                  v-model="sortBy"
                  :options="sortOptions"
                  placeholder="Sort by"
                  class="w-full"
                  @update:model-value="loadMedicalCenters"
                />
              </div>
            </div>
            <div v-if="medicalCenters.length > 0" class="text-sm text-slate-600 whitespace-nowrap">
              {{ medicalCenters.length }} {{ medicalCenters.length === 1 ? 'center' : 'centers' }} found
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader v-for="i in 6" :key="i" class="h-80" />
      </div>

      <!-- Empty State -->
      <div v-else-if="medicalCenters.length === 0" class="text-center py-12">
        <EmptyState
          title="No medical centers found"
          description="Try adjusting your filters or check back later"
        />
      </div>

      <!-- Medical Centers List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          v-for="center in medicalCenters"
          :key="center.id"
          class="cursor-pointer group hover:shadow-xl transition-all duration-300"
          @click="router.push(`/services/medical/${center.id}`)"
        >
          <div class="relative aspect-[4/3] bg-slate-200 rounded-t-2xl overflow-hidden">
            <img
              v-if="getMedicalImageUrl(center)"
              :src="getMedicalImageUrl(center)"
              :alt="center.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              @error="handleImageError"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-100 to-pink-100">
              <HeartPulse class="h-16 w-16 text-red-400" />
            </div>
            <div v-if="center.verified" class="absolute top-2 right-2">
              <Badge variant="success" size="sm">Verified</Badge>
            </div>
            <div v-if="center.emergency_available" class="absolute top-2 left-2">
              <Badge variant="accent" size="sm" class="bg-red-500 text-white">24/7 Emergency</Badge>
            </div>
            <div v-if="center.rating" class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
              <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
              <span class="text-sm font-semibold">{{ center.rating.toFixed(1) }}</span>
            </div>
          </div>
          <CardBody class="p-4">
            <h3 class="font-semibold text-lg text-slate-900 mb-2">{{ center.name }}</h3>
            <p v-if="center.description" class="text-sm text-slate-600 mb-3 line-clamp-2">{{ center.description }}</p>
            <div class="flex items-center justify-between mb-3">
              <div v-if="center.city" class="flex items-center gap-1 text-sm text-slate-500">
                <MapPin class="h-4 w-4" />
                <span>{{ center.city.name }}</span>
              </div>
              <div v-if="center.type" class="text-sm font-semibold text-red-600">
                {{ center.type }}
              </div>
            </div>
            <div v-if="center.languages && Array.isArray(center.languages) && center.languages.length > 0" class="mb-3 flex flex-wrap gap-1">
              <Badge
                v-for="lang in (center.languages as string[]).slice(0, 3)"
                :key="lang"
                variant="secondary"
                size="xs"
              >
                {{ lang }}
              </Badge>
            </div>
            <Button variant="primary" size="sm" class="w-full" @click.stop="router.push(`/services/medical/${center.id}`)">
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
import { HeartPulse, MapPin, Star } from 'lucide-vue-next';
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
const medicalCenters = ref<any[]>([]);
const cities = ref<any[]>([]);
const selectedCityId = ref('');
const selectedType = ref('');
const sortBy = ref('name');

const cityOptions = computed(() => [
  { value: '', label: 'All Cities' },
  ...cities.value.map((city: any) => ({
    value: city.id,
    label: city.name,
  })),
]);

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Clinic', label: 'Clinic' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Specialist', label: 'Specialist' },
  { value: 'Dental', label: 'Dental' },
];

const sortOptions = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'rating', label: 'Rating (High to Low)' },
  { value: 'city', label: 'City' },
];

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data || [];
  } catch (error) {
    console.error('Failed to load cities', error);
  }
}

async function loadMedicalCenters() {
  loading.value = true;
  try {
    const params: any = {};
    if (selectedCityId.value) params.city_id = selectedCityId.value;
    if (selectedType.value) params.type = selectedType.value;

    const response = await axios.get('/api/public/catalog/medical', { params });
    let centers = response.data || [];

    // Apply sorting
    if (sortBy.value === 'name') {
      centers.sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (sortBy.value === 'rating') {
      centers.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy.value === 'city') {
      centers.sort((a: any, b: any) => (a.city?.name || '').localeCompare(b.city?.name || ''));
    }

    medicalCenters.value = centers;
  } catch (error) {
    console.error('Failed to load medical centers', error);
    medicalCenters.value = [];
  } finally {
    loading.value = false;
  }
}

function getMedicalImageUrl(center: any): string | null {
  if (center.coverAsset) {
    return center.coverAsset.thumbnail_url || center.coverAsset.public_url || null;
  }
  return null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

onMounted(async () => {
  await loadCities();
  await loadMedicalCenters();
});
</script>




