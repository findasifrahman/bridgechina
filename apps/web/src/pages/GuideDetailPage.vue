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
                    v-if="guide.profile_photo_url"
                    :src="guide.profile_photo_url"
                    :alt="guide.name"
                    class="w-24 h-24 rounded-full object-cover"
                  />
                  <div v-else class="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
                    <User class="h-12 w-12 text-teal-400" />
                  </div>
                  <div v-if="guide.verified" class="absolute -bottom-1 -right-1">
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                </div>
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-slate-900 mb-2">{{ guide.name || 'Guide' }}</h1>
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

          <!-- Reviews -->
          <Card v-if="reviews.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Reviews</h2>
              <div class="space-y-4">
                <div
                  v-for="review in reviews"
                  :key="review.id"
                  class="border-b border-slate-200 pb-4 last:border-0"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <User class="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <div class="font-semibold text-sm">{{ review.user?.email || 'Anonymous' }}</div>
                        <div class="flex items-center gap-1">
                          <Star
                            v-for="i in 5"
                            :key="i"
                            class="h-3 w-3"
                            :class="i <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'"
                          />
                        </div>
                      </div>
                    </div>
                    <span class="text-xs text-slate-500">{{ formatDate(review.created_at) }}</span>
                  </div>
                  <p v-if="review.comment" class="text-sm text-slate-700">{{ review.comment }}</p>
                </div>
              </div>
            </CardBody>
          </Card>
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
              <Button variant="primary" full-width @click="handleRequestGuide" class="mb-4">
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
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const guide = ref<any>(null);
const reviews = ref<any[]>([]);
const relatedServices = ref<any[]>([]);

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
      
      // Load reviews
      try {
        const reviewsResponse = await axios.get(`/api/public/reviews`, {
          params: { entity_type: 'guide', entity_id: guideId },
        });
        reviews.value = reviewsResponse.data || [];
      } catch (e) {
        reviews.value = [];
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
  router.push({
    path: '/request',
    query: {
      category: 'guide',
      guide_id: guide.value?.id,
      guide_name: guide.value?.name,
    },
  });
}

onMounted(() => {
  loadGuide();
});
</script>

