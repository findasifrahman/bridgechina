<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-amber-50">
    <!-- Hero Banner -->
    <div class="relative bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 overflow-hidden">
      <div class="absolute inset-0 opacity-20">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3"
          alt="Halal Food"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="flex-1 text-center md:text-left text-white">
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
              Halal Food
            </h1>
            <p class="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md">
              Authentic halal cuisine and restaurants across China
            </p>
            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🍽️ Restaurants
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🥘 Halal Certified
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🚚 Delivery
              </Badge>
              <Badge variant="secondary" size="lg" class="bg-white/20 backdrop-blur-sm text-white border-white/30">
                🌍 Authentic
              </Badge>
            </div>
          </div>
          <div class="flex-shrink-0">
            <div class="relative w-32 h-32 md:w-40 md:h-40">
              <UtensilsCrossed class="w-full h-full text-white drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <Tabs v-model="activeCategory" :tabs="categoryTabs" />
    </div>

    <!-- Filters and Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Filter Bar -->
      <Card class="mb-8 shadow-lg border-2 border-amber-200">
        <CardBody class="p-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Filter by City</label>
                <Select
                  v-model="filters.city_id"
                  :options="cityOptions"
                  placeholder="All Cities"
                  class="w-full"
                  @update:model-value="loadData"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Search</label>
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
            <div v-if="foodItems.length > 0" class="text-sm text-slate-600 whitespace-nowrap">
              {{ foodItems.length }} {{ foodItems.length === 1 ? 'item' : 'items' }} found
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Loading State -->
      <div v-if="loadingFoodItems" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonLoader v-for="i in 8" :key="i" class="h-80" />
      </div>

      <!-- Empty State -->
      <div v-else-if="foodItems.length === 0" class="text-center py-12">
        <EmptyState
          title="No food items found"
          description="Try adjusting your filters or check back later"
        />
      </div>

      <!-- Food Items List with Framed Images -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="item in foodItems"
          :key="item.id"
          class="cursor-pointer group"
          @click="router.push(`/services/halal-food/item/${item.id}`)"
        >
          <!-- Framed Image Card -->
          <Card class="h-full hover:shadow-xl transition-all duration-300">
            <div class="relative bg-white p-3 rounded-t-2xl">
              <div class="relative aspect-square bg-slate-200 rounded-lg overflow-hidden">
                <img
                  v-if="item.coverAsset?.thumbnail_url || item.coverAsset?.public_url"
                  :src="item.coverAsset?.thumbnail_url || item.coverAsset?.public_url"
                  :alt="item.name"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  @error="handleImageError"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                  <UtensilsCrossed class="h-16 w-16 text-amber-400" />
                </div>
                <div v-if="item.is_halal" class="absolute top-2 right-2">
                  <Badge variant="success" size="sm" class="shadow-lg">Halal</Badge>
                </div>
                <div v-if="item.rating" class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                  <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span class="text-sm font-semibold">{{ item.rating.toFixed(1) }}</span>
                </div>
              </div>
            </div>
            <CardBody class="p-4">
              <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2">{{ item.name }}</h3>
              <p v-if="item.restaurant?.name" class="text-xs text-slate-600 mb-3 line-clamp-1">{{ item.restaurant.name }}</p>
              <div class="flex items-center justify-between mb-3">
                <div class="text-lg font-bold text-amber-600">¥{{ item.price }}</div>
                <Button variant="primary" size="sm" @click.stop="handleRequestDelivery(item)">
                  Order
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>

    <!-- Login Modal -->
    <Modal v-model="showLoginModal" title="Login Required">
      <div class="p-6">
        <p class="text-center text-lg text-slate-700 mb-6">Please log in to order food.</p>
        <div class="flex gap-3">
          <Button variant="ghost" full-width @click="showLoginModal = false">Cancel</Button>
          <Button variant="primary" full-width @click="router.push('/login')">Log In</Button>
        </div>
        <p class="text-center text-sm text-slate-600 mt-4">
          Don't have an account? 
          <router-link to="/register" class="text-amber-600 hover:underline">Register here</router-link>
        </p>
      </div>
    </Modal>

    <!-- Confirmation Modal -->
    <Modal v-model="showConfirmModal" title="Confirm Order">
      <div class="p-6">
        <div v-if="selectedFoodItem" class="space-y-4">
          <div class="text-center">
            <CheckCircle class="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 class="text-2xl font-bold text-slate-900 mb-2">Thank you for your order, sir!</h3>
            <p class="text-slate-700 mb-4">
              A representative will contact you within 5 minutes. You can see the status on your account page.
            </p>
          </div>
          
          <Card class="bg-slate-50">
            <CardBody class="p-4">
              <div class="flex items-center gap-3 mb-2">
                <img
                  v-if="selectedFoodItem.coverAsset?.thumbnail_url || selectedFoodItem.coverAsset?.public_url"
                  :src="selectedFoodItem.coverAsset?.thumbnail_url || selectedFoodItem.coverAsset?.public_url"
                  :alt="selectedFoodItem.name"
                  class="w-16 h-16 object-cover rounded-lg"
                />
                <div class="flex-1">
                  <h4 class="font-semibold text-slate-900">{{ selectedFoodItem.name }}</h4>
                  <p class="text-sm text-slate-600">{{ selectedFoodItem.restaurant?.name }}</p>
                  <p class="text-lg font-bold text-amber-600 mt-1">¥{{ selectedFoodItem.price }}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div class="flex gap-3">
            <Button variant="ghost" full-width @click="showConfirmModal = false" :disabled="submitting">No, Cancel</Button>
            <Button variant="primary" full-width @click="createFoodOrder(selectedFoodItem)" :loading="submitting">
              Yes, Confirm Order
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { UtensilsCrossed, Star, CheckCircle } from 'lucide-vue-next';
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
  Modal,
  useToast,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const loadingFoodItems = ref(true);
const foodItems = ref<any[]>([]);
const foodCategories = ref<any[]>([]);
const cities = ref<any[]>([]);
const activeCategory = ref('all');
const showLoginModal = ref(false);
const showConfirmModal = ref(false);
const selectedFoodItem = ref<any>(null);
const submitting = ref(false);

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

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
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

async function createFoodOrder(item: any) {
  submitting.value = true;
  try {
    // Find or get default city (you may want to get from user's location or default)
    const defaultCityId = filters.value.city_id || cities.value[0]?.id || '';
    
    if (!defaultCityId) {
      toast.error('Please select a city first');
      return;
    }

    // Find halal_food category
    let category;
    try {
      const categoryResponse = await axios.get('/api/public/service-categories');
      category = categoryResponse.data.find((c: any) => c.key === 'halal_food');
    } catch (e) {
      // Category might not exist, will be created by backend
    }

    const response = await axios.post('/api/public/service-request', {
      category_key: 'halal_food',
      city_id: defaultCityId,
      customer_name: authStore.user?.email || authStore.user?.phone || 'User',
      phone: authStore.user?.phone || '',
      email: authStore.user?.email || null,
      request_payload: {
        food_item_id: item.id,
        food_item_name: item.name,
        food_item_price: item.price,
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant?.name,
      },
    });

    toast.success('Order placed successfully! A representative will contact you within 5 minutes.');
    showConfirmModal.value = false;
    selectedFoodItem.value = null;
    
    // Optionally redirect to account page
    setTimeout(() => {
      router.push('/user/requests');
    }, 2000);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to place order. Please try again.');
  } finally {
    submitting.value = false;
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
  await loadFoodItems();
}

function handleRequestDelivery(item: any) {
  if (!authStore.isAuthenticated) {
    showLoginModal.value = true;
    selectedFoodItem.value = item;
    return;
  }
  
  // Show confirmation dialog
  selectedFoodItem.value = item;
  showConfirmModal.value = true;
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
