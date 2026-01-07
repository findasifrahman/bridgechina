<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6">
        <Button variant="ghost" size="sm" @click="$router.push('/shopping')" class="mb-4">
          ← Continue Shopping
        </Button>
        <h1 class="text-3xl font-bold text-slate-900">Shopping Cart</h1>
        <p class="text-sm text-slate-600 mt-1">
          Review your items and submit a purchase request
        </p>
      </div>

      <div v-if="isEmpty" class="text-center py-12">
        <ShoppingCart class="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <h2 class="text-xl font-semibold text-slate-900 mb-2">Your cart is empty</h2>
        <p class="text-slate-600 mb-6">Add some products to get started!</p>
        <Button variant="primary" @click="$router.push('/shopping')">
          Go Shopping
        </Button>
      </div>

      <div v-else class="space-y-6">
        <!-- Cart Items -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">
              Items ({{ totalItems }})
            </h2>
            <div class="space-y-4">
              <div
                v-for="item in cartItems"
                :key="item.externalId"
                class="flex gap-4 p-4 border border-slate-200 rounded-lg hover:border-teal-300 transition-colors"
              >
                <!-- Product Image -->
                <div class="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                    <Package class="h-8 w-8" />
                  </div>
                </div>

                <!-- Product Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2">{{ item.title }}</h3>
                  <div class="text-sm text-slate-600 mb-2">
                    <span v-if="item.priceMin && item.priceMax && item.priceMin !== item.priceMax">
                      {{ formatPrice(item.priceMin) }} - {{ formatPrice(item.priceMax) }}
                    </span>
                    <span v-else-if="item.priceMin">{{ formatPrice(item.priceMin) }}</span>
                    <span v-else class="text-slate-500">Price on request</span>
                  </div>
                  
                  <!-- SKU Details -->
                  <div v-if="item.skuDetails && item.skuDetails.length > 0" class="text-xs text-slate-500 mb-2">
                    <div v-for="(sku, idx) in item.skuDetails" :key="idx" class="mb-1">
                      {{ sku.sku?.props_names || sku.sku?.specid || `SKU ${idx + 1}` }}: Qty {{ sku.qty }}
                    </div>
                  </div>

                  <!-- Quantity Controls -->
                  <div class="flex items-center gap-3 mt-2">
                    <span class="text-sm text-slate-600">Quantity:</span>
                    <div class="flex items-center gap-2">
                      <button
                        @click="updateQuantity(item.externalId, item.quantity - 1)"
                        class="w-8 h-8 flex items-center justify-center border border-red-300 text-red-600 rounded hover:bg-red-50"
                        :disabled="item.quantity <= 1"
                      >
                        <Minus class="h-4 w-4" />
                      </button>
                      <span class="w-12 text-center font-medium">{{ item.quantity }}</span>
                      <button
                        @click="updateQuantity(item.externalId, item.quantity + 1)"
                        class="w-8 h-8 flex items-center justify-center border border-teal-300 text-teal-600 rounded hover:bg-teal-50"
                      >
                        <Plus class="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      @click="removeFromCart(item.externalId)"
                      class="ml-auto text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">Summary</h2>
          <div class="space-y-3 mb-6">
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">Total Items:</span>
              <span class="font-medium">{{ totalItems }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">Estimated Total:</span>
              <span class="font-semibold text-teal-600">{{ formatTotalPrice() }}</span>
            </div>
            <div class="text-xs text-slate-500 pt-2 border-t border-slate-200">
              * Final price will be confirmed by our agent after verification
            </div>
          </div>

          <!-- Submit Request Button -->
          <Button
            variant="primary"
            size="lg"
            class="w-full"
            :loading="submitting"
            @click="submitRequest"
          >
            <ShoppingCart class="h-4 w-4 mr-2" />
            Submit Purchase Request
          </Button>
          <p class="text-xs text-slate-600 text-center mt-3">
            No payment now. Agent confirms final quote → You approve → We purchase & ship.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@bridgechina/ui';
import { ShoppingCart, Package, Plus, Minus } from 'lucide-vue-next';
import { Button } from '@bridgechina/ui';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const { cartItems, totalItems, isEmpty, updateQuantity, removeFromCart, clearCart } = useShoppingCart();
const submitting = ref(false);

const conversionRates = ref<{ CNY_TO_BDT?: number; CNY_TO_USD?: number }>({
  CNY_TO_BDT: 15,
  CNY_TO_USD: 0.14,
});

function formatPrice(price: number): string {
  return `¥${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatTotalPrice(): string {
  const total = cartItems.value.reduce((sum, item) => {
    const itemPrice = item.priceMin || 0;
    const itemQty = item.quantity;
    return sum + (itemPrice * itemQty);
  }, 0);
  return formatPrice(total);
}

async function submitRequest() {
  if (!authStore.isAuthenticated) {
    toast.error('Please login to submit a purchase request');
    router.push('/login');
    return;
  }

  if (isEmpty.value) {
    toast.error('Your cart is empty');
    return;
  }

  submitting.value = true;
  try {
    // Prepare cart items for request
    const items = cartItems.value.map(item => ({
      externalId: item.externalId,
      title: item.title,
      qty: item.quantity,
      imageUrl: item.imageUrl,
      priceMin: item.priceMin,
      priceMax: item.priceMax,
      sourceUrl: item.sourceUrl,
      skuDetails: item.skuDetails,
    }));

    // Create service request
    const response = await axios.post('/api/user/requests', {
      categoryKey: 'shopping',
      payload: {
        items,
        totalItems: totalItems.value,
        estimatedTotal: cartItems.value.reduce((sum, item) => {
          return sum + ((item.priceMin || 0) * item.quantity);
        }, 0),
        source: 'shopping_cart',
      },
    });

    toast.success('Purchase request submitted successfully!');
    
    // Clear cart after successful submission
    clearCart();
    
    // Navigate to requests page
    router.push(`/user/requests/${response.data.id}`);
  } catch (error: any) {
    console.error('Failed to submit request:', error);
    toast.error(error.response?.data?.error || 'Failed to submit purchase request');
  } finally {
    submitting.value = false;
  }
}
</script>

