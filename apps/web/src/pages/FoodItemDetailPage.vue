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

      <!-- Cross-sell Widget -->
      <div class="mt-12">
        <CrossSellWidget />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronRight,
  UtensilsCrossed,
  MessageCircle,
} from 'lucide-vue-next';
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
const foodItem = ref<any>(null);

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
  router.push({
    path: '/request',
    query: {
      category: 'food_delivery',
      food_item_id: foodItem.value?.id,
      food_item_name: foodItem.value?.name,
      restaurant_id: foodItem.value?.restaurant?.id,
      restaurant_name: foodItem.value?.restaurant?.name,
    },
  });
}

function openWhatsApp() {
  const message = encodeURIComponent(`Hi, I'm interested in ordering ${foodItem.value?.name || 'this item'}`);
  window.open(`https://wa.me/1234567890?text=${message}`, '_blank');
}

onMounted(() => {
  loadFoodItem();
});
</script>

