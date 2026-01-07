<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-3 sticky top-0 z-10">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-lg font-semibold">My Requests</h1>
        <div class="flex items-center gap-2">
          <select
            v-model="filters.status"
            @change="loadDispatches"
            class="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="responded">Responded</option>
            <option value="skipped">Skipped</option>
          </select>
          <select
            v-model="filters.category"
            @change="loadDispatches"
            class="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Categories</option>
            <option value="hotel">Hotel</option>
            <option value="transport">Transport</option>
            <option value="tours">Tours</option>
            <option value="medical">Medical</option>
            <option value="shopping">Shopping</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Requests List -->
    <div class="flex-1 overflow-y-auto bg-white">
      <div v-if="loading" class="p-4 text-center text-sm text-slate-500">
        Loading...
      </div>
      <div v-else-if="dispatches.length === 0" class="p-4 text-center text-sm text-slate-500">
        No requests assigned
      </div>
      <div v-else class="divide-y divide-slate-200">
        <div
          v-for="dispatch in dispatches"
          :key="dispatch.id"
          class="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
          @click="selectRequest(dispatch.request.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                  {{ dispatch.request.category.key }}
                </span>
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    getStatusClass(dispatch.status)
                  ]"
                >
                  {{ dispatch.status }}
                </span>
                <span v-if="dispatch.request.sla_due_at" class="text-xs text-slate-500">
                  SLA: {{ formatSlaTime(dispatch.request.sla_due_at) }}
                </span>
              </div>
              
              <div class="text-sm font-medium text-slate-900 mb-1">
                {{ dispatch.request.city.name }}
              </div>
              
              <div v-if="dispatch.request.providerMessageContexts?.[0]" class="text-sm text-slate-600 line-clamp-2">
                {{ dispatch.request.providerMessageContexts[0].extracted_summary || dispatch.request.providerMessageContexts[0].user_message_text }}
              </div>
              
              <div class="text-xs text-slate-500 mt-2">
                Sent: {{ formatTime(dispatch.sent_at) }}
              </div>
            </div>
            
            <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';

const router = useRouter();

const dispatches = ref<any[]>([]);
const loading = ref(false);
const filters = ref({
  status: '',
  category: '',
});

function formatTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatSlaTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 0) return 'Overdue';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h`;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-yellow-100 text-yellow-700',
    responded: 'bg-green-100 text-green-700',
    skipped: 'bg-slate-100 text-slate-700',
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
}

async function loadDispatches() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.category) params.category = filters.value.category;
    
    const response = await axios.get('/api/provider/dispatches', { params });
    dispatches.value = response.data.dispatches || [];
  } catch (error) {
    console.error('Failed to load dispatches:', error);
  } finally {
    loading.value = false;
  }
}

function selectRequest(requestId: string) {
  router.push(`/provider/requests/${requestId}`);
}

onMounted(() => {
  loadDispatches();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>





