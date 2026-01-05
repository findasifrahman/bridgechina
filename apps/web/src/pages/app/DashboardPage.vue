<template>
  <div class="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    <div class="flex items-center justify-between mb-6">
      <PageHeader title="Dashboard" />
      <Button variant="ghost" size="sm" @click="loadData" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <StatCard label="Active Requests" :value="activeRequests" icon="📋" />
      <StatCard label="Orders" :value="orders" icon="🛍️" />
      <StatCard label="Saved Addresses" :value="addresses" icon="📍" />
    </div>
    <Card>
      <CardHeader>
        <h3 class="text-lg font-semibold">Recent Requests</h3>
      </CardHeader>
      <CardBody>
        <EmptyState
          v-if="requests.length === 0"
          title="No requests yet"
          description="Submit your first service request to get started"
        />
        <div v-else class="space-y-4">
          <div v-for="request in requests" :key="request.id" class="border-b pb-4">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold">{{ request.category.name }}</p>
                <p class="text-sm text-slate-600">{{ request.city.name }}</p>
              </div>
              <StatusChip :status="request.status" />
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
import { PageHeader, Card, CardHeader, CardBody, StatCard, StatusChip, EmptyState, Button } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const activeRequests = ref(0);
const orders = ref(0);
const addresses = ref(0);
const requests = ref<any[]>([]);
const loading = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const [requestsRes, ordersRes, addressesRes] = await Promise.all([
      axios.get('/api/user/requests'),
      axios.get('/api/user/orders'),
      axios.get('/api/user/addresses'),
    ]);
    requests.value = requestsRes.data;
    activeRequests.value = requests.value.filter((r: any) => r.status !== 'done' && r.status !== 'cancelled').length;
    orders.value = ordersRes.data.length;
    addresses.value = addressesRes.data.length;
  } catch (error) {
    console.error('Failed to load dashboard data');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

