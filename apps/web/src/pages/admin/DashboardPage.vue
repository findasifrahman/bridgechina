<template>
  <div>
    <PageHeader title="Admin Dashboard" />

    <div v-if="loading" class="text-center py-8 text-slate-500">Loading KPIs...</div>
    <div v-else-if="error" class="text-center py-8 text-red-500">{{ error }}</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Conversations -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Conversations</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-4">
            <div>
              <div class="text-2xl font-bold text-teal-600">{{ kpiData?.conversations?.last24h || 0 }}</div>
              <div class="text-sm text-slate-600">Last 24 hours</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-teal-600">{{ kpiData?.conversations?.last7d || 0 }}</div>
              <div class="text-sm text-slate-600">Last 7 days</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Average Provider Response Time -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Avg Provider Response Time</h3>
        </CardHeader>
        <CardBody>
          <div v-if="!kpiData?.avgProviderResponseByCategory || kpiData.avgProviderResponseByCategory.length === 0" class="text-sm text-slate-500">
            No data available
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="cat in kpiData.avgProviderResponseByCategory"
              :key="cat.categoryKey"
              class="flex justify-between items-center"
            >
              <span class="text-sm text-slate-700">{{ cat.categoryName }}</span>
              <span class="text-sm font-semibold text-teal-600">{{ cat.avgMinutes }} min</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Average OPS Approval Time -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Avg OPS Approval Time</h3>
        </CardHeader>
        <CardBody>
          <div v-if="kpiData?.avgOpsApprovalMinutes === null" class="text-sm text-slate-500">
            No data available
          </div>
          <div v-else>
            <div class="text-2xl font-bold text-teal-600">{{ kpiData?.avgOpsApprovalMinutes || 0 }} min</div>
            <div class="text-sm text-slate-600">Average time to first approval</div>
          </div>
        </CardBody>
      </Card>

      <!-- Overdue SLA -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Overdue SLA</h3>
        </CardHeader>
        <CardBody>
          <div>
            <div class="text-2xl font-bold" :class="kpiData?.overdueSla?.percentage > 10 ? 'text-red-600' : kpiData?.overdueSla?.percentage > 5 ? 'text-yellow-600' : 'text-teal-600'">
              {{ kpiData?.overdueSla?.percentage?.toFixed(1) || 0 }}%
            </div>
            <div class="text-sm text-slate-600">
              {{ kpiData?.overdueSla?.count || 0 }} of {{ kpiData?.overdueSla?.total || 0 }} requests
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Offers Summary -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Provider Offers</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-700">Submitted</span>
              <span class="text-sm font-semibold text-yellow-600">{{ kpiData?.offers?.submitted || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-700">Approved</span>
              <span class="text-sm font-semibold text-green-600">{{ kpiData?.offers?.approved || 0 }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-700">Rejected</span>
              <span class="text-sm font-semibold text-red-600">{{ kpiData?.offers?.rejected || 0 }}</span>
            </div>
            <div class="flex justify-between items-center border-t pt-2">
              <span class="text-sm font-medium text-slate-700">Total</span>
              <span class="text-sm font-semibold text-teal-600">{{ kpiData?.offers?.total || 0 }}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardHeader, CardBody } from '@bridgechina/ui';

const kpiData = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);
let pollInterval: number | null = null;

async function loadKpiData() {
  loading.value = true;
  error.value = null;
  try {
    const response = await axios.get('/api/admin/kpi/summary');
    kpiData.value = response.data;
  } catch (err: any) {
    console.error('Failed to load KPI data:', err);
    error.value = err.response?.data?.error || 'Failed to load KPI data';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadKpiData();
  pollInterval = setInterval(loadKpiData, 60000); // Refresh every minute
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>
