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

      <div v-else>
        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_420px]">
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
                        <span v-if="getDisplayPriceMin(item) !== undefined && getDisplayPriceMax(item) !== undefined && getDisplayPriceMin(item) !== getDisplayPriceMax(item)">
                          {{ formatPrice(getDisplayPriceMin(item) || 0) }} - {{ formatPrice(getDisplayPriceMax(item) || 0) }}
                        </span>
                        <span v-else-if="getDisplayPriceMin(item) !== undefined">{{ formatPrice(getDisplayPriceMin(item) || 0) }}</span>
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

                  <div v-if="item.skuDetails && item.skuDetails.length > 0" class="mt-3 space-y-2">
                    <div
                      v-for="(sku, idx) in item.skuDetails"
                      :key="idx"
                      class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-xs font-semibold text-slate-700">{{ sku.label || sku.sku?.props_names || sku.sku?.specid || `SKU ${idx + 1}` }}</p>
                        <p class="mt-0.5 text-[11px] text-slate-500">{{ formatPrice(Number(sku.displayUnitPrice || 0)) }} each</p>
                      </div>
                      <div class="flex items-center rounded-2xl border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          class="h-8 w-8 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          :disabled="Number(sku.qty || 0) <= 0"
                          @click="changeCartSkuQty(item, idx, -1)"
                        >
                          <Minus class="mx-auto h-3.5 w-3.5" />
                        </button>
                        <span class="w-10 text-center text-sm font-bold text-slate-900">{{ sku.qty }}</span>
                        <button
                          type="button"
                          class="h-8 w-8 text-teal-600 hover:bg-teal-50"
                          @click="changeCartSkuQty(item, idx, 1)"
                        >
                          <Plus class="mx-auto h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-3">
                    <span class="text-sm font-semibold text-slate-600">Quantity</span>
                    <div v-if="!(item.skuDetails && item.skuDetails.length > 0)" class="flex items-center rounded-2xl border border-slate-200 bg-white">
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
                    <div v-else class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900">
                      {{ getItemCheckoutQuantity(item) }} selected
                    </div>
                    <p v-if="item.skuDetails && item.skuDetails.length > 0" class="text-xs text-slate-500">
                      Use the plus and minus buttons above to change each selected option.
                    </p>
                    <div class="ml-auto text-right">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Line total</p>
                      <p class="text-lg font-black text-teal-700">{{ formatPrice(getItemLineTotal(item)) }}</p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-2xl font-black text-slate-950">Contact</h2>
                <p class="mt-1 text-sm text-slate-500">Use email code now. SMS code can be enabled later from the shared auth module.</p>
              </div>
              <RouterLink
                v-if="!authStore.isAuthenticated"
                :to="{ name: 'login', query: { redirect: '/shopping/checkout' } }"
                class="text-sm font-semibold text-teal-700 underline-offset-4 hover:underline"
              >
                Sign in
              </RouterLink>
            </div>

            <div v-if="!authStore.isAuthenticated" class="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
              <AuthOtpPanel
                title="Welcome"
                subtitle="Please enter your phone number / email"
                redirect-path="/shopping/checkout"
                :framed="false"
                @authenticated="handleCheckoutAuthenticated"
              />
            </div>

            <div v-else class="mt-5 space-y-5">
              <div class="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
                Signed in as {{ authStore.user?.email || authStore.user?.phone }}
              </div>

              <div v-if="!authStore.user?.phone">
                <Input
                  v-model="checkoutPhone"
                  label="Phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  :error="checkoutPhoneError"
                  @input="checkoutPhoneError = ''"
                />
                <p class="mt-1 text-xs text-slate-500">Bangladesh mobile format: 01XXXXXXXXX or +8801XXXXXXXXX.</p>
              </div>

              <div class="space-y-4">
                <h3 class="text-2xl font-black text-slate-950">Delivery</h3>

                <Select
                  v-if="addresses.length > 0"
                  v-model="selectedAddressId"
                  label="Saved address"
                  :options="addressOptions"
                  placeholder="Select an address"
                />

                <form v-if="addresses.length === 0" class="space-y-3" @submit.prevent="handleAddAddress">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <Input v-model="addressForm.name" label="First name / recipient" placeholder="Name" :error="addressErrors.name" @input="addressErrors.name = ''" />
                    <Input v-model="addressForm.city" label="City" placeholder="Dhaka" :error="addressErrors.city" @input="addressErrors.city = ''" />
                  </div>
                  <Input v-model="addressForm.address_line" label="Address" placeholder="House, road, area" :error="addressErrors.address_line" @input="addressErrors.address_line = ''" />
                  <Input v-model="addressForm.notes" label="Apartment, suite, etc. (optional)" placeholder="Floor, apartment, landmark" />
                  <div class="grid gap-3 sm:grid-cols-2">
                    <Input v-model="addressForm.postal_code" label="Postal code (optional)" />
                    <Input v-model="addressForm.phone" label="Delivery phone" type="tel" placeholder="01XXXXXXXXX" :error="addressErrors.phone" @input="addressErrors.phone = ''" />
                  </div>
                  <label class="flex items-center gap-2">
                    <input v-model="addressForm.is_default" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                    <span class="text-sm text-slate-700">Save this information for next time</span>
                  </label>
                  <Button variant="ghost" type="submit" class="rounded-2xl border border-slate-200 bg-gray-100 px-4 py-2 text-teal-600 hover:bg-slate-50" :loading="savingAddress">
                    Save delivery address
                  </Button>
                </form>
              </div>
            </div>
          </div>

          <div class="hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] lg:block">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Checkout status</p>
                <h2 class="mt-1 text-xl font-black text-slate-900">
                  {{ orderWarnings.length ? 'Action needed before checkout' : 'Ready to place your order' }}
                </h2>
                <p class="mt-2 text-sm leading-6 text-slate-600">
                  {{ orderWarnings.length ? 'Please fix the highlighted issue below before placing the order.' : 'Your cart, shipping details, and address are ready for checkout.' }}
                </p>
              </div>
              <div class="min-w-[220px] text-right">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grand total</p>
                <p class="mt-1 text-2xl font-black text-teal-700">{{ formatPrice(grandTotal) }}</p>
              </div>
            </div>

            <div
              v-if="orderWarnings.length"
              class="mt-4 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 shadow-[0_8px_24px_rgba(244,63,94,0.08)]"
            >
              <p class="font-bold text-rose-800">Checkout blocked</p>
              <div class="mt-2 space-y-2">
                <div v-for="warning in orderWarnings" :key="warning">{{ warning }}</div>
              </div>
            </div>

            <div v-else class="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
              All minimum order requirements are satisfied.
            </div>

            <div class="mt-5 flex items-center justify-between gap-4">
              <p v-if="!authStore.isAuthenticated" class="text-sm leading-6 text-slate-500">
                Sign in or register on this page to continue checkout.
              </p>
              <p v-else-if="addresses.length === 0" class="text-sm leading-6 text-amber-700">
                Add your phone and delivery address on this page before placing the order.
              </p>
              <p v-else class="text-sm leading-6 text-slate-500">
                Payment is not collected now. You can upload the payment slip from your orders page after checkout.
              </p>

              <Button
                variant="primary"
                size="lg"
                class="shrink-0 rounded-2xl bg-teal-600 px-8 py-3 text-white hover:bg-teal-700"
                :loading="submitting"
                :disabled="orderWarnings.length > 0 || submitting"
                @click="handleCheckoutPrimaryAction"
              >
                <ShoppingCart class="mr-2 h-4 w-4" />
                {{ checkoutPrimaryLabel }}
              </Button>
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
              <div v-if="authStore.isAuthenticated">
                <Select
                  v-if="addresses.length > 0"
                  v-model="selectedAddressId"
                  label="Delivery address"
                  :options="addressOptions"
                  placeholder="Select an address"
                />
                <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <p class="text-sm font-semibold text-slate-900">No shipping address yet</p>
                  <p class="mt-1 text-xs leading-5 text-slate-500">Use the delivery form in the Contact section.</p>
                </div>
              </div>
              <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p class="text-sm font-semibold text-slate-900">Sign in to continue</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">
                  Use the Contact form on this page or open the full sign-in page.
                </p>
              </div>
              <div>
                <p class="mb-2 text-sm font-semibold text-slate-900">Shipping method</p>
                <div class="overflow-hidden rounded-2xl border border-slate-200">
                  <label
                    v-for="option in shippingOptions"
                    :key="option.value"
                    class="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0"
                    :class="shippingMethod === option.value ? 'bg-teal-50 ring-1 ring-inset ring-teal-600' : 'bg-white'"
                  >
                    <span class="flex items-center gap-3">
                      <input v-model="shippingMethod" type="radio" :value="option.value" class="h-4 w-4 text-teal-700 focus:ring-teal-600" />
                      <span>
                        <span class="block text-sm font-bold text-slate-900">{{ option.label }}</span>
                        <span class="block text-xs text-slate-500">Will be delivered by 12-14 days</span>
                      </span>
                    </span>
                    <span class="text-sm font-bold text-slate-900">{{ option.value === 'air' ? formatPrice(shippingFee || 0) : 'Calculated' }}</span>
                  </label>
                </div>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Estimated shipping fee</p>
                    <p class="mt-1 text-lg font-black text-slate-900">{{ formatPrice(shippingFee) }}</p>
                  </div>
                  <div class="text-right text-xs text-slate-500">
                    <p>{{ shippingMethodLabel }}</p>
                    <p>{{ totalEstimatedWeightLabel }}</p>
                  </div>
                </div>
                <p v-if="shippingRateLabel" class="mt-2 text-xs text-teal-700">{{ shippingRateLabel }}</p>
              </div>
              <p class="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                The product weight is approximate. The final shipping cost will be calculated in front of the user by measuring the weight when the product arrives.
              </p>
              <Input v-model="notes" label="Order notes" placeholder="Special instructions" />
            </div>

            <div class="mt-5 space-y-3 rounded-[1.5rem] bg-slate-50 p-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Items</span>
                <span class="font-bold text-slate-900">{{ totalItems }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Product total</span>
                <span class="font-bold text-slate-900">{{ formatPrice(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Estimated shipping</span>
                <span class="font-bold text-slate-900">{{ formatPrice(shippingFee || 0) }}</span>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-3">
                <label class="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Coupon code</label>
                <div class="flex gap-2">
                  <Input v-model="couponCode" placeholder="SAVE10" class="flex-1" @input="clearAppliedCoupon" />
                  <Button variant="ghost" class="shrink-0 border border-slate-200 bg-slate-50" :loading="applyingCoupon" @click="applyCoupon">
                    Apply
                  </Button>
                </div>
                <p v-if="appliedCoupon" class="mt-2 text-xs font-semibold text-teal-700">
                  {{ appliedCoupon.code }} applied: -{{ formatPrice(appliedCoupon.discount_amount) }}
                </p>
                <button v-if="appliedCoupon" type="button" class="mt-1 text-xs font-semibold text-rose-600" @click="removeCoupon">
                  Remove coupon
                </button>
              </div>
              <div v-if="couponDiscount > 0" class="flex items-center justify-between text-sm">
                <span class="text-slate-600">Coupon discount</span>
                <span class="font-bold text-teal-700">-{{ formatPrice(couponDiscount) }}</span>
              </div>
              <div class="border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
                <div class="flex items-center justify-between">
                  <span>Total</span>
                  <span class="text-teal-700">{{ formatPrice(grandTotal) }}</span>
                </div>
              </div>
            </div>

            <div v-if="orderWarnings.length" class="mt-4 space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 lg:hidden">
              <div v-for="warning in orderWarnings" :key="warning">{{ warning }}</div>
            </div>

            <Button
              variant="primary"
              size="lg"
              class="mt-5 w-full rounded-2xl bg-teal-600 py-3 text-white hover:bg-teal-700 lg:hidden"
              :loading="submitting"
              :disabled="orderWarnings.length > 0 || submitting"
              @click="handleCheckoutPrimaryAction"
            >
              <ShoppingCart class="mr-2 h-4 w-4" />
              {{ checkoutPrimaryLabel }}
            </Button>

            <p v-if="!authStore.isAuthenticated" class="mt-3 text-center text-xs leading-6 text-slate-500 lg:hidden">
              Sign in or register right here to complete checkout.
            </p>
            <p v-else-if="addresses.length === 0" class="mt-3 text-center text-xs leading-6 text-amber-700 lg:hidden">
              Add a shipping address on this page before placing the order.
            </p>
            <p v-else class="mt-3 text-center text-xs leading-6 text-slate-500 lg:hidden">
              Payment is not collected now. You can upload the payment slip from your orders page after checkout.
            </p>
          </div>
        </aside>
        </div>

        <div class="mt-6 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
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
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useToast } from '@bridgechina/ui';
import { ChevronLeft, Minus, Package, Plus, ShoppingCart } from 'lucide-vue-next';
import { Button, Input, Select } from '@bridgechina/ui';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';
import AuthOtpPanel from '@/components/auth/AuthOtpPanel.vue';
import { isValidBangladeshPhone, normalizeBangladeshPhone } from '@/utils/contact-validation';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const { cartItems, totalItems, isEmpty, updateQuantity, updateSkuDetails, removeFromCart, clearCart, setCartItems } = useShoppingCart();

const loading = ref(false);
const submitting = ref(false);
const addresses = ref<any[]>([]);
const selectedAddressId = ref('');
const shippingMethod = ref('air');
const shippingFee = ref<number>(0);
const notes = ref('');
const shoppingSettings = ref<{
  moqRule?: { minimum_product?: number; minimum_price_threshold?: number; currency?: string };
  shippingRates?: Array<{ method: string; currency: string; min_rate_per_kg: number; max_rate_per_kg: number }>;
}>({});
const moqRule = ref({ minimum_product: 1, minimum_price_threshold: 0, currency: 'BDT' });
const savingAddress = ref(false);
const syncingCart = ref(false);
const applyingCoupon = ref(false);
const couponCode = ref('');
const appliedCoupon = ref<any>(null);
const checkoutPhone = ref(authStore.user?.phone || '');
const checkoutPhoneError = ref('');
const addressErrors = ref({
  name: '',
  phone: '',
  city: '',
  address_line: '',
});
const addressForm = ref({
  name: '',
  phone: '',
  country: 'Bangladesh',
  city: '',
  address_line: '',
  postal_code: '',
  notes: '',
  is_default: false,
});

function getDisplayPriceMin(item: any): number | undefined {
  const value = item?.displayPriceMin ?? item?.priceMin ?? item?.sourcePriceMin;
  return typeof value === 'number' ? value : undefined;
}

function getDisplayPriceMax(item: any): number | undefined {
  const fallback = getDisplayPriceMin(item);
  const value = item?.displayPriceMax ?? item?.priceMax ?? item?.sourcePriceMax ?? fallback;
  return typeof value === 'number' ? value : undefined;
}

function getItemLineTotal(item: any): number {
  if (Array.isArray(item?.skuDetails) && item.skuDetails.length > 0) {
    return item.skuDetails.reduce((sum: number, sku: any) => {
      const unitPrice = Number(sku?.displayUnitPrice ?? sku?.sourceUnitPrice ?? getDisplayPriceMin(item) ?? 0);
      const qty = Number(sku?.qty || 0);
      return sum + (unitPrice * qty);
    }, 0);
  }

  return (getDisplayPriceMin(item) || 0) * Number(item?.quantity || 0);
}

function getItemCheckoutQuantity(item: any): number {
  if (Array.isArray(item?.skuDetails) && item.skuDetails.length > 0) {
    return item.skuDetails.reduce((sum: number, sku: any) => sum + Number(sku?.qty || 0), 0);
  }

  return Number(item?.quantity || 0);
}

function getItemWeight(item: any): number {
  const weight = Number(item?.estimatedWeight || 0);
  const qty = getItemCheckoutQuantity(item);
  return weight > 0 && qty > 0 ? weight * qty : 0;
}

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + getItemLineTotal(item), 0);
});

const totalEstimatedWeight = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + getItemWeight(item), 0);
});

const couponDiscount = computed(() => {
  const amount = Number(appliedCoupon.value?.discount_amount || 0);
  return Math.max(0, Math.min(subtotal.value, amount));
});

const grandTotal = computed(() => Math.max(0, subtotal.value - couponDiscount.value) + (shippingFee.value || 0));

const activeShippingRate = computed(() => {
  const rates = shoppingSettings.value.shippingRates || [];
  return rates.find((rate) => rate.method === shippingMethod.value) || null;
});

const shippingMethodLabel = computed(() => {
  return shippingMethod.value === 'sea' ? 'Sea shipping' : 'Air shipping';
});

const shippingRateLabel = computed(() => {
  if (!activeShippingRate.value) return '';
  const rate = activeShippingRate.value;
  return `${rate.currency} ${rate.min_rate_per_kg}-${rate.max_rate_per_kg} per kg`;
});

const totalEstimatedWeightLabel = computed(() => {
  if (totalEstimatedWeight.value <= 0) return 'Weight pending';
  return `Approx. ${totalEstimatedWeight.value.toFixed(2).replace(/\.?0+$/, '')} kg`;
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

const checkoutPrimaryLabel = computed(() => {
  if (!authStore.isAuthenticated) return 'Sign in to checkout';
  if (addresses.value.length === 0) return 'Add address to continue';
  if (!selectedAddressId.value) return 'Select address to continue';
  return 'Place order';
});

const shippingOptions = [
  { value: 'air', label: 'Air shipping' },
  { value: 'sea', label: 'Sea shipping' },
];

function formatPrice(price: number): string {
  return `BDT ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function clearAppliedCoupon() {
  appliedCoupon.value = null;
}

function removeCoupon() {
  couponCode.value = '';
  appliedCoupon.value = null;
}

async function applyCoupon() {
  if (!couponCode.value.trim()) {
    toast.error('Enter a coupon code');
    return;
  }
  if (!authStore.isAuthenticated) {
    toast.error('Sign in before applying a coupon');
    return;
  }
  applyingCoupon.value = true;
  try {
    const response = await axios.post('/api/user/coupons/validate', {
      code: couponCode.value.trim(),
      subtotal: subtotal.value,
      currency: 'BDT',
    });
    appliedCoupon.value = response.data;
    couponCode.value = response.data.code;
    toast.success('Coupon applied');
  } catch (error: any) {
    appliedCoupon.value = null;
    toast.error(error.response?.data?.error || 'Coupon is not valid');
  } finally {
    applyingCoupon.value = false;
  }
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

function resetAddressForm() {
  const phone = authStore.user?.phone || checkoutPhone.value;
  addressForm.value = {
    name: '',
    phone,
    country: 'Bangladesh',
    city: '',
    address_line: '',
    postal_code: '',
    notes: '',
    is_default: addresses.value.length === 0,
  };
}

function changeCartSkuQty(item: any, skuIndex: number, delta: number) {
  const rows = Array.isArray(item?.skuDetails)
    ? item.skuDetails.map((sku: any) => ({ ...sku, qty: Number(sku?.qty || 0) }))
    : [];
  const row = rows[skuIndex];
  if (!row) return;

  row.qty = Math.max(0, row.qty + delta);
  const normalizedRows = rows.filter((sku: any) => sku.qty > 0);

  if (!normalizedRows.length) {
    removeFromCart(item.externalId);
    toast.success('Item removed from cart');
    return;
  }

  updateSkuDetails(item.externalId, normalizedRows);
}

async function loadShoppingSettings() {
  try {
    const response = await axios.get('/api/public/shopping/settings');
    shoppingSettings.value = response.data || {};
    moqRule.value = response.data?.moqRule || moqRule.value;
  } catch (error) {
    console.error('Failed to load shopping settings', error);
  }
}

function buildCheckoutItems() {
  return cartItems.value.map((item) => {
    const qty = getItemCheckoutQuantity(item);
    const unitPrice = qty > 0 ? getItemLineTotal(item) / qty : 0;

    return {
      externalId: item.externalId,
      title: item.title,
      qty,
      priceMin: unitPrice,
      priceMax: unitPrice,
      imageUrl: item.imageUrl,
      sourceUrl: item.sourceUrl,
      productUrl: item.productUrl || item.sourceUrl,
      sellerName: item.sellerName,
      vendorId: item.vendorId,
      shopUrl: item.shopUrl,
      skuDetails: item.skuDetails,
      selectedShippingMethod: shippingMethod.value,
      estimatedWeight: item.estimatedWeight,
    };
  });
}

async function loadServerCart() {
  if (!authStore.isAuthenticated || syncingCart.value) return;
  try {
    const response = await axios.get('/api/user/cart');
    const serverItems = response.data?.items || [];
    if (serverItems.length > 0 && cartItems.value.length === 0) {
      setCartItems(serverItems);
    }
  } catch (error) {
    console.error('Failed to load server cart', error);
  }
}

async function syncLocalCartToServer() {
  if (!authStore.isAuthenticated || cartItems.value.length === 0) return;
  syncingCart.value = true;
  try {
    const response = await axios.post('/api/user/cart/sync', {
      currency: 'BDT',
      items: buildCheckoutItems(),
    });
    const serverItems = response.data?.items || [];
    if (serverItems.length > 0) {
      setCartItems(serverItems);
    }
  } finally {
    syncingCart.value = false;
  }
}

async function hydrateAuthenticatedCart() {
  if (!authStore.isAuthenticated) return;
  if (cartItems.value.length > 0) {
    try {
      await syncLocalCartToServer();
      return;
    } catch (error) {
      console.error('Failed to sync local cart', error);
    }
  }
  await loadServerCart();
  addressErrors.value = { name: '', phone: '', city: '', address_line: '' };
}

async function handleCheckoutAuthenticated() {
  checkoutPhone.value = authStore.user?.phone || checkoutPhone.value;
  resetAddressForm();
  await loadAddresses();
  await hydrateAuthenticatedCart();
}

function validateAddressForm() {
  addressErrors.value = { name: '', phone: '', city: '', address_line: '' };
  let valid = true;
  if (!addressForm.value.name.trim()) {
    addressErrors.value.name = 'Recipient name is required';
    valid = false;
  }
  if (!addressForm.value.city.trim()) {
    addressErrors.value.city = 'City is required';
    valid = false;
  }
  if (!addressForm.value.address_line.trim()) {
    addressErrors.value.address_line = 'Address is required';
    valid = false;
  }
  if (!isValidBangladeshPhone(addressForm.value.phone)) {
    addressErrors.value.phone = 'Enter a valid Bangladesh mobile number';
    valid = false;
  }
  return valid;
}

async function handleAddAddress() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/shopping/checkout' } });
    return;
  }

  if (!validateAddressForm()) {
    toast.error('Please complete the required address fields');
    return;
  }

  savingAddress.value = true;
  try {
    const response = await axios.post('/api/user/addresses', {
      ...addressForm.value,
      phone: normalizeBangladeshPhone(addressForm.value.phone),
      is_default: !!addressForm.value.is_default,
    });
    toast.success('Address added');
    resetAddressForm();
    await loadAddresses();
    selectedAddressId.value = response.data?.id || addresses.value[0]?.id || '';
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to add address');
  } finally {
    savingAddress.value = false;
  }
}

async function ensureCheckoutPhone() {
  if (authStore.user?.phone) return true;
  const phone = checkoutPhone.value.trim();
  if (!isValidBangladeshPhone(phone)) {
    checkoutPhoneError.value = 'Enter a valid Bangladesh mobile number';
    toast.error('Please provide a valid phone number');
    return false;
  }

  await axios.patch('/api/user/profile', { phone: normalizeBangladeshPhone(phone) });
  await authStore.fetchUser();
  checkoutPhone.value = authStore.user?.phone || normalizeBangladeshPhone(phone);
  if (!addressForm.value.phone) addressForm.value.phone = checkoutPhone.value;
  return true;
}

async function ensureCheckoutAddress() {
  if (selectedAddressId.value) return true;
  if (addresses.value.length > 0) {
    selectedAddressId.value = addresses.value[0].id;
    return true;
  }
  await handleAddAddress();
  return !!selectedAddressId.value;
}

async function submitCheckout() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/shopping/checkout' } });
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

  if (!(await ensureCheckoutPhone())) {
    return;
  }

  if (!(await ensureCheckoutAddress())) {
    return;
  }

  submitting.value = true;
  try {
    await syncLocalCartToServer();
    const response = await axios.post('/api/user/orders/checkout', {
      shipping_address_id: selectedAddressId.value,
      shipping_method: shippingMethod.value,
      currency: 'BDT',
      coupon_code: appliedCoupon.value?.code || undefined,
      notes: notes.value || undefined,
    });

    toast.success('Order placed successfully');
    clearCart();
    router.push({ path: '/user/orders', query: { upload: response.data?.id } });
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to place order');
  } finally {
    submitting.value = false;
  }
}

function handleCheckoutPrimaryAction() {
  if (orderWarnings.value.length > 0) {
    toast.error(orderWarnings.value[0]);
    return;
  }

  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: '/shopping/checkout' } });
    return;
  }

  if (!selectedAddressId.value && addresses.value.length > 0) {
    selectedAddressId.value = addresses.value[0].id;
  }

  submitCheckout();
}

watch(
  [shippingMethod, totalEstimatedWeight, activeShippingRate],
  () => {
    const rate = activeShippingRate.value;
    const weight = totalEstimatedWeight.value;
    if (!rate || weight <= 0) {
      shippingFee.value = 0;
      return;
    }

    shippingFee.value = Math.round(weight * rate.min_rate_per_kg);
  },
  { immediate: true },
);

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      checkoutPhone.value = authStore.user?.phone || checkoutPhone.value;
      resetAddressForm();
      loadAddresses();
      hydrateAuthenticatedCart();
    } else {
      addresses.value = [];
      selectedAddressId.value = '';
    }
  }
);

onMounted(() => {
  if (authStore.isAuthenticated) {
    checkoutPhone.value = authStore.user?.phone || checkoutPhone.value;
    resetAddressForm();
    loadAddresses();
    hydrateAuthenticatedCart();
  }
});
onMounted(loadShoppingSettings);
</script>
