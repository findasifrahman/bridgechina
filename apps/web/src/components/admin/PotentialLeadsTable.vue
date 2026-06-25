<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader
        title="Potential Lead"
        subtitle="Customers with cart items from the last month but no matching order yet"
      />
      <Button variant="ghost" size="sm" @click="loadLeads" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Input v-model="filters.search" label="Search" placeholder="Customer, phone, email, product" @input="onFilterChange" />
          <div class="self-end text-xs text-slate-500">{{ total }} lead(s) from last 1 month</div>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading potential leads...</div>
        <div v-else-if="leads.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No potential leads found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead class="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Customer</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Cart activity</th>
                <th class="border-b border-slate-200 px-2 py-2 text-left">Products</th>
                <th class="border-b border-slate-200 px-2 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lead in leads" :key="lead.cart_id" class="align-top hover:bg-slate-50/80">
                <td class="border-b border-slate-100 px-2 py-2">
                  <div class="space-y-1">
                    <div class="font-semibold text-slate-900">{{ lead.full_name || lead.email || lead.phone || 'Customer' }}</div>
                    <div class="text-slate-500">{{ lead.email || 'No email' }}</div>
                    <div class="text-slate-500">{{ lead.phone || 'No phone' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-2 py-2">
                  <div class="space-y-1">
                    <div class="text-slate-900">Last added {{ formatDateTime(lead.last_cart_item_at) }}</div>
                    <div class="text-slate-500">First added {{ formatDateTime(lead.first_cart_item_at) }}</div>
                    <div class="flex flex-wrap gap-1 pt-1">
                      <Badge variant="default" class="text-[10px]">{{ lead.item_count }} item row(s)</Badge>
                      <Badge variant="default" class="text-[10px]">Qty {{ lead.total_qty }}</Badge>
                    </div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-2 py-2">
                  <div class="space-y-2">
                    <div
                      v-for="item in leadItems(lead).slice(0, 3)"
                      :key="item.id"
                      class="flex min-w-[18rem] items-center gap-2"
                    >
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.title || 'Product'"
                        class="h-9 w-9 rounded-md border border-slate-200 object-cover"
                      />
                      <div class="min-w-0">
                        <div class="truncate font-medium text-slate-900">{{ item.title || 'Product' }}</div>
                        <div class="text-slate-500">
                          Qty {{ item.qty }} · {{ money(item.price, item.currency) }}
                          <span v-if="item.sellerShop || item.sellerEmail"> · {{ item.sellerShop || item.sellerEmail }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="leadItems(lead).length > 3" class="text-slate-400">+{{ leadItems(lead).length - 3 }} more</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-2 py-2 text-right">
                  <div class="font-semibold text-slate-900">{{ money(lead.cart_value, lead.currency) }}</div>
                  <div class="text-slate-500">Cart estimate</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200">
          <Pagination :current-page="page" :total-pages="totalPages" :total="total" :page-size="limit" @update:currentPage="handlePageChange" />
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import axios from '@/utils/axios';
import { Badge, Button, Card, CardBody, Input, PageHeader, Pagination, useToast } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const props = defineProps<{
  endpoint: string;
}>();

const toast = useToast();
const loading = ref(false);
const leads = ref<any[]>([]);
const page = ref(1);
const limit = ref(25);
const total = ref(0);
const totalPages = ref(1);
const filters = reactive({ search: '' });
let filterTimer: number | undefined;

function leadItems(lead: any) {
  return Array.isArray(lead.items) ? lead.items : [];
}

function formatDateTime(value: string) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function money(value: number, currency = 'BDT') {
  return `${currency || 'BDT'} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

async function loadLeads() {
  loading.value = true;
  try {
    const response = await axios.get(props.endpoint, {
      params: {
        page: page.value,
        limit: limit.value,
        search: filters.search || undefined,
      },
    });
    leads.value = response.data?.leads || [];
    total.value = response.data?.total || 0;
    totalPages.value = response.data?.totalPages || 1;
  } catch (error) {
    console.error('Failed to load potential leads:', error);
    toast.error('Failed to load potential leads');
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  page.value = 1;
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(loadLeads, 300);
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadLeads();
}

onMounted(loadLeads);
</script>
