<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader
        title="Orders"
        subtitle="Compact seller review queue with customer details, archive controls, and payment slip status"
      />
      <Button variant="ghost" size="sm" @click="loadOrders" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-4">
          <Input v-model="filters.search" label="Search" placeholder="Order, email, phone, product" @input="onFilterChange" />
          <Select v-model="filters.status" label="Seller status" :options="statusOptions" @update:modelValue="onFilterChange" />
          <Input v-model="filters.from" label="From" type="date" @input="onFilterChange" />
          <Input v-model="filters.to" label="To" type="date" @input="onFilterChange" />
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{{ total }} rows</span>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{{ dayGroups.length }} days</span>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">Default view: pending_review</span>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading seller orders...</div>
        <div v-else-if="orders.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No orders found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Order</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Customer / Address</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Product</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Review</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Amount</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in dayGroups" :key="group.day">
                <tr>
                  <td colspan="6" class="bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    {{ group.dayLabel }}
                    <span class="ml-2 rounded-full bg-white px-2 py-0.5 text-slate-500">{{ group.items.length }}</span>
                  </td>
                </tr>
                <tr v-for="item in group.items" :key="item.id" class="align-top hover:bg-slate-50/80">
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">#{{ item.order?.order_number || item.order_id.slice(0, 8) }}</div>
                      <div class="text-slate-500">{{ formatDateTime(item.created_at || item.order?.created_at) }}</div>
                      <div class="text-slate-500">Qty {{ item.qty }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-medium text-slate-900">{{ customerName(item) }}</div>
                      <div class="text-slate-500">{{ customerPhone(item) }}</div>
                      <div class="text-slate-500">{{ shippingSummary(item) }}</div>
                      <Badge :variant="badgeVariant(item.order?.status || '')" class="text-[10px]">
                        {{ item.order?.status || 'pending_payment' }}
                      </Badge>
                      <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px]" @click="selectedOrderItem = item; customerModalOpen = true">
                        View customer
                      </Button>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-medium text-slate-900">{{ item.product?.title || item.title_snapshot }}</div>
                      <div class="text-slate-500">{{ item.product?.category?.name || 'Category' }}</div>
                      <Badge :variant="badgeVariant(item.seller_status)" class="text-[10px]">{{ item.seller_status || 'pending_review' }}</Badge>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-2">
                      <Badge :variant="badgeVariant(latestProof(item.order)?.status || 'default')" class="text-[10px]">
                        {{ latestProof(item.order)?.status || 'unsubmitted' }}
                      </Badge>
                      <div class="flex flex-wrap gap-1">
                        <Badge v-if="item.seller_note" variant="default" class="text-[10px]">Note added</Badge>
                        <Badge v-if="item.order?.paymentProofs?.length" variant="success" class="text-[10px]">{{ item.order.paymentProofs.length }} slip(s)</Badge>
                      </div>
                      <a
                        v-if="latestProof(item.order)?.asset?.public_url"
                        :href="latestProof(item.order).asset.public_url"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Slip
                      </a>
                      <div v-if="item.seller_status === 'pending_review'" class="flex flex-wrap gap-2">
                        <Button size="sm" variant="primary" class="h-6 px-2 text-[10px]" @click="reviewItem(item.id, 'approved')">Approve</Button>
                        <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px] text-rose-600" @click="reviewItem(item.id, 'rejected')">Reject</Button>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">{{ formatCurrency(item.price_snapshot * item.qty, item.currency_snapshot) }}</div>
                      <div class="text-slate-500">Unit {{ formatCurrency(item.price_snapshot, item.currency_snapshot) }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px]" @click="archiveOrder(item.order_id)">Archive</Button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200">
          <Pagination :current-page="page" :total-pages="totalPages" :total="total" :page-size="limit" @update:currentPage="handlePageChange" />
        </div>
      </CardBody>
    </Card>

    <Modal v-model="customerModalOpen" title="Customer snapshot" size="lg">
      <div v-if="selectedOrderItem" class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="font-semibold text-slate-900">{{ customerName(selectedOrderItem) }}</div>
          <div class="text-sm text-slate-600">{{ customerPhone(selectedOrderItem) }}</div>
          <div class="text-sm text-slate-600">{{ shippingSummary(selectedOrderItem) }}</div>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <Input v-model.number="customerReview.rating" type="number" min="1" max="10" label="Customer rating" />
          <Textarea v-model="customerReview.note" label="Internal note" rows="4" placeholder="Returns too much, premium client, etc." />
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" class="text-rose-600" @click="saveCustomerReview">Save note</Button>
          <Button variant="primary" @click="customerModalOpen = false">Close</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Button, Card, CardBody, Badge, Input, Modal, Pagination, PageHeader, Select, Textarea } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const loading = ref(false);
const orders = ref<any[]>([]);
const page = ref(1);
const limit = ref(25);
const total = ref(0);
const totalPages = ref(1);
const filters = reactive({
  search: '',
  status: '',
  from: '',
  to: '',
});

const customerModalOpen = ref(false);
const selectedOrderItem = ref<any>(null);
const customerReview = reactive({ rating: 10, note: '' });

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

const dayGroups = computed(() => {
  const map = new Map<string, any[]>();
  for (const item of orders.value) {
    const date = new Date(item.created_at || item.order?.created_at).toISOString().slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(item);
  }
  return Array.from(map.entries()).map(([day, items]) => ({
    day,
    dayLabel: new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    items,
  }));
});

function badgeVariant(value: string) {
  if (['approved'].includes(value)) return 'success';
  if (['pending_review', 'submitted', 'pending_payment', 'pending_purchase'].includes(value)) return 'warning';
  if (['rejected', 'archived', 'cancelled'].includes(value)) return 'danger';
  return 'default';
}

function formatCurrency(value: number | string | null | undefined, currency?: string) {
  const code = currency || 'BDT';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value || 0));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function latestProof(order: any) {
  return order?.paymentProofs?.[0] || null;
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
  return `${shipping.name || 'Address'} • ${shipping.city || ''}`.trim();
}

async function loadOrders() {
  loading.value = true;
  try {
    const response = await axios.get('/api/seller/orders', {
      params: {
        page: page.value,
        limit: limit.value,
        status: filters.status || undefined,
        search: filters.search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      },
    });
    const payload = response.data || {};
    orders.value = payload.items || [];
    total.value = payload.total || 0;
    totalPages.value = payload.totalPages || 1;
  } catch (error) {
    console.error('Failed to load seller orders', error);
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  page.value = 1;
  loadOrders();
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadOrders();
}

async function reviewItem(id: string, status: 'approved' | 'rejected') {
  try {
    await axios.patch(`/api/seller/order-items/${id}/review`, { status });
    toast.success(status === 'approved' ? 'Order item approved' : 'Order item rejected');
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update item');
  }
}

async function archiveOrder(orderId: string) {
  try {
    await axios.patch(`/api/seller/orders/${orderId}/archive`);
    toast.success('Order archived');
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to archive order');
  }
}

async function saveCustomerReview() {
  if (!selectedOrderItem.value?.order?.user?.id) return;
  try {
    await axios.patch(`/api/seller/customers/${selectedOrderItem.value.order.user.id}/review`, {
      rating: Number(customerReview.rating || 10),
      note: customerReview.note || undefined,
    });
    toast.success('Customer review saved');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save customer review');
  }
}

onMounted(loadOrders);
</script>
