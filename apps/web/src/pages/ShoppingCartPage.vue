<template>
  <div class="min-h-screen bg-[#f5f7fb]">
    <div class="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click="router.push('/shopping')"
        >
          <ChevronLeft class="h-4 w-4" />
          Back to shopping
        </button>
        <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Checkout</p>
        <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Review your order</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Choose a delivery address, confirm your shipping method, and place the order. Payment proof can be uploaded later from your orders page. Shipping time: 12-14 days.
        </p>
      </div>

      <div v-if="isEmpty" class="grid min-h-[55vh] place-items-center rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
        <div class="max-w-md text-center">
          <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <ShoppingCart class="h-9 w-9" />
          </div>
          <h2 class="text-2xl font-black tracking-tight text-slate-900">Your cart is empty</h2>
          <p class="mt-3 text-sm leading-6 text-slate-600">
            Add products from the marketplace and return here to complete checkout.
          </p>
          <Button variant="primary" class="mt-6 rounded-2xl bg-teal-600 px-6 py-3 text-white hover:bg-teal-700" @click="router.push('/shopping')">
            Browse products
          </Button>
        </div>
      </div>

      <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_420px]">
        <section class="space-y-4">
          <div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Items</p>
                <h2 class="mt-1 text-xl font-black text-slate-900">Your selected products</h2>
              </div>
              <p class="text-sm font-semibold text-slate-500">{{ totalItems }} total units</p>
            </div>

            <div class="mt-5 space-y-4">
              <article
                v-for="item in cartItems"
                :key="item.externalId"
                class="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:flex-row"
              >
                <div class="h-28 w-full overflow-hidden rounded-2xl bg-white sm:h-24 sm:w-24 sm:flex-shrink-0">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                    <Package class="h-8 w-8" />
                  </div>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0">
                      <h3 class="line-clamp-2 text-base font-bold text-slate-900">{{ item.title }}</h3>
                      <p class="mt-1 text-sm text-slate-500">
                        <span v-if="item.priceMin && item.priceMax && item.priceMin !== item.priceMax">
                          {{ formatPrice(item.priceMin) }} - {{ formatPrice(item.priceMax) }}
                        </span>
                        <span v-else-if="item.priceMin">{{ formatPrice(item.priceMin) }}</span>
                        <span v-else>Price on request</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      class="text-sm font-semibold text-rose-600 hover:text-rose-700"
                      @click="removeFromCart(item.externalId)"
                    >
                      Remove
                    </button>
                  </div>

                  <div v-if="item.skuDetails && item.skuDetails.length > 0" class="mt-3 flex flex-wrap gap-2">
                    <span
                      v-for="(sku, idx) in item.skuDetails"
                      :key="idx"
                      class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {{ sku.sku?.props_names || sku.sku?.specid || `SKU ${idx + 1}` }} x{{ sku.qty }}
                    </span>
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-3">
                    <span class="text-sm font-semibold text-slate-600">Quantity</span>
                    <div class="flex items-center rounded-2xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        class="h-10 w-10 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        :disabled="item.quantity <= 1"
                        @click="updateQuantity(item.externalId, item.quantity - 1)"
                      >
                        <Minus class="mx-auto h-4 w-4" />
                      </button>
                      <span class="w-12 text-center text-sm font-bold text-slate-900">{{ item.quantity }}</span>
                      <button
                        type="button"
                        class="h-10 w-10 text-teal-600 hover:bg-teal-50"
                        @click="updateQuantity(item.externalId, item.quantity + 1)"
                      >
                        <Plus class="mx-auto h-4 w-4" />
                      </button>
                    </div>
                    <div class="ml-auto text-right">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Line total</p>
                      <p class="text-lg font-black text-teal-700">{{ formatPrice((item.priceMin || 0) * item.quantity) }}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div class="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <p class="text-xs font-bold uppercase tracking-[0.24em] text-white/65">What happens next</p>
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl bg-white/10 p-4">
                <p class="text-sm font-semibold">1. Checkout</p>
                <p class="mt-1 text-sm text-white/75">You place the order with your selected address.</p>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <p class="text-sm font-semibold">2. Payment slip</p>
                <p class="mt-1 text-sm text-white/75">Upload a cash slip later from your orders page.</p>
              </div>
              <div class="rounded-2xl bg-white/10 p-4">
                <p class="text-sm font-semibold">3. Shipping</p>
                <p class="mt-1 text-sm text-white/75">Seller and admin track purchased, warehouse, and shipped statuses.</p>
              </div>
            </div>
          </div>
        </section>

        <aside class="space-y-4 lg:sticky lg:top-24 self-start">
          <div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Shipping details</p>
            <h2 class="mt-1 text-xl font-black text-slate-900">Order summary</h2>

            <div class="mt-5 space-y-4">
              <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Shipping time is 12-14 days. MOQ and minimum order value are checked before order placement.
              </div>
              <Select
                v-model="selectedAddressId"
                label="Delivery address"
                :options="addressOptions"
                placeholder="Select an address"
              />
              <Select
                v-model="shippingMethod"
                label="Shipping method"
                :options="shippingOptions"
              />
              <Input
                v-model.number="shippingFee"
                label="Estimated shipping fee"
                type="number"
                min="0"
                step="0.01"
              />
              <Input v-model="notes" label="Order notes" placeholder="Special instructions" />
            </div>

            <div class="mt-5 space-y-3 rounded-[1.5rem] bg-slate-50 p-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Items</span>
                <span class="font-bold text-slate-900">{{ totalItems }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Subtotal</span>
                <span class="font-bold text-slate-900">{{ formatPrice(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Shipping</span>
                <span class="font-bold text-slate-900">{{ formatPrice(shippingFee || 0) }}</span>
              </div>
              <div class="border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
                <div class="flex items-center justify-between">
                  <span>Total</span>
                  <span class="text-teal-700">{{ formatPrice(subtotal + (shippingFee || 0)) }}</span>
                </div>
              </div>
            </div>

            <div v-if="orderWarnings.length" class="mt-4 space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <div v-for="warning in orderWarnings" :key="warning">{{ warning }}</div>
            </div>

            <Button
              variant="primary"
              size="lg"
              class="mt-5 w-full rounded-2xl bg-teal-600 py-3 text-white hover:bg-teal-700"
              :loading="submitting"
              :disabled="!selectedAddressId || addresses.length === 0 || orderWarnings.length > 0"
              @click="submitCheckout"
            >
              <ShoppingCart class="mr-2 h-4 w-4" />
              Place order
            </Button>

            <p v-if="addresses.length === 0" class="mt-3 text-center text-xs leading-6 text-amber-700">
              Add a shipping address in your profile before placing the order.
            </p>
            <p v-else class="mt-3 text-center text-xs leading-6 text-slate-500">
              Payment is not collected now. You can upload the payment slip from your orders page after checkout.
            </p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@bridgechina/ui';
import { ChevronLeft, Minus, Package, Plus, ShoppingCart } from 'lucide-vue-next';
import { Button, Input, Select } from '@bridgechina/ui';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const { cartItems, totalItems, isEmpty, updateQuantity, removeFromCart, clearCart } = useShoppingCart();

const loading = ref(false);
const submitting = ref(false);
const addresses = ref<any[]>([]);
const selectedAddressId = ref('');
const shippingMethod = ref('air');
const shippingFee = ref<number>(0);
const notes = ref('');
const moqRule = ref({ minimum_product: 1, minimum_price_threshold: 0, currency: 'BDT' });

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + ((item.priceMin || 0) * item.quantity), 0);
});

const orderWarnings = computed(() => {
  const warnings: string[] = [];
  const minimumPrice = Number(moqRule.value.minimum_price_threshold || 0);
  if (subtotal.value > 0 && subtotal.value < minimumPrice) {
    warnings.push(`Minimum order amount is ${formatPrice(minimumPrice)}.`);
  }
  for (const item of cartItems.value) {
    const itemMin = Math.max(Number(item.minimumOrderQty || 1), Number(moqRule.value.minimum_product || 1));
    if (item.quantity < itemMin) {
      warnings.push(`${item.title} MOQ is ${itemMin}.`);
    }
  }
  return warnings;
});

const addressOptions = computed(() =>
  addresses.value.map((address) => ({
    value: address.id,
    label: `${address.name} - ${address.city}`,
  }))
);

const shippingOptions = [
  { value: 'air', label: 'Air shipping' },
  { value: 'sea', label: 'Sea shipping' },
];

function formatPrice(price: number): string {
  return `BDT ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

async function loadAddresses() {
  if (!authStore.isAuthenticated) return;
  loading.value = true;
  try {
    const response = await axios.get('/api/user/addresses');
    addresses.value = response.data || [];
    selectedAddressId.value = addresses.value[0]?.id || '';
  } catch (error) {
    console.error('Failed to load addresses', error);
  } finally {
    loading.value = false;
  }
}

async function loadShoppingSettings() {
  try {
    const response = await axios.get('/api/public/shopping/settings');
    moqRule.value = response.data?.moqRule || moqRule.value;
  } catch (error) {
    console.error('Failed to load shopping settings', error);
  }
}

async function submitCheckout() {
  if (!authStore.isAuthenticated) {
    toast.error('Please log in to place the order');
    router.push('/login');
    return;
  }

  if (isEmpty.value) {
    toast.error('Your cart is empty');
    return;
  }

  if (orderWarnings.value.length > 0) {
    toast.error(orderWarnings.value[0]);
    return;
  }

  if (!selectedAddressId.value) {
    toast.error('Please add or select a shipping address');
    return;
  }

  submitting.value = true;
  try {
    await axios.post('/api/user/orders/checkout', {
      shipping_address_id: selectedAddressId.value,
      shipping_method: shippingMethod.value,
      shipping_fee: Number(shippingFee.value || 0),
      currency: 'BDT',
      notes: notes.value || undefined,
      items: cartItems.value.map((item) => ({
        externalId: item.externalId,
        title: item.title,
        qty: item.quantity,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl,
      })),
    });

    toast.success('Order placed successfully');
    clearCart();
    router.push('/user/orders');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to place order');
  } finally {
    submitting.value = false;
  }
}

onMounted(loadAddresses);
onMounted(loadShoppingSettings);
</script>
