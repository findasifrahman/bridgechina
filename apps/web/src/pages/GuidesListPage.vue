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
              @update:model-value="loadGuides"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Language</label>
            <Select
              v-model="filters.language"
              :options="languageOptions"
              placeholder="Any Language"
              @update:model-value="loadGuides"
            />
          </div>
          <div class="flex items-end">
            <Button variant="primary" @click="loadGuides" class="w-full">Search</Button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Results -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" class="h-80" />
    </div>

    <div v-else-if="guides.length === 0" class="text-center py-12">
      <EmptyState
        title="No guides found"
        description="Try adjusting your filters or check back later"
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="guide in guides"
        :key="guide.id"
        class="cursor-pointer group"
        :hover="true"
        @click="router.push(`/services/guide/${guide.user_id}`)"
      >
        <div class="relative aspect-square bg-slate-200 rounded-t-2xl overflow-hidden">
          <img
            v-if="getGuideImageUrl(guide)"
            :src="getGuideImageUrl(guide)"
            :alt="guide.name || 'Guide'"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            @error="handleImageError"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
            <User class="h-12 w-12 text-teal-400" />
          </div>
          <div v-if="guide.verified" class="absolute top-2 right-2">
            <Badge variant="success" size="sm">Verified</Badge>
          </div>
        </div>
        <CardBody class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1">{{ guide.display_name || guide.name || 'Guide' }}</h3>
          <p v-if="guide.bio" class="text-xs text-slate-600 mb-2 line-clamp-2">{{ guide.bio }}</p>
          <div class="flex items-center justify-between mb-2">
            <div v-if="guide.rating" class="flex items-center gap-1">
              <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
              <span class="text-xs font-medium">{{ guide.rating.toFixed(1) }}</span>
            </div>
            <div v-if="guide.hourly_rate" class="text-sm font-semibold text-teal-600">
              ¥{{ guide.hourly_rate }}/hr
            </div>
          </div>
          <div v-if="guide.languages && Array.isArray(guide.languages) && guide.languages.length > 0" class="flex flex-wrap gap-1 mb-2">
            <Badge
              v-for="lang in (guide.languages as string[]).slice(0, 3)"
              :key="lang"
              variant="secondary"
              size="xs"
            >
              {{ lang }}
            </Badge>
          </div>
          <Button variant="primary" size="sm" class="w-full mt-2" @click.stop="handleRequestGuide(guide)">
            Request Guide
          </Button>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { User, Star } from 'lucide-vue-next';
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
const guides = ref<any[]>([]);
const cities = ref<any[]>([]);

const filters = ref({
  city_id: '',
  language: '',
});

const cityOptions = ref<any[]>([]);
const languageOptions = [
  { value: '', label: 'Any Language' },
  { value: 'English', label: 'English' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Malay', label: 'Malay' },
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

async function loadGuides() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    if (filters.value.language) params.language = filters.value.language;

    // Try public endpoint, fallback gracefully
    try {
      const response = await axios.get('/api/public/catalog/guides', { params });
      guides.value = response.data || [];
    } catch (e) {
      // Endpoint may not exist yet, use empty array
      guides.value = [];
    }
  } catch (error) {
    console.error('Failed to load guides', error);
  } finally {
    loading.value = false;
  }
}

function getGuideImageUrl(guide: any): string | null {
  // Use coverAsset URLs (direct R2 URLs)
  if (guide.coverAsset) {
    return guide.coverAsset.thumbnail_url || guide.coverAsset.public_url || null;
  }
  // Fallback to profile_photo_url if it exists
  return guide.profile_photo_url || null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function handleRequestGuide(guide: any) {
  router.push({
    path: '/request',
    query: {
      category: 'guide',
      guide_id: guide.user_id,
      guide_name: guide.display_name || guide.name,
    },
  });
}

onMounted(async () => {
  await loadCities();
  await loadGuides();
});
</script>

