<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-8">
      <SkeletonLoader class="h-96 mb-6" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="place" class="px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/places" class="text-slate-500 hover:text-teal-600">Places</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium">{{ place.name }}</span>
      </nav>

      <!-- Hero Carousel + Quick Info (2-column on desktop) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <!-- Left: Hero Carousel (medium height) -->
        <div class="lg:col-span-2">
          <div class="relative max-h-[420px] aspect-video bg-slate-200 rounded-2xl overflow-hidden">
            <ImageCarousel
              :images="getImageUrls()"
            />
          </div>
        </div>

        <!-- Right: Quick Info Card -->
        <div class="lg:sticky lg:top-20 lg:h-fit">
          <Card class="border-2 border-teal-200">
            <CardBody class="p-6">
              <h1 class="text-2xl font-bold text-slate-900 mb-4 line-clamp-2">{{ place.name }}</h1>
              
              <div v-if="place.star_rating" class="flex items-center gap-2 mb-4">
                <div class="flex items-center">
                  <Star v-for="i in 5" :key="i" class="h-4 w-4" :class="i <= Math.round(place.star_rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'" />
                </div>
                <span class="font-semibold text-slate-900">{{ place.star_rating.toFixed(1) }}</span>
                <span v-if="place.review_count" class="text-sm text-slate-500">({{ place.review_count }})</span>
              </div>

              <div v-if="place.cost_range" class="mb-4">
                <div class="text-sm text-slate-600">Cost Range</div>
                <div class="text-lg font-semibold text-teal-600">{{ place.cost_range }}</div>
              </div>

              <div v-if="place.customer_support_phone" class="mb-4 flex items-center gap-2 text-slate-600">
                <Phone class="h-4 w-4 text-teal-600" />
                <a :href="`tel:${place.customer_support_phone}`" class="text-sm hover:text-teal-600">{{ place.customer_support_phone }}</a>
              </div>

              <div v-if="place.opening_hours" class="mb-4">
                <div class="text-xs text-slate-600 mb-1">Opening Hours</div>
                <div class="text-sm text-slate-700">
                  {{ getOpeningHoursSnippet(place.opening_hours) }}
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <Button variant="primary" full-width @click="handleRequestGuide" class="flex items-center justify-center gap-2">
                  <User class="h-4 w-4" />
                  Request Guide
                </Button>
                <Button variant="secondary" full-width @click="handleRequestTransport" class="flex items-center justify-center gap-2">
                  <Car class="h-4 w-4" />
                  Request Transport
                </Button>
                <Button variant="ghost" full-width @click="openMap" class="flex items-center justify-center gap-2">
                  <MapPin class="h-4 w-4" />
                  View on Map
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <div>
            <div class="flex items-center gap-2 text-slate-600 mb-4">
              <MapPin class="h-5 w-5 text-teal-600" />
              <span>{{ place.address }}</span>
            </div>
            <div v-if="place.city" class="flex items-center gap-2 text-slate-600 mb-4">
              <Building2 class="h-5 w-5 text-slate-400" />
              <span>{{ place.city.name }}</span>
            </div>
            <div class="flex gap-2 mb-4">
              <Badge v-if="place.is_family_friendly" variant="success">Family Friendly</Badge>
              <Badge v-if="place.is_pet_friendly" variant="success">Pet Friendly</Badge>
            </div>
          </div>

          <Card>
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">About</h2>
              <p v-if="place.short_description" class="text-slate-700 mb-4">{{ place.short_description }}</p>
              <p v-if="place.description" class="text-slate-700 leading-relaxed">{{ place.description }}</p>
            </CardBody>
          </Card>

          <!-- Opening Hours -->
          <Card v-if="place.opening_hours">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock class="h-5 w-5 text-teal-600" />
                Opening Hours
              </h2>
              <div class="space-y-2">
                <div
                  v-for="(hours, day) in parseOpeningHours(place.opening_hours)"
                  :key="day"
                  class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                >
                  <span class="font-medium text-slate-700">{{ day }}</span>
                  <span class="text-slate-600">{{ hours || 'Closed' }}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Available Tours -->
          <Card v-if="place.tourLinks && place.tourLinks.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Available Tours</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="link in place.tourLinks"
                  :key="link.tour.id"
                  class="p-4 border border-slate-200 rounded-lg hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
                  @click="router.push(`/services/tours?tour=${link.tour.id}`)"
                >
                  <div class="font-semibold text-slate-900 mb-1">{{ link.tour.name }}</div>
                  <div v-if="link.tour.price_from" class="text-teal-600 font-medium">
                    From ¥{{ link.tour.price_from }}
                  </div>
                  <div v-if="link.tour.duration_hours" class="text-sm text-slate-500 mt-1">
                    Duration: {{ link.tour.duration_hours }} hours
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Reviews Section -->
          <Card v-if="reviews.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Reviews</h2>
              <div class="space-y-4">
                <div
                  v-for="review in reviews"
                  :key="review.id"
                  class="border-b border-slate-100 last:border-0 pb-4 last:pb-0"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <div class="flex items-center gap-1">
                      <Star
                        v-for="i in 5"
                        :key="i"
                        class="h-4 w-4"
                        :class="i <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'"
                      />
                    </div>
                    <span class="text-sm font-medium text-slate-700">{{ review.user?.email || 'Anonymous' }}</span>
                    <span class="text-xs text-slate-400">{{ formatDate(review.created_at) }}</span>
                  </div>
                  <p v-if="review.comment" class="text-slate-700 text-sm">{{ review.comment }}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Related Services -->
          <CrossSellWidget
            title="Related Services"
            :items="relatedServices"
            @click="handleServiceClick"
          />
        </div>

        <!-- Right: Sidebar -->
        <div class="space-y-6">
          <Card>
            <CardBody>
              <h3 class="font-semibold mb-4">Quick Info</h3>
              <div class="space-y-3">
                <div v-if="place.cost_range" class="flex items-center justify-between">
                  <span class="text-slate-600">Cost Range:</span>
                  <span class="font-medium text-teal-600">{{ place.cost_range }}</span>
                </div>
                <div v-if="place.customer_support_phone" class="flex items-center justify-between">
                  <span class="text-slate-600">Support:</span>
                  <a :href="`tel:${place.customer_support_phone}`" class="font-medium text-teal-600 hover:underline">
                    {{ place.customer_support_phone }}
                  </a>
                </div>
                <div class="pt-3 border-t border-slate-200 space-y-2">
                  <Button
                    variant="primary"
                    class="w-full"
                    @click="handleRequestGuide"
                  >
                    <User class="h-4 w-4 mr-2" />
                    Request Guide
                  </Button>
                  <Button
                    variant="secondary"
                    class="w-full"
                    @click="handleRequestTransport"
                  >
                    <Car class="h-4 w-4 mr-2" />
                    Request Transport
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Nearby Places -->
          <Card v-if="nearbyPlaces.length > 0">
            <CardBody>
              <h3 class="font-semibold mb-4">Nearby Places</h3>
              <div class="space-y-3">
                <div
                  v-for="nearby in nearbyPlaces.slice(0, 3)"
                  :key="nearby.id"
                  class="flex gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  @click="router.push(`/places/${nearby.id}`)"
                >
                  <img
                    v-if="getPlaceThumbnail(nearby)"
                    :src="getPlaceThumbnail(nearby)"
                    :alt="nearby.name"
                    class="w-16 h-16 object-cover rounded-lg"
                    @error="handleImageError"
                  />
                  <div v-else class="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                    <MapPin class="h-6 w-6 text-slate-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm line-clamp-1">{{ nearby.name }}</div>
                    <div v-if="nearby.star_rating" class="flex items-center gap-1 mt-1">
                      <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span class="text-xs">{{ nearby.star_rating.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Cross-Sell -->
      <div class="mt-8">
        <CrossSellWidget :items="relatedServices" title="You may also need" />
      </div>
    </div>

    <div v-else class="px-4 sm:px-6 lg:px-8 py-12 text-center">
      <EmptyState
        title="Place not found"
        description="The place you're looking for doesn't exist or has been removed."
      >
        <template #action>
          <Button variant="primary" @click="router.push('/places')">Browse All Places</Button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MapPin, Star, Clock, Building2, ChevronRight, User, Car, Phone } from 'lucide-vue-next';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  Card,
  CardBody,
  Badge,
  Button,
  SkeletonLoader,
  EmptyState,
  ImageCarousel,
  CrossSellWidget,
} from '@bridgechina/ui';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const place = ref<any>(null);
const nearbyPlaces = ref<any[]>([]);
const relatedServices = ref<any[]>([]);
const reviews = ref<any[]>([]);
const loading = ref(true);

function getImageUrls(): string[] {
  if (!place.value) return [];
  
  const urls: string[] = [];
  
  // Add cover image
  if (place.value.coverAsset?.public_url) {
    urls.push(place.value.coverAsset.public_url);
  }
  
  // Add gallery images
  if (place.value.galleryAssets && Array.isArray(place.value.galleryAssets)) {
    place.value.galleryAssets.forEach((asset: any) => {
      if (asset.public_url && !urls.includes(asset.public_url)) {
        urls.push(asset.public_url);
      }
    });
  }
  
  // Fallback: try old images format
  if (urls.length === 0 && place.value.images && Array.isArray(place.value.images)) {
    place.value.images.forEach((img: any) => {
      if (img.asset?.public_url && !urls.includes(img.asset.public_url)) {
        urls.push(img.asset.public_url);
      }
    });
  }
  
  return urls.length > 0 ? urls : [];
}

function getPlaceThumbnail(placeItem: any): string | null {
  if (placeItem.coverAsset?.thumbnail_url) return placeItem.coverAsset.thumbnail_url;
  if (placeItem.coverAsset?.public_url) return placeItem.coverAsset.public_url;
  if (placeItem.galleryAssets?.[0]?.thumbnail_url) return placeItem.galleryAssets[0].thumbnail_url;
  if (placeItem.galleryAssets?.[0]?.public_url) return placeItem.galleryAssets[0].public_url;
  if (placeItem.images?.[0]?.asset?.thumbnail_url) return placeItem.images[0].asset.thumbnail_url;
  if (placeItem.images?.[0]?.asset?.public_url) return placeItem.images[0].asset.public_url;
  return null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function parseOpeningHours(hours: any): Record<string, string> {
  if (typeof hours === 'string') {
    try {
      return JSON.parse(hours);
    } catch {
      return {};
    }
  }
  return hours || {};
}

function getOpeningHoursSnippet(hours: any): string {
  const parsed = parseOpeningHours(hours);
  const entries = Object.entries(parsed);
  if (entries.length === 0) return 'Check with venue';
  // Return first available day or "Mon-Fri: 9am-6pm" style
  const firstEntry = entries[0];
  if (firstEntry[1]) {
    return `${firstEntry[0]}: ${firstEntry[1]}`;
  }
  return 'Check with venue';
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function openMap() {
  if (place.value?.geo_lat && place.value?.geo_lng) {
    const url = `https://www.google.com/maps?q=${place.value.geo_lat},${place.value.geo_lng}`;
    window.open(url, '_blank');
  }
}

function handleRequestGuide() {
  router.push({
    path: '/request',
    query: {
      category: 'guide',
      place_id: place.value.id,
      place_name: place.value.name,
    },
  });
}

function handleRequestTransport() {
  router.push({
    path: '/request',
    query: {
      category: 'transport',
      place_id: place.value.id,
      place_name: place.value.name,
    },
  });
}

function handleServiceClick(item: any) {
  if (item.type === 'hotel') {
    router.push(`/services/hotel`);
  } else if (item.type === 'restaurant') {
    router.push(`/services/halal-food`);
  } else if (item.type === 'tour') {
    router.push(`/services/tours`);
  } else {
    router.push(`/services/${item.type}`);
  }
}

async function loadPlace() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const response = await axios.get(`/api/public/catalog/cityplaces/${id}`);
    
    if (response.data.error) {
      place.value = null;
      return;
    }
    
    place.value = response.data;

    // Load nearby places (same city)
    if (place.value && place.value.city_id) {
      try {
        const nearbyRes = await axios.get(`/api/public/catalog/cityplaces?city_id=${place.value.city_id}&limit=4`);
        nearbyPlaces.value = (nearbyRes.data || []).filter((p: any) => p.id !== place.value.id);
      } catch (e) {
        console.error('Failed to load nearby places', e);
      }
    }

    // Load related services (hotels, restaurants, tours in same city)
    if (place.value && place.value.city_id) {
      try {
        const [hotelsRes, restaurantsRes, toursRes] = await Promise.all([
          axios.get(`/api/public/catalog/hotels?city_id=${place.value.city_id}&limit=2`),
          axios.get(`/api/public/catalog/restaurants?city_id=${place.value.city_id}&limit=2`),
          axios.get(`/api/public/catalog/tours?city_id=${place.value.city_id}&limit=2`),
        ]);
        relatedServices.value = [
          ...hotelsRes.data.map((h: any) => ({ ...h, type: 'hotel' })),
          ...restaurantsRes.data.map((r: any) => ({ ...r, type: 'restaurant' })),
          ...toursRes.data.map((t: any) => ({ ...t, type: 'tour' })),
        ].slice(0, 4);
      } catch (e) {
        console.error('Failed to load related services', e);
      }
    }

    // Load reviews
    if (place.value && place.value.id) {
      try {
        const reviewsRes = await axios.get(`/api/public/reviews?entity_type=cityplace&entity_id=${place.value.id}`);
        reviews.value = reviewsRes.data || [];
      } catch (e) {
        console.error('Failed to load reviews', e);
      }
    }
  } catch (error: any) {
    console.error('Failed to load place', error);
    if (error.response?.status === 404 || error.response?.status === 400) {
      place.value = null;
    } else {
      toast.error('Failed to load place details');
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadPlace);
</script>


