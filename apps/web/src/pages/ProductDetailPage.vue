<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="animate-pulse">
        <div class="h-96 bg-slate-200 rounded-lg mb-6" />
        <div class="h-8 bg-slate-200 rounded w-2/3 mb-4" />
        <div class="h-4 bg-slate-200 rounded w-full mb-2" />
        <div class="h-4 bg-slate-200 rounded w-3/4" />
      </div>
    </div>

    <div v-else-if="product" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" size="sm" @click="$router.push('/shopping')" class="mb-4">
        ← Back to Shopping
      </Button>

      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="grid md:grid-cols-2 gap-8 p-6">
          <!-- Product Images -->
          <div>
            <div class="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4">
              <img
                v-if="getProductImage(product)"
                :src="getProductImage(product)"
                :alt="product.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                <Package class="h-32 w-32" />
              </div>
            </div>
          </div>

          <!-- Product Info -->
          <div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">{{ product.title }}</h1>
            <Badge class="mb-4">{{ product.category?.name }}</Badge>
            
            <div class="mb-6">
              <div class="text-4xl font-bold text-teal-600 mb-2">
                ¥{{ product.price }} {{ product.currency }}
              </div>
              <div class="flex items-center gap-4">
                <Badge :variant="product.stock_qty > 0 ? 'success' : 'danger'">
                  {{ product.stock_qty > 0 ? `In Stock (${product.stock_qty})` : 'Out of Stock' }}
                </Badge>
              </div>
            </div>

            <div v-if="product.description" class="mb-6">
              <h3 class="font-semibold mb-2">Description</h3>
              <p class="text-slate-700 whitespace-pre-line">{{ product.description }}</p>
            </div>

            <div class="flex gap-4">
              <Input
                v-model.number="quantity"
                type="number"
                :min="1"
                :max="product.stock_qty"
                class="w-24"
              />
              <Button
                variant="primary"
                :disabled="product.stock_qty === 0 || quantity < 1"
                @click="addToCart"
                class="flex-1"
              >
                <ShoppingCart class="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>

            <div class="mt-6 pt-6 border-t border-slate-200">
              <h3 class="font-semibold mb-2">Seller Information</h3>
              <p class="text-sm text-slate-600">{{ product.seller?.email || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <EmptyState
        title="Product not found"
        description="The product you're looking for doesn't exist or has been removed"
      />
      <div class="text-center mt-6">
        <Button variant="primary" @click="$router.push('/shopping')">
          Back to Shopping
        </Button>
      </div>

      <!-- Cross-Sell -->
      <div class="mt-8">
        <CrossSellWidget :items="relatedProducts" title="You may also like" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Package, ShoppingCart } from 'lucide-vue-next';
import {
  Button,
  Badge,
  Input,
  EmptyState,
  CrossSellWidget,
} from '@bridgechina/ui';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const product = ref<any>(null);
const relatedProducts = ref<any[]>([]);
const loading = ref(true);
const quantity = ref(1);

function getProductImage(product: any): string {
  if (product.cover_asset_id) {
    return `https://placeholder.com/600x600?text=${encodeURIComponent(product.title)}`;
  }
  if (product.images && Array.isArray(product.images) && product.images[0]) {
    return product.images[0];
  }
  return '';
}

async function loadProduct() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/public/shopping/products/${route.params.id}`);
    product.value = response.data;

    // Load related products (same category)
    if (product.value?.category_id) {
      try {
        const relatedRes = await axios.get(`/api/public/shopping/products?category_id=${product.value.category_id}&limit=4`);
        relatedProducts.value = (relatedRes.data || []).filter((p: any) => p.id !== product.value.id).slice(0, 4);
      } catch (e) {
        console.error('Failed to load related products', e);
      }
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      product.value = null;
    } else {
      toast.error('Failed to load product');
    }
  } finally {
    loading.value = false;
  }
}

function addToCart() {
  // TODO: Implement cart functionality
  toast.success(`Added ${quantity.value} item(s) to cart`);
}

onMounted(() => {
  loadProduct();
});
</script>

