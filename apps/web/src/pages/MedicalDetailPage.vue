<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <div v-if="loading" class="space-y-6">
      <SkeletonLoader class="h-96" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="medicalCenter" class="max-w-7xl mx-auto">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-red-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/medical" class="text-slate-500 hover:text-red-600">Medical Help</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium">{{ medicalCenter.name }}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left: Main Info -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Header -->
          <Card>
            <CardBody class="p-6">
              <div class="flex items-start gap-6">
                <div class="relative">
                  <img
                    v-if="getMedicalImageUrl(medicalCenter)"
                    :src="getMedicalImageUrl(medicalCenter)"
                    :alt="medicalCenter.name"
                    class="w-24 h-24 rounded-xl object-cover"
                    @error="handleImageError"
                  />
                  <div v-else class="w-24 h-24 rounded-xl bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                    <HeartPulse class="h-12 w-12 text-red-400" />
                  </div>
                  <div v-if="medicalCenter.verified" class="absolute -bottom-1 -right-1">
                    <Badge variant="success" size="sm">Verified</Badge>
                  </div>
                  <div v-if="medicalCenter.emergency_available" class="absolute -top-1 -left-1">
                    <Badge variant="accent" size="sm" class="bg-red-500 text-white">24/7</Badge>
                  </div>
                </div>
                <div class="flex-1">
                  <h1 class="text-2xl font-bold text-slate-900 mb-2">{{ medicalCenter.name }}</h1>
                  <div class="flex items-center gap-4 mb-3">
                    <div v-if="medicalCenter.rating" class="flex items-center gap-1">
                      <Star class="h-5 w-5 fill-amber-400 text-amber-400" />
                      <span class="font-semibold">{{ medicalCenter.rating.toFixed(1) }}</span>
                      <span v-if="medicalCenter.review_count" class="text-sm text-slate-500">({{ medicalCenter.review_count }} reviews)</span>
                    </div>
                    <div v-if="medicalCenter.type" class="text-lg font-semibold text-red-600">
                      {{ medicalCenter.type }}
                    </div>
                  </div>
                  <div v-if="medicalCenter.languages && Array.isArray(medicalCenter.languages) && medicalCenter.languages.length > 0" class="flex flex-wrap gap-2 mb-2">
                    <Badge
                      v-for="lang in medicalCenter.languages"
                      :key="lang"
                      variant="secondary"
                    >
                      {{ lang }}
                    </Badge>
                  </div>
                  <div v-if="medicalCenter.city" class="flex items-center gap-1 text-slate-600">
                    <MapPin class="h-4 w-4" />
                    <span>{{ medicalCenter.city.name }}</span>
                  </div>
                  <div v-if="medicalCenter.address" class="flex items-center gap-1 text-slate-600 mt-1">
                    <MapPin class="h-4 w-4 text-slate-400" />
                    <span class="text-sm">{{ medicalCenter.address }}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Description -->
          <Card v-if="medicalCenter.description">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">About This Medical Center</h2>
              <p class="text-slate-700 leading-relaxed">{{ medicalCenter.description }}</p>
            </CardBody>
          </Card>

          <!-- Services -->
          <Card v-if="medicalCenter.services && Object.keys(medicalCenter.services).length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Services Offered</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(value, key) in medicalCenter.services" :key="key" class="flex items-center gap-2">
                  <Check class="h-5 w-5 text-red-600" />
                  <span class="text-slate-700 capitalize">{{ key.replace(/_/g, ' ') }}: {{ value }}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Specialties -->
          <Card v-if="medicalCenter.specialties && Array.isArray(medicalCenter.specialties) && medicalCenter.specialties.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Specialties</h2>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="specialty in medicalCenter.specialties"
                  :key="specialty"
                  variant="primary"
                >
                  {{ specialty }}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <!-- Opening Hours -->
          <Card v-if="medicalCenter.opening_hours">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock class="h-5 w-5 text-red-600" />
                Opening Hours
              </h2>
              <div class="space-y-2">
                <div
                  v-for="(hours, day) in parseOpeningHours(medicalCenter.opening_hours)"
                  :key="day"
                  class="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                >
                  <span class="font-medium text-slate-700">{{ day }}</span>
                  <span class="text-slate-600">{{ hours || 'Closed' }}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Contact Information -->
          <Card v-if="medicalCenter.contact_phone || medicalCenter.contact_email || medicalCenter.website">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Contact Information</h2>
              <div class="space-y-3">
                <div v-if="medicalCenter.contact_phone" class="flex items-center gap-2">
                  <Phone class="h-5 w-5 text-red-600" />
                  <a :href="`tel:${medicalCenter.contact_phone}`" class="text-slate-700 hover:text-red-600">
                    {{ medicalCenter.contact_phone }}
                  </a>
                </div>
                <div v-if="medicalCenter.contact_email" class="flex items-center gap-2">
                  <Mail class="h-5 w-5 text-red-600" />
                  <a :href="`mailto:${medicalCenter.contact_email}`" class="text-slate-700 hover:text-red-600">
                    {{ medicalCenter.contact_email }}
                  </a>
                </div>
                <div v-if="medicalCenter.website" class="flex items-center gap-2">
                  <Globe class="h-5 w-5 text-red-600" />
                  <a :href="medicalCenter.website" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-red-600">
                    {{ medicalCenter.website }}
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Reviews Section -->
          <div class="mt-12">
            <ReviewsSection entity-type="medical" :entity-id="medicalCenter.id" />
          </div>
        </div>

        <!-- Right: Request Card -->
        <div>
          <Card class="sticky top-4">
            <CardBody class="p-6">
              <h3 class="font-semibold text-slate-900 mb-4">Request Medical Assistance</h3>
              <div v-if="medicalCenter.emergency_available" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center gap-2 text-red-700 font-semibold">
                  <AlertCircle class="h-5 w-5" />
                  <span>24/7 Emergency Available</span>
                </div>
              </div>
              <Button variant="primary" full-width @click="handleRequestMedical" class="mb-4" :disabled="submitting">
                Request Assistance
              </Button>
              <div class="pt-4 border-t border-slate-200">
                <h4 class="text-sm font-semibold text-slate-900 mb-2">What's Included</h4>
                <ul class="text-sm text-slate-600 space-y-1">
                  <li v-if="medicalCenter.languages" class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-red-600" />
                    Languages: {{ (medicalCenter.languages as string[]).join(', ') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-red-600" />
                    Professional medical staff
                  </li>
                  <li class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-red-600" />
                    Translation support
                  </li>
                  <li v-if="medicalCenter.emergency_available" class="flex items-center gap-2">
                    <Check class="h-4 w-4 text-red-600" />
                    24/7 emergency services
                  </li>
                </ul>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Related Services -->
      <div class="mt-8">
        <CrossSellWidget :items="relatedServices" title="You may also need" />
      </div>
    </div>

    <div v-else class="text-center py-12">
      <EmptyState title="Medical center not found" description="The medical center you're looking for doesn't exist" />
    </div>

    <!-- Login Modal -->
    <Modal v-model="showLoginModal" title="Login Required">
      <div class="p-6 text-center">
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p class="text-slate-700 mb-4">Thank you for choosing. Please log in to request medical assistance.</p>
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
        <div class="bg-red-50 border border-red-200 rounded-xl p-6">
          <p class="text-slate-700 mb-4">Thank you for choosing this medical center. Press OK and we will contact you within 1 hour.</p>
          <div class="flex gap-3">
            <Button variant="ghost" full-width @click="showConfirmModal = false" :disabled="submitting">Cancel</Button>
            <Button variant="primary" full-width @click="createMedicalRequest" :loading="submitting">OK</Button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { HeartPulse, Star, ChevronRight, Check, MapPin, Phone, Mail, Globe, Clock, AlertCircle } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
  SkeletonLoader,
  EmptyState,
  Modal,
  useToast,
  CrossSellWidget,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import ReviewsSection from '@/components/reviews/ReviewsSection.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const medicalCenter = ref<any>(null);
const relatedServices = ref<any[]>([]);
const showLoginModal = ref(false);
const showConfirmModal = ref(false);
const submitting = ref(false);
const cities = ref<any[]>([]);

function getMedicalImageUrl(center: any): string | null {
  if (center?.coverAsset) {
    return center.coverAsset.thumbnail_url || center.coverAsset.public_url || null;
  }
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

async function loadMedicalCenter() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const response = await axios.get(`/api/public/catalog/medical/${id}`);
    
    if (response.data.error) {
      medicalCenter.value = null;
      return;
    }
    
    medicalCenter.value = response.data;

    // Load cities for service request
    try {
      const citiesResponse = await axios.get('/api/public/cities');
      cities.value = citiesResponse.data || [];
    } catch (e) {
      cities.value = [];
    }

    // Load related services (hotels, restaurants, transport in same city)
    if (medicalCenter.value && medicalCenter.value.city_id) {
      try {
        const [hotelsRes, restaurantsRes, transportRes] = await Promise.all([
          axios.get(`/api/public/catalog/hotels?city_id=${medicalCenter.value.city_id}&limit=2`).catch(() => ({ data: [] })),
          axios.get(`/api/public/catalog/restaurants?city_id=${medicalCenter.value.city_id}&limit=2`).catch(() => ({ data: [] })),
          axios.get(`/api/public/catalog/transport?city_id=${medicalCenter.value.city_id}&limit=2`).catch(() => ({ data: [] })),
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
    console.error('Failed to load medical center', error);
    if (error.response?.status === 404 || error.response?.status === 400) {
      medicalCenter.value = null;
    } else {
      toast.error('Failed to load medical center details');
    }
  } finally {
    loading.value = false;
  }
}

function handleRequestMedical() {
  if (!authStore.isAuthenticated) {
    showLoginModal.value = true;
    return;
  }
  
  // Show confirmation dialog
  showConfirmModal.value = true;
}

async function createMedicalRequest() {
  if (!medicalCenter.value) return;
  
  submitting.value = true;
  try {
    // Get default city (use medical center's city or first city)
    const defaultCityId = medicalCenter.value.city_id || cities.value[0]?.id || '';
    
    if (!defaultCityId) {
      toast.error('City information is missing. Please try again.');
      return;
    }

    const response = await axios.post('/api/public/service-request', {
      category_key: 'medical',
      city_id: defaultCityId,
      customer_name: authStore.user?.email?.split('@')[0] || authStore.user?.phone || 'User',
      phone: authStore.user?.phone || '',
      email: authStore.user?.email || null,
      request_payload: {
        medical_center_id: medicalCenter.value.id,
        medical_center_name: medicalCenter.value.name,
        medical_center_type: medicalCenter.value.type,
        medical_center_address: medicalCenter.value.address,
        languages: medicalCenter.value.languages,
        emergency_available: medicalCenter.value.emergency_available,
      },
    });

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
  loadMedicalCenter();
});
</script>

