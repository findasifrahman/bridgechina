<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="px-4 sm:px-6 lg:px-8 py-8">
      <SkeletonLoader class="h-96 mb-6" />
      <SkeletonLoader class="h-64" />
    </div>

    <div v-else-if="foodItem" class="px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-6 flex items-center space-x-2 text-sm">
        <router-link to="/" class="text-slate-500 hover:text-teal-600">Home</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link to="/services/halal-food" class="text-slate-500 hover:text-teal-600">Halal Food</router-link>
        <ChevronRight class="h-4 w-4 text-slate-400" />
        <router-link
          v-if="foodItem.restaurant"
          :to="`/services/halal-food/restaurant/${foodItem.restaurant.id}`"
          class="text-slate-500 hover:text-teal-600"
        >
          {{ foodItem.restaurant.name }}
        </router-link>
        <ChevronRight v-if="foodItem.restaurant" class="h-4 w-4 text-slate-400" />
        <span class="text-slate-900 font-medium line-clamp-1">{{ foodItem.name }}</span>
      </nav>

      <!-- Image + Info Card -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <!-- Left: Image -->
        <div class="lg:col-span-2">
          <div class="relative aspect-video bg-slate-200 rounded-2xl overflow-hidden">
            <img
              v-if="foodItem.coverAsset?.public_url"
              :src="foodItem.coverAsset.public_url"
              :alt="foodItem.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
              <UtensilsCrossed class="h-16 w-16 text-teal-400" />
            </div>
          </div>
        </div>

        <!-- Right: Sticky Info Card -->
        <div class="lg:sticky lg:top-20 lg:h-fit">
          <Card class="border-2 border-teal-200">
            <CardBody class="p-6">
              <h1 class="text-2xl font-bold text-slate-900 mb-4 line-clamp-2">{{ foodItem.name }}</h1>
              
              <div v-if="foodItem.name_cn" class="text-lg text-slate-600 mb-4">{{ foodItem.name_cn }}</div>

              <div v-if="foodItem.price" class="mb-4">
                <div class="text-3xl font-bold text-teal-600">¥{{ foodItem.price }}</div>
              </div>

              <div class="flex flex-wrap gap-2 mb-4">
                <Badge v-if="foodItem.is_halal" variant="success">Halal</Badge>
                <Badge v-if="foodItem.category" variant="default">{{ foodItem.category.name }}</Badge>
                <Badge v-if="foodItem.spicy_level" variant="warning">{{ getSpicyLabel(foodItem.spicy_level) }}</Badge>
              </div>

              <div v-if="foodItem.restaurant" class="mb-4 p-3 bg-slate-50 rounded-lg">
                <div class="text-xs text-slate-600 mb-1">From Restaurant</div>
                <router-link
                  :to="`/services/halal-food/restaurant/${foodItem.restaurant.id}`"
                  class="font-semibold text-teal-600 hover:text-teal-700"
                >
                  {{ foodItem.restaurant.name }}
                </router-link>
              </div>

              <Button variant="primary" full-width size="lg" @click="handleOrderItem" class="mb-3">
                Order This Item
              </Button>
              
              <Button variant="secondary" full-width @click="openWhatsApp">
                <MessageCircle class="h-4 w-4 mr-2" />
                Contact via WhatsApp
              </Button>
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
              <h2 class="text-xl font-semibold mb-4">Description</h2>
              <p v-if="foodItem.description" class="text-slate-700 leading-relaxed">{{ foodItem.description }}</p>
              <p v-else class="text-slate-500 italic">No description available.</p>
            </CardBody>
          </Card>

          <!-- Ingredients -->
          <Card v-if="foodItem.ingredients && Array.isArray(foodItem.ingredients) && foodItem.ingredients.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Ingredients</h2>
              <div class="flex flex-wrap gap-2">
                <Badge v-for="ingredient in foodItem.ingredients" :key="ingredient" variant="default">{{ ingredient }}</Badge>
              </div>
            </CardBody>
          </Card>

          <!-- Allergens -->
          <Card v-if="foodItem.allergens && Array.isArray(foodItem.allergens) && foodItem.allergens.length > 0">
            <CardBody>
              <h2 class="text-xl font-semibold mb-4">Allergens</h2>
              <div class="flex flex-wrap gap-2">
                <Badge v-for="allergen in foodItem.allergens" :key="allergen" variant="warning">{{ allergen }}</Badge>
              </div>
            </CardBody>
          </Card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Nutrition Info (if available) -->
          <Card v-if="foodItem.nutrition_info">
            <CardBody>
              <h3 class="font-semibold mb-3">Nutrition Info</h3>
              <div class="text-sm text-slate-700 space-y-1">
                <div v-for="(value, key) in foodItem.nutrition_info" :key="key" class="flex justify-between">
                  <span class="text-slate-600">{{ key }}:</span>
                  <span class="font-medium">{{ value }}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- Reviews Section -->
      <div class="mt-12">
        <ReviewsSection entity-type="food" :entity-id="foodItem.id" />
      </div>

      <!-- Cross-sell Widget -->
      <div class="mt-12">
        <CrossSellWidget 
          :items="relatedFoodItems" 
          title="You might also like"
          @click="handleRelatedItemClick"
        />
      </div>
    </div>

    <div v-else class="px-4 sm:px-6 lg:px-8 py-12 text-center">
      <EmptyState
        title="Food item not found"
        description="The food item you're looking for doesn't exist or has been removed."
      >
        <Button variant="primary" @click="router.push('/services/halal-food')">Browse Food Items</Button>
      </EmptyState>
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
          <router-link to="/register" class="text-teal-600 hover:underline">Register here</router-link>
        </p>
      </div>
    </Modal>

    <!-- Confirmation Modal -->
    <Modal v-model="showConfirmModal" title="Confirm Order">
      <div class="p-6">
        <div v-if="foodItem" class="space-y-4">
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
                  v-if="foodItem.coverAsset?.thumbnail_url || foodItem.coverAsset?.public_url"
                  :src="foodItem.coverAsset?.thumbnail_url || foodItem.coverAsset?.public_url"
                  :alt="foodItem.name"
                  class="w-16 h-16 object-cover rounded-lg"
                />
                <div class="flex-1">
                  <h4 class="font-semibold text-slate-900">{{ foodItem.name }}</h4>
                  <p class="text-sm text-slate-600">{{ foodItem.restaurant?.name }}</p>
                  <p class="text-lg font-bold text-teal-600 mt-1">¥{{ foodItem.price }}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div class="flex gap-3">
            <Button variant="ghost" full-width @click="showConfirmModal = false" :disabled="submitting">No, Cancel</Button>
            <Button variant="primary" full-width @click="createFoodOrder" :loading="submitting">
              Yes, Confirm Order
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronRight,
  UtensilsCrossed,
  MessageCircle,
  CheckCircle,
} from 'lucide-vue-next';
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
const foodItem = ref<any>(null);
const showLoginModal = ref(false);
const showConfirmModal = ref(false);
const submitting = ref(false);
const cities = ref<any[]>([]);
const relatedFoodItems = ref<any[]>([]);
const loadingRelated = ref(false);

function getSpicyLabel(level: number): string {
  if (level === 0) return 'Not Spicy';
  if (level === 1) return 'Mild';
  if (level === 2) return 'Medium';
  if (level === 3) return 'Hot';
  if (level >= 4) return 'Very Hot';
  return 'Unknown';
}

async function loadFoodItem() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/public/catalog/food-items/${route.params.id}`);
    foodItem.value = response.data;
    // Load related items after current item is loaded
    await loadRelatedFoodItems();
  } catch (error: any) {
    console.error('Failed to load food item', error);
    if (error.response?.status === 404) {
      foodItem.value = null;
    }
  } finally {
    loading.value = false;
  }
}

function handleOrderItem() {
  if (!authStore.isAuthenticated) {
    showLoginModal.value = true;
    return;
  }
  
  // Show confirmation dialog
  showConfirmModal.value = true;
}

async function createFoodOrder() {
  if (!foodItem.value) return;
  
  submitting.value = true;
  try {
    // Get default city (use first city or foodItem's city)
    const defaultCityId = foodItem.value.restaurant?.city_id || cities.value[0]?.id || '';
    
    if (!defaultCityId) {
      toast.error('Please select a city first');
      return;
    }

    const response = await axios.post('/api/public/service-request', {
      category_key: 'halal_food',
      city_id: defaultCityId,
      customer_name: authStore.user?.email || authStore.user?.phone || 'User',
      phone: authStore.user?.phone || '',
      email: authStore.user?.email || null,
      request_payload: {
        food_item_id: foodItem.value.id,
        food_item_name: foodItem.value.name,
        food_item_price: foodItem.value.price,
        restaurant_id: foodItem.value.restaurant_id,
        restaurant_name: foodItem.value.restaurant?.name,
      },
    });

    toast.success('Order placed successfully! A representative will contact you within 5 minutes.');
    showConfirmModal.value = false;
    
    // Optionally redirect to account page
    setTimeout(() => {
      router.push('/app/requests');
    }, 2000);
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to place order. Please try again.');
  } finally {
    submitting.value = false;
  }
}

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data || [];
  } catch (error) {
    console.error('Failed to load cities', error);
  }
}

async function loadRelatedFoodItems() {
  if (!foodItem.value) return;
  
  loadingRelated.value = true;
  try {
    const params: any = {
      limit: 4,
    };
    
    // Exclude current item
    if (foodItem.value.id) {
      params.exclude_id = foodItem.value.id;
    }
    
    // If food item has a category, try to get items from same category
    if (foodItem.value.category_id) {
      params.category_id = foodItem.value.category_id;
    }
    
    // If food item has a restaurant, try to get items from same restaurant
    if (foodItem.value.restaurant_id) {
      params.restaurant_id = foodItem.value.restaurant_id;
    }
    
    try {
      const response = await axios.get('/api/public/catalog/food-items', { params });
      relatedFoodItems.value = response.data?.data || response.data || [];
    } catch (e) {
      // If endpoint fails, try without filters
      try {
        const response = await axios.get('/api/public/catalog/food-items', { 
          params: { limit: 4, exclude_id: foodItem.value.id } 
        });
        relatedFoodItems.value = response.data?.data || response.data || [];
      } catch (e2) {
        relatedFoodItems.value = [];
      }
    }
  } catch (error) {
    console.error('Failed to load related food items', error);
    relatedFoodItems.value = [];
  } finally {
    loadingRelated.value = false;
  }
}

function handleRelatedItemClick(item: any) {
  router.push(`/services/halal-food/item/${item.id}`);
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi, I'm interested in ordering ${foodItem.value?.name || 'this item'}`);
  window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
}

onMounted(async () => {
  await loadCities();
  await loadFoodItem();
});
</script>

