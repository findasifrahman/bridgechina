<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader
        title="Seller Dashboard"
        subtitle="Compact weekly and monthly reporting with order drilldowns, approvals, and customer insight"
      />
      <Button variant="ghost" size="sm" @click="loadData" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Total order items</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900">{{ stats.items }}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Approved</p>
        <p class="mt-2 text-3xl font-semibold text-emerald-600">{{ stats.approved }}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Rejected</p>
        <p class="mt-2 text-3xl font-semibold text-rose-600">{{ stats.rejected }}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Pending proofs</p>
        <p class="mt-2 text-3xl font-semibold text-teal-600">{{ stats.pendingProofs }}</p>
      </div>
    </div>

    <div class="grid gap-3 xl:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Shipping rate</p>
        <div class="mt-2 space-y-1 text-sm text-slate-600">
          <div>Air: {{ settings.shippingAir }}</div>
          <div>Sea: {{ settings.shippingSea }}</div>
          <div class="text-[11px] text-slate-500">Shipping time: {{ settings.shippingTime }}</div>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">OTAPI markup</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900">{{ settings.markup }}%</p>
        <p class="mt-1 text-[11px] text-slate-500">Read only in seller panel.</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-slate-500">MOQ rule</p>
        <div class="mt-2 space-y-1 text-sm text-slate-600">
          <div>Minimum quantity: {{ settings.moqQty }}</div>
          <div>Minimum order value: {{ settings.moqValue }}</div>
          <div class="text-[11px] text-slate-500">{{ settings.moqCurrency }}</div>
        </div>
      </div>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-base font-semibold">Recent seller orders</h3>
          <Button variant="ghost" size="sm" @click="$router.push('/seller/orders')">View orders</Button>
        </div>
      </CardHeader>
      <CardBody>
        <EmptyState
          v-if="recentOrders.length === 0"
          title="No orders yet"
          description="Orders will appear here once customers buy your products."
        />
        <div v-else class="space-y-2">
          <div
            v-for="item in recentOrders.slice(0, 5)"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-semibold text-slate-900">{{ item.product?.title || item.title_snapshot }}</p>
                <p class="text-[11px] text-slate-500">
                  #{{ item.order?.order_number || item.order_id.slice(0, 8) }} · Qty {{ item.qty }} · {{ customerName(item) }}
                </p>
              </div>
              <StatusChip :status="item.seller_status || 'pending_review'" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <div class="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 class="text-base font-semibold">Weekly sales</h3>
        </CardHeader>
        <CardBody class="space-y-2">
          <div v-if="(weeklySales || []).length === 0" class="text-xs text-slate-500">No weekly report data yet</div>
          <button
            v-for="row in weeklySales.slice(0, 8)"
            :key="row.period"
            class="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-[12px] transition hover:border-teal-300 hover:bg-teal-50/50"
            @click="openReport('week', row.period)"
          >
            <div>
              <div class="font-medium text-slate-900">{{ formatPeriod(row.period, 'week') }}</div>
              <div class="text-[11px] text-slate-500">{{ row.items }} items</div>
            </div>
            <div class="font-semibold text-slate-900">{{ formatMoney(row.revenue) }}</div>
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-base font-semibold">Monthly sales</h3>
        </CardHeader>
        <CardBody class="space-y-2">
          <div v-if="(monthlySales || []).length === 0" class="text-xs text-slate-500">No monthly report data yet</div>
          <button
            v-for="row in monthlySales.slice(0, 8)"
            :key="row.period"
            class="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-[12px] transition hover:border-teal-300 hover:bg-teal-50/50"
            @click="openReport('month', row.period)"
          >
            <div>
              <div class="font-medium text-slate-900">{{ formatPeriod(row.period, 'month') }}</div>
              <div class="text-[11px] text-slate-500">{{ row.items }} items</div>
            </div>
            <div class="font-semibold text-slate-900">{{ formatMoney(row.revenue) }}</div>
          </button>
        </CardBody>
      </Card>
    </div>

    <Modal v-model="reportModalOpen" :title="reportTitle" size="xl">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span class="rounded-full bg-slate-100 px-3 py-1.5">{{ reportMetaLabel }}</span>
          <span class="rounded-full bg-slate-100 px-3 py-1.5">{{ reportOrders.length }} orders</span>
        </div>

        <div v-if="reportLoading" class="py-10 text-center text-sm text-slate-500">Loading report...</div>
        <div v-else-if="reportOrders.length === 0" class="py-10 text-center text-sm text-slate-500">No orders in this period</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Order</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Customer</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Product</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Amount</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reportOrders" :key="item.id" class="align-top hover:bg-slate-50/70">
                <td class="border-b border-slate-100 px-3 py-2 font-semibold text-slate-900">
                  #{{ item.order?.order_number || item.order_id.slice(0, 8) }}
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="font-medium text-slate-900">{{ customerName(item) }}</div>
                  <div class="text-slate-500">{{ customerPhone(item) }}</div>
                  <div class="text-slate-500">{{ shippingSummary(item) }}</div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="font-medium text-slate-900">{{ item.product?.title || item.title_snapshot }}</div>
                  <div class="text-slate-500">{{ item.product?.category?.name || 'Category' }}</div>
                  <div class="text-slate-500">Qty {{ item.qty }}</div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <StatusChip :status="item.seller_status || 'pending_review'" />
                </td>
                <td class="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-900">
                  {{ formatCurrency(item.price_snapshot * item.qty, item.currency_snapshot) }}
                </td>
                <td class="border-b border-slate-100 px-3 py-2 text-right text-slate-500">
                  {{ formatDateTime(item.created_at || item.order?.created_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { Button, Card, CardBody, CardHeader, EmptyState, Modal, PageHeader, StatusChip } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const loading = ref(false);
const reportLoading = ref(false);
const stats = ref({
  items: 0,
  approved: 0,
  rejected: 0,
  pendingProofs: 0,
});
const recentOrders = ref<any[]>([]);
const weeklySales = ref<any[]>([]);
const monthlySales = ref<any[]>([]);
const settings = ref({
  shippingAir: 'Not set',
  shippingSea: 'Not set',
  shippingTime: '12-14 days',
  markup: 0,
  moqQty: 1,
  moqValue: 'BDT 0',
  moqCurrency: 'BDT',
});
const reportModalOpen = ref(false);
const reportOrders = ref<any[]>([]);
const reportTitle = ref('Sales report');
const reportMetaLabel = ref('');

async function loadData() {
  loading.value = true;
  try {
    const response = await axios.get('/api/seller/dashboard');
    stats.value = response.data || stats.value;
    weeklySales.value = response.data?.weeklySales || [];
    monthlySales.value = response.data?.monthlySales || [];
    const settingsRes = await axios.get('/api/public/shopping/settings');
    const shippingRates = Array.isArray(settingsRes.data?.shippingRates) ? settingsRes.data.shippingRates : [];
    const air = shippingRates.find((rate: any) => rate.method === 'air');
    const sea = shippingRates.find((rate: any) => rate.method === 'sea');
    settings.value = {
      shippingAir: air ? `${air.currency} ${air.min_rate_per_kg} - ${air.max_rate_per_kg} /kg` : 'Not set',
      shippingSea: sea ? `${sea.currency} ${sea.min_rate_per_kg} - ${sea.max_rate_per_kg} /kg` : 'Not set',
      shippingTime: settingsRes.data?.shippingTimeText || '12-14 days',
      markup: settingsRes.data?.otapiMarkupPercent ?? 0,
      moqQty: settingsRes.data?.moqRule?.minimum_product ?? 1,
      moqValue: `${settingsRes.data?.moqRule?.currency || 'BDT'} ${Number(settingsRes.data?.moqRule?.minimum_price_threshold || 0).toLocaleString()}`,
      moqCurrency: settingsRes.data?.moqRule?.currency || 'BDT',
    };
    const ordersRes = await axios.get('/api/seller/orders', {
      params: { status: 'all', limit: 12 },
    });
    recentOrders.value = ordersRes.data?.items || [];
  } catch (error) {
    console.error('Failed to load seller dashboard', error);
  } finally {
    loading.value = false;
  }
}

function customerName(item: any) {
  return item?.order?.user?.customerProfile?.full_name || item?.order?.user?.email || 'Customer';
}

function customerPhone(item: any) {
  return item?.order?.user?.phone || item?.order?.user?.email || 'N/A';
}

function shippingSummary(item: any) {
  const shipping = item?.order?.shippingAddress;
  if (!shipping) return 'No shipping address';
  return `${shipping.name || 'Address'} · ${shipping.city || ''}`.trim();
}

function formatMoney(value: number | null | undefined) {
  return `BDT ${(value ?? 0).toLocaleString()}`;
}

function formatCurrency(value: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(value ?? 0).toLocaleString()}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPeriod(value: string, type: 'week' | 'month') {
  const date = new Date(value);
  if (type === 'week') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function buildRange(period: string, type: 'week' | 'month') {
  const start = new Date(period);
  const end = new Date(start);
  if (type === 'week') {
    end.setDate(end.getDate() + 7);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return {
    from: start.toISOString(),
    to: new Date(end.getTime() - 1000).toISOString(),
  };
}

async function openReport(type: 'week' | 'month', period: string) {
  reportModalOpen.value = true;
  reportLoading.value = true;
  const range = buildRange(period, type);
  reportTitle.value = type === 'week' ? `Weekly sales report · ${formatPeriod(period, type)}` : `Monthly sales report · ${formatPeriod(period, type)}`;
  reportMetaLabel.value = `${range.from.slice(0, 10)} to ${range.to.slice(0, 10)}`;
  try {
    const response = await axios.get('/api/seller/orders', {
      params: {
        status: 'all',
        from: range.from,
        to: range.to,
        limit: 100,
      },
    });
    reportOrders.value = response.data?.items || [];
  } catch (error) {
    console.error('Failed to load seller report', error);
    reportOrders.value = [];
  } finally {
    reportLoading.value = false;
  }
}

onMounted(loadData);
</script>
