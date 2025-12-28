<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Search/Filter Bar -->
    <Card class="mb-6">
      <CardBody class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">City</label>
            <Select
              v-model="filters.city_id"
              :options="cityOptions"
              placeholder="All Cities"
              @update:model-value="loadRestaurants"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Cuisine Type</label>
            <Select
              v-model="filters.cuisine_type"
              :options="cuisineOptions"
              placeholder="All Cuisines"
              @update:model-value="loadRestaurants"
            />
          </div>
          <div class="flex items-end">
            <Button variant="primary" @click="loadRestaurants" class="w-full">Search</Button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Results -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" class="h-64" />
    </div>

    <div v-else-if="restaurants.length === 0" class="text-center py-12">
      <EmptyState
        title="No restaurants found"
        description="Try adjusting your filters or search criteria"
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="restaurant in restaurants"
        :key="restaurant.id"
        class="cursor-pointer group"
        :hover="true"
        @click="router.push(`/services/halal-food/restaurant/${restaurant.id}`)"
      >
        <div class="relative h-48 bg-slate-200 overflow-hidden">
          <img
            v-if="restaurant.coverAsset?.thumbnail_url || restaurant.coverAsset?.public_url"
            :src="restaurant.coverAsset?.thumbnail_url || restaurant.coverAsset?.public_url"
            :alt="restaurant.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div v-else class="w-full h-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
            <UtensilsCrossed class="h-12 w-12 text-teal-400" />
          </div>
          <div class="absolute top-2 right-2">
            <Badge v-if="restaurant.halal_verified" variant="success">Halal</Badge>
          </div>
        </div>
        <CardBody class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1 line-clamp-1">{{ restaurant.name }}</h3>
          <div v-if="restaurant.rating" class="flex items-center gap-1 mb-2">
            <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
            <span class="text-sm font-medium">{{ restaurant.rating.toFixed(1) }}</span>
            <span v-if="restaurant.review_count" class="text-xs text-slate-500">({{ restaurant.review_count }})</span>
          </div>
          <p v-if="restaurant.cuisine_type" class="text-xs text-slate-600 mb-2">
            {{ restaurant.cuisine_type }}
          </p>
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <MapPin class="h-3 w-3" />
            <span class="line-clamp-1">{{ restaurant.city?.name || restaurant.address }}</span>
          </div>
          <div v-if="restaurant.delivery_supported" class="mt-2">
            <Badge variant="default" size="sm">Delivery Available</Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MapPin, Star, UtensilsCrossed } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Select,
  Badge,
  SkeletonLoader,
  EmptyState,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const router = useRouter();
const loading = ref(true);
const restaurants = ref<any[]>([]);
const cities = ref<any[]>([]);

const filters = ref({
  city_id: '',
  cuisine_type: '',
});

const cityOptions = ref([{ value: '', label: 'All Cities' }]);
const cuisineOptions = ref([
  { value: '', label: 'All Cuisines' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Middle Eastern', label: 'Middle Eastern' },
  { value: 'Indian', label: 'Indian' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Malaysian', label: 'Malaysian' },
  { value: 'Indonesian', label: 'Indonesian' },
]);

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data || [];
    cityOptions.value = [
      { value: '', label: 'All Cities' },
      ...cities.value.map((city: any) => ({
        value: city.id,
        label: city.name,
      })),
    ];
  } catch (error) {
    console.error('Failed to load cities', error);
  }
}

async function loadRestaurants() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    
    const response = await axios.get('/api/public/catalog/restaurants', { params });
    let results = response.data || [];
    
    // Filter by cuisine type on client side (or add to API)
    if (filters.value.cuisine_type) {
      results = results.filter((r: any) => r.cuisine_type === filters.value.cuisine_type);
    }
    
    restaurants.value = results;
  } catch (error) {
    console.error('Failed to load restaurants', error);
    restaurants.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadCities();
  loadRestaurants();
});
</script>

