<template>
  <div class="space-y-4">
    <PageHeader title="Service Requests" />
    <FilterBar
      :filters="filterOptions"
      @search="handleSearch"
      @filter="handleFilter"
    />
    <CompactTable
      :columns="columns"
      :data="tableData"
      :actions="true"
      @view="handleView"
      @edit="handleEdit"
      @sort="handleSort"
    >
      <template #cell-category="{ value }">
        {{ value.name }}
      </template>
      <template #cell-city="{ value }">
        {{ value.name }}
      </template>
      <template #cell-status="{ value }">
        <StatusChip :status="value" />
      </template>
      <template #cell-created_at="{ value }">
        {{ new Date(value).toLocaleDateString() }}
      </template>
      <template #actions="{ row }">
        <Button variant="ghost" size="sm" @click="handleView(row)">View</Button>
      </template>
    </CompactTable>
    <Pagination
      v-if="totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      :total="totalItems"
      :page-size="20"
      @update:current-page="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from '@/utils/axios';
import { useRouter } from 'vue-router';
import { PageHeader, CompactTable, FilterBar, StatusChip, Button, Pagination } from '@bridgechina/ui';

const router = useRouter();

const requests = ref<any[]>([]);
const categories = ref<any[]>([]);
const searchQuery = ref('');
const filters = ref({
  status: '',
  category_id: '',
  city_id: '',
});
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const sortBy = ref('created_at');
const sortOrder = ref<'asc' | 'desc'>('desc');
const loading = ref(false);

const filterOptions = [
  {
    key: 'status',
    placeholder: 'All Statuses',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'new', label: 'New' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'quoted', label: 'Quoted' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'paid', label: 'Paid' },
      { value: 'booked', label: 'Booked' },
      { value: 'done', label: 'Done' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'category_id',
    placeholder: 'All Categories',
    options: computed(() => [
      { value: '', label: 'All Categories' },
      ...categories.value.map((cat) => ({ value: cat.id, label: cat.name })),
    ]).value,
  },
];

const columns = [
  { key: 'category', label: 'Category', sortable: false },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'city', label: 'City', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Created', sortable: true },
];

const tableData = computed(() => requests.value);

async function loadRequests() {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: 20,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.category_id) params.category_id = filters.value.category_id;
    if (filters.value.city_id) params.city_id = filters.value.city_id;
    
    const response = await axios.get('/api/admin/requests', { params });
    if (Array.isArray(response.data)) {
      requests.value = response.data;
      totalPages.value = Math.ceil(response.data.length / 20);
      totalItems.value = response.data.length;
    } else {
      requests.value = response.data.requests || response.data;
      totalPages.value = response.data.totalPages || Math.ceil((response.data.total || 0) / 20);
      totalItems.value = response.data.total || response.data.length;
    }
  } catch (error) {
    console.error('Failed to load requests');
  } finally {
    loading.value = false;
  }
}

function handleSearch(query: string) {
  searchQuery.value = query;
  currentPage.value = 1;
  loadRequests();
}

function handleFilter(filterValues: Record<string, any>) {
  filters.value = { ...filters.value, ...filterValues };
  currentPage.value = 1;
  loadRequests();
}

function handleSort(key: string) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'asc';
  }
  loadRequests();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadRequests();
}

function handleView(row: any) {
  router.push(`/admin/requests/${row.id}`);
}

function handleEdit(row: any) {
  router.push(`/admin/requests/${row.id}`);
}

onMounted(async () => {
  // Load categories from requests
  try {
    const requestsRes = await axios.get('/api/admin/requests?limit=100');
    const uniqueCats = new Map();
    (requestsRes.data || []).forEach((req: any) => {
      if (req.category && !uniqueCats.has(req.category.id)) {
        uniqueCats.set(req.category.id, req.category);
      }
    });
    categories.value = Array.from(uniqueCats.values());
  } catch (error) {
    console.error('Failed to load categories');
  }
  await loadRequests();
});
</script>
