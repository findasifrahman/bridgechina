<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Search Bar with Tabs -->
    <Card class="mb-6">
      <CardBody class="p-4">
        <!-- Mode Tabs -->
        <div class="flex gap-2 mb-4 border-b border-slate-200">
          <button
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              searchMode === 'city'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            ]"
            @click="searchMode = 'city'; searchQuery = 'Guangzhou'; performSearch()"
          >
            Guangzhou (City)
          </button>
          <button
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              searchMode === 'name'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            ]"
            @click="searchMode = 'name'; searchQuery = ''; performSearch()"
          >
            Hotel Name
          </button>
        </div>

        <!-- Search Inputs -->
        <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-slate-700 mb-1">
              {{ searchMode === 'city' ? 'Destination' : 'Hotel Name' }}
            </label>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchMode === 'city' ? 'Guangzhou' : 'Enter hotel name...'"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              @keyup.enter="performSearch"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Check-in</label>
            <input
              v-model="checkin"
              type="date"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Check-out</label>
            <input
              v-model="checkout"
              type="date"
              :min="checkin || undefined"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Guests/Rooms</label>
            <select
              v-model="occupancy"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="1-1">1 Guest, 1 Room</option>
              <option value="2-1">2 Guests, 1 Room</option>
              <option value="2-2">2 Guests, 2 Rooms</option>
              <option value="4-2">4 Guests, 2 Rooms</option>
            </select>
          </div>
          <div class="flex items-end">
            <Button variant="primary" @click="performSearch" class="w-full">Search</Button>
          </div>
        </div>

        <!-- Blocked Message -->
        <div v-if="blockedExternal && blockedReason" class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-sm text-amber-800">{{ blockedReason }}</p>
        </div>
        <div v-else-if="blockedReason && !blockedExternal" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">{{ blockedReason }}</p>
        </div>
      </CardBody>
    </Card>

    <!-- Filters (Client-side) -->
    <Card v-if="allHotels.length > 0" class="mb-6">
      <CardBody class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Price Range</label>
            <Select
              v-model="clientFilters.priceRange"
              :options="priceRangeOptions"
              placeholder="Any Price"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Star Rating</label>
            <Select
              v-model="clientFilters.starRating"
              :options="starRatingOptions"
              placeholder="Any Rating"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Free Cancellation</label>
            <Select
              v-model="clientFilters.freeCancellation"
              :options="cancellationOptions"
              placeholder="All"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Breakfast Included</label>
            <Select
              v-model="clientFilters.breakfast"
              :options="breakfastOptions"
              placeholder="All"
            />
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Results -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" class="h-64" />
    </div>

    <div v-else-if="filteredHotels.length === 0" class="text-center py-12">
      <EmptyState
        title="No hotels found"
        description="Try adjusting your filters or search criteria"
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="hotel in filteredHotels"
        :key="`${hotel.source || 'internal'}-${hotel.id}`"
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
          <div class="absolute top-2 right-2 flex gap-2">
            <Badge v-if="hotel.source === 'internal' && hotel.verified" variant="success" size="sm">Verified</Badge>
            <Badge v-else-if="hotel.source === 'external'" variant="primary" size="sm">Booking.com</Badge>
          </div>
        </div>
        <CardBody class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1 line-clamp-1">{{ hotel.name }}</h3>
          <p class="text-xs text-slate-600 mb-2">{{ hotel.city?.name || hotel.city }}</p>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div v-if="hotel.review_score || hotel.rating" class="flex items-center gap-1">
                <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
                <span class="text-xs font-medium">{{ (hotel.review_score || hotel.rating)?.toFixed(1) }}</span>
              </div>
              <div v-if="hotel.star_rating" class="flex items-center gap-1">
                <span class="text-xs text-slate-500">{{ '⭐'.repeat(hotel.star_rating) }}</span>
              </div>
            </div>
            <div v-if="hotel.price_from || hotel.gross_price" class="text-sm font-semibold text-teal-600">
              From {{ hotel.currency || 'CNY' === 'CNY' ? '¥' : hotel.currency }} {{ hotel.price_from || hotel.gross_price }}
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
            {{ hotel.source === 'external' ? 'View Details' : 'Request Booking' }}
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
import { ref, computed, onMounted } from 'vue';
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
const internalHotels = ref<any[]>([]);
const externalHotels = ref<any[]>([]);
const blockedExternal = ref(false);
const blockedReason = ref('');
const currentPage = ref(1);
const totalPages = ref(1);

const searchMode = ref<'city' | 'name'>('city');
const searchQuery = ref('Guangzhou');
const checkin = ref('');
const checkout = ref('');
const occupancy = ref('2-1');

const clientFilters = ref({
  priceRange: '',
  starRating: '',
  freeCancellation: '',
  breakfast: '',
});

const priceRangeOptions = [
  { value: '', label: 'Any Price' },
  { value: '0-200', label: '¥0 - ¥200' },
  { value: '200-500', label: '¥200 - ¥500' },
  { value: '500-1000', label: '¥500 - ¥1000' },
  { value: '1000+', label: '¥1000+' },
];

const starRatingOptions = [
  { value: '', label: 'Any Rating' },
  { value: '3', label: '3+ Stars' },
  { value: '4', label: '4+ Stars' },
  { value: '5', label: '5 Stars' },
];

const cancellationOptions = [
  { value: '', label: 'All' },
  { value: 'yes', label: 'Free Cancellation' },
];

const breakfastOptions = [
  { value: '', label: 'All' },
  { value: 'yes', label: 'Breakfast Included' },
];

// Computed: All hotels combined
const allHotels = computed(() => {
  return [...internalHotels.value, ...externalHotels.value];
});

// Computed: Filtered hotels (client-side filtering)
const filteredHotels = computed(() => {
  let filtered = [...allHotels.value];

  // Price filter
  if (clientFilters.value.priceRange) {
    const [min, max] = clientFilters.value.priceRange.split('-');
    filtered = filtered.filter(hotel => {
      const price = hotel.price_from || hotel.gross_price || 0;
      if (min && price < parseFloat(min)) return false;
      if (max && max !== '+' && price > parseFloat(max)) return false;
      if (max === '+' && price < 1000) return false;
      return true;
    });
  }

  // Star rating filter
  if (clientFilters.value.starRating) {
    const minStars = parseFloat(clientFilters.value.starRating);
    filtered = filtered.filter(hotel => {
      const stars = hotel.star_rating || 0;
      return stars >= minStars;
    });
  }

  // Free cancellation filter (best-effort)
  if (clientFilters.value.freeCancellation === 'yes') {
    filtered = filtered.filter(hotel => {
      return hotel.has_free_cancellation === true ||
        (hotel.highlights && JSON.stringify(hotel.highlights).toLowerCase().includes('free cancellation'));
    });
  }

  // Breakfast filter (best-effort)
  if (clientFilters.value.breakfast === 'yes') {
    filtered = filtered.filter(hotel => {
      return hotel.hotel_include_breakfast === true ||
        (hotel.highlights && JSON.stringify(hotel.highlights).toLowerCase().includes('breakfast'));
    });
  }

  return filtered;
});

async function performSearch() {
  loading.value = true;
  try {
    const [adults, room_qty] = occupancy.value.split('-').map(Number);
    
    const params: any = {
      mode: searchMode.value,
      q: searchQuery.value || (searchMode.value === 'city' ? 'Guangzhou' : ''),
      adults: adults || 1,
      room_qty: room_qty || 1,
      page_number: currentPage.value,
    };

    if (checkin.value) params.checkin = checkin.value;
    if (checkout.value) params.checkout = checkout.value;

    const response = await axios.get('/api/public/hotels/search', { params });
    const data = response.data || {};

    internalHotels.value = (data.internal || []).map((h: any) => ({ ...h, source: 'internal' }));
    externalHotels.value = (data.external || []).map((h: any) => ({ ...h, source: 'external' }));
    blockedExternal.value = data.blockedExternal || false;
    blockedReason.value = data.blockedReason || '';

    totalPages.value = 1; // API doesn't paginate yet
  } catch (error: any) {
    console.error('Failed to search hotels', error);
    internalHotels.value = [];
    externalHotels.value = [];
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page: number) {
  currentPage.value = page;
  performSearch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getHotelImageUrl(hotel: any): string | null {
  // External hotels
  if (hotel.source === 'external') {
    return hotel.cover_photo_url || (hotel.photo_urls && hotel.photo_urls[0]) || null;
  }
  
  // Internal hotels
  if (hotel.coverAsset) {
    return hotel.coverAsset.thumbnail_url || hotel.coverAsset.public_url || null;
  }
  
  return null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function handleRequestBooking(hotel: any) {
  if (hotel.source === 'external') {
    // For external hotels, navigate to detail page
    router.push(`/services/hotel/${hotel.id}`);
  } else {
    // For internal hotels, go to request page
    router.push({
      path: '/request',
      query: {
        category: 'hotel',
        hotel_id: hotel.id,
        hotel_name: hotel.name,
      },
    });
  }
}

onMounted(async () => {
  // Set default checkout date (checkin + 1 day)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  checkin.value = today.toISOString().split('T')[0];
  checkout.value = tomorrow.toISOString().split('T')[0];
  
  // Only load internal hotels on page load - don't call external API
  // External API will only be called when user clicks "Search" button
  loading.value = true;
  try {
    const response = await axios.get('/api/public/hotels/search', {
      params: {
        mode: searchMode.value,
        q: searchQuery.value,
        // Don't send dates or other params - just get internal hotels
        // External API will only be called when user explicitly searches
      },
    });
    const data = response.data || { internal: [], external: [] };
    internalHotels.value = data.internal || [];
    externalHotels.value = []; // Don't load external on page load
    blockedExternal.value = false;
    blockedReason.value = undefined;
  } catch (error: any) {
    console.error('Failed to load hotels', error);
    internalHotels.value = [];
    externalHotels.value = [];
  } finally {
    loading.value = false;
  }
});
</script>
