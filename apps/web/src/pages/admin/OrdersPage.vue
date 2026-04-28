<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader
        title="Orders"
        subtitle="Daywise checkout queue with seller approvals, customer lookup, and compact fulfillment control"
      />
      <Button variant="ghost" size="sm" @click="loadOrders" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-5">
          <Input v-model="filters.search" label="Search" placeholder="Order, email, phone, city" @input="onFilterChange" />
          <Select v-model="filters.status" label="Status" :options="statusOptions" @update:modelValue="onFilterChange" />
          <Select v-model="filters.paymentStatus" label="Payment" :options="paymentOptions" @update:modelValue="onFilterChange" />
          <Input v-model="filters.from" label="From" type="date" @input="onFilterChange" />
          <Input v-model="filters.to" label="To" type="date" @input="onFilterChange" />
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <button
            class="rounded-full border px-3 py-1.5 transition"
            :class="pendingFirst ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'"
            @click="togglePendingFirst"
          >
            Pending review first
          </button>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{{ total }} total orders</span>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{{ dayGroups.length }} days shown</span>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading orders...</div>
        <div v-else-if="orders.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No orders found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Order</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Customer</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Items</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Payment</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Total</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in dayGroups" :key="group.day">
                <tr>
                  <td colspan="7" class="bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    {{ group.dayLabel }}
                    <span class="ml-2 rounded-full bg-white px-2 py-0.5 text-slate-500">{{ group.orders.length }}</span>
                  </td>
                </tr>
                <tr v-for="order in group.orders" :key="order.id" class="align-top hover:bg-slate-50/80">
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">#{{ order.order_number }}</div>
                      <div class="text-slate-500">{{ formatDateTime(order.created_at) }}</div>
                      <div class="text-slate-500">{{ order.shippingAddress?.city || 'No city' }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="font-medium text-slate-900">{{ customerName(order) }}</div>
                      <div class="text-slate-500">{{ customerEmail(order) }}</div>
                      <div class="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px]" @click="openCustomer(order)">
                          View customer
                        </Button>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <div class="text-slate-900">{{ order.items?.length || 0 }} items</div>
                      <div class="max-w-[18rem] text-slate-500">
                        <span
                          v-for="item in order.items.slice(0, 2)"
                          :key="item.id"
                          class="mr-1 inline-block rounded-full bg-slate-100 px-2 py-0.5"
                        >
                          {{ item.title_snapshot || item.product?.title }}
                        </span>
                        <span v-if="order.items.length > 2" class="text-slate-400">+{{ order.items.length - 2 }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-2">
                      <Badge :variant="badgeVariant(order.status)" class="text-[10px]">{{ order.status }}</Badge>
                      <div class="w-36">
                        <Select
                          :model-value="order.status"
                          :options="fulfillmentOptions"
                          @update:model-value="updateStatus(order.id, $event)"
                        />
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <Badge
                          v-for="state in sellerStateSummary(order)"
                          :key="state"
                          :variant="badgeVariant(state)"
                          class="text-[11px]"
                        >
                          {{ state }}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2">
                    <div class="space-y-1">
                      <Badge :variant="badgeVariant(order.payment_status)" class="text-[10px]">{{ order.payment_status }}</Badge>
                      <Badge v-if="latestProof(order)" :variant="badgeVariant(latestProof(order).status)" class="text-[10px]">
                        {{ latestProof(order).status }}
                      </Badge>
                      <div v-else class="text-slate-500">No slip uploaded</div>
                      <div class="text-slate-500">{{ order.paymentProofs?.length || 0 }} proof(s)</div>
                      <a
                        v-if="latestProof(order)?.asset?.public_url"
                        :href="latestProof(order).asset.public_url"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Open slip
                      </a>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">{{ money(order.total, order.currency) }}</div>
                      <div class="text-slate-500">Shipping {{ money(order.shipping_fee, order.currency) }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-2 py-2 text-right">
                    <div class="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" class="h-6 px-2 text-[10px]" @click="openOrderDetails(order)">Details</Button>
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

    <Modal v-model="customerModalOpen" :title="customerModalTitle" size="xl">
      <div v-if="selectedCustomer" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Customer profile</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ selectedCustomer.customerProfile?.full_name || selectedCustomer.email || 'Customer' }}</div>
            <div class="mt-2 space-y-1 text-sm text-slate-600">
              <div>Email: {{ selectedCustomer.email || 'N/A' }}</div>
              <div>Phone: {{ selectedCustomer.phone || 'N/A' }}</div>
              <div>Preferred currency: {{ selectedCustomer.customerProfile?.preferred_currency || 'BDT' }}</div>
              <div>Current rating: {{ selectedCustomer.customerProfile?.internal_rating ?? '—' }}/10</div>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input v-model.number="customerReview.rating" type="number" min="1" max="10" label="Internal rating" />
            <Textarea v-model="customerReview.note" label="Internal note" rows="4" placeholder="Premium client, high return risk, sensitive buyer, etc." />
            <div class="flex justify-end gap-2">
              <Button variant="ghost" class="text-rose-600" :loading="deletingCustomer" @click="deleteSelectedCustomer">Delete customer</Button>
              <Button variant="primary" :loading="savingCustomerReview" @click="saveCustomerReview">Save review</Button>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <Card class="shadow-none">
            <CardBody>
              <div class="mb-2 text-sm font-semibold text-slate-900">Addresses</div>
              <div v-if="selectedCustomer.addresses?.length" class="space-y-2">
                <div v-for="address in selectedCustomer.addresses" :key="address.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="font-medium text-slate-900">{{ address.name }}</div>
                  <div class="text-slate-600">{{ address.phone }} • {{ address.city }}</div>
                  <div class="text-slate-500">{{ address.address_line }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500">No addresses saved.</div>
            </CardBody>
          </Card>

          <Card class="shadow-none">
            <CardBody>
              <div class="mb-2 text-sm font-semibold text-slate-900">Recent orders</div>
              <div v-if="selectedCustomer.orders?.length" class="space-y-2">
                <div v-for="order in selectedCustomer.orders" :key="order.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="font-medium text-slate-900">#{{ order.order_number }}</div>
                  <div class="text-slate-600">{{ formatDateTime(order.created_at) }} • {{ money(order.total, order.currency) }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500">No recent orders.</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Modal>

    <Modal v-model="orderModalOpen" title="Order details" size="xl">
      <div v-if="selectedOrder" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 p-3 text-sm">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Order</div>
            <div class="font-semibold text-slate-900">#{{ selectedOrder.order_number }}</div>
            <div class="text-slate-600">{{ formatDateTime(selectedOrder.created_at) }}</div>
          </div>
          <div class="rounded-2xl border border-slate-200 p-3 text-sm">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Customer</div>
            <div class="font-semibold text-slate-900">{{ customerName(selectedOrder) }}</div>
            <div class="text-slate-600">{{ customerEmail(selectedOrder) }}</div>
          </div>
          <div class="rounded-2xl border border-slate-200 p-3 text-sm">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Shipping</div>
            <div class="font-semibold text-slate-900">{{ selectedOrder.shippingAddress?.city || 'N/A' }}</div>
            <div class="text-slate-600">{{ selectedOrder.shipping_method || 'air' }}</div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200">
          <div class="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">Items</div>
          <div class="divide-y divide-slate-100">
            <div v-for="item in selectedOrder.items" :key="item.id" class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <div class="font-medium text-slate-900">{{ item.title_snapshot || item.product?.title }}</div>
                <div class="text-slate-500">Qty {{ item.qty }} • {{ money(item.price_snapshot, item.currency_snapshot) }}</div>
              </div>
              <Badge :variant="badgeVariant(item.seller_status)" class="text-[11px]">{{ item.seller_status }}</Badge>
            </div>
          </div>
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
const total = ref(0);
const page = ref(1);
const limit = ref(25);
const totalPages = ref(1);
const pendingFirst = ref(true);
const filters = reactive({
  search: '',
  status: '',
  paymentStatus: '',
  from: '',
  to: '',
});

const customerModalOpen = ref(false);
const customerModalTitle = ref('Customer');
const selectedCustomer = ref<any>(null);
const customerReview = reactive({
  rating: 10,
  note: '',
});
const savingCustomerReview = ref(false);
const deletingCustomer = ref(false);

const orderModalOpen = ref(false);
const selectedOrder = ref<any>(null);

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending_purchase', label: 'Pending purchase' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'in_warehouse', label: 'In warehouse' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentOptions = [
  { value: '', label: 'All payment states' },
  { value: 'unsubmitted', label: 'Unsubmitted' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const fulfillmentOptions = [
  { value: 'pending_purchase', label: 'Pending purchase' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'in_warehouse', label: 'In warehouse' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const dayGroups = computed(() => {
  const map = new Map<string, any[]>();
  for (const order of orders.value) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }
  return Array.from(map.entries()).map(([day, items]) => ({
    day,
    dayLabel: new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    orders: items,
  }));
});

function badgeVariant(value: string) {
  if (['approved', 'shipped', 'received', 'purchased', 'completed'].includes(value)) return 'success';
  if (['submitted', 'pending_payment', 'pending_review', 'pending_purchase', 'in_warehouse'].includes(value)) return 'warning';
  if (['rejected', 'cancelled'].includes(value)) return 'danger';
  return 'default';
}

function money(amount: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function customerName(order: any) {
  return order?.user?.customerProfile?.full_name || order?.user?.email || 'Customer';
}

function customerEmail(order: any) {
  return order?.user?.phone || order?.user?.email || 'N/A';
}

function sellerStateSummary(order: any) {
  const states = Array.from(new Set((order.items || []).map((item: any) => item.seller_status).filter(Boolean)));
  return states.slice(0, 3);
}

function latestProof(order: any) {
  return order?.paymentProofs?.[0] || null;
}

async function loadOrders() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/orders', {
      params: {
        page: page.value,
        limit: limit.value,
        search: filters.search || undefined,
        status: filters.status || undefined,
        payment_status: filters.paymentStatus || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        pending_first: pendingFirst.value ? '1' : '0',
      },
    });
    const payload = response.data || {};
    orders.value = payload.orders || [];
    total.value = payload.total || 0;
    totalPages.value = payload.totalPages || 1;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load orders');
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  page.value = 1;
  loadOrders();
}

function togglePendingFirst() {
  pendingFirst.value = !pendingFirst.value;
  loadOrders();
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadOrders();
}

async function updateStatus(orderId: string, status: string | number) {
  try {
    await axios.patch(`/api/admin/orders/${orderId}/status`, { status: String(status) });
    toast.success('Order status updated');
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update status');
  }
}

async function openCustomer(order: any) {
  const customerId = order?.user?.id;
  if (!customerId) return;
  customerModalTitle.value = `${customerName(order)} profile`;
  customerModalOpen.value = true;
  selectedCustomer.value = null;
  try {
    const response = await axios.get(`/api/admin/customers/${customerId}`);
    selectedCustomer.value = response.data;
    customerReview.rating = response.data?.customerProfile?.internal_rating ?? 10;
    customerReview.note = response.data?.customerProfile?.internal_note ?? '';
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load customer');
  }
}

function openOrderDetails(order: any) {
  selectedOrder.value = order;
  orderModalOpen.value = true;
}

async function saveCustomerReview() {
  if (!selectedCustomer.value?.id) return;
  savingCustomerReview.value = true;
  try {
    await axios.patch(`/api/admin/customers/${selectedCustomer.value.id}/review`, {
      rating: Number(customerReview.rating || 10),
      note: customerReview.note || undefined,
    });
    toast.success('Customer review saved');
    const response = await axios.get(`/api/admin/customers/${selectedCustomer.value.id}`);
    selectedCustomer.value = response.data;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save customer review');
  } finally {
    savingCustomerReview.value = false;
  }
}

async function deleteSelectedCustomer() {
  if (!selectedCustomer.value?.id) return;
  if (!confirm('Delete this customer and all related orders? This cannot be undone.')) return;
  deletingCustomer.value = true;
  try {
    await axios.delete(`/api/admin/users/${selectedCustomer.value.id}`);
    toast.success('Customer deleted');
    customerModalOpen.value = false;
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete customer');
  } finally {
    deletingCustomer.value = false;
  }
}

onMounted(loadOrders);
</script>
