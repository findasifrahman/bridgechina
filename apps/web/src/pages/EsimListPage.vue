<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Hero Section -->
    <div class="max-w-7xl mx-auto mb-8">
      <div class="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl p-8 md:p-12 text-white">
        <div class="flex items-center gap-4 mb-4">
          <div class="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <Smartphone class="h-12 w-12" />
          </div>
          <div>
            <h1 class="text-3xl md:text-4xl font-bold mb-2">eSIM Plans</h1>
            <p class="text-lg text-white/90">Stay connected in China without changing your SIM card</p>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="text-2xl font-bold">🌍</div>
            <div class="text-sm mt-1">Global Coverage</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="text-2xl font-bold">⚡</div>
            <div class="text-sm mt-1">Instant Activation</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="text-2xl font-bold">💰</div>
            <div class="text-sm mt-1">Best Prices</div>
          </div>
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="text-2xl font-bold">📱</div>
            <div class="text-sm mt-1">No SIM Swap</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="max-w-7xl mx-auto mb-6">
      <Card>
        <CardBody class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Region</label>
              <Select
                v-model="filters.region"
                :options="regionOptions"
                placeholder="All Regions"
                @update:model-value="loadPlans"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Price Range</label>
              <Select
                v-model="filters.price_range"
                :options="priceRangeOptions"
                placeholder="Any Price"
                @update:model-value="loadPlans"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Data Amount</label>
              <Select
                v-model="filters.data_amount"
                :options="dataAmountOptions"
                placeholder="Any Amount"
                @update:model-value="loadPlans"
              />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Plans Grid -->
    <div class="max-w-7xl mx-auto">
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader v-for="i in 6" :key="i" class="h-80" />
      </div>

      <div v-else-if="plans.length === 0" class="text-center py-12">
        <EmptyState
          title="No plans found"
          description="Try adjusting your filters"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          v-for="plan in plans"
          :key="plan.id"
          class="cursor-pointer group overflow-hidden"
          :hover="true"
          @click="router.push(`/services/esim/${plan.id}`)"
        >
          <div class="relative aspect-video bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 overflow-hidden">
            <img
              v-if="plan.coverAsset?.thumbnail_url || plan.coverAsset?.public_url"
              :src="plan.coverAsset?.thumbnail_url || plan.coverAsset?.public_url"
              :alt="plan.name"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <Smartphone class="h-16 w-16 text-white/80" />
            </div>
            <div class="absolute top-3 right-3">
              <Badge variant="success" size="sm" class="bg-white/90 text-purple-600">
                Active
              </Badge>
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div class="text-white font-bold text-xl">¥{{ plan.price }}</div>
              <div class="text-white/90 text-sm">{{ plan.validity_days }} days</div>
            </div>
          </div>
          <CardBody class="p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="font-bold text-slate-900 mb-1 text-lg">{{ plan.name }}</h3>
                <div class="flex items-center gap-2 text-sm text-slate-600">
                  <Globe class="h-4 w-4" />
                  <span>{{ plan.region_text }}</span>
                </div>
              </div>
              <div class="bg-purple-100 rounded-lg p-2">
                <Wifi class="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-sm">
                <Database class="h-4 w-4 text-purple-500" />
                <span class="text-slate-700">{{ plan.data_text }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <Building2 class="h-4 w-4 text-pink-500" />
                <span class="text-slate-700">{{ plan.provider }}</span>
              </div>
            </div>
            <Button variant="primary" full-width class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              View Details
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Smartphone, Globe, Wifi, Database, Building2 } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Select,
  SkeletonLoader,
  EmptyState,
  Badge,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const router = useRouter();

const plans = ref<any[]>([]);
const loading = ref(true);

const filters = ref({
  region: '',
  price_range: '',
  data_amount: '',
});

const regionOptions = [
  { value: '', label: 'All Regions' },
  { value: 'China', label: 'China' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Global', label: 'Global' },
];

const priceRangeOptions = [
  { value: '', label: 'Any Price' },
  { value: '0-50', label: 'Under ¥50' },
  { value: '50-100', label: '¥50 - ¥100' },
  { value: '100-200', label: '¥100 - ¥200' },
  { value: '200+', label: 'Over ¥200' },
];

const dataAmountOptions = [
  { value: '', label: 'Any Amount' },
  { value: '1-5', label: '1-5 GB' },
  { value: '5-10', label: '5-10 GB' },
  { value: '10-20', label: '10-20 GB' },
  { value: '20+', label: '20+ GB' },
];

async function loadPlans() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.region) {
      params.region = filters.value.region;
    }
    if (filters.value.price_range) {
      const [min, max] = filters.value.price_range.split('-');
      if (min) params.min_price = min === '200+' ? '200' : min;
      if (max && max !== '+') params.max_price = max;
    }
    
    const res = await axios.get('/api/public/catalog/esim', { params });
    plans.value = res.data;
  } catch (error) {
    console.error('Failed to load esim plans', error);
    plans.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadPlans();
});
</script>

