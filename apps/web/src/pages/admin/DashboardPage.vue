<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader title="Admin Dashboard" subtitle="Shopping orders, payment proofs, products, and seller approvals" />
      <Button variant="ghost" size="sm" @click="loadDashboard" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="stat in stats" :key="stat.label">
        <CardBody class="p-5">
          <div class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{{ stat.label }}</div>
          <div class="mt-2 text-3xl font-semibold text-slate-900">{{ stat.value }}</div>
          <div class="mt-2 text-sm text-slate-500">{{ stat.hint }}</div>
        </CardBody>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Recent Orders</h3>
            <Button variant="ghost" size="sm" @click="$router.push('/admin/orders')">View all</Button>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="recentOrders.length === 0" class="py-10 text-center text-slate-500">
            No orders yet
          </div>
          <div v-else class="space-y-4">
            <div v-for="order in recentOrders" :key="order.id" class="rounded-xl border border-slate-200 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-slate-900">Order #{{ order.order_number }}</div>
                  <div class="text-sm text-slate-500">
                    {{ order.user?.customerProfile?.full_name || order.user?.email || 'Customer' }}
                  </div>
                  <div class="text-sm text-slate-500">{{ order.items?.length || 0 }} items • {{ new Date(order.created_at).toLocaleString() }}</div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge :variant="badgeVariant(order.status)">{{ order.status }}</Badge>
                  <Badge :variant="badgeVariant(order.payment_status)">{{ order.payment_status }}</Badge>
                </div>
              </div>
              <div class="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <div>Subtotal: <span class="font-medium text-slate-900">{{ money(order.subtotal, order.currency) }}</span></div>
                <div>Payment proofs: <span class="font-medium text-slate-900">{{ order.paymentProofs?.length || 0 }}</span></div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Quick Actions</h3>
        </CardHeader>
        <CardBody class="space-y-3">
          <router-link class="block rounded-xl border border-slate-200 px-4 py-3 hover:border-teal-300 hover:bg-teal-50" to="/admin/orders">
            <div class="font-medium text-slate-900">Manage orders</div>
            <div class="text-sm text-slate-500">Update fulfillment status and review seller-approved items.</div>
          </router-link>
          <router-link class="block rounded-xl border border-slate-200 px-4 py-3 hover:border-teal-300 hover:bg-teal-50" to="/admin/payment-proofs">
            <div class="font-medium text-slate-900">Review payment proofs</div>
            <div class="text-sm text-slate-500">Approve or reject uploaded payment slips.</div>
          </router-link>
          <router-link class="block rounded-xl border border-slate-200 px-4 py-3 hover:border-teal-300 hover:bg-teal-50" to="/admin/shopping">
            <div class="font-medium text-slate-900">Manage products</div>
            <div class="text-sm text-slate-500">Create manual products and maintain categories.</div>
          </router-link>
          <router-link class="block rounded-xl border border-slate-200 px-4 py-3 hover:border-teal-300 hover:bg-teal-50" to="/admin/sellers">
            <div class="font-medium text-slate-900">Seller overview</div>
            <div class="text-sm text-slate-500">Review seller accounts and their shopping activity.</div>
          </router-link>
        </CardBody>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 class="text-base font-semibold">Weekly sales</h3>
        </CardHeader>
        <CardBody class="space-y-2">
          <div v-if="(dashboard.weeklySales || []).length === 0" class="text-sm text-slate-500">No weekly report data yet</div>
          <div v-else class="space-y-2">
            <div v-for="row in dashboard.weeklySales.slice(0, 8)" :key="row.period" class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div class="text-slate-700">{{ formatPeriod(row.period, 'week') }}</div>
              <div class="font-medium text-slate-900">{{ money(row.revenue, 'BDT') }} • {{ row.orders }} orders</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-base font-semibold">Monthly sales</h3>
        </CardHeader>
        <CardBody class="space-y-2">
          <div v-if="(dashboard.monthlySales || []).length === 0" class="text-sm text-slate-500">No monthly report data yet</div>
          <div v-else class="space-y-2">
            <div v-for="row in dashboard.monthlySales.slice(0, 8)" :key="row.period" class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <div class="text-slate-700">{{ formatPeriod(row.period, 'month') }}</div>
              <div class="font-medium text-slate-900">{{ money(row.revenue, 'BDT') }} • {{ row.orders }} orders</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const loading = ref(false);
const error = ref('');
const dashboard = ref<any>({});

const stats = computed(() => [
  { label: 'Users', value: dashboard.value.users ?? 0, hint: 'Registered customers, sellers, and admins' },
  { label: 'Products', value: dashboard.value.products ?? 0, hint: 'Published and draft shopping items' },
  { label: 'Orders', value: dashboard.value.orders ?? 0, hint: 'Customer checkout orders' },
  { label: 'Seller Approved', value: dashboard.value.approvedSellerItems ?? 0, hint: 'Order items approved by sellers' },
  { label: 'Pending Proofs', value: dashboard.value.pendingProofs ?? 0, hint: 'Uploaded payment slips awaiting review' },
  { label: 'Pending Review', value: dashboard.value.pendingSellerItems ?? 0, hint: 'Items waiting for seller review' },
]);

const recentOrders = computed(() => dashboard.value.recentOrders || []);

function badgeVariant(value: string) {
  if (['approved', 'shipped', 'received', 'completed'].includes(value)) return 'success';
  if (['submitted', 'pending_payment', 'pending_review'].includes(value)) return 'warning';
  if (['rejected', 'cancelled'].includes(value)) return 'danger';
  return 'default';
}

function money(amount: number | null | undefined, currency = 'BDT') {
  const value = typeof amount === 'number' ? amount : 0;
  return `${currency} ${value.toLocaleString()}`;
}

function formatPeriod(value: string, type: 'week' | 'month') {
  const date = new Date(value);
  if (type === 'week') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const response = await axios.get('/api/admin/dashboard');
    dashboard.value = response.data || {};
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load admin dashboard';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>
