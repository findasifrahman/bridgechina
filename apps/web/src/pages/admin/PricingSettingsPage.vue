<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader title="Pricing Settings" subtitle="Control shipping ranges, Marketplace markup, and MOQ guardrails" />
      <Button variant="ghost" size="sm" @click="loadSettings" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardBody class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Shipping rates</h3>
            <p class="text-sm text-slate-500">Set the per-kg range displayed on the storefront and seller dashboard.</p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h4 class="text-sm font-semibold text-slate-900">Air</h4>
                <span class="text-[11px] text-slate-500">Visible on home / detail / checkout</span>
              </div>
              <Input v-model="shippingForm.air.currency" label="Currency" />
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <Input v-model.number="shippingForm.air.min_rate_per_kg" type="number" min="0" step="0.01" label="Min / kg" />
                <Input v-model.number="shippingForm.air.max_rate_per_kg" type="number" min="0" step="0.01" label="Max / kg" />
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="mb-3 flex items-center justify-between">
                <h4 class="text-sm font-semibold text-slate-900">Sea</h4>
                <span class="text-[11px] text-slate-500">Visible on home / detail / checkout</span>
              </div>
              <Input v-model="shippingForm.sea.currency" label="Currency" />
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <Input v-model.number="shippingForm.sea.min_rate_per_kg" type="number" min="0" step="0.01" label="Min / kg" />
                <Input v-model.number="shippingForm.sea.max_rate_per_kg" type="number" min="0" step="0.01" label="Max / kg" />
              </div>
            </div>
          </div>

          <Button variant="primary" :loading="savingShipping" @click="saveShippingRates">Save shipping rates</Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Marketplace markup</h3>
            <p class="text-sm text-slate-500">Applied to  product prices before display.</p>
          </div>
          <Input v-model.number="markupPercent" type="number" min="0" step="0.1" label="Markup percent" />
          <Button variant="primary" :loading="savingMarkup" @click="saveMarkup">Save markup</Button>

          <div class="pt-4">
            <h3 class="text-lg font-semibold text-slate-900">MOQ rule</h3>
            <p class="text-sm text-slate-500">Applies to Marketplace checkout and admin-added products.</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <Input v-model.number="moqRule.minimum_product" type="number" min="1" label="Minimum product qty" />
            <Input v-model.number="moqRule.minimum_price_threshold" type="number" min="0" step="0.01" label="Minimum price threshold" />
          </div>
          <Input v-model="moqRule.currency" label="Currency" />
          <Button variant="primary" :loading="savingMoq" @click="saveMoqRule">Save MOQ rule</Button>
        </CardBody>
      </Card>
    </div>

    <Card>
      <CardBody class="space-y-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">Discount coupons</h3>
            <p class="text-sm text-slate-500">Create checkout coupon codes with date windows, usage limits, and minimum order rules.</p>
          </div>
          <Button variant="ghost" size="sm" @click="resetCouponForm">New coupon</Button>
        </div>

        <div class="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-4">
          <Input v-model="couponForm.code" label="Code" placeholder="SAVE10" />
          <Input v-model="couponForm.title" label="Title" placeholder="Launch discount" />
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Discount type</label>
            <select v-model="couponForm.discount_type" class="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <Input v-model.number="couponForm.discount_value" type="number" min="0" step="0.01" label="Discount value" />
          <Input v-model.number="couponForm.max_discount_amount" type="number" min="0" step="0.01" label="Max discount" />
          <Input v-model.number="couponForm.min_order_amount" type="number" min="0" step="0.01" label="Min order" />
          <Input v-model="couponForm.starts_at" type="datetime-local" label="Starts at" />
          <Input v-model="couponForm.ends_at" type="datetime-local" label="Ends at" />
          <Input v-model.number="couponForm.usage_limit" type="number" min="1" label="Total usage limit" />
          <Input v-model.number="couponForm.per_user_limit" type="number" min="1" label="Per user limit" />
          <Input v-model="couponForm.currency" label="Currency" />
          <label class="flex items-end gap-2 pb-2">
            <input v-model="couponForm.is_active" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
            <span class="text-sm text-slate-700">Active</span>
          </label>
          <div class="lg:col-span-4">
            <Input v-model="couponForm.description" label="Description" placeholder="Internal note or policy" />
          </div>
          <div class="flex gap-3 lg:col-span-4">
            <Button variant="primary" :loading="savingCoupon" @click="saveCoupon">
              {{ editingCouponId ? 'Update coupon' : 'Create coupon' }}
            </Button>
            <Button v-if="editingCouponId" variant="ghost" @click="resetCouponForm">Cancel edit</Button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th class="px-4 py-3">Code</th>
                <th class="px-4 py-3">Discount</th>
                <th class="px-4 py-3">Window</th>
                <th class="px-4 py-3">Usage</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="coupons.length === 0">
                <td colspan="6" class="px-4 py-8 text-center text-slate-500">No coupons created yet.</td>
              </tr>
              <tr v-for="coupon in coupons" :key="coupon.id" class="border-t border-slate-100">
                <td class="px-4 py-3">
                  <div class="font-bold text-slate-900">{{ coupon.code }}</div>
                  <div class="text-xs text-slate-500">{{ coupon.title || coupon.description || 'No description' }}</div>
                </td>
                <td class="px-4 py-3">
                  <div>{{ coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : formatMoney(coupon.discount_value, coupon.currency) }}</div>
                  <div class="text-xs text-slate-500">Min {{ formatMoney(coupon.min_order_amount || 0, coupon.currency) }}</div>
                </td>
                <td class="px-4 py-3 text-xs text-slate-600">
                  <div>{{ coupon.starts_at ? formatDate(coupon.starts_at) : 'Now' }}</div>
                  <div>{{ coupon.ends_at ? formatDate(coupon.ends_at) : 'No expiry' }}</div>
                </td>
                <td class="px-4 py-3">
                  {{ coupon.usage_count || 0 }} / {{ coupon.usage_limit || 'Unlimited' }}
                  <div class="text-xs text-slate-500">Per user {{ coupon.per_user_limit || 1 }}</div>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="coupon.is_active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'">
                    {{ coupon.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" @click="editCoupon(coupon)">Edit</Button>
                    <Button variant="ghost" size="sm" class="text-rose-600" @click="deleteCoupon(coupon)">Delete</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardBody, Button, Input } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const loading = ref(false);
const savingShipping = ref(false);
const savingMarkup = ref(false);
const savingMoq = ref(false);
const savingCoupon = ref(false);
const coupons = ref<any[]>([]);
const editingCouponId = ref('');
const markupPercent = ref(0);
const shippingForm = reactive({
  air: {
    currency: 'BDT',
    min_rate_per_kg: 0,
    max_rate_per_kg: 0,
  },
  sea: {
    currency: 'BDT',
    min_rate_per_kg: 0,
    max_rate_per_kg: 0,
  },
});
const moqRule = reactive({
  minimum_product: 1,
  minimum_price_threshold: 0,
  currency: 'BDT',
});
const couponForm = reactive({
  code: '',
  title: '',
  description: '',
  discount_type: 'percent',
  discount_value: 0,
  max_discount_amount: null as number | null,
  min_order_amount: 0,
  currency: 'BDT',
  starts_at: '',
  ends_at: '',
  usage_limit: null as number | null,
  per_user_limit: 1,
  is_active: true,
});

async function loadSettings() {
  loading.value = true;
  try {
    const [markupRes, moqRes, shippingRes, couponsRes] = await Promise.all([
      axios.get('/api/admin/profit-markup'),
      axios.get('/api/admin/moq-rule'),
      axios.get('/api/admin/shipping-rates'),
      axios.get('/api/admin/coupons'),
    ]);

    markupPercent.value = markupRes.data?.percent_rate ?? 0;
    Object.assign(moqRule, {
      minimum_product: moqRes.data?.minimum_product ?? 1,
      minimum_price_threshold: moqRes.data?.minimum_price_threshold ?? 0,
      currency: moqRes.data?.currency ?? 'BDT',
    });

    const shippingRates = Array.isArray(shippingRes.data) ? shippingRes.data : [];
    const air = shippingRates.find((rate: any) => rate.method === 'air');
    const sea = shippingRates.find((rate: any) => rate.method === 'sea');
    Object.assign(shippingForm.air, {
      currency: air?.currency ?? 'BDT',
      min_rate_per_kg: air?.min_rate_per_kg ?? 0,
      max_rate_per_kg: air?.max_rate_per_kg ?? 0,
    });
    Object.assign(shippingForm.sea, {
      currency: sea?.currency ?? 'BDT',
      min_rate_per_kg: sea?.min_rate_per_kg ?? 0,
      max_rate_per_kg: sea?.max_rate_per_kg ?? 0,
    });
    coupons.value = Array.isArray(couponsRes.data) ? couponsRes.data : [];
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load pricing settings');
  } finally {
    loading.value = false;
  }
}

function formatMoney(value: number | string | null | undefined, currency = 'BDT') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function resetCouponForm() {
  editingCouponId.value = '';
  Object.assign(couponForm, {
    code: '',
    title: '',
    description: '',
    discount_type: 'percent',
    discount_value: 0,
    max_discount_amount: null,
    min_order_amount: 0,
    currency: 'BDT',
    starts_at: '',
    ends_at: '',
    usage_limit: null,
    per_user_limit: 1,
    is_active: true,
  });
}

function editCoupon(coupon: any) {
  editingCouponId.value = coupon.id;
  Object.assign(couponForm, {
    code: coupon.code || '',
    title: coupon.title || '',
    description: coupon.description || '',
    discount_type: coupon.discount_type || 'percent',
    discount_value: Number(coupon.discount_value || 0),
    max_discount_amount: coupon.max_discount_amount == null ? null : Number(coupon.max_discount_amount),
    min_order_amount: Number(coupon.min_order_amount || 0),
    currency: coupon.currency || 'BDT',
    starts_at: toDateTimeLocal(coupon.starts_at),
    ends_at: toDateTimeLocal(coupon.ends_at),
    usage_limit: coupon.usage_limit == null ? null : Number(coupon.usage_limit),
    per_user_limit: Number(coupon.per_user_limit || 1),
    is_active: Boolean(coupon.is_active),
  });
}

function couponPayload() {
  return {
    code: couponForm.code,
    title: couponForm.title || undefined,
    description: couponForm.description || undefined,
    discount_type: couponForm.discount_type,
    discount_value: Number(couponForm.discount_value || 0),
    max_discount_amount: couponForm.max_discount_amount == null ? null : Number(couponForm.max_discount_amount),
    min_order_amount: Number(couponForm.min_order_amount || 0),
    currency: couponForm.currency || 'BDT',
    starts_at: couponForm.starts_at || null,
    ends_at: couponForm.ends_at || null,
    usage_limit: couponForm.usage_limit == null ? null : Number(couponForm.usage_limit),
    per_user_limit: Number(couponForm.per_user_limit || 1),
    is_active: Boolean(couponForm.is_active),
  };
}

async function saveCoupon() {
  if (!couponForm.code.trim()) {
    toast.error('Coupon code is required');
    return;
  }
  savingCoupon.value = true;
  try {
    if (editingCouponId.value) {
      await axios.put(`/api/admin/coupons/${editingCouponId.value}`, couponPayload());
      toast.success('Coupon updated');
    } else {
      await axios.post('/api/admin/coupons', couponPayload());
      toast.success('Coupon created');
    }
    resetCouponForm();
    await loadSettings();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save coupon');
  } finally {
    savingCoupon.value = false;
  }
}

async function deleteCoupon(coupon: any) {
  if (!confirm(`Delete coupon ${coupon.code}? Used coupons will be deactivated instead.`)) return;
  try {
    await axios.delete(`/api/admin/coupons/${coupon.id}`);
    toast.success('Coupon removed');
    await loadSettings();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete coupon');
  }
}

async function saveShippingRates() {
  savingShipping.value = true;
  try {
    await Promise.all([
      axios.put('/api/admin/shipping-rates/air', {
        currency: shippingForm.air.currency || 'BDT',
        min_rate_per_kg: Number(shippingForm.air.min_rate_per_kg || 0),
        max_rate_per_kg: Number(shippingForm.air.max_rate_per_kg || 0),
      }),
      axios.put('/api/admin/shipping-rates/sea', {
        currency: shippingForm.sea.currency || 'BDT',
        min_rate_per_kg: Number(shippingForm.sea.min_rate_per_kg || 0),
        max_rate_per_kg: Number(shippingForm.sea.max_rate_per_kg || 0),
      }),
    ]);
    toast.success('Shipping rates updated');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save shipping rates');
  } finally {
    savingShipping.value = false;
  }
}

async function saveMarkup() {
  savingMarkup.value = true;
  try {
    await axios.put('/api/admin/profit-markup', {
      percent_rate: Number(markupPercent.value || 0),
    });
    toast.success('Markup updated');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save markup');
  } finally {
    savingMarkup.value = false;
  }
}

async function saveMoqRule() {
  savingMoq.value = true;
  try {
    await axios.put('/api/admin/moq-rule', {
      minimum_product: Number(moqRule.minimum_product || 1),
      minimum_price_threshold: Number(moqRule.minimum_price_threshold || 0),
      currency: moqRule.currency || 'BDT',
    });
    toast.success('MOQ rule updated');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save MOQ rule');
  } finally {
    savingMoq.value = false;
  }
}

onMounted(loadSettings);
</script>
