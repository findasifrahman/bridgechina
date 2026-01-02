<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-8">
      <SkeletonLoader class="h-96 mb-6" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="hotel" class="px-4 sm:px-6 lg:px-8 py-4">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/hotel" class="text-slate-500 hover:text-teal-600">Hotels</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium line-clamp-1">{{ hotel.name }}</span>
      </nav>

      <!-- Image Gallery + Sticky Card -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <!-- Left: Image Gallery -->
        <div class="lg:col-span-2">
          <ImageCarousel :images="getImageUrls()" />
        </div>

        <!-- Right: Sticky Booking Card -->
        <div class="lg:sticky lg:top-20 lg:h-fit">
            <Card class="border-2 border-teal-200">
                <CardBody class="p-4">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <h1 class="text-lg font-semibold text-slate-900 leading-tight pr-2">{{ hotel.name }}</h1>
                      <div v-if="hotel.price_per_night || hotel.price_from || hotel.gross_price" class="mt-1">
                        <span class="text-sm font-bold text-teal-600">
                          {{ hotel.currency === 'CNY' ? '¥' : hotel.currency || '¥' }}{{ Math.round(hotel.price_per_night || hotel.price_from || hotel.gross_price || 0) }}
                        </span>
                        <span class="text-xs text-slate-500 ml-1">/night</span>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Badge v-if="hotel.source === 'internal' && hotel.verified" variant="success">Verified</Badge>
                    </div>
                  </div>
              
              <div v-if="hotel.review_score || hotel.rating" class="flex items-center gap-2 mb-3 text-sm">
                <div class="flex items-center">
                  <Star v-for="i in 5" :key="i" class="h-4 w-4" :class="i <= Math.round(hotel.review_score || hotel.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'" />
                </div>
                <span class="font-semibold text-slate-900">{{ (hotel.review_score || hotel.rating || 0).toFixed(1) }}</span>
                <span class="text-sm text-slate-500">({{ hotel.review_count || 0 }} reviews)</span>
                <span v-if="hotel.review_score_word" class="text-xs text-slate-600 capitalize">({{ hotel.review_score_word }})</span>
              </div>

              <div v-if="hotel.star_rating" class="mb-2 text-xs">
                <span class="text-xs text-slate-600">Star Rating: </span>
                <span class="text-sm">{{ '⭐'.repeat(hotel.star_rating) }}</span>
              </div>

              <div v-if="hotel.price_per_night || hotel.price_from || hotel.gross_price" class="mb-3">
                <div class="text-xs text-slate-600">Starting from</div>
                <div class="text-lg font-bold text-teal-600">
                  {{ hotel.currency === 'CNY' ? '¥' : hotel.currency || '¥' }}{{ Math.round(hotel.price_per_night || hotel.price_from || hotel.gross_price || 0) }}
                </div>
                <div class="text-xs text-slate-500">per night</div>
                <div v-if="hotel.strikethrough_price && hotel.strikethrough_price > (hotel.price_per_night || hotel.price_from || hotel.gross_price || 0)" class="text-xs text-slate-400 line-through mt-1">
                  {{ hotel.currency === 'CNY' ? '¥' : hotel.currency || '¥' }}{{ Math.round(hotel.strikethrough_price) }}
                </div>
              </div>

              <div v-if="hotel.city || hotel.address" class="mb-3 flex items-center gap-2 text-xs text-slate-600">
                <MapPin class="h-3 w-3 text-teal-600 flex-shrink-0" />
                <span class="line-clamp-2">{{ hotel.city?.name || hotel.city || hotel.address }}</span>
              </div>

                  <!-- External hotel: View on provider button -->
                  <Button 
                    v-if="hotel.source === 'external' && hotel.booking_url" 
                    variant="primary" 
                    full-width 
                    size="sm" 
                    @click="openBookingUrl"
                    class="mb-2"
                  >
                    View on Provider Site
                  </Button>
              
              <!-- Internal hotel or fallback: Request Booking -->
              <Button 
                v-else
                variant="primary" 
                full-width 
                size="sm" 
                @click="handleRequestBooking" 
                class="mb-2"
              >
                {{ hotel.source === 'external' ? 'Book this place' : 'Request Booking' }}
              </Button>
              
              <Button variant="secondary" full-width size="sm" @click="openWhatsApp">
                <MessageCircle class="h-3 w-3 mr-2" />
                Contact via WhatsApp
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 space-y-3">
          <!-- Description -->
          <Card>
            <CardBody class="p-4">
              <h2 class="text-lg font-semibold mb-2">About This Hotel</h2>
              <div v-if="hotel.description" class="text-slate-700 leading-relaxed">
                <!-- External hotels: description is array of objects with description field -->
                <div v-if="Array.isArray(hotel.description) && hotel.description.length > 0">
                  <div v-for="(desc, idx) in hotel.description" :key="idx" class="mb-4">
                    <h3 v-if="desc.section" class="font-semibold text-slate-900 mb-2">{{ desc.section }}</h3>
                    <p v-if="desc.description" class="mb-2">{{ desc.description }}</p>
                    <p v-else-if="typeof desc === 'string'">{{ desc }}</p>
                  </div>
                </div>
                <!-- Internal hotels: description is string -->
                <div v-else-if="typeof hotel.description === 'string'">
                  <p>{{ hotel.description }}</p>
                </div>
                <!-- Fallback -->
                <div v-else>
                  <p>{{ JSON.stringify(hotel.description) }}</p>
                </div>
              </div>
              <p v-else class="text-slate-500 italic">No description available.</p>
            </CardBody>
          </Card>

          <!-- Highlights (External hotels) -->
          <Card v-if="hotel.highlights && Array.isArray(hotel.highlights) && hotel.highlights.length > 0">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Highlights</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div v-for="(highlight, idx) in hotel.highlights" :key="idx" class="flex items-center gap-2 text-sm text-slate-700">
                  <Check class="h-4 w-4 text-teal-600 flex-shrink-0" />
                  <span>{{ highlight.translated_name || highlight.name || highlight }}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Facilities (External hotels - Most Popular) -->
          <Card v-if="hotel.facilities && (hotel.facilities.popular || hotel.facilities.all || hotel.facilities.facilities)">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Facilities</h2>
              <!-- Most Popular Facilities -->
              <div v-if="hotel.facilities.popular && Array.isArray(hotel.facilities.popular) && hotel.facilities.popular.length > 0" class="mb-4">
                <h3 class="text-sm font-medium text-slate-600 mb-2">Most Popular</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div v-for="(facility, idx) in hotel.facilities.popular.slice(0, 9)" :key="idx" class="flex items-center gap-2 text-sm text-slate-700">
                    <Check class="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <span>{{ typeof facility === 'object' ? (facility.name || facility.translated_name || JSON.stringify(facility)) : facility }}</span>
                  </div>
                </div>
              </div>
              <!-- All Facilities (from facilities_block.facilities) -->
              <div v-if="hotel.facilities.facilities && Array.isArray(hotel.facilities.facilities) && hotel.facilities.facilities.length > 0" class="mt-4">
                <h3 class="text-sm font-medium text-slate-600 mb-2">All Facilities</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div v-for="(facility, idx) in hotel.facilities.facilities" :key="idx" class="flex items-center gap-2 text-sm text-slate-700">
                    <Check class="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <span>{{ typeof facility === 'object' ? (facility.name || facility.translated_name || JSON.stringify(facility)) : facility }}</span>
                  </div>
                </div>
              </div>
              <!-- Fallback: all array -->
              <div v-else-if="hotel.facilities.all && Array.isArray(hotel.facilities.all) && hotel.facilities.all.length > 0" class="mt-4">
                <h3 class="text-sm font-medium text-slate-600 mb-2">All Facilities</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div v-for="(facility, idx) in hotel.facilities.all" :key="idx" class="flex items-center gap-2 text-sm text-slate-700">
                    <Check class="h-4 w-4 text-teal-600 flex-shrink-0" />
                    <span>{{ typeof facility === 'object' ? (facility.name || facility.translated_name || JSON.stringify(facility)) : facility }}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Payment Features (External hotels) -->
          <Card v-if="hotel.payment_features && Array.isArray(hotel.payment_features) && hotel.payment_features.length > 0">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Payment Methods</h2>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="(method, idx) in hotel.payment_features"
                  :key="idx"
                  variant="default"
                  size="sm"
                >
                  {{ method.name || method.creditcard_name || method }}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <!-- Review Scores Breakdown (External hotels) -->
          <Card v-if="hotel.review_scores && Array.isArray(hotel.review_scores) && hotel.review_scores.length > 0">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Review Scores</h2>
              <div v-for="(scoreGroup, idx) in hotel.review_scores" :key="idx" class="mb-4 last:mb-0">
                <h3 class="text-sm font-medium text-slate-600 mb-3">{{ scoreGroup.customer_type || 'Overall' }} ({{ scoreGroup.average_score?.toFixed(1) || 'N/A' }})</h3>
                <div v-if="scoreGroup.score_breakdown && Array.isArray(scoreGroup.score_breakdown)" class="space-y-2">
                  <div v-for="(item, itemIdx) in scoreGroup.score_breakdown" :key="itemIdx" class="flex items-center justify-between">
                    <span class="text-sm text-slate-700">{{ item.localized_question || item.question }}</span>
                    <div class="flex items-center gap-2">
                      <div class="w-32 bg-slate-200 rounded-full h-2">
                        <div 
                          class="bg-teal-600 h-2 rounded-full" 
                          :style="{ width: `${((item.score || 0) / 10) * 100}%` }"
                        ></div>
                      </div>
                      <span class="text-sm font-medium text-slate-900 w-8 text-right">{{ (item.score || 0).toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Nearby Attractions (External hotels) -->
          <Card v-if="hotel.attractions && Array.isArray(hotel.attractions) && hotel.attractions.length > 0">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Popular Attractions Nearby</h2>
              <div class="space-y-3">
                <div v-for="(attraction, idx) in hotel.attractions.slice(0, 6)" :key="idx" class="flex items-start gap-3">
                  <MapPin class="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div class="flex-1">
                    <h4 class="font-medium text-slate-900">{{ attraction.tag || attraction.name || attraction.title }}</h4>
                    <p v-if="attraction.distance" class="text-xs text-slate-600">{{ typeof attraction.distance === 'number' ? `${attraction.distance.toFixed(1)} km` : attraction.distance }} away</p>
                    <p v-if="attraction.description" class="text-sm text-slate-700 mt-1">{{ attraction.description }}</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Sustainability (External hotels) -->
          <Card v-if="hotel.sustainability && hotel.sustainability.sustainability_level">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Sustainability</h2>
              <div class="flex items-center gap-3 mb-4">
                <Badge variant="success" size="sm">{{ hotel.sustainability.sustainability_level.title || hotel.sustainability.sustainability_level.name }}</Badge>
                <span class="text-sm text-slate-600">{{ hotel.sustainability.sustainability_level.description }}</span>
              </div>
              <div v-if="hotel.sustainability.efforts && Array.isArray(hotel.sustainability.efforts)" class="space-y-4">
                <div v-for="(effort, idx) in hotel.sustainability.efforts" :key="idx">
                  <h3 class="font-medium text-slate-800 mb-2">{{ effort.title }}</h3>
                  <ul class="list-disc list-inside space-y-1 text-sm text-slate-700">
                    <li v-for="(step, stepIdx) in (effort.steps || [])" :key="stepIdx">{{ step }}</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Family Facilities (External hotels) -->
          <Card v-if="hotel.family_facilities && Array.isArray(hotel.family_facilities) && hotel.family_facilities.length > 0">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Family Facilities</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div v-for="(facility, idx) in hotel.family_facilities" :key="idx" class="flex items-center gap-2 text-sm text-slate-700">
                  <Check class="h-4 w-4 text-teal-600 flex-shrink-0" />
                  <span>{{ facility }}</span>
                </div>
              </div>
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

          <!-- Facilities (Internal hotels only - external hotels use the card above) -->
          <Card v-if="hotel.source === 'internal' && hotel.facilities">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Facilities</h2>
              <div class="prose prose-sm max-w-none text-slate-700" v-html="formatFacilities(hotel.facilities)" />
            </CardBody>
          </Card>

          <!-- Policies -->
          <Card v-if="hotel.policies">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Policies</h2>
              <div class="prose prose-sm max-w-none text-slate-700" v-html="formatPolicies(hotel.policies)" />
            </CardBody>
          </Card>

          <!-- Contact Info -->
          <Card v-if="hotel.phone || hotel.email || hotel.website">
            <CardBody class="p-4">
              <h2 class="text-base font-semibold mb-2">Contact Information</h2>
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
        <div class="space-y-3">
          <!-- Address Card -->
          <Card v-if="hotel.address">
            <CardBody class="p-4">
              <h3 class="text-sm font-semibold mb-2 flex items-center gap-2">
                <MapPin class="h-3 w-3 text-teal-600" />
                Location
              </h3>
              <p class="text-xs text-slate-700">{{ hotel.address }}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Reviews Section -->
      <div class="mt-12">
        <ReviewsSection entity-type="hotel" :entity-id="hotel.id" />
      </div>

          <!-- Similar Hotels -->
          <section v-if="similarHotels.length > 0" class="mt-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">You May Also Like</h2>
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
      <div class="mt-6">
        <CrossSellWidget :items="similarHotels" />
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
  
  // External hotels: use gallery_photos
  if (hotel.value.source === 'external') {
    if (hotel.value.cover_photo_url) {
      urls.push(hotel.value.cover_photo_url);
    }
    if (hotel.value.gallery_photos && Array.isArray(hotel.value.gallery_photos)) {
      hotel.value.gallery_photos.forEach((photo: any) => {
        const url = photo.url_max1280 || photo.url_max750 || photo.url || photo;
        if (url && typeof url === 'string' && !urls.includes(url)) {
          urls.push(url);
        }
      });
    }
    if (urls.length > 0) return urls;
  }
  
  // Internal hotels: use coverAsset and galleryAssets
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
  // Check if user is logged in
  const token = localStorage.getItem('access_token');
  if (!token) {
    // Redirect to login with return path
    router.push({
      path: '/login',
      query: {
        redirect: `/services/hotel/${route.params.id}`,
      },
    });
    return;
  }

  // For external hotels, include external_hotel_id
  if (hotel.value?.source === 'external') {
    router.push({
      path: '/request',
      query: {
        category: 'hotel',
        hotel_id: hotel.value?.id,
        hotel_name: hotel.value?.name,
        hotel_source: 'BOOKINGCOM',
        external_hotel_id: hotel.value?.id,
      },
    });
  } else {
    router.push({
      path: '/request',
      query: {
        category: 'hotel',
        hotel_id: hotel.value?.id,
        hotel_name: hotel.value?.name,
      },
    });
  }
}

function openBookingUrl() {
  if (hotel.value?.booking_url && typeof window !== 'undefined') {
    window.open(hotel.value.booking_url, '_blank');
  }
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi, I'm interested in booking ${hotel.value?.name || 'this hotel'}`);
  if (typeof window !== 'undefined') {
    window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
  }
}

onMounted(() => {
  loadHotel();
});
</script>

