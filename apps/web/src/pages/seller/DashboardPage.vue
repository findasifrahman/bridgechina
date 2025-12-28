<template>
  <div>
    <PageHeader title="Seller Dashboard" />
    <div class="grid md:grid-cols-3 gap-6 mb-8">
      <StatCard label="Active Products" :value="stats.products || 0" icon="📦" />
      <StatCard label="Orders Today" :value="stats.ordersToday || 0" icon="🛍️" />
      <StatCard label="Total Revenue" :value="`¥${stats.totalRevenue || 0}`" icon="💰" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, StatCard } from '@bridgechina/ui';

const stats = ref<any>({});

onMounted(async () => {
  try {
    const response = await axios.get('/api/seller/dashboard');
    stats.value = response.data;
  } catch (error) {
    console.error('Failed to load dashboard stats');
  }
});
</script>

