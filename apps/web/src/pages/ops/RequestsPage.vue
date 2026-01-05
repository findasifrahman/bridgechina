<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <PageHeader title="Service Requests" />
      <Button variant="ghost" size="sm" @click="loadRequests" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <!-- Filters -->
    <Card>
      <CardBody>
        <div class="grid md:grid-cols-4 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by ID, name, phone, email..."
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
              <option value="service_done">Service Done</option>
              <option value="payment_done">Payment Done</option>
              <option value="done">Done</option>
              <option value="complete">Complete</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              v-model="filters.category_id"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Desktop Table -->
    <Card class="hidden md:block">
      <CardBody class="p-0">
        <div v-if="loading" class="text-center py-8 text-slate-500">Loading requests...</div>
        <div v-else-if="requests.length === 0" class="text-center py-8">
          <EmptyState
            title="No requests found"
            description="Try adjusting your filters or check back later"
          />
        </div>
        <table v-else class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Customer
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                City
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            <tr
              v-for="req in requests"
              :key="req.id"
              class="hover:bg-slate-50 transition-colors cursor-pointer"
              @click="$router.push(`/ops/requests/${req.id}`)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <code class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{{ req.id.slice(0, 8) }}</code>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {{ req.category?.name || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                <div>
                  <div class="font-medium">{{ req.customer_name }}</div>
                  <div class="text-xs text-slate-500">{{ req.phone }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                {{ req.city?.name || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <StatusChip :status="req.status" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                <div>{{ formatDate(req.created_at) }}</div>
                <div class="text-xs text-slate-400">{{ formatTime(req.created_at) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button variant="ghost" size="sm" @click.stop="$router.push(`/ops/requests/${req.id}`)">
                  View
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </CardBody>
    </Card>

    <!-- Mobile List -->
    <div class="md:hidden space-y-4">
      <div v-if="loading" class="text-center py-8 text-slate-500">Loading requests...</div>
      <Card v-else-if="requests.length === 0">
        <CardBody>
          <EmptyState
            title="No requests found"
            description="Try adjusting your filters or check back later"
          />
        </CardBody>
      </Card>
      <Card
        v-else
        v-for="req in requests"
        :key="req.id"
        class="cursor-pointer hover:shadow-md transition-shadow"
        @click="$router.push(`/ops/requests/${req.id}`)"
      >
        <CardBody>
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <code class="text-xs bg-slate-100 px-2 py-1 rounded font-mono mb-2 inline-block">{{ req.id.slice(0, 8) }}</code>
              <p class="font-semibold text-slate-900">{{ req.customer_name }}</p>
              <p class="text-sm text-slate-600">{{ req.phone }}</p>
            </div>
            <StatusChip :status="req.status" />
          </div>
          <div class="mt-2 space-y-1 text-sm text-slate-600">
            <p><span class="font-medium">Category:</span> {{ req.category?.name || 'N/A' }}</p>
            <p><span class="font-medium">City:</span> {{ req.city?.name || 'N/A' }}</p>
            <p><span class="font-medium">Created:</span> {{ formatDate(req.created_at) }} {{ formatTime(req.created_at) }}</p>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-4">
      <Button
        variant="ghost"
        size="sm"
        :disabled="currentPage === 1"
        @click="currentPage--; loadRequests()"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <span class="text-sm text-slate-600 px-4">
        Page {{ currentPage }} of {{ totalPages }} ({{ totalItems }} total)
      </span>
      <Button
        variant="ghost"
        size="sm"
        :disabled="currentPage === totalPages"
        @click="currentPage++; loadRequests()"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { PageHeader, Card, CardBody, StatusChip, Button, EmptyState } from '@bridgechina/ui';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const router = useRouter();

const requests = ref<any[]>([]);
const categories = ref<any[]>([]);
const searchQuery = ref('');
const filters = ref({
  status: '',
  category_id: '',
});
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const loading = ref(false);

let searchTimeout: NodeJS.Timeout | null = null;

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadRequests() {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: 20,
    };
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.category_id) params.category_id = filters.value.category_id;
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim();

    const response = await axios.get('/api/ops/requests', { params });
    requests.value = response.data.requests || [];
    totalItems.value = response.data.pagination?.total || 0;
    totalPages.value = response.data.pagination?.totalPages || 1;
  } catch (error: any) {
    console.error('Failed to load requests:', error);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadRequests();
  }, 300);
}

function applyFilters() {
  currentPage.value = 1;
  loadRequests();
}

onMounted(async () => {
  // Load categories
  try {
    const catResponse = await axios.get('/api/admin/service-categories');
    categories.value = catResponse.data || [];
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
  await loadRequests();
});
</script>
