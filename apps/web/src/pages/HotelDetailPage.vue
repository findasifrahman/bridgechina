<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-8">
      <SkeletonLoader class="h-96 mb-6" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="hotel" class="px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/hotel" class="text-slate-500 hover:text-teal-600">Hotels</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium line-clamp-1">{{ hotel.name }}</span>
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
              <div class="flex items-center justify-between mb-4">
                <h1 class="text-2xl font-bold text-slate-900 line-clamp-2">{{ hotel.name }}</h1>
                <Badge v-if="hotel.verified" variant="success">Verified</Badge>
              </div>
              
              <div v-if="hotel.rating" class="flex items-center gap-2 mb-4">
                <div class="flex items-center">
                  <Star v-for="i in 5" :key="i" class="h-4 w-4" :class="i <= Math.round(hotel.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'" />
                </div>
                <span class="font-semibold text-slate-900">{{ hotel.rating.toFixed(1) }}</span>
                <span class="text-sm text-slate-500">({{ hotel.review_count || 0 }} reviews)</span>
              </div>

              <div v-if="hotel.price_from" class="mb-4">
                <div class="text-sm text-slate-600">Starting from</div>
                <div class="text-2xl font-bold text-teal-600">¥{{ hotel.price_from }}</div>
                <div class="text-xs text-slate-500">per night</div>
              </div>

              <div v-if="hotel.city" class="mb-4 flex items-center gap-2 text-slate-600">
                <MapPin class="h-4 w-4 text-teal-600" />
                <span>{{ hotel.city.name }}</span>
              </div>

              <Button variant="primary" full-width size="lg" @click="handleRequestBooking" class="mb-3">
                Request Booking
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
              <h2 class="text-xl font-semibold mb-4">About This Hotel</h2>
              <p v-if="hotel.description" class="text-slate-700 leading-relaxed">{{ hotel.description }}</p>
              <p v-else class="text-slate-500 italic">No description available.</p>
            </CardBody>
          </Card>

          <!-- Amenities -->
          <Card v-if="hotel.amenities && Array.isArray(hotel.amenities) && hotel.amenities.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Amenities</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div v-for="amenity in hotel.amenities" :key="amenity" class="flex items-center gap-2 text-sm text-slate-700">
                  <Check class="h-4 w-4 text-teal-600" />
                  <span>{{ amenity }}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Facilities -->
          <Card v-if="hotel.facilities">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Facilities</h2>
              <div class="prose prose-sm max-w-none text-slate-700" v-html="formatFacilities(hotel.facilities)" />
            </CardBody>
          </Card>

          <!-- Policies -->
          <Card v-if="hotel.policies">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Policies</h2>
              <div class="prose prose-sm max-w-none text-slate-700" v-html="formatPolicies(hotel.policies)" />
            </CardBody>
          </Card>

          <!-- Contact Info -->
          <Card v-if="hotel.phone || hotel.email || hotel.website">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Contact Information</h2>
              <div class="space-y-2 text-slate-700">
                <div v-if="hotel.phone" class="flex items-center gap-2">
                  <Phone class="h-4 w-4 text-teal-600" />
                  <a :href="`tel:${hotel.phone}`" class="hover:text-teal-600">{{ hotel.phone }}</a>
                </div>
                <div v-if="hotel.email" class="flex items-center gap-2">
                  <Mail class="h-4 w-4 text-teal-600" />
                  <a :href="`mailto:${hotel.email}`" class="hover:text-teal-600">{{ hotel.email }}</a>
                </div>
                <div v-if="hotel.website" class="flex items-center gap-2">
                  <Globe class="h-4 w-4 text-teal-600" />
                  <a :href="hotel.website" target="_blank" class="hover:text-teal-600 truncate">{{ hotel.website }}</a>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Address Card -->
          <Card v-if="hotel.address">
            <CardBody>
              <h3 class="font-semibold mb-2 flex items-center gap-2">
                <MapPin class="h-4 w-4 text-teal-600" />
                Location
              </h3>
              <p class="text-sm text-slate-700">{{ hotel.address }}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Reviews Section -->
      <div class="mt-12">
        <ReviewsSection entity-type="hotel" :entity-id="hotel.id" />
      </div>

      <!-- Similar Hotels -->
      <section v-if="similarHotels.length > 0" class="mt-12">
        <h2 class="text-2xl font-bold text-slate-900 mb-6">You May Also Like</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CompactCard
            v-for="similar in similarHotels"
            :key="similar.id"
            :item="similar"
            :title="similar.name"
            :subtitle="similar.city?.name"
            :thumbnail="similar.coverAsset?.thumbnail_url || similar.coverAsset?.public_url"
            :rating="similar.rating"
            :price="similar.price_from ? `¥${similar.price_from}` : undefined"
            :meta="similar.city?.name"
            @click="router.push(`/services/hotel/${similar.id}`)"
          />
        </div>
      </section>

      <!-- Cross-sell Widget -->
      <div class="mt-12">
        <CrossSellWidget />
      </div>
    </div>

    <div v-else class="px-4 sm:px-6 lg:px-8 py-12 text-center">
      <EmptyState
        title="Hotel not found"
        description="The hotel you're looking for doesn't exist or has been removed."
      >
        <Button variant="primary" @click="router.push('/services/hotel')">Browse Hotels</Button>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronRight,
  Star,
  MapPin,
  Check,
  Phone,
  Mail,
  Globe,
  MessageCircle,
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
const hotel = ref<any>(null);
const similarHotels = ref<any[]>([]);

function getImageUrls(): string[] {
  if (!hotel.value) return [];
  const urls: string[] = [];
  
  if (hotel.value.coverAsset?.public_url) {
    urls.push(hotel.value.coverAsset.public_url);
  }
  
  if (hotel.value.galleryAssets && Array.isArray(hotel.value.galleryAssets)) {
    hotel.value.galleryAssets.forEach((asset: any) => {
      if (asset.public_url && !urls.includes(asset.public_url)) {
        urls.push(asset.public_url);
      }
    });
  }
  
  return urls.length > 0 ? urls : ['/placeholder-hotel.jpg'];
}

function formatFacilities(facilities: any): string {
  if (typeof facilities === 'string') return facilities;
  if (Array.isArray(facilities)) {
    return '<ul class="list-disc list-inside space-y-1">' + facilities.map((f: string) => `<li>${f}</li>`).join('') + '</ul>';
  }
  return JSON.stringify(facilities);
}

function formatPolicies(policies: any): string {
  if (typeof policies === 'string') return policies;
  if (Array.isArray(policies)) {
    return '<ul class="list-disc list-inside space-y-1">' + policies.map((p: string) => `<li>${p}</li>`).join('') + '</ul>';
  }
  return JSON.stringify(policies);
}

async function loadHotel() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/public/catalog/hotels/${route.params.id}`);
    hotel.value = response.data;

    // Load similar hotels in same city
    if (hotel.value.city_id) {
      const similarResponse = await axios.get(`/api/public/catalog/hotels?city_id=${hotel.value.city_id}&limit=6`);
      similarHotels.value = (similarResponse.data || [])
        .filter((h: any) => h.id !== hotel.value.id)
        .slice(0, 6);
    }
  } catch (error: any) {
    console.error('Failed to load hotel', error);
    if (error.response?.status === 404) {
      hotel.value = null;
    }
  } finally {
    loading.value = false;
  }
}

function handleRequestBooking() {
  router.push({
    path: '/request',
    query: {
      category: 'hotel',
      hotel_id: hotel.value?.id,
      hotel_name: hotel.value?.name,
    },
  });
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi, I'm interested in booking ${hotel.value?.name || 'this hotel'}`);
  window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
}

onMounted(() => {
  loadHotel();
});
</script>

