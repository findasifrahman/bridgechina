<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader title="Sellers" subtitle="Compact seller directory with weekly and monthly drilldowns" />
      <Button variant="ghost" size="sm" @click="loadSellers" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-[1fr_auto]">
          <Input v-model="search" label="Search" placeholder="Shop name, email, phone" @input="onSearchChange" />
          <div class="self-end text-xs text-slate-500">{{ total }} sellers</div>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading sellers...</div>
        <div v-else-if="sellers.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No sellers found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead class="sticky top-0 z-10 bg-slate-50 uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Seller</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Stats</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="seller in sellers" :key="seller.id" class="align-top hover:bg-slate-50/80">
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="space-y-1">
                    <div class="font-semibold text-slate-900">{{ seller.sellerProfile?.shop_name || seller.email }}</div>
                    <div class="text-slate-500">{{ seller.email || 'No email' }}</div>
                    <div class="text-slate-500">{{ seller.phone || 'No phone' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="space-y-1 text-slate-600">
                    <div>Products: {{ seller.products?.length || 0 }}</div>
                    <div>Order items: {{ seller.sellerOrderItems?.length || 0 }}</div>
                    <div>Rating: {{ seller.sellerProfile?.rating ?? '—' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="space-y-1">
                    <Badge :variant="seller.sellerProfile?.verified ? 'success' : 'warning'" class="text-[10px]">
                      {{ seller.sellerProfile?.verified ? 'Verified' : 'Unverified' }}
                    </Badge>
                    <Badge :variant="seller.sellerProfile?.is_active ? 'success' : 'default'" class="text-[10px]">
                      {{ seller.sellerProfile?.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" class="h-7 px-2 text-[10px]" @click="openSeller(seller)">View report</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200">
          <Pagination :current-page="page" :total-pages="totalPages" :total="total" :page-size="limit" @update:currentPage="handlePageChange" />
        </div>
      </CardBody>
    </Card>

    <Modal v-model="showSellerModal" title="Seller report" size="xl">
      <div v-if="reportLoading" class="py-10 text-center text-sm text-slate-500">Loading seller report...</div>
      <div v-else-if="selectedSeller" class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="font-semibold text-slate-900">{{ selectedSeller.sellerProfile?.shop_name || selectedSeller.email }}</div>
          <div class="text-sm text-slate-600">{{ selectedSeller.email }} • {{ selectedSeller.phone || 'No phone' }}</div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 p-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Weekly sales</p>
            <div class="mt-2 space-y-2">
              <button
                v-for="row in report.weeklySales || []"
                :key="row.period"
                class="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-[11px] hover:bg-slate-50"
                @click="loadPeriodOrders('week', row.period)"
              >
                <span>{{ formatPeriod(row.period, 'week') }}</span>
                <span class="font-semibold text-slate-900">{{ formatMoney(row.revenue) }} • {{ row.items }} items</span>
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 p-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Monthly sales</p>
            <div class="mt-2 space-y-2">
              <button
                v-for="row in report.monthlySales || []"
                :key="row.period"
                class="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-[11px] hover:bg-slate-50"
                @click="loadPeriodOrders('month', row.period)"
              >
                <span>{{ formatPeriod(row.period, 'month') }}</span>
                <span class="font-semibold text-slate-900">{{ formatMoney(row.revenue) }} • {{ row.items }} items</span>
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200">
          <div class="border-b border-slate-200 px-4 py-3">
            <div class="text-sm font-semibold text-slate-900">{{ ordersHeading }}</div>
            <div class="text-xs text-slate-500">{{ report.items?.length || 0 }} order items</div>
          </div>
          <div class="max-h-[420px] overflow-auto">
            <table class="min-w-full border-separate border-spacing-0 text-[11px]">
              <thead class="sticky top-0 bg-white text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Order</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Customer</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Product</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-right">Qty / Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in report.items || []" :key="item.id" class="align-top hover:bg-slate-50">
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="font-semibold text-slate-900">#{{ item.order?.order_number || item.order_id.slice(0, 8) }}</div>
                    <div class="text-slate-500">{{ formatDateTime(item.created_at || item.order?.created_at) }}</div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="font-medium text-slate-900">{{ item.order?.user?.customerProfile?.full_name || item.order?.user?.email || 'Customer' }}</div>
                    <div class="text-slate-500">{{ item.order?.shippingAddress?.city || 'No city' }}</div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="font-medium text-slate-900">{{ item.product?.title || item.title_snapshot }}</div>
                    <div class="text-slate-500">{{ item.seller_status || 'pending_review' }}</div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2 text-right">
                    <div class="font-semibold text-slate-900">{{ formatMoney(item.price_snapshot * item.qty) }}</div>
                    <div class="text-slate-500">Qty {{ item.qty }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardBody, Button, Badge, Input, Modal, Pagination, useToast } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const sellers = ref<any[]>([]);
const loading = ref(false);
const search = ref('');
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const limit = ref(25);

const showSellerModal = ref(false);
const reportLoading = ref(false);
const selectedSeller = ref<any>(null);
const report = ref<any>({ weeklySales: [], monthlySales: [], items: [] });
const ordersHeading = ref('Orders');
let ordersRange: { from?: string; to?: string } = {};

async function loadSellers() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/sellers', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
      },
    });
    const payload = response.data || {};
    sellers.value = payload.sellers || [];
    total.value = payload.total || 0;
    totalPages.value = payload.totalPages || 1;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load sellers');
  } finally {
    loading.value = false;
  }
}

function onSearchChange() {
  page.value = 1;
  loadSellers();
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadSellers();
}

async function openSeller(seller: any) {
  selectedSeller.value = seller;
  showSellerModal.value = true;
  reportLoading.value = true;
  ordersHeading.value = 'Recent order items';
  ordersRange = {};
  try {
    const response = await axios.get(`/api/admin/sellers/${seller.id}/report`);
    report.value = response.data || { weeklySales: [], monthlySales: [], items: [] };
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load seller report');
  } finally {
    reportLoading.value = false;
  }
}

async function loadPeriodOrders(periodType: 'week' | 'month', period: string) {
  if (!selectedSeller.value) return;
  const start = new Date(period);
  const end = new Date(start);
  end.setDate(end.getDate() + (periodType === 'week' ? 7 : 30));
  reportLoading.value = true;
  ordersHeading.value = `${periodType === 'week' ? 'Weekly' : 'Monthly'} orders`;
  ordersRange = { from: start.toISOString(), to: end.toISOString() };
  try {
    const response = await axios.get(`/api/admin/sellers/${selectedSeller.value.id}/report`, {
      params: ordersRange,
    });
    report.value = response.data || { weeklySales: [], monthlySales: [], items: [] };
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load orders');
  } finally {
    reportLoading.value = false;
  }
}

function formatMoney(value: number | null | undefined) {
  return `BDT ${(value ?? 0).toLocaleString()}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPeriod(value: string, type: 'week' | 'month') {
  const date = new Date(value);
  return type === 'week'
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

onMounted(loadSellers);
</script>
