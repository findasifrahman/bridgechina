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

      <div class="grid lg:grid-cols-12 gap-6">
        <!-- Media (left) -->
        <div class="lg:col-span-5">
          <div class="bg-white rounded-lg shadow-sm overflow-hidden p-6">
            <div class="lg:flex lg:gap-4">
              <!-- Desktop vertical thumbnails (left of media) -->
              <div v-if="(product.images && product.images.length > 1) || product.videoUrl" class="hidden lg:flex lg:flex-col gap-2 w-20">
                <button
                  v-if="product.videoUrl"
                  type="button"
                  class="aspect-square rounded border-2 cursor-pointer transition-all bg-slate-100 flex items-center justify-center"
                  :class="selectedImage === product.videoUrl ? 'border-teal-500' : 'border-slate-200 hover:border-teal-300'"
                  @click="selectVideo()"
                >
                  <Play class="h-6 w-6 text-slate-600" />
                </button>
                <button
                  v-for="(img, idx) in (product.images || []).slice(0, 8)"
                  :key="idx"
                  type="button"
                  class="aspect-square rounded border-2 overflow-hidden cursor-pointer transition-all bg-slate-100"
                  :class="selectedImage === img ? 'border-teal-500' : 'border-slate-200 hover:border-teal-300'"
                  @click="selectImage(img)"
                >
                  <img :src="img" :alt="`${product.title} ${String(Number(idx) + 1)}`" class="w-full h-full object-cover" />
                </button>
              </div>

              <!-- Main media -->
              <div class="flex-1">
                <div class="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4 border border-slate-200 relative group cursor-pointer" @click="openFullscreen(activeMediaUrl)">
                  <video
                    v-if="showVideo"
                    ref="videoRef"
                    :src="product.videoUrl"
                    :autoplay="videoMode === 'auto'"
                    :muted="videoMode === 'auto'"
                    playsinline
                    loop
                    controls
                    class="w-full h-full object-contain"
                    @click.stop
                  />
                  <img
                    v-else-if="activeMediaUrl"
                    :src="activeMediaUrl"
                    :alt="product.title"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                    <Package class="h-32 w-32" />
                  </div>
                  <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-2">
                    <Maximize2 class="h-5 w-5 text-white" />
                  </div>
                </div>

                <!-- Mobile thumbnails -->
                <div v-if="(product.images && product.images.length > 1) || product.videoUrl" class="grid grid-cols-4 gap-2 lg:hidden">
                  <div
                    v-if="product.videoUrl"
                    @click="selectVideo()"
                    class="aspect-square rounded border-2 cursor-pointer transition-all bg-slate-100 flex items-center justify-center"
                    :class="selectedImage === product.videoUrl ? 'border-teal-500' : 'border-slate-200 hover:border-teal-300'"
                  >
                    <Play class="h-8 w-8 text-slate-600" />
                  </div>
                  <img
                    v-for="(img, idx) in (product.images || []).slice(0, product.videoUrl ? 7 : 8)"
                    :key="idx"
                    :src="img"
                    :alt="`${product.title} ${String(Number(idx) + 1)}`"
                    class="aspect-square object-cover rounded border-2 cursor-pointer transition-all"
                    :class="selectedImage === img ? 'border-teal-500' : 'border-slate-200 hover:border-teal-300'"
                    @click="selectImage(img)"
                  />
                </div>

                <!-- Title below media on desktop -->
                <div class="hidden lg:block mt-4">
                  <h1 class="text-2xl font-bold text-slate-900">{{ product.title }}</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Info (middle) -->
        <div class="lg:col-span-4">
          <div class="bg-white rounded-lg shadow-sm overflow-hidden p-6">
            <div class="space-y-6">
              <div class="lg:hidden">
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
              <div class="flex items-center justify-between mb-2">
                <div class="text-2xl font-bold text-teal-600">
                  <span v-if="product.priceMin && product.priceMax && product.priceMin !== product.priceMax">
                    {{ formatPrice(product.priceMin) }} - {{ formatPrice(product.priceMax) }}
                  </span>
                  <span v-else-if="product.priceMin">{{ formatPrice(product.priceMin) }}</span>
                  <span v-else>Price on request</span>
                </div>
                <!-- Currency Selector -->
                <div class="flex gap-1 border border-slate-200 rounded-lg p-1 bg-white">
                  <button
                    v-for="curr in ['CNY', 'BDT', 'USD'] as const"
                    :key="curr"
                    @click="selectedCurrency = curr"
                    :class="[
                      'px-2 py-1 rounded text-xs font-medium transition-colors',
                      selectedCurrency === curr
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50'
                    ]"
                  >
                    {{ curr }}
                  </button>
                </div>
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

            <!-- Estimated Weight -->
            <div v-if="product.estimatedWeightKg !== null && product.estimatedWeightKg !== undefined" class="text-sm bg-slate-50 rounded-lg p-3">
              <span class="font-semibold text-slate-700">Estimated Weight:</span>
              <span class="ml-2 text-slate-600">{{ formatWeight(product.estimatedWeightKg) }} kg</span>
            </div>
            <div v-else class="text-sm bg-amber-50 rounded-lg p-3 border border-amber-200">
              <span class="font-semibold text-amber-800">Weight unknown — agent will confirm</span>
            </div>

            <!-- Availability -->
            <div v-if="product.availableQuantity !== undefined" class="text-sm flex items-center gap-2">
              <Package class="h-4 w-4 text-slate-500" />
              <span class="font-semibold text-slate-700">Available Quantity:</span>
              <span class="text-slate-600">{{ formatNumber(product.availableQuantity) }}</span>
            </div>

            <!-- Total Amount (when quantity selected) -->
            <div v-if="totalQuantity > 0 && (product.priceMin || product.tieredPricing)" class="text-sm bg-teal-50 rounded-lg p-3 border border-teal-200">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-700 flex items-center gap-2">
                  <ShoppingCart class="h-4 w-4 text-teal-600" />
                  Total Amount:
                </span>
                <span class="text-lg font-bold text-teal-600">{{ formatTotalAmount() }}</span>
              </div>
              <div class="text-xs text-slate-600 mt-1">
                {{ totalQuantity }} × {{ formatPrice(getUnitPrice()) }}
              </div>
            </div>

            <!-- SKU Selection -->
            <div v-if="product.skus && product.skus.length > 0" class="border border-slate-200 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-3">
                <Package class="h-4 w-4 text-slate-600" />
                <div class="text-sm font-semibold text-slate-700">Size / Price / Stock / Quantity</div>
              </div>
              <div class="grid md:grid-cols-1 gap-3">
                <div v-for="(sku, idx) in product.skus.slice(0, 6)" :key="idx" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-slate-900 mb-1">{{ sku.props_names || sku.specid || `SKU ${String(Number(idx) + 1)}` }}</div>
                    <div class="text-xs text-slate-600 space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-teal-600">{{ formatPrice(sku.sale_price || sku.price || 0) }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <Package class="h-3 w-3 text-slate-400" />
                        <span>Stock: {{ formatNumber(sku.stock || 0) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-3">
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
              <button v-if="product.skus.length > 6" class="mt-3 w-full text-sm text-teal-600 hover:text-teal-700 font-medium py-2 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors">
                View All {{ product.skus.length }} Variants →
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
            </div>

            <!-- Action Buttons -->
            <div class="space-y-3 mt-4">
              <div class="flex gap-2">
                <Button
                  variant="secondary"
                  @click="addToCart"
                  class="flex-1"
                  :disabled="totalQuantity <= 0"
                >
                  <ShoppingCart class="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="primary"
                  @click="requestQuote"
                  class="flex-1"
                  size="lg"
                >
                  Request Purchase & Shipping
                </Button>
              </div>
              <p class="text-xs text-slate-600 text-center">
                No payment now. Agent confirms final quote → You approve → We purchase & ship.
              </p>
              <Button
                variant="ghost"
                @click="openWhatsApp"
                class="w-full"
              >
                <MessageCircle class="h-4 w-4 mr-2" />
                Contact via WhatsApp
              </Button>
            </div>

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

        <!-- Shipping Card (right) -->
        <div class="lg:col-span-3">
          <ShippingCard
            :shipping-data="product.bridgechinaShipping"
            :estimated-weight-kg="product.estimatedWeightKg"
            :quantity="totalQuantity"
            :has-battery="hasBattery"
            :is-sticky="true"
            :currency="selectedCurrency"
            :conversion-rates="conversionRates"
            @method-change="selectedShippingMethod = $event"
            @weight-change="manualWeight = $event"
          />
        </div>
      </div>

      <!-- Description Section (Full width below) -->
      <div class="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <div v-if="product.description" class="border-t border-slate-200 p-6">
          <h2 class="text-xl font-bold text-slate-900 mb-4">Product Description</h2>
          <div 
            class="prose prose-sm max-w-none text-slate-700"
            v-html="product.description"
          />
        </div>

        <!-- Product Properties -->
        <div v-if="product.productProps && product.productProps.length > 0" class="border-t border-slate-200 p-6">
          <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Package class="h-5 w-5 text-teal-600" />
            Product Properties
          </h2>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="(prop, idx) in product.productProps" :key="idx" class="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-teal-300 transition-colors">
              <div class="text-xs font-semibold text-slate-500 uppercase mb-1">{{ Object.keys(prop)[0] }}</div>
              <div class="text-sm font-medium text-slate-900">{{ Object.values(prop)[0] }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Similar Products -->
      <div v-if="similarProducts.length > 0" class="mt-6 bg-white rounded-lg shadow-sm overflow-hidden p-6">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Package class="h-5 w-5 text-teal-600" />
          Similar Products
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-3 gap-4">
          <ProductCard
            v-for="item in similarProducts"
            :key="item.externalId"
            :product="item"
            :selected-currency="selectedCurrency"
            :conversion-rates="conversionRates"
            @click="handleProductClick(item)"
          />
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

    <!-- Fullscreen Image Modal -->
    <div
      v-if="fullscreenImage"
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      @click="fullscreenImage = null"
    >
      <button
        class="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"
        @click="fullscreenImage = null"
      >
        <X class="h-8 w-8" />
      </button>
      <img
        :src="fullscreenImage"
        :alt="product?.title"
        class="max-w-full max-h-full object-contain"
        @click.stop
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Package, Star, Plus, Minus, MessageCircle, Play, ShoppingCart, X, Maximize2 } from 'lucide-vue-next';
import {
  Button,
  Badge,
  Input,
  EmptyState,
} from '@bridgechina/ui';
import { useWhatsApp } from '@/composables/useWhatsApp';
import { useShoppingCart } from '@/composables/useShoppingCart';
import ShippingCard from '@/components/shopping/ShippingCard.vue';
import ProductCard from '@/components/shopping/ProductCard.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { openWhatsApp: openWhatsAppComposable } = useWhatsApp();
const { addToCart: addToCartComposable } = useShoppingCart();

const product = ref<any>(null);
const loading = ref(true);
const quantity = ref(1);
const selectedImage = ref<string | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const videoMode = ref<'none' | 'auto' | 'user'>('none');
const selectedSkus = ref<Record<string, number>>({});
const selectedLanguage = ref<'en' | 'zh'>('zh');
const selectedCurrency = ref<'CNY' | 'BDT' | 'USD'>('CNY');
const selectedShippingMethod = ref<string>('');
const hasBattery = ref(false);
const manualWeight = ref<number | null>(null);
const conversionRates = ref<{ CNY_TO_BDT?: number; CNY_TO_USD?: number }>({});
const fullscreenImage = ref<string | null>(null);
const similarProducts = ref<any[]>([]);

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M+';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K+';
  }
  return num.toString();
}

function formatWeight(kg: number): string {
  return kg.toFixed(2).replace(/\.?0+$/, '');
}

function formatPrice(price: number): string {
  const currency = selectedCurrency.value;
  
  if (currency === 'CNY') {
    return `¥${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (currency === 'BDT') {
    const rate = conversionRates.value.CNY_TO_BDT || 15; // Fallback rate
    const bdtPrice = price * rate;
    return `৳${bdtPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (currency === 'USD') {
    const rate = conversionRates.value.CNY_TO_USD || 0.14; // Fallback rate
    const usdPrice = price * rate;
    return `$${usdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  return `¥${price}`;
}

function getUnitPrice(): number {
  if (!product.value) return 0;
  
  // Check tiered pricing first
  if (product.value.tieredPricing && product.value.tieredPricing.length > 0) {
    // Find matching tier
    const matchingTier = product.value.tieredPricing
      .slice()
      .reverse()
      .find((tier: any) => totalQuantity.value >= tier.minQty);
    
    if (matchingTier) {
      return matchingTier.price;
    }
    // Use first tier if quantity is less than minimum
    return product.value.tieredPricing[0].price;
  }
  
  // Use priceMin if available
  if (product.value.priceMin) {
    return product.value.priceMin;
  }
  
  return 0;
}

function formatTotalAmount(): string {
  const unitPrice = getUnitPrice();
  const total = unitPrice * totalQuantity.value;
  return formatPrice(total);
}

const activeMediaUrl = computed(() => {
  if (selectedImage.value) return selectedImage.value;
  return product.value?.imageUrl || null;
});

const showVideo = computed(() => {
  return !!(product.value?.videoUrl && selectedImage.value === product.value.videoUrl && videoMode.value !== 'none');
});

function openFullscreen(imageUrl: string | null) {
  if (imageUrl) {
    fullscreenImage.value = imageUrl;
  }
}

function selectImage(img: string) {
  selectedImage.value = img;
}

function selectVideo() {
  if (!product.value?.videoUrl) return;
  videoMode.value = 'user';
  selectedImage.value = product.value.videoUrl;
}

async function tryAutoplayVideo() {
  if (!product.value?.videoUrl) return;
  if (videoMode.value !== 'auto') return;
  if (!videoRef.value) return;
  try {
    videoRef.value.muted = true;
    await videoRef.value.play();
  } catch {
    // Autoplay blocked: fallback to image
    videoMode.value = 'none';
    const firstImg = product.value?.images?.[0] || product.value?.imageUrl || null;
    selectedImage.value = firstImg;
  }
}

function handleProductClick(item: any) {
  router.push({
    path: `/shopping/tmapi/${item.externalId}`,
    query: { language: selectedLanguage.value },
  });
}

async function loadSimilarProducts() {
  try {
    // Get similar products from cache (exclude current product)
    const response = await axios.get('/api/public/shopping/hot', {
      params: {
        page: 1,
        pageSize: 8,
      },
    });
    
    const products = Array.isArray(response.data) ? response.data : [];
    // Filter out current product
    similarProducts.value = products
      .filter((p: any) => p.externalId !== product.value?.externalId)
      .slice(0, 8);
  } catch (error) {
    console.error('Failed to load similar products:', error);
    similarProducts.value = [];
  }
}

const totalQuantity = computed(() => {
  if (product.value?.skus && Object.keys(selectedSkus.value).length > 0) {
    return Object.values(selectedSkus.value).reduce((sum, qty) => sum + qty, 0) || quantity.value;
  }
  return quantity.value;
});

function updateSkuQuantity(sku: any, delta: number) {
  const key = sku.specid || sku.skuid || String(Math.random());
  const current = selectedSkus.value[key] || 0;
  selectedSkus.value[key] = Math.max(0, current + delta);
}

async function loadProduct() {
  loading.value = true;
  try {
    const externalId = route.params.externalId as string;
    const query = route.query as { language?: string };
    const language = query.language === 'en' ? 'en' : 'zh';
    selectedLanguage.value = language;
    const response = await axios.get(`/api/public/shopping/item/${externalId}`, {
      params: { language },
    });
    product.value = response.data;
    
    // Set initial selected image
    if (product.value.videoUrl) {
      // Try autoplay (muted). If blocked, fallback to image.
      videoMode.value = 'auto';
      selectedImage.value = product.value.videoUrl;
      await nextTick();
      await tryAutoplayVideo();
    } else if (product.value.images && product.value.images.length > 0) {
      selectedImage.value = product.value.images[0];
    } else if (product.value.imageUrl) {
      selectedImage.value = product.value.imageUrl;
    }

    // Load conversion rates
    conversionRates.value = {
      CNY_TO_BDT: 15, // Default fallback
      CNY_TO_USD: 0.14, // Default fallback
    };

    // Load similar products
    await loadSimilarProducts();
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

watch(selectedImage, async () => {
  if (product.value?.videoUrl && selectedImage.value === product.value.videoUrl && videoMode.value === 'auto') {
    await nextTick();
    await tryAutoplayVideo();
  }
});

async function requestQuote() {
  try {
    // Calculate total quantity if SKUs are selected
    let totalQty = quantity.value;
    const skuDetails: any[] = [];
    
    if (product.value.skus && Object.keys(selectedSkus.value).length > 0) {
      totalQty = Object.values(selectedSkus.value).reduce((sum, qty) => sum + qty, 0);
      if (totalQty === 0) {
        totalQty = quantity.value; // Use default quantity if no SKUs selected
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
    await axios.post('/api/user/requests', {
      categoryKey: 'shopping',
      payload: {
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
    router.push('/user/requests');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to submit request');
  }
}

function addToCart() {
  if (!product.value || totalQuantity.value <= 0) {
    toast.error('Please select a quantity');
    return;
  }

  // Collect SKU details if available
  let skuDetails: any[] | undefined;
  if (product.value.skus && Object.keys(selectedSkus.value).length > 0) {
    skuDetails = [];
    for (const [specId, qty] of Object.entries(selectedSkus.value)) {
      if (qty > 0) {
        const sku = product.value.skus.find((s: any) => (s.specid || s.skuid) === specId);
        if (sku) {
          skuDetails.push({ specId, qty, sku });
        }
      }
    }
  }

  addToCartComposable(
    product.value,
    totalQuantity.value,
    skuDetails && skuDetails.length > 0 ? skuDetails : undefined
  );

  toast.success('Added to cart!');
}

function openWhatsApp() {
  const message = `Hi, I'm interested in getting a quote for ${product.value?.title || 'this product'}`;
  openWhatsAppComposable(message);
}

onMounted(() => {
  loadProduct();
});
</script>
