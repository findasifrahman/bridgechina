<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Category Tabs -->
    <div class="mb-6">
      <Tabs v-model="activeCategory" :tabs="categoryTabs" />
    </div>

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
              @update:model-value="loadData"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Search</label>
            <Input
              v-model="filters.search"
              placeholder="Search restaurants or dishes..."
              @input="debouncedSearch"
            />
          </div>
          <div class="flex items-end">
            <Button variant="primary" @click="loadData" class="w-full">Search</Button>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Restaurants Section -->
    <div v-if="activeCategory === 'restaurants'" class="mb-8">
      <h2 class="text-lg font-semibold text-slate-900 mb-4">Restaurants</h2>
      <div v-if="loadingRestaurants" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonLoader v-for="i in 6" :key="i" class="h-64" />
      </div>
      <div v-else-if="restaurants.length === 0" class="text-center py-12">
        <EmptyState title="No restaurants found" description="Try adjusting your filters" />
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          class="cursor-pointer group"
          :hover="true"
          @click="router.push(`/services/halal-food/restaurant/${restaurant.id}`)"
        >
          <div class="relative aspect-video bg-slate-200 rounded-t-2xl overflow-hidden">
            <img
              v-if="restaurant.coverAsset?.thumbnail_url || restaurant.coverAsset?.public_url"
              :src="restaurant.coverAsset?.thumbnail_url || restaurant.coverAsset?.public_url"
              :alt="restaurant.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
              <UtensilsCrossed class="h-12 w-12 text-teal-400" />
            </div>
            <div v-if="restaurant.halal_verified" class="absolute top-2 right-2">
              <Badge variant="success" size="sm">Halal</Badge>
            </div>
          </div>
          <CardBody class="p-4">
            <h3 class="font-semibold text-slate-900 mb-1 line-clamp-1">{{ restaurant.name }}</h3>
            <p class="text-xs text-slate-600 mb-2">{{ restaurant.city?.name }} • {{ restaurant.cuisine_type || 'Restaurant' }}</p>
            <div class="flex items-center justify-between mb-2">
              <div v-if="restaurant.rating" class="flex items-center gap-1">
                <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
                <span class="text-xs font-medium">{{ restaurant.rating.toFixed(1) }}</span>
              </div>
              <div v-if="restaurant.delivery_supported" class="text-xs text-slate-500">Delivery Available</div>
            </div>
            <Button variant="primary" size="sm" class="w-full mt-3" @click.stop="handleViewRestaurant(restaurant)">
              View Menu
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- Food Items Section -->
    <div v-else>
      <h2 class="text-lg font-semibold text-slate-900 mb-4">
        {{ activeCategory === 'all' ? 'All Food Items' : `Food Items - ${getCategoryName(activeCategory)}` }}
      </h2>
      <div v-if="loadingFoodItems" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonLoader v-for="i in 8" :key="i" class="h-64" />
      </div>
      <div v-else-if="foodItems.length === 0" class="text-center py-12">
        <EmptyState title="No food items found" description="Try selecting a different category" />
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          v-for="item in foodItems"
          :key="item.id"
          class="cursor-pointer group"
          :hover="true"
          @click="router.push(`/services/halal-food/item/${item.id}`)"
        >
          <div class="relative aspect-square bg-slate-200 rounded-t-2xl overflow-hidden">
            <img
              v-if="item.coverAsset?.thumbnail_url || item.coverAsset?.public_url"
              :src="item.coverAsset?.thumbnail_url || item.coverAsset?.public_url"
              :alt="item.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
              <UtensilsCrossed class="h-12 w-12 text-teal-400" />
            </div>
            <div v-if="item.is_halal" class="absolute top-2 right-2">
              <Badge variant="success" size="xs">Halal</Badge>
            </div>
          </div>
          <CardBody class="p-4">
            <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2 text-sm">{{ item.name }}</h3>
            <p class="text-xs text-slate-600 mb-2">{{ item.restaurant?.name }}</p>
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-teal-600">¥{{ item.price }}</div>
              <Button variant="ghost" size="sm" @click.stop="handleRequestDelivery(item)">
                Order
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { UtensilsCrossed, Star } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Select,
  Input,
  Badge,
  SkeletonLoader,
  EmptyState,
  Tabs,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const router = useRouter();

const loadingRestaurants = ref(true);
const loadingFoodItems = ref(true);
const restaurants = ref<any[]>([]);
const foodItems = ref<any[]>([]);
const foodCategories = ref<any[]>([]);
const cities = ref<any[]>([]);
const activeCategory = ref('restaurants');

const filters = ref({
  city_id: '',
  search: '',
  category_id: '',
});

const cityOptions = ref<any[]>([]);
const categoryTabs = ref<any[]>([]);

let searchTimeout: NodeJS.Timeout;

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadData();
  }, 500);
}

function getCategoryName(categoryId: string): string {
  if (categoryId === 'all') return 'All';
  const category = foodCategories.value.find(c => c.id === categoryId);
  return category?.name || categoryId;
}

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

async function loadFoodCategories() {
  try {
    // Try public endpoint first, fallback to empty if not available
    try {
      const response = await axios.get('/api/public/catalog/food-categories');
      foodCategories.value = response.data || [];
    } catch (e) {
      // Endpoint may not exist, use empty array
      foodCategories.value = [];
    }
    categoryTabs.value = [
      { value: 'restaurants', label: 'Restaurants' },
      { value: 'all', label: 'All Food' },
      ...foodCategories.value.map((cat: any) => ({
        value: cat.id,
        label: cat.name,
      })),
    ];
  } catch (error) {
    console.error('Failed to load food categories', error);
  }
}

async function loadRestaurants() {
  loadingRestaurants.value = true;
  try {
    const params: any = {};
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    if (filters.value.search) params.search = filters.value.search;

    const response = await axios.get('/api/public/catalog/restaurants', { params });
    restaurants.value = response.data || [];
  } catch (error) {
    console.error('Failed to load restaurants', error);
  } finally {
    loadingRestaurants.value = false;
  }
}

async function loadFoodItems() {
  loadingFoodItems.value = true;
  try {
    const params: any = {};
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    if (filters.value.search) params.search = filters.value.search;
    if (activeCategory.value !== 'all' && activeCategory.value !== 'restaurants') {
      params.category_id = activeCategory.value;
    }

    // Try public endpoint, fallback gracefully if not available
    try {
      const response = await axios.get('/api/public/catalog/food-items', { params });
      foodItems.value = response.data?.data || response.data || [];
    } catch (e) {
      // Endpoint may not exist yet
      foodItems.value = [];
    }
  } catch (error) {
    console.error('Failed to load food items', error);
  } finally {
    loadingFoodItems.value = false;
  }
}

async function loadData() {
  if (activeCategory.value === 'restaurants') {
    await loadRestaurants();
  } else {
    await loadFoodItems();
  }
}

function handleViewRestaurant(restaurant: any) {
  router.push(`/services/halal-food/restaurant/${restaurant.id}`);
}

function handleRequestDelivery(item: any) {
  router.push({
    path: '/request',
    query: {
      category: 'food',
      food_item_id: item.id,
      restaurant_id: item.restaurant_id,
    },
  });
}

watch(activeCategory, () => {
  loadData();
});

onMounted(async () => {
  await loadCities();
  await loadFoodCategories();
  await loadData();
});
</script>

