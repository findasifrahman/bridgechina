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

async function loadSettings() {
  loading.value = true;
  try {
    const [markupRes, moqRes, shippingRes] = await Promise.all([
      axios.get('/api/admin/profit-markup'),
      axios.get('/api/admin/moq-rule'),
      axios.get('/api/admin/shipping-rates'),
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
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load pricing settings');
  } finally {
    loading.value = false;
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
