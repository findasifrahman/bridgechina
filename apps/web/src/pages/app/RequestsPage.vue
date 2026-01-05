<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <PageHeader title="My Service Requests" />
      <Button variant="ghost" size="sm" @click="loadRequests" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <!-- Filters and Search -->
    <Card class="mb-6">
      <CardBody>
        <div class="grid md:grid-cols-4 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by ID, category, city, status..."
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              @input="handleSearch"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              v-model="filters.status"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="quoted">Quoted</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <select
              v-model="dateRange"
              @change="handleDateRangeChange"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        </div>
        <div v-if="dateRange === 'custom'" class="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">From Date</label>
            <input
              v-model="customFromDate"
              type="date"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">To Date</label>
            <input
              v-model="customToDate"
              type="date"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Requests Table (Desktop) -->
    <Card class="hidden md:block">
      <CardBody>
        <div v-if="loading" class="text-center py-8 text-slate-500">Loading requests...</div>
        <div v-else-if="filteredRequests.length === 0" class="text-center py-8">
          <EmptyState
            title="No requests found"
            description="Try adjusting your filters or submit a new service request"
          />
        </div>
        <div v-else>
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">ID</th>
                <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">City</th>
                <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700">Created</th>
                <th class="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="req in paginatedRequests"
                :key="req.id"
                class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td class="py-3 px-4">
                  <code class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{{ req.id?.slice(0, 8) }}</code>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <Tag class="h-4 w-4 text-slate-400" />
                    <span class="font-medium text-slate-900">{{ req.category?.name || 'N/A' }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-slate-600">
                  <div class="flex items-center gap-2">
                    <MapPin class="h-4 w-4 text-slate-400" />
                    <span>{{ req.city?.name || 'N/A' }}</span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <StatusChip :status="req.status" />
                </td>
                <td class="py-3 px-4 text-slate-600 text-sm">
                  <div class="flex items-center gap-2">
                    <Clock class="h-4 w-4 text-slate-400" />
                    <span>{{ formatDate(req.created_at) }}</span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" @click="$router.push(`/user/requests/${req.id}`)">
                      View
                    </Button>
                    <Button
                      v-if="canCancel(req.status)"
                      variant="ghost"
                      size="sm"
                      @click="handleCancel(req.id)"
                      :loading="cancellingId === req.id"
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>

    <!-- Requests List (Mobile) -->
    <div class="md:hidden space-y-4">
      <div v-if="loading" class="text-center py-8 text-slate-500">Loading requests...</div>
      <Card v-else-if="filteredRequests.length === 0">
        <CardBody>
          <EmptyState
            title="No requests found"
            description="Try adjusting your filters or submit a new service request"
          />
        </CardBody>
      </Card>
      <Card v-else v-for="req in paginatedRequests" :key="req.id" class="cursor-pointer hover:shadow-md transition-shadow" @click="$router.push(`/user/requests/${req.id}`)">
        <CardBody>
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <code class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{{ req.id?.slice(0, 8) }}</code>
                <Tag class="h-4 w-4 text-slate-400" />
                <p class="font-semibold text-slate-900">{{ req.category?.name || 'Service' }}</p>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <MapPin class="h-4 w-4 text-slate-400" />
                <p class="text-sm text-slate-600">{{ req.city?.name || 'N/A' }}</p>
              </div>
              <div class="flex items-center gap-2 mb-2">
                <Clock class="h-4 w-4 text-slate-400" />
                <p class="text-sm text-slate-500">{{ formatDate(req.created_at) }}</p>
              </div>
              <StatusChip :status="req.status" class="mt-2" />
            </div>
            <Button
              v-if="canCancel(req.status)"
              variant="ghost"
              size="sm"
              @click.stop="handleCancel(req.id)"
              :loading="cancellingId === req.id"
            >
              Cancel
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 flex justify-center">
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="text-sm text-slate-600 px-4">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <Button
          variant="ghost"
          size="sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardBody, StatusChip, Button, EmptyState } from '@bridgechina/ui';
import { RefreshCw, Tag, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const router = useRouter();
const toast = useToast();

const requests = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const filters = ref({
  status: '',
});
const dateRange = ref('7');
const customFromDate = ref('');
const customToDate = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const cancellingId = ref<string | null>(null);

// Computed dates
const dateFilter = computed(() => {
  if (dateRange.value === 'all') {
    return { from_date: undefined, to_date: undefined };
  }
  if (dateRange.value === 'custom') {
    return {
      from_date: customFromDate.value || undefined,
      to_date: customToDate.value || undefined,
    };
  }
  const days = parseInt(dateRange.value);
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  return {
    from_date: fromDate.toISOString().split('T')[0],
    to_date: toDate.toISOString().split('T')[0],
  };
});

const filteredRequests = computed(() => {
  let filtered = requests.value;
  
      // Apply search filter
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter((req) => {
          return (
            req.id?.toLowerCase().includes(query) ||
            req.category?.name?.toLowerCase().includes(query) ||
            req.city?.name?.toLowerCase().includes(query) ||
            req.status?.toLowerCase().includes(query)
          );
        });
      }
  
  return filtered;
});

const totalPages = computed(() => Math.ceil(filteredRequests.value.length / pageSize.value));
const paginatedRequests = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRequests.value.slice(start, start + pageSize.value);
});

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function canCancel(status: string) {
  const finalStatuses = ['completed', 'done', 'cancelled', 'payment_done', 'service_done', 'complete'];
  return !finalStatuses.includes(status);
}

async function loadRequests() {
  loading.value = true;
  try {
    const params: any = {};
    // Send all_time param when "all" is selected
    if (dateRange.value === 'all') {
      params.all_time = 'true';
    } else {
      // Always send date params for other ranges to ensure API uses explicit dates
      const dateFilterVal = dateFilter.value;
      if (dateFilterVal.from_date) {
        params.from_date = dateFilterVal.from_date;
      }
      if (dateFilterVal.to_date) {
        params.to_date = dateFilterVal.to_date;
      }
    }
    if (filters.value.status) params.status = filters.value.status;

    const response = await axios.get('/api/user/requests', { params });
    requests.value = response.data || [];
    currentPage.value = 1; // Reset to first page on new load
  } catch (error: any) {
    console.error('Failed to load requests:', error);
    toast.error(error.response?.data?.error || 'Failed to load requests');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
}

function handleDateRangeChange() {
  if (dateRange.value !== 'custom') {
    applyFilters();
  }
}

function applyFilters() {
  loadRequests();
}

async function handleCancel(requestId: string) {
  if (!confirm('Are you sure you want to cancel this request?')) {
    return;
  }

  cancellingId.value = requestId;
  try {
    await axios.patch(`/api/user/requests/${requestId}`, { status: 'cancelled' });
    toast.success('Request cancelled successfully');
    await loadRequests();
  } catch (error: any) {
    console.error('Failed to cancel request:', error);
    toast.error(error.response?.data?.error || 'Failed to cancel request');
  } finally {
    cancellingId.value = null;
  }
}

onMounted(() => {
  loadRequests();
});
</script>
