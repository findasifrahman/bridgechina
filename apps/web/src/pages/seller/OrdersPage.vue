<template>
  <div>
    <PageHeader title="My Orders" />
    <Card>
      <CardBody>
        <EmptyState
          v-if="orders.length === 0"
          title="No orders yet"
          description="Orders will appear here when customers purchase your products"
        />
        <div v-else class="space-y-4">
          <div v-for="order in orders" :key="order.id" class="border-b pb-4">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold">Order #{{ order.id.slice(0, 8) }}</p>
                <p class="text-sm text-slate-600">{{ order.items.length }} items</p>
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
import { PageHeader, Card, CardBody, StatusChip, EmptyState } from '@bridgechina/ui';

const orders = ref<any[]>([]);

onMounted(async () => {
  try {
    const response = await axios.get('/api/seller/orders');
    orders.value = response.data;
  } catch (error) {
    console.error('Failed to load orders');
  }
});
</script>

