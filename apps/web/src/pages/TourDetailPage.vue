<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-8">
      <SkeletonLoader class="h-96 mb-6" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="tour" class="px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/tours" class="text-slate-500 hover:text-teal-600">Tours</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium line-clamp-1">{{ tour.name }}</span>
      </nav>

      <!-- Image Gallery + Sticky Card -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <!-- Left: Image Gallery -->
        <div class="lg:col-span-2">
          <ImageCarousel :images="getImageUrls()" />
        </div>

        <!-- Right: Sticky Booking Card -->
        <div class="lg:sticky lg:top-20 lg:h-fit">
          <Card class="border-2 border-teal-200">
            <CardBody class="p-6">
              <h1 class="text-2xl font-bold text-slate-900 mb-4 line-clamp-2">{{ tour.name }}</h1>
              
              <div v-if="tour.price_from" class="mb-4">
                <div class="text-sm text-slate-600">Starting from</div>
                <div class="text-2xl font-bold text-teal-600">¥{{ tour.price_from }}</div>
                <div class="text-xs text-slate-500">per person</div>
              </div>

              <div v-if="tour.duration_days" class="mb-4 flex items-center gap-2 text-slate-600">
                <Calendar class="h-4 w-4 text-teal-600" />
                <span>{{ tour.duration_days }} day{{ tour.duration_days > 1 ? 's' : '' }}</span>
              </div>

              <div v-if="tour.city" class="mb-4 flex items-center gap-2 text-slate-600">
                <MapPin class="h-4 w-4 text-teal-600" />
                <span>{{ tour.city.name }}</span>
              </div>

              <Button variant="primary" full-width size="lg" @click="handleBookTour" class="mb-3">
                Book Tour
              </Button>
              
              <Button variant="secondary" full-width @click="openWhatsApp">
                <MessageCircle class="h-4 w-4 mr-2" />
                Contact via WhatsApp
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <!-- Description -->
          <Card>
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">About This Tour</h2>
              <p v-if="tour.description" class="text-slate-700 leading-relaxed">{{ tour.description }}</p>
              <p v-else class="text-slate-500 italic">No description available.</p>
            </CardBody>
          </Card>

          <!-- Highlights -->
          <Card v-if="tour.highlights && Array.isArray(tour.highlights) && tour.highlights.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Highlights</h2>
              <ul class="space-y-2">
                <li v-for="highlight in tour.highlights" :key="highlight" class="flex items-start gap-2 text-slate-700">
                  <Sparkles class="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{{ highlight }}</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <!-- Inclusions -->
          <Card v-if="tour.inclusions && Array.isArray(tour.inclusions) && tour.inclusions.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">What's Included</h2>
              <ul class="space-y-2">
                <li v-for="inclusion in tour.inclusions" :key="inclusion" class="flex items-center gap-2 text-slate-700">
                  <Check class="h-4 w-4 text-teal-600" />
                  <span>{{ inclusion }}</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <!-- Exclusions -->
          <Card v-if="tour.exclusions && Array.isArray(tour.exclusions) && tour.exclusions.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">What's Not Included</h2>
              <ul class="space-y-2">
                <li v-for="exclusion in tour.exclusions" :key="exclusion" class="flex items-center gap-2 text-slate-700">
                  <X class="h-4 w-4 text-slate-400" />
                  <span>{{ exclusion }}</span>
                </li>
              </ul>
            </CardBody>
          </Card>

          <!-- City Places -->
          <Card v-if="tour.tourLinks && tour.tourLinks.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Places You'll Visit</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="link in tour.tourLinks"
                  :key="link.id"
                  class="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-teal-300 transition-colors cursor-pointer"
                  @click="router.push(`/places/${link.cityPlace.id}`)"
                >
                  <img
                    v-if="link.cityPlace.coverAsset?.thumbnail_url"
                    :src="link.cityPlace.coverAsset.thumbnail_url"
                    :alt="link.cityPlace.name"
                    class="w-16 h-16 object-cover rounded"
                  />
                  <div v-else class="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                    <MapPin class="h-6 w-6 text-slate-400" />
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-sm text-slate-900 line-clamp-1">{{ link.cityPlace.name }}</h3>
                    <p v-if="link.cityPlace.city" class="text-xs text-slate-500">{{ link.cityPlace.city.name }}</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Tour Details -->
          <Card>
            <CardBody>
              <h3 class="font-semibold mb-3">Tour Details</h3>
              <div class="space-y-2 text-sm text-slate-700">
                <div v-if="tour.min_group_size" class="flex justify-between">
                  <span class="text-slate-600">Min Group:</span>
                  <span class="font-medium">{{ tour.min_group_size }} people</span>
                </div>
                <div v-if="tour.max_group_size" class="flex justify-between">
                  <span class="text-slate-600">Max Group:</span>
                  <span class="font-medium">{{ tour.max_group_size }} people</span>
                </div>
                <div v-if="tour.difficulty_level" class="flex justify-between">
                  <span class="text-slate-600">Difficulty:</span>
                  <Badge :variant="getDifficultyVariant(tour.difficulty_level)">{{ tour.difficulty_level }}</Badge>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Reviews Section (Full Width) -->
      <div class="mt-12">
        <ReviewsSection entity-type="tour" :entity-id="tour.id" />
      </div>

      <!-- Other Tours in City -->
      <section v-if="otherTours.length > 0" class="mt-12">
        <h2 class="text-2xl font-bold text-slate-900 mb-6">Other Tours in {{ tour.city?.name }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CompactCard
            v-for="other in otherTours"
            :key="other.id"
            :item="other"
            :title="other.name"
            :subtitle="other.city?.name"
            :thumbnail="other.coverAsset?.thumbnail_url || other.coverAsset?.public_url"
            :price="other.price_from ? `¥${other.price_from}` : undefined"
            :meta="`${other.duration_days || ''} days`"
            @click="router.push(`/services/tours/${other.id}`)"
          />
        </div>
      </section>

      <!-- Cross-sell Widget -->
      <div class="mt-12">
        <CrossSellWidget :items="relatedServices" title="You may also need" />
      </div>
    </div>

    <div v-else class="px-4 sm:px-6 lg:px-8 py-12 text-center">
      <EmptyState
        title="Tour not found"
        description="The tour you're looking for doesn't exist or has been removed."
      >
        <Button variant="primary" @click="router.push('/services/tours')">Browse Tours</Button>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronRight,
  MapPin,
  Check,
  X,
  Calendar,
  MessageCircle,
  Sparkles,
} from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
  SkeletonLoader,
  EmptyState,
  ImageCarousel,
  CompactCard,
  CrossSellWidget,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import ReviewsSection from '@/components/reviews/ReviewsSection.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const tour = ref<any>(null);
const otherTours = ref<any[]>([]);
const relatedServices = ref<any[]>([]);

function getImageUrls(): string[] {
  if (!tour.value) return [];
  const urls: string[] = [];
  
  if (tour.value.coverAsset?.public_url) {
    urls.push(tour.value.coverAsset.public_url);
  }
  
  if (tour.value.galleryAssets && Array.isArray(tour.value.galleryAssets)) {
    tour.value.galleryAssets.forEach((asset: any) => {
      if (asset.public_url && !urls.includes(asset.public_url)) {
        urls.push(asset.public_url);
      }
    });
  }
  
  return urls.length > 0 ? urls : ['/placeholder-tour.jpg'];
}

function getDifficultyVariant(level: string): 'default' | 'success' | 'warning' | 'danger' {
  const map: Record<string, any> = {
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };
  return map[level?.toLowerCase()] || 'default';
}

async function loadTour() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/public/catalog/tours/${route.params.id}`);
    tour.value = response.data;

    // Load other tours in same city
    if (tour.value.city_id) {
      const otherResponse = await axios.get(`/api/public/catalog/tours?city_id=${tour.value.city_id}`);
      otherTours.value = (otherResponse.data || [])
        .filter((t: any) => t.id !== tour.value.id)
        .slice(0, 6);
    }

    // Load related services (hotels, restaurants, transport in same city)
    if (tour.value && tour.value.city_id) {
      try {
        const [hotelsRes, restaurantsRes, transportRes] = await Promise.all([
          axios.get(`/api/public/catalog/hotels?city_id=${tour.value.city_id}&limit=2`).catch(() => ({ data: [] })),
          axios.get(`/api/public/catalog/restaurants?city_id=${tour.value.city_id}&limit=2`).catch(() => ({ data: [] })),
          axios.get(`/api/public/catalog/transport?city_id=${tour.value.city_id}&limit=2`).catch(() => ({ data: [] })),
        ]);
        relatedServices.value = [
          ...hotelsRes.data.map((h: any) => ({ ...h, type: 'hotel' })),
          ...restaurantsRes.data.map((r: any) => ({ ...r, type: 'restaurant' })),
          ...transportRes.data.map((t: any) => ({ ...t, type: 'transport' })),
        ].slice(0, 4);
      } catch (e) {
        console.error('Failed to load related services', e);
        relatedServices.value = [];
      }
    }
  } catch (error: any) {
    console.error('Failed to load tour', error);
    if (error.response?.status === 404) {
      tour.value = null;
    }
  } finally {
    loading.value = false;
  }
}

function handleBookTour() {
  router.push({
    path: '/request',
    query: {
      category: 'tour',
      tour_id: tour.value?.id,
      tour_name: tour.value?.name,
    },
  });
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi, I'm interested in booking ${tour.value?.name || 'this tour'}`);
  window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
}

onMounted(() => {
  loadTour();
});
</script>

