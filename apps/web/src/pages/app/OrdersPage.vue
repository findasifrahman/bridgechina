<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <PageHeader title="My Orders" />
      <Button variant="ghost" size="sm" @click="loadOrders" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>
    <Card>
      <CardBody>
        <EmptyState
          v-if="orders.length === 0"
          title="No orders yet"
          description="Start shopping to see your orders here"
        />
        <div v-else class="space-y-4">
          <div v-for="order in orders" :key="order.id" class="border-b pb-4">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold">Order #{{ order.id.slice(0, 8) }}</p>
                <p class="text-sm text-slate-600">{{ order.items.length }} items</p>
                <p class="text-sm text-slate-500">{{ new Date(order.created_at).toLocaleDateString() }}</p>
              </div>
              <StatusChip :status="order.status" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardBody, StatusChip, EmptyState, Button } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const orders = ref<any[]>([]);
const loading = ref(false);

async function loadOrders() {
  loading.value = true;
  try {
    const response = await axios.get('/api/user/orders');
    orders.value = response.data;
  } catch (error) {
    console.error('Failed to load orders');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadOrders();
});
</script>

