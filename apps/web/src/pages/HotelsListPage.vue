<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Search/Filter Bar -->
    <Card class="mb-6">
      <CardBody class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">City</label>
            <Select
              v-model="filters.city_id"
              :options="cityOptions"
              placeholder="All Cities"
              @update:model-value="loadHotels"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Price Range</label>
            <Select
              v-model="filters.price_range"
              :options="priceRangeOptions"
              placeholder="Any Price"
              @update:model-value="loadHotels"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Rating</label>
            <Select
              v-model="filters.min_rating"
              :options="ratingOptions"
              placeholder="Any Rating"
              @update:model-value="loadHotels"
            />
          </div>
          <div class="flex items-end">
            <Button variant="primary" @click="loadHotels" class="w-full">Search</Button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Results -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" class="h-64" />
    </div>

    <div v-else-if="hotels.length === 0" class="text-center py-12">
      <EmptyState
        title="No hotels found"
        description="Try adjusting your filters or search criteria"
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="hotel in hotels"
        :key="hotel.id"
        class="cursor-pointer group"
        :hover="true"
        @click="router.push(`/services/hotel/${hotel.id}`)"
      >
        <div class="relative aspect-video bg-slate-200 rounded-t-2xl overflow-hidden">
          <img
            v-if="getHotelImageUrl(hotel)"
            :src="getHotelImageUrl(hotel)"
            :alt="hotel.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            @error="handleImageError"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
            <Hotel class="h-12 w-12 text-teal-400" />
          </div>
          <div v-if="hotel.verified" class="absolute top-2 right-2">
            <Badge variant="success" size="sm">Verified</Badge>
          </div>
        </div>
        <CardBody class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1 line-clamp-1">{{ hotel.name }}</h3>
          <p class="text-xs text-slate-600 mb-2">{{ hotel.city?.name }}</p>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div v-if="hotel.rating" class="flex items-center gap-1">
                <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
                <span class="text-xs font-medium">{{ hotel.rating.toFixed(1) }}</span>
              </div>
              <div v-if="hotel.star_rating" class="flex items-center gap-1">
                <span class="text-xs text-slate-500">{{ '⭐'.repeat(hotel.star_rating) }}</span>
              </div>
            </div>
            <div v-if="hotel.price_from" class="text-sm font-semibold text-teal-600">
              From ¥{{ hotel.price_from }}
            </div>
          </div>
          <div v-if="hotel.amenities && Array.isArray(hotel.amenities) && hotel.amenities.length > 0" class="flex flex-wrap gap-1 mt-2">
            <Badge
              v-for="amenity in (hotel.amenities as string[]).slice(0, 3)"
              :key="amenity"
              variant="secondary"
              size="xs"
            >
              {{ amenity }}
            </Badge>
          </div>
          <Button variant="primary" size="sm" class="w-full mt-3" @click.stop="handleRequestBooking(hotel)">
            Request Booking
          </Button>
        </CardBody>
      </Card>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Hotel, Star } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Select,
  Badge,
  SkeletonLoader,
  EmptyState,
  Pagination,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const hotels = ref<any[]>([]);
const cities = ref<any[]>([]);
const currentPage = ref(1);
const totalPages = ref(1);

const filters = ref({
  city_id: route.query.city as string || '',
  price_range: route.query.price_range as string || '',
  min_rating: route.query.rating as string || '',
});

const cityOptions = ref<any[]>([]);
const priceRangeOptions = [
  { value: '', label: 'Any Price' },
  { value: '0-200', label: '¥0 - ¥200' },
  { value: '200-500', label: '¥200 - ¥500' },
  { value: '500-1000', label: '¥500 - ¥1000' },
  { value: '1000+', label: '¥1000+' },
];

const ratingOptions = [
  { value: '', label: 'Any Rating' },
  { value: '4', label: '4+ Stars' },
  { value: '4.5', label: '4.5+ Stars' },
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

async function loadHotels() {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: 12,
    };
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    if (filters.value.min_rating) params.min_rating = filters.value.min_rating;
    if (filters.value.price_range) {
      const [min, max] = filters.value.price_range.split('-');
      if (min) params.price_min = min;
      if (max && max !== '+') params.price_max = max;
      if (max === '+') params.price_min = '1000';
    }

    const response = await axios.get('/api/public/catalog/hotels', { params });
    const data = response.data || [];
    // coverAsset is already included in the API response
    hotels.value = data;
    totalPages.value = 1; // API doesn't paginate yet
  } catch (error) {
    console.error('Failed to load hotels', error);
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadHotels();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getHotelImageUrl(hotel: any): string | null {
  if (!hotel.coverAsset) return null;
  
  // Use proxied media endpoint to avoid CORS issues
  if (hotel.coverAsset.id) {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    // On localhost: use relative URL (Vite proxy handles it)
    // On Vercel: use absolute URL with Railway backend
    if (apiUrl) {
      return `${apiUrl}/api/public/media/${hotel.coverAsset.id}`;
    }
    return `/api/public/media/${hotel.coverAsset.id}`;
  }
  
  // Fallback to direct URLs if no ID
  return hotel.coverAsset.thumbnail_url || hotel.coverAsset.public_url || null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function handleRequestBooking(hotel: any) {
  router.push({
    path: '/request',
    query: {
      category: 'hotel',
      hotel_id: hotel.id,
      hotel_name: hotel.name,
    },
  });
}

onMounted(async () => {
  await loadCities();
  await loadHotels();
});
</script>

