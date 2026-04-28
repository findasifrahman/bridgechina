<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader title="Dashboard" />
      <Button variant="ghost" size="sm" @click="loadData" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>Orders</span>
          <Package class="h-4 w-4" />
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-900">{{ metrics.orders }}</div>
        <p class="mt-1 text-sm text-slate-500">Your purchase history</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between text-sm text-rose-600">
          <span>User action required</span>
          <CreditCard class="h-4 w-4" />
        </div>
        <div class="mt-3 text-3xl font-semibold text-rose-600">{{ metrics.pendingPayment }}</div>
        <p class="mt-1 text-sm text-slate-500">Orders waiting for payment slip or approval</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>Cart items</span>
          <ShoppingBag class="h-4 w-4" />
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-900">{{ metrics.cartItems }}</div>
        <p class="mt-1 text-sm text-slate-500">Ready for checkout</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>Addresses</span>
          <MapPin class="h-4 w-4" />
        </div>
        <div class="mt-3 text-3xl font-semibold text-slate-900">{{ metrics.addresses }}</div>
        <p class="mt-1 text-sm text-slate-500">Saved delivery locations</p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold">Recent orders</h3>
              <p class="text-sm text-slate-500">Track shipping, payment status, and slip approval from one place.</p>
            </div>
            <Button variant="ghost" size="sm" @click="$router.push('/user/orders')">View all</Button>
          </div>
        </CardHeader>
        <CardBody>
          <EmptyState
            v-if="orders.length === 0"
            title="No orders yet"
            description="Start shopping to see your checkout history here."
          >
            <template #actions>
              <Button variant="primary" @click="$router.push('/shopping')">Shop now</Button>
            </template>
          </EmptyState>

          <div v-else class="space-y-3">
            <button
              v-for="order in orders.slice(0, 5)"
              :key="order.id"
              class="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
              @click="$router.push(`/user/orders`)"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <p class="font-semibold text-slate-900">#{{ order.order_number || order.id.slice(0, 8) }}</p>
                    <StatusChip :status="order.status" />
                  </div>
                  <p class="text-sm text-slate-500">
                    {{ order.items?.length || 0 }} item{{ (order.items?.length || 0) !== 1 ? 's' : '' }}
                    <span class="mx-2">•</span>
                    {{ new Date(order.created_at).toLocaleDateString() }}
                  </p>
                  <p v-if="isUserActionRequired(order)" class="text-sm font-semibold text-rose-600">
                    User action required
                  </p>
                  <p class="text-sm text-slate-600">
                    Payment: <span class="font-medium">{{ paymentLabel(order) }}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-semibold text-slate-900">{{ formatCurrency(order.total, order.currency) }}</p>
                  <p class="text-xs text-slate-500">Shipping {{ formatCurrency(order.shipping_fee || 0, order.currency) }}</p>
                </div>
              </div>
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Quick actions</h3>
        </CardHeader>
        <CardBody class="space-y-3">
          <Button class="w-full justify-start" variant="primary" @click="$router.push('/shopping/cart')">
            <ShoppingBag class="mr-2 h-4 w-4" />
            Go to cart
          </Button>
          <Button class="w-full justify-start" variant="ghost" @click="$router.push('/user/orders')">
            <Package class="mr-2 h-4 w-4" />
            Review orders
          </Button>
          <Button class="w-full justify-start" variant="ghost" @click="$router.push('/user/profile')">
            <User class="mr-2 h-4 w-4" />
            Update profile
          </Button>
          <Button class="w-full justify-start" variant="ghost" @click="$router.push('/shopping')">
            <Sparkles class="mr-2 h-4 w-4" />
            Continue shopping
          </Button>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { Button, Card, CardHeader, CardBody, EmptyState, PageHeader, StatusChip } from '@bridgechina/ui';
import { CreditCard, MapPin, Package, ShoppingBag, Sparkles, RefreshCw, User } from 'lucide-vue-next';

const loading = ref(false);
const orders = ref<any[]>([]);
const cart = ref<any>(null);
const addresses = ref<any[]>([]);
const metrics = ref({
  orders: 0,
  pendingPayment: 0,
  cartItems: 0,
  addresses: 0,
});

function formatCurrency(value: number | string | null | undefined, currency?: string) {
  const amount = Number(value || 0);
  const code = currency || 'BDT';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
}

function latestProof(order: any) {
  return order?.paymentProofs?.[0] || null;
}

function isUserActionRequired(order: any) {
  const status = String(order?.payment_status || '').toLowerCase();
  if (status === 'approved' || status === 'paid') return false;
  return status === 'pending_payment' || !latestProof(order);
}

function paymentLabel(order: any) {
  return isUserActionRequired(order) ? 'User action required' : (order?.payment_status || 'unsubmitted');
}

async function loadData() {
  loading.value = true;
  try {
    const [ordersRes, cartRes, addressesRes] = await Promise.all([
      axios.get('/api/user/orders'),
      axios.get('/api/user/cart'),
      axios.get('/api/user/addresses'),
    ]);

    orders.value = ordersRes.data || [];
    cart.value = cartRes.data || null;
    addresses.value = addressesRes.data || [];
    metrics.value = {
      orders: orders.value.length,
      pendingPayment: orders.value.filter((order: any) => isUserActionRequired(order)).length,
      cartItems: cart.value?.items?.length || 0,
      addresses: addresses.value.length,
    };
  } catch (error) {
    console.error('Failed to load dashboard data', error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>
