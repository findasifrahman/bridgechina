<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-8">
      <SkeletonLoader class="h-96 mb-6" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="restaurant" class="px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/halal-food" class="text-slate-500 hover:text-teal-600">Halal Food</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium line-clamp-1">{{ restaurant.name }}</span>
      </nav>

      <!-- Image Gallery + Sticky Card -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <!-- Left: Image Gallery -->
        <div class="lg:col-span-2">
          <ImageCarousel :images="getImageUrls()" />
        </div>

        <!-- Right: Sticky Info Card -->
        <div class="lg:sticky lg:top-20 lg:h-fit">
          <Card class="border-2 border-teal-200">
            <CardBody class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h1 class="text-2xl font-bold text-slate-900 line-clamp-2">{{ restaurant.name }}</h1>
                <Badge v-if="restaurant.halal_verified" variant="success">Halal Verified</Badge>
              </div>
              
              <div v-if="restaurant.rating" class="flex items-center gap-2 mb-4">
                <div class="flex items-center">
                  <Star v-for="i in 5" :key="i" class="h-4 w-4" :class="i <= Math.round(restaurant.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'" />
                </div>
                <span class="font-semibold text-slate-900">{{ restaurant.rating.toFixed(1) }}</span>
                <span class="text-sm text-slate-500">({{ restaurant.review_count || 0 }} reviews)</span>
              </div>

              <div v-if="restaurant.address" class="mb-4 flex items-start gap-2 text-slate-600">
                <MapPin class="h-4 w-4 text-teal-600 mt-0.5" />
                <span class="text-sm">{{ restaurant.address }}</span>
              </div>

              <div v-if="restaurant.phone" class="mb-4 flex items-center gap-2 text-slate-600">
                <Phone class="h-4 w-4 text-teal-600" />
                <a :href="`tel:${restaurant.phone}`" class="text-sm hover:text-teal-600">{{ restaurant.phone }}</a>
              </div>

              <div class="flex flex-col gap-2">
                <Button variant="primary" full-width size="lg" @click="handleOrderDelivery">
                  Order / Request Delivery
                </Button>
                
                <Button variant="secondary" full-width @click="openWhatsApp">
                  <MessageCircle class="h-4 w-4 mr-2" />
                  Contact via WhatsApp
                </Button>
              </div>
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
              <h2 class="text-xl font-semibold mb-4">About This Restaurant</h2>
              <p v-if="restaurant.description" class="text-slate-700 leading-relaxed">{{ restaurant.description }}</p>
              <p v-else class="text-slate-500 italic">No description available.</p>
            </CardBody>
          </Card>

          <!-- Cuisine & Specialties -->
          <Card v-if="restaurant.cuisine_type || (restaurant.specialties && Array.isArray(restaurant.specialties) && restaurant.specialties.length > 0)">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Cuisine & Specialties</h2>
              <div v-if="restaurant.cuisine_type" class="mb-3">
                <span class="text-sm font-medium text-slate-600">Cuisine Type: </span>
                <Badge variant="accent">{{ restaurant.cuisine_type }}</Badge>
              </div>
              <div v-if="restaurant.specialties && Array.isArray(restaurant.specialties) && restaurant.specialties.length > 0" class="flex flex-wrap gap-2">
                <Badge v-for="specialty in restaurant.specialties" :key="specialty" variant="default">{{ specialty }}</Badge>
              </div>
            </CardBody>
          </Card>

          <!-- Menu Preview -->
          <Card v-if="restaurant.foodItems && restaurant.foodItems.length > 0">
            <CardBody>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold">Menu Preview</h2>
                <Button variant="ghost" size="sm" @click="viewFullMenu">View Full Menu →</Button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="item in restaurant.foodItems.slice(0, 6)"
                  :key="item.id"
                  class="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-teal-300 transition-colors cursor-pointer"
                  @click="router.push(`/services/halal-food/item/${item.id}`)"
                >
                  <img
                    v-if="item.coverAsset?.thumbnail_url"
                    :src="item.coverAsset.thumbnail_url"
                    :alt="item.name"
                    class="w-16 h-16 object-cover rounded"
                  />
                  <div v-else class="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                    <UtensilsCrossed class="h-6 w-6 text-slate-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-sm text-slate-900 line-clamp-1">{{ item.name }}</h3>
                    <p v-if="item.price" class="text-sm font-semibold text-teal-600">¥{{ item.price }}</p>
                    <Badge v-if="item.is_halal" variant="success" size="sm" class="mt-1">Halal</Badge>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Restaurant Info -->
          <Card>
            <CardBody>
              <h3 class="font-semibold mb-3">Restaurant Info</h3>
              <div class="space-y-2 text-sm text-slate-700">
                <div v-if="restaurant.delivery_supported" class="flex items-center gap-2">
                  <Check class="h-4 w-4 text-teal-600" />
                  <span>Delivery Available</span>
                </div>
                <div v-if="restaurant.opening_hours" class="flex items-start gap-2">
                  <Clock class="h-4 w-4 text-teal-600 mt-0.5" />
                  <span class="text-xs">{{ formatOpeningHours(restaurant.opening_hours) }}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Reviews Section -->
      <div class="mt-12">
        <ReviewsSection entity-type="restaurant" :entity-id="restaurant.id" />
      </div>

      <!-- Cross-sell Widget -->
      <div class="mt-12">
        <CrossSellWidget 
          :items="relatedRestaurants" 
          title="You might also like"
          @click="handleRelatedRestaurantClick"
        />
      </div>
    </div>

    <div v-else class="px-4 sm:px-6 lg:px-8 py-12 text-center">
      <EmptyState
        title="Restaurant not found"
        description="The restaurant you're looking for doesn't exist or has been removed."
      >
        <Button variant="primary" @click="router.push('/services/halal-food')">Browse Restaurants</Button>
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
  Phone,
  MessageCircle,
  UtensilsCrossed,
  Check,
  Clock,
} from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
  SkeletonLoader,
  EmptyState,
  ImageCarousel,
  CrossSellWidget,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import ReviewsSection from '@/components/reviews/ReviewsSection.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const restaurant = ref<any>(null);
const relatedRestaurants = ref<any[]>([]);
const loadingRelated = ref(false);

function getImageUrls(): string[] {
  if (!restaurant.value) return [];
  const urls: string[] = [];
  
  if (restaurant.value.coverAsset?.public_url) {
    urls.push(restaurant.value.coverAsset.public_url);
  }
  
  if (restaurant.value.galleryAssets && Array.isArray(restaurant.value.galleryAssets)) {
    restaurant.value.galleryAssets.forEach((asset: any) => {
      if (asset.public_url && !urls.includes(asset.public_url)) {
        urls.push(asset.public_url);
      }
    });
  }
  
  return urls.length > 0 ? urls : ['/placeholder-restaurant.jpg'];
}

function formatOpeningHours(hours: any): string {
  if (typeof hours === 'string') return hours;
  if (typeof hours === 'object') {
    const entries = Object.entries(hours);
    if (entries.length > 0) {
      return entries.map(([day, time]) => `${day}: ${time}`).join(', ');
    }
  }
  return 'Check with restaurant';
}

async function loadRestaurant() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/public/catalog/restaurants/${route.params.id}`);
    restaurant.value = response.data;
    // Load related restaurants after current restaurant is loaded
    await loadRelatedRestaurants();
  } catch (error: any) {
    console.error('Failed to load restaurant', error);
    if (error.response?.status === 404) {
      restaurant.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function loadRelatedRestaurants() {
  if (!restaurant.value) return;
  
  loadingRelated.value = true;
  try {
    const params: any = {
      limit: 4,
    };
    
    // Exclude current restaurant
    if (restaurant.value.id) {
      params.exclude_id = restaurant.value.id;
    }
    
    // If restaurant has a city, try to get restaurants from same city
    if (restaurant.value.city_id) {
      params.city_id = restaurant.value.city_id;
    }
    
    // If restaurant has a cuisine type, we could filter by that too
    // But for now, just get restaurants from same city
    
    try {
      const response = await axios.get('/api/public/catalog/restaurants', { params });
      relatedRestaurants.value = response.data || [];
    } catch (e) {
      // If endpoint fails, try without filters
      try {
        const response = await axios.get('/api/public/catalog/restaurants', { 
          params: { limit: 4, exclude_id: restaurant.value.id } 
        });
        relatedRestaurants.value = response.data || [];
      } catch (e2) {
        relatedRestaurants.value = [];
      }
    }
  } catch (error) {
    console.error('Failed to load related restaurants', error);
    relatedRestaurants.value = [];
  } finally {
    loadingRelated.value = false;
  }
}

function handleRelatedRestaurantClick(item: any) {
  router.push(`/services/halal-food/restaurant/${item.id}`);
}

function handleOrderDelivery() {
  router.push({
    path: '/request',
    query: {
      category: 'food_delivery',
      restaurant_id: restaurant.value?.id,
      restaurant_name: restaurant.value?.name,
    },
  });
}

function viewFullMenu() {
  // Could navigate to a menu page or show modal
  router.push(`/services/halal-food?restaurant_id=${restaurant.value?.id}`);
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi, I'm interested in ${restaurant.value?.name || 'this restaurant'}`);
  window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
}

onMounted(() => {
  loadRestaurant();
});
</script>

