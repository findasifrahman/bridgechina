<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <div v-if="loading" class="max-w-7xl mx-auto">
      <SkeletonLoader class="h-96 mb-6" />
      <div class="grid md:grid-cols-2 gap-6">
        <SkeletonLoader class="h-64" />
        <SkeletonLoader class="h-64" />
      </div>
    </div>

    <div v-else-if="plan" class="max-w-7xl mx-auto">
      <!-- Hero Image Section -->
      <div class="relative rounded-3xl overflow-hidden mb-8 h-96">
        <img
          v-if="plan.coverAsset?.public_url || plan.coverAsset?.thumbnail_url"
          :src="plan.coverAsset?.public_url || plan.coverAsset?.thumbnail_url"
          :alt="plan.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
          <Smartphone class="h-24 w-24 text-white/80" />
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div class="flex items-center gap-3 mb-2">
            <Badge variant="success" class="bg-white/20 backdrop-blur-sm">Active</Badge>
            <span class="text-sm">{{ plan.provider }}</span>
          </div>
          <h1 class="text-4xl md:text-5xl font-bold mb-2">{{ plan.name }}</h1>
          <p class="text-lg text-white/90">{{ plan.region_text }}</p>
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2 space-y-6">
          <!-- Plan Details Card -->
          <Card>
            <CardHeader>
              <h2 class="text-xl font-bold text-slate-900">Plan Details</h2>
            </CardHeader>
            <CardBody class="p-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <div class="bg-purple-100 rounded-lg p-2 flex-shrink-0">
                    <Database class="h-5 w-5 text-purple-600" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-slate-600 mb-0.5">Data</div>
                    <div class="font-semibold text-slate-900 text-sm truncate">{{ plan.data_text }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="bg-pink-100 rounded-lg p-2 flex-shrink-0">
                    <Calendar class="h-5 w-5 text-pink-600" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-slate-600 mb-0.5">Validity</div>
                    <div class="font-semibold text-slate-900 text-sm">{{ plan.validity_days }} days</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="bg-orange-100 rounded-lg p-2 flex-shrink-0">
                    <Globe class="h-5 w-5 text-orange-600" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-slate-600 mb-0.5">Region</div>
                    <div class="font-semibold text-slate-900 text-sm truncate">{{ plan.region_text }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="bg-teal-100 rounded-lg p-2 flex-shrink-0">
                    <Building2 class="h-5 w-5 text-teal-600" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs text-slate-600 mb-0.5">Provider</div>
                    <div class="font-semibold text-slate-900 text-sm truncate">{{ plan.provider }}</div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <!-- Description -->
          <Card v-if="plan.description">
            <CardHeader>
              <h2 class="text-xl font-bold text-slate-900">Description</h2>
            </CardHeader>
            <CardBody class="p-4">
              <p class="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{{ plan.description }}</p>
            </CardBody>
          </Card>

          <!-- Features -->
          <Card>
            <CardHeader>
              <h2 class="text-xl font-bold text-slate-900">Features</h2>
            </CardHeader>
            <CardBody class="p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="flex items-center gap-2">
                  <CheckCircle class="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span class="text-sm text-slate-700">Instant activation</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle class="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span class="text-sm text-slate-700">No SIM card swap needed</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle class="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span class="text-sm text-slate-700">Works on all eSIM-compatible devices</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle class="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span class="text-sm text-slate-700">Keep your original number</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- Sidebar -->
        <div>
          <Card class="sticky top-4">
            <CardBody class="p-5">
              <div class="text-center mb-5">
                <div class="text-3xl font-bold text-purple-600 mb-1">¥{{ plan.price }}</div>
                <div class="text-xs text-slate-600">CNY</div>
              </div>
              <Button
                variant="primary"
                full-width
                size="lg"
                class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 mb-4"
                @click="handlePurchase"
              >
                <ShoppingCart class="h-4 w-4 mr-2" />
                Purchase Now
              </Button>
              <div class="text-center text-xs text-slate-600 space-y-1.5">
                <div class="flex items-center justify-center gap-1.5">
                  <Shield class="h-3.5 w-3.5" />
                  <span>Secure payment</span>
                </div>
                <div class="flex items-center justify-center gap-1.5">
                  <Clock class="h-3.5 w-3.5" />
                  <span>Instant activation</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Reviews Section -->
      <div class="mt-12">
        <ReviewsSection entity-type="esim" :entity-id="plan.id" />
      </div>
    </div>

    <div v-else class="text-center py-12">
      <EmptyState title="Plan not found" description="The eSIM plan you're looking for doesn't exist" />
    </div>

    <!-- Purchase Modal -->
    <EsimPurchaseModal
      v-if="showModal"
      :plan="plan"
      @close="showModal = false"
      @purchased="handlePurchased"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Smartphone,
  Database,
  Calendar,
  Globe,
  Building2,
  CheckCircle,
  ShoppingCart,
  Shield,
  Clock,
} from 'lucide-vue-next';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  SkeletonLoader,
  EmptyState,
  Badge,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import EsimPurchaseModal from '@/components/esim/EsimPurchaseModal.vue';
import ReviewsSection from '@/components/reviews/ReviewsSection.vue';

const route = useRoute();
const router = useRouter();

const plan = ref<any>(null);
const loading = ref(true);
const showModal = ref(false);

async function loadPlan() {
  loading.value = true;
  try {
    const res = await axios.get(`/api/public/catalog/esim/${route.params.id}`);
    plan.value = res.data;
  } catch (error) {
    console.error('Failed to load esim plan', error);
    plan.value = null;
  } finally {
    loading.value = false;
  }
}

function handlePurchase() {
  showModal.value = true;
}

function handlePurchased() {
  showModal.value = false;
  // Optionally redirect or show success message
}

onMounted(() => {
  loadPlan();
});
</script>

