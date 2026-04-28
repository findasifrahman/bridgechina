<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader title="My Orders" subtitle="Compact order history with payment slip upload and status tracking" />
      <Button variant="ghost" size="sm" @click="loadOrders" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input v-model="filters.search" label="Search" placeholder="Order number or note" @input="onFilterChange" />
          <div class="self-end text-xs text-slate-500">{{ total }} orders</div>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading orders...</div>
        <div v-else-if="orders.length === 0">
          <EmptyState title="No orders yet" description="Your paid and pending orders will appear here.">
            <template #actions>
              <Button variant="primary" @click="$router.push('/shopping')">Start shopping</Button>
            </template>
          </EmptyState>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead class="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Order</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Items</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Payment</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Total</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in dayGroups" :key="group.day">
                <tr>
                  <td colspan="6" class="bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                    {{ group.dayLabel }}
                    <span class="ml-2 rounded-full bg-white px-2 py-0.5 text-slate-500">{{ group.orders.length }}</span>
                  </td>
                </tr>
                <tr v-for="order in group.orders" :key="order.id" class="align-top hover:bg-slate-50/80">
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">#{{ order.order_number || order.id.slice(0, 8) }}</div>
                      <div class="text-slate-500">{{ formatDateTime(order.created_at) }}</div>
                      <div class="text-slate-500">{{ order.shippingAddress?.city || 'No city' }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="space-y-1">
                      <div class="text-slate-900">{{ order.items?.length || 0 }} items</div>
                      <div class="text-slate-500">
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
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="space-y-1">
                      <StatusChip :status="order.status" />
                      <div class="text-slate-500">Shipping {{ order.shipping_method || 'air' }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="space-y-1">
                      <Badge :variant="badgeVariant(order.payment_status)" class="text-[11px]">{{ paymentStatusLabel(order.payment_status) }}</Badge>
                      <Badge v-if="latestProof(order)" :variant="proofBadgeVariant(latestProof(order).status)" class="text-[11px]">
                        {{ proofStatusLabel(latestProof(order).status) }}
                      </Badge>
                      <div v-else class="text-slate-500">No slip uploaded</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2 text-right">
                    <div class="space-y-1">
                      <div class="font-semibold text-slate-900">{{ formatCurrency(order.total, order.currency) }}</div>
                      <div class="text-slate-500">Shipping {{ formatCurrency(order.shipping_fee || 0, order.currency) }}</div>
                    </div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2 text-right">
                    <div class="flex justify-end">
                      <Button size="sm" variant="primary" class="h-10 px-3 text-[11px]" @click="openProofModal(order)">
                        {{ latestProof(order) ? 'Replace slip' : 'Upload payment slip' }}
                      </Button>
                    </div>
                    <div v-if="latestProof(order)" class="mt-2 text-[11px] text-slate-500">
                      Approval is tracked by seller/admin in {{ proofStatusLabel(latestProof(order).status).toLowerCase() }} state.
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

    <Modal v-model="proofModalOpen" title="Upload payment slip" size="lg">
      <form class="space-y-4" @submit.prevent="submitProof">
        <div v-if="selectedOrder" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Order #{{ selectedOrder.order_number || selectedOrder.id.slice(0, 8) }} • {{ formatCurrency(selectedOrder.total, selectedOrder.currency) }}
        </div>
        <Input v-model="proofForm.amount" label="Amount paid" type="number" min="0" step="0.01" />
        <Input v-model="proofForm.notes" label="Notes" placeholder="Bank transfer note, reference, etc." />
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">Payment slip file</label>
          <input type="file" accept="image/*,.pdf" @change="onFileChange" class="block w-full text-sm" />
        </div>
        <p class="text-xs text-slate-500">Accepted: image or PDF. The slip will be visible to seller and admin.</p>
        <div class="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" @click="proofModalOpen = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="submittingProof" :disabled="!proofFile">Submit</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Button, Card, CardBody, EmptyState, Input, Modal, PageHeader, Pagination, StatusChip, Badge } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const loading = ref(false);
const submittingProof = ref(false);
const orders = ref<any[]>([]);
const page = ref(1);
const totalPages = ref(1);
const total = ref(0);
const limit = ref(25);
const proofModalOpen = ref(false);
const selectedOrder = ref<any>(null);
const proofFile = ref<File | null>(null);
const filters = reactive({ search: '' });
const proofForm = ref({ amount: '', notes: '' });

const dayGroups = computed(() => {
  const map = new Map<string, any[]>();
  for (const order of orders.value) {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(order);
  }
  return Array.from(map.entries()).map(([day, orders]) => ({
    day,
    dayLabel: new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    orders,
  }));
});

function badgeVariant(value: string) {
  if (['approved', 'shipped', 'received'].includes(value)) return 'success';
  if (['submitted', 'pending_payment', 'pending_review'].includes(value)) return 'warning';
  if (['rejected', 'cancelled'].includes(value)) return 'danger';
  return 'default';
}

function proofBadgeVariant(value: string) {
  if (value === 'approved') return 'success';
  if (value === 'submitted' || value === 'pending') return 'warning';
  if (value === 'rejected') return 'danger';
  return 'default';
}

function paymentStatusLabel(value: string | null | undefined) {
  return value || 'unsubmitted';
}

function proofStatusLabel(value: string | null | undefined) {
  if (!value) return 'No slip';
  return value;
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

async function loadOrders() {
  loading.value = true;
  try {
    const response = await axios.get('/api/user/orders', {
      params: {
        page: page.value,
        limit: limit.value,
        search: filters.search || undefined,
      },
    });
    orders.value = response.data?.orders || [];
    total.value = response.data?.total || 0;
    totalPages.value = response.data?.totalPages || 1;
  } catch (error) {
    console.error('Failed to load orders', error);
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

function openProofModal(order: any) {
  selectedOrder.value = order;
  proofFile.value = null;
  proofForm.value = { amount: '', notes: '' };
  proofModalOpen.value = true;
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  proofFile.value = input.files?.[0] || null;
}

async function submitProof() {
  if (!selectedOrder.value || !proofFile.value) return;

  submittingProof.value = true;
  try {
    const formData = new FormData();
    formData.append('file', proofFile.value);
    const uploadRes = await axios.post('/api/user/media/upload', formData);

    await axios.post(`/api/user/orders/${selectedOrder.value.id}/payment-proof`, {
      asset_id: uploadRes.data.id,
      amount: proofForm.value.amount ? Number(proofForm.value.amount) : undefined,
      notes: proofForm.value.notes || undefined,
    });

    toast.success('Payment slip submitted');
    proofModalOpen.value = false;
    await loadOrders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to submit payment slip');
  } finally {
    submittingProof.value = false;
  }
}

onMounted(loadOrders);
</script>
