<template>
  <div>
    <PageHeader title="Admin Dashboard" />
    <div class="grid md:grid-cols-4 gap-6 mb-8">
      <StatCard label="Leads Today" :value="stats.leads?.today || 0">
        <template #icon>
          <div class="text-2xl">👥</div>
        </template>
      </StatCard>
      <StatCard label="Leads This Week" :value="stats.leads?.week || 0">
        <template #icon>
          <div class="text-2xl">📊</div>
        </template>
      </StatCard>
      <StatCard label="Active Requests" :value="activeRequests">
        <template #icon>
          <div class="text-2xl">📋</div>
        </template>
      </StatCard>
      <StatCard label="Orders This Week" :value="stats.orders?._count || 0">
        <template #icon>
          <div class="text-2xl">🛍️</div>
        </template>
      </StatCard>
    </div>
    <div class="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Latest Service Requests</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-3">
            <div
              v-for="request in latestRequests"
              :key="request.id"
              class="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
              @click="$router.push(`/admin/requests/${request.id}`)"
            >
              <div>
                <p class="font-semibold text-sm">{{ request.category.name }}</p>
                <p class="text-xs text-slate-600">{{ request.customer_name }}</p>
              </div>
              <StatusChip :status="request.status" />
            </div>
            <EmptyState
              v-if="latestRequests.length === 0"
              title="No requests"
              description="Service requests will appear here"
            />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Latest Leads</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-3">
            <div
              v-for="lead in latestLeads"
              :key="lead.id"
              class="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
              @click="$router.push(`/admin/leads/${lead.id}`)"
            >
              <div>
                <p class="font-semibold text-sm">{{ lead.name }}</p>
                <p class="text-xs text-slate-600">{{ lead.phone }}</p>
              </div>
              <StatusChip :status="lead.status" />
            </div>
            <EmptyState
              v-if="latestLeads.length === 0"
              title="No leads"
              description="Leads will appear here"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardHeader, CardBody, StatCard, StatusChip, EmptyState } from '@bridgechina/ui';

const stats = ref<any>({});
const latestRequests = ref<any[]>([]);
const latestLeads = ref<any[]>([]);

const activeRequests = computed(() => {
  if (!stats.value.requests?.byStatus) return 0;
  return stats.value.requests.byStatus
    .filter((s: any) => !['done', 'cancelled'].includes(s.status))
    .reduce((sum: number, s: any) => sum + s._count, 0);
});

onMounted(async () => {
  try {
    const [statsRes, requestsRes, leadsRes] = await Promise.all([
      axios.get('/api/admin/dashboard'),
      axios.get('/api/admin/requests?limit=5'),
      axios.get('/api/admin/leads?limit=5'),
    ]);
    stats.value = statsRes.data || {};
    latestRequests.value = Array.isArray(requestsRes.data) ? requestsRes.data.slice(0, 5) : [];
    latestLeads.value = Array.isArray(leadsRes.data) ? leadsRes.data.slice(0, 5) : [];
  } catch (error: any) {
    console.error('Failed to load dashboard stats', error);
    // Set defaults to show something
    stats.value = {};
    latestRequests.value = [];
    latestLeads.value = [];
  }
});
</script>
