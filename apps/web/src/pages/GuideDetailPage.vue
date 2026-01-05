<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <div v-if="loading" class="space-y-6">
      <SkeletonLoader class="h-96" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="guide" class="max-w-7xl mx-auto">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/guide" class="text-slate-500 hover:text-teal-600">Guides</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium">{{ guide.name || 'Guide' }}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Profile Header -->
          <Card>
            <CardBody class="p-6">
              <div class="flex items-start gap-6">
                <div class="relative">
                  <img
                    v-if="getGuideImageUrl(guide)"
                    :src="getGuideImageUrl(guide)"
                    :alt="guide.name"
                    class="w-24 h-24 rounded-full object-cover"
                    @error="handleImageError"
                  />
                  <div v-else class="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
                    <User class="h-12 w-12 text-teal-400" />
                  </div>
                  <div v-if="guide.verified" class="absolute -bottom-1 -right-1">
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                </div>
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-slate-900 mb-2">{{ guide.display_name || guide.name || 'Guide' }}</h1>
                  <div class="flex items-center gap-4 mb-3">
                    <div v-if="guide.rating" class="flex items-center gap-1">
                      <Star class="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span class="font-semibold">{{ guide.rating.toFixed(1) }}</span>
                      <span v-if="guide.review_count" class="text-sm text-slate-500">({{ guide.review_count }} reviews)</span>
                    </div>
                    <div v-if="guide.hourly_rate" class="text-lg font-semibold text-teal-600">
                      ¥{{ guide.hourly_rate }}/hour
                    </div>
                  </div>
                  <div v-if="guide.languages && Array.isArray(guide.languages) && guide.languages.length > 0" class="flex flex-wrap gap-2">
                    <Badge
                      v-for="lang in guide.languages"
                      :key="lang"
                      variant="secondary"
                    >
                      {{ lang }}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Bio -->
          <Card v-if="guide.bio">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">About</h2>
              <p class="text-slate-700 leading-relaxed">{{ guide.bio }}</p>
            </CardBody>
          </Card>

          <!-- Gallery -->
          <Card v-if="guide.gallery_photos && guide.gallery_photos.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Gallery</h2>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <img
                  v-for="(photo, index) in guide.gallery_photos"
                  :key="index"
                  :src="photo"
                  :alt="`Gallery photo ${index + 1}`"
                  class="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  @click="openGallery(index)"
                />
              </div>
            </CardBody>
          </Card>

          <!-- Reviews Section -->
          <div class="mt-12">
            <ReviewsSection entity-type="guide" :entity-id="guide.id" />
          </div>
        </div>

        <!-- Right: Booking Card -->
        <div>
          <Card class="sticky top-4">
            <CardBody class="p-6">
              <h3 class="font-semibold text-slate-900 mb-4">Request This Guide</h3>
              <div v-if="guide.hourly_rate" class="mb-4">
                <div class="text-2xl font-bold text-teal-600">¥{{ guide.hourly_rate }}</div>
                <div class="text-sm text-slate-500">per hour</div>
              </div>
              <Button variant="primary" full-width @click="handleRequestGuide" class="mb-4" :disabled="submitting">
                Request Guide
              </Button>
              <div class="pt-4 border-t border-slate-200">
                <h4 class="text-sm font-semibold text-slate-900 mb-2">What's Included</h4>
                <ul class="text-sm text-slate-600 space-y-1">
                  <li v-if="guide.languages" class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-teal-600" />
                    Languages: {{ (guide.languages as string[]).join(', ') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-teal-600" />
                    Local expertise
                  </li>
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-teal-600" />
                    Translation support
                  </li>
                </ul>
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

    <div v-else class="text-center py-12">
      <EmptyState title="Guide not found" description="The guide you're looking for doesn't exist" />
    </div>

    <!-- Login Modal -->
    <Modal v-model="showLoginModal" title="Login Required">
      <div class="p-6 text-center">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p class="text-slate-700 mb-4">Thank you for choosing. Please log in to request this guide's service.</p>
          <div class="flex gap-3 justify-center">
            <Button variant="ghost" @click="showLoginModal = false">Cancel</Button>
            <Button variant="primary" @click="router.push('/login')">Log In</Button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Confirmation Modal -->
    <Modal v-model="showConfirmModal" title="Confirm Request">
      <div class="p-6">
        <div class="bg-teal-50 border border-teal-200 rounded-xl p-6">
          <p class="text-slate-700 mb-4">Thank you for choosing this guide. Press OK and we will contact you within 1 hour.</p>
          <div class="flex gap-3">
            <Button variant="ghost" full-width @click="showConfirmModal = false" :disabled="submitting">Cancel</Button>
            <Button variant="primary" full-width @click="createGuideRequest" :loading="submitting">OK</Button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { User, Star, ChevronRight, Check } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
  SkeletonLoader,
  EmptyState,
  CrossSellWidget,
  Modal,
  useToast,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import ReviewsSection from '@/components/reviews/ReviewsSection.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const guide = ref<any>(null);
const reviews = ref<any[]>([]);
const relatedServices = ref<any[]>([]);
const showLoginModal = ref(false);
const showConfirmModal = ref(false);
const submitting = ref(false);
const cities = ref<any[]>([]);

function getGuideImageUrl(guide: any): string | null {
  // Use coverAsset URLs (direct R2 URLs)
  if (guide?.coverAsset) {
    return guide.coverAsset.thumbnail_url || guide.coverAsset.public_url || null;
  }
  // Fallback to profile_photo_url if it exists
  return guide?.profile_photo_url || null;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function openGallery(index: number) {
  // Could implement a lightbox here
  console.log('Open gallery at index', index);
}

async function loadGuide() {
  loading.value = true;
  try {
    const guideId = route.params.id as string;
    // Try public endpoint, fallback gracefully
    try {
      const response = await axios.get(`/api/public/catalog/guides/${guideId}`);
      guide.value = response.data;
      
      // Load cities for service request
      try {
        const citiesResponse = await axios.get('/api/public/cities');
        cities.value = citiesResponse.data || [];
      } catch (e) {
        cities.value = [];
      }

      // Load related services (transport, food, hotels)
      try {
        const homeResponse = await axios.get('/api/public/home');
        relatedServices.value = [
          ...(homeResponse.data.top_restaurants || []).slice(0, 2),
          ...(homeResponse.data.top_hotels || []).slice(0, 2),
        ];
      } catch (e) {
        relatedServices.value = [];
      }
    } catch (e) {
      // Guide endpoint may not exist
      guide.value = null;
    }
  } catch (error) {
    console.error('Failed to load guide', error);
  } finally {
    loading.value = false;
  }
}

function handleRequestGuide() {
  if (!authStore.isAuthenticated) {
    showLoginModal.value = true;
    return;
  }
  
  // Show confirmation dialog
  showConfirmModal.value = true;
}

async function createGuideRequest() {
  if (!guide.value) return;
  
  submitting.value = true;
  try {
    // Get default city (use guide's city or first city)
    const defaultCityId = guide.value.city_id || cities.value[0]?.id || '';
    
    if (!defaultCityId) {
      toast.error('City information is missing. Please try again.');
      return;
    }

    // Use user endpoint if logged in, otherwise public endpoint
    const endpoint = authStore.isAuthenticated ? '/api/user/requests' : '/api/public/service-request';
    
    if (authStore.isAuthenticated) {
      // Use new user endpoint
      const response = await axios.post(endpoint, {
        categoryKey: 'guide',
        city_id: defaultCityId,
        payload: {
          guide_id: guide.value.id,
          guide_user_id: guide.value.user_id || null,
          guide_name: guide.value.display_name || guide.value.name,
          guide_hourly_rate: guide.value.hourly_rate,
          guide_daily_rate: guide.value.daily_rate,
          guide_languages: guide.value.languages,
        },
      });
      
      toast.success('Request submitted successfully! We will contact you within 1 hour.');
      showConfirmModal.value = false;
      
      setTimeout(() => {
        router.push(`/user/requests/${response.data.id}`);
      }, 2000);
    } else {
      // Use public endpoint (fallback, though this shouldn't happen if login modal works)
      const response = await axios.post(endpoint, {
        category_key: 'guide',
        city_id: defaultCityId,
        customer_name: authStore.user?.email?.split('@')[0] || authStore.user?.phone || 'User',
        phone: authStore.user?.phone || '',
        email: authStore.user?.email || null,
        request_payload: {
          guide_id: guide.value.id,
          guide_user_id: guide.value.user_id || null,
          guide_name: guide.value.display_name || guide.value.name,
          guide_hourly_rate: guide.value.hourly_rate,
          guide_daily_rate: guide.value.daily_rate,
          guide_languages: guide.value.languages,
        },
      });
      
      toast.success('Request submitted successfully! We will contact you within 1 hour.');
      showConfirmModal.value = false;
      
      setTimeout(() => {
        router.push('/user/requests');
      }, 2000);
    }

    toast.success('Request submitted successfully! We will contact you within 1 hour.');
    showConfirmModal.value = false;
    
    // Optionally redirect to account page
    setTimeout(() => {
      router.push('/user/requests');
    }, 2000);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to submit request. Please try again.');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadGuide();
});
</script>

