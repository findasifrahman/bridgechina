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
            <div class="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4 border border-slate-200">
              <img
                v-if="selectedImage || product.imageUrl"
                :src="selectedImage || product.imageUrl"
                :alt="product.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                <Package class="h-32 w-32" />
              </div>
            </div>
            <div v-if="product.images && product.images.length > 1" class="grid grid-cols-4 gap-2">
              <img
                v-for="(img, idx) in product.images.slice(0, 8)"
                :key="idx"
                :src="img"
                :alt="`${product.title} ${idx + 1}`"
                class="aspect-square object-cover rounded border-2 cursor-pointer transition-all"
                :class="selectedImage === img ? 'border-teal-500' : 'border-slate-200 hover:border-teal-300'"
                @click="selectedImage = img"
              />
            </div>
          </div>

          <!-- Product Info -->
          <div class="space-y-6">
            <div>
              <h1 class="text-3xl font-bold text-slate-900 mb-3">{{ product.title }}</h1>
              
              <!-- Rating and Sales -->
              <div class="flex items-center gap-4 mb-4">
                <div v-if="product.rating" class="flex items-center gap-1">
                  <Star v-for="i in 5" :key="i" class="h-5 w-5" :class="i <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'" />
                  <span class="ml-2 text-sm font-medium text-slate-700">{{ product.rating.toFixed(1) }}</span>
                  <span v-if="product.ratingCount" class="text-sm text-slate-500">({{ product.ratingCount }} reviews)</span>
                </div>
                <div v-if="product.totalSold" class="text-sm text-slate-600">
                  Total sold: {{ formatNumber(product.totalSold) }}
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="border-t border-b border-slate-200 py-4">
              <div class="text-4xl font-bold text-teal-600 mb-3">
                <span v-if="product.priceMin && product.priceMax && product.priceMin !== product.priceMax">
                  ¥{{ product.priceMin }} - ¥{{ product.priceMax }}
                </span>
                <span v-else-if="product.priceMin">¥{{ product.priceMin }}</span>
                <span v-else>Price on request</span>
                <span class="text-lg text-slate-600 ml-2">{{ product.currency }}</span>
              </div>
              
              <!-- Tiered Pricing -->
              <div v-if="product.tieredPricing && product.tieredPricing.length > 0" class="mt-3 space-y-2">
                <div class="text-sm font-semibold text-slate-700 mb-2">Pricing Tiers:</div>
                <div v-for="(tier, idx) in product.tieredPricing" :key="idx" class="flex items-center justify-between text-sm">
                  <span class="text-slate-600">
                    {{ tier.minQty }}{{ tier.maxQty ? ` - ${tier.maxQty}` : '+' }} pieces
                  </span>
                  <span class="font-semibold text-teal-600">¥{{ tier.price }}</span>
                </div>
              </div>
            </div>

            <!-- Availability -->
            <div v-if="product.availableQuantity !== undefined" class="text-sm">
              <span class="font-semibold text-slate-700">Available Quantity:</span>
              <span class="ml-2 text-slate-600">{{ formatNumber(product.availableQuantity) }}</span>
            </div>

            <!-- Stock -->
            <div v-if="product.stock !== undefined" class="text-sm">
              <span class="font-semibold text-slate-700">Stock:</span>
              <span class="ml-2 text-slate-600">{{ formatNumber(product.stock) }}</span>
            </div>

            <!-- SKU Selection -->
            <div v-if="product.skus && product.skus.length > 0" class="border border-slate-200 rounded-lg p-4">
              <div class="text-sm font-semibold text-slate-700 mb-3">Size / Price / Stock / Quantity</div>
              <div class="space-y-2">
                <div v-for="(sku, idx) in product.skus.slice(0, 5)" :key="idx" class="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-slate-900">{{ sku.props_names || sku.specid || `SKU ${idx + 1}` }}</div>
                    <div class="text-xs text-slate-600">
                      Price: ¥{{ sku.sale_price || sku.price || 'N/A' }} | 
                      Stock: {{ formatNumber(sku.stock || 0) }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      @click="updateSkuQuantity(sku, -1)"
                      class="w-8 h-8 flex items-center justify-center border border-red-300 text-red-600 rounded hover:bg-red-50"
                      :disabled="!selectedSkus[sku.specid || idx] || selectedSkus[sku.specid || idx] <= 0"
                    >
                      <Minus class="h-4 w-4" />
                    </button>
                    <input
                      v-model.number="selectedSkus[sku.specid || idx]"
                      type="number"
                      min="0"
                      class="w-16 h-8 text-center border border-slate-300 rounded text-sm"
                    />
                    <button
                      @click="updateSkuQuantity(sku, 1)"
                      class="w-8 h-8 flex items-center justify-center border border-teal-300 text-teal-600 rounded hover:bg-teal-50"
                    >
                      <Plus class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <button v-if="product.skus.length > 5" class="mt-2 text-sm text-teal-600 hover:text-teal-700">
                VIEW ALL ↓
              </button>
            </div>

            <!-- Quantity Selection (if no SKUs) -->
            <div v-else class="flex gap-4 items-end">
              <div class="flex-1">
                <label class="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <div class="flex items-center gap-2">
                  <button
                    @click="quantity = Math.max(1, quantity - 1)"
                    class="w-10 h-10 flex items-center justify-center border border-red-300 text-red-600 rounded hover:bg-red-50"
                    :disabled="quantity <= 1"
                  >
                    <Minus class="h-4 w-4" />
                  </button>
                  <Input
                    v-model.number="quantity"
                    type="number"
                    :min="1"
                    class="w-24 text-center"
                  />
                  <button
                    @click="quantity++"
                    class="w-10 h-10 flex items-center justify-center border border-teal-300 text-teal-600 rounded hover:bg-teal-50"
                  >
                    <Plus class="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Button
                variant="primary"
                :disabled="quantity < 1"
                @click="requestToBuy"
                class="flex-1 h-10"
              >
                <ShoppingCart class="h-4 w-4 mr-2" />
                Request to Buy
              </Button>
            </div>

            <!-- Seller Info -->
            <div v-if="product.sellerName" class="border-t border-slate-200 pt-4">
              <h3 class="font-semibold text-slate-900 mb-2">Seller</h3>
              <p class="text-slate-700">{{ product.sellerName }}</p>
            </div>

            <!-- Shipping Info -->
            <div v-if="product.shippingInfo" class="border-t border-slate-200 pt-4">
              <h3 class="font-semibold text-slate-900 mb-2">Shipping Information</h3>
              <div class="space-y-1 text-sm text-slate-600">
                <div v-if="product.shippingInfo.areaFrom">
                  <span class="font-medium">Shipping from:</span> {{ product.shippingInfo.areaFrom.join(', ') }}
                </div>
                <div v-if="product.shippingInfo.freeShipping" class="text-teal-600 font-medium">
                  ✓ Free shipping available
                </div>
                <div v-if="product.shippingInfo.shipIn48h" class="text-teal-600 font-medium">
                  ✓ Ships within 48 hours
                </div>
              </div>
            </div>

            <!-- Service Tags -->
            <div v-if="product.serviceTags && product.serviceTags.length > 0" class="border-t border-slate-200 pt-4">
              <div class="flex flex-wrap gap-2">
                <Badge v-for="tag in product.serviceTags" :key="tag" variant="success">
                  {{ tag }}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <!-- Description Section -->
        <div v-if="product.description" class="border-t border-slate-200 p-6">
          <h2 class="text-xl font-bold text-slate-900 mb-4">Product Description</h2>
          <div 
            class="prose prose-sm max-w-none text-slate-700"
            v-html="product.description"
          />
        </div>

        <!-- Product Properties -->
        <div v-if="product.productProps && product.productProps.length > 0" class="border-t border-slate-200 p-6">
          <h2 class="text-xl font-bold text-slate-900 mb-4">Product Properties</h2>
          <div class="grid md:grid-cols-2 gap-4">
            <div v-for="(prop, idx) in product.productProps" :key="idx" class="flex">
              <span class="font-medium text-slate-700 w-32">{{ Object.keys(prop)[0] }}:</span>
              <span class="text-slate-600">{{ Object.values(prop)[0] }}</span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Package, ShoppingCart, Star, Plus, Minus } from 'lucide-vue-next';
import {
  Button,
  Badge,
  Input,
  EmptyState,
} from '@bridgechina/ui';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const product = ref<any>(null);
const loading = ref(true);
const quantity = ref(1);
const selectedImage = ref<string | null>(null);
const selectedSkus = ref<Record<string, number>>({});

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M+';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K+';
  }
  return num.toString();
}

function updateSkuQuantity(sku: any, delta: number) {
  const key = sku.specid || sku.skuid || String(Math.random());
  const current = selectedSkus.value[key] || 0;
  selectedSkus.value[key] = Math.max(0, current + delta);
}

async function loadProduct() {
  loading.value = true;
  try {
    const externalId = route.params.externalId as string;
    const response = await axios.get(`/api/public/shopping/item/${externalId}`);
    product.value = response.data;
    
    // Set initial selected image
    if (product.value.images && product.value.images.length > 0) {
      selectedImage.value = product.value.images[0];
    } else if (product.value.imageUrl) {
      selectedImage.value = product.value.imageUrl;
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

async function requestToBuy() {
  try {
    // Calculate total quantity if SKUs are selected
    let totalQty = quantity.value;
    const skuDetails: any[] = [];
    
    if (product.value.skus && Object.keys(selectedSkus.value).length > 0) {
      totalQty = Object.values(selectedSkus.value).reduce((sum, qty) => sum + qty, 0);
      if (totalQty === 0) {
        toast.error('Please select at least one item');
        return;
      }
      
      // Collect selected SKU details
      for (const [specId, qty] of Object.entries(selectedSkus.value)) {
        if (qty > 0) {
          const sku = product.value.skus.find((s: any) => (s.specid || s.skuid) === specId);
          if (sku) {
            skuDetails.push({ specId, qty, sku });
          }
        }
      }
    }

    // Create service request for shopping
    const response = await axios.post('/api/user/service-request', {
      category: 'shopping',
      request_payload: {
        externalId: product.value.externalId,
        title: product.value.title,
        qty: totalQty,
        imageUrl: product.value.imageUrl,
        priceMin: product.value.priceMin,
        priceMax: product.value.priceMax,
        sourceUrl: product.value.sourceUrl,
        skuDetails: skuDetails.length > 0 ? skuDetails : undefined,
      },
    });

    toast.success('Request submitted successfully!');
    router.push('/app/requests');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to submit request');
  }
}

onMounted(() => {
  loadProduct();
});
</script>
