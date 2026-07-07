<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PageHeader
        title="Top Searches"
        subtitle="Track what shoppers search from text, category, recent, and visual menu clicks."
      />
      <Button variant="ghost" size="sm" :loading="loading" @click="loadAnalytics">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>
    <div
      v-if="warning"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      {{ warning }}
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <Card v-for="period in periodCards" :key="period.key">
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-slate-900">{{ period.title }}</h2>
              <p class="text-xs text-slate-500">{{ period.subtitle }}</p>
            </div>
            <span class="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
              {{ period.rows.length }}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div
            v-if="period.rows.length === 0"
            class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
          >
            No searches recorded.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(row, index) in period.rows"
              :key="`${period.key}-${row.normalizedKey}`"
              class="rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
                      >{{ index + 1 }}</span
                    >
                    <div class="truncate font-semibold text-slate-900">
                      {{ row.queryText || row.normalizedKey }}
                    </div>
                  </div>
                  <div class="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                    <span>{{ humanIntent(row.intentType) }}</span>
                    <span v-if="row.categorySlug">Category: {{ row.categorySlug }}</span>
                    <span>{{ row.language || 'zh' }}</span>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-lg font-black text-teal-700">{{ row.searchCount || 0 }}</div>
                  <div class="text-[10px] uppercase tracking-[0.16em] text-slate-400">searches</div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Last 20 Searches</h2>
            <p class="text-sm text-slate-500">
              Most recent search events recorded by the storefront.
            </p>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >{{ latest.length }} rows</span
          >
        </div>
      </CardHeader>
      <CardBody>
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th class="px-4 py-3">Search</th>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3">Language</th>
                <th class="px-4 py-3">Results</th>
                <th class="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="latest.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-slate-500">
                  No recent searches recorded.
                </td>
              </tr>
              <tr v-for="row in latest" :key="row.id" class="border-t border-slate-100">
                <td class="px-4 py-3">
                  <div class="font-semibold text-slate-900">
                    {{ row.queryText || row.normalizedKey }}
                  </div>
                  <div v-if="row.categorySlug" class="text-xs text-slate-500">
                    Category: {{ row.categorySlug }}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >{{ humanIntent(row.intentType) }}</span
                  >
                </td>
                <td class="px-4 py-3 text-slate-600">{{ row.language || 'zh' }}</td>
                <td class="px-4 py-3 text-slate-600">{{ row.resultCount || 0 }}</td>
                <td class="px-4 py-3 text-slate-600">{{ formatDate(row.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardHeader, CardBody, Button } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

type SearchRow = {
  id?: string;
  normalizedKey: string;
  queryText: string;
  searchCount?: number;
  resultCount?: number;
  intentType?: string;
  categorySlug?: string;
  language?: string;
  createdAt?: string;
};

const loading = ref(false);
const error = ref('');
const warning = ref('');
const periods = ref<{ today: SearchRow[]; week: SearchRow[]; month: SearchRow[] }>({
  today: [],
  week: [],
  month: [],
});
const latest = ref<SearchRow[]>([]);

const periodCards = computed(() => [
  { key: 'today', title: 'Today', subtitle: 'Since midnight', rows: periods.value.today || [] },
  { key: 'week', title: 'This Week', subtitle: 'Last 7 days', rows: periods.value.week || [] },
  {
    key: 'month',
    title: 'This Month',
    subtitle: 'Since month start',
    rows: periods.value.month || [],
  },
]);

function humanIntent(value?: string) {
  const text = String(value || 'text').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadAnalytics() {
  loading.value = true;
  error.value = '';
  warning.value = '';
  try {
    const response = await axios.get('/api/admin/shopping/search-intents', {
      params: { limit: 10, latestLimit: 20 },
    });
    periods.value = {
      today: Array.isArray(response.data?.periods?.today) ? response.data.periods.today : [],
      week: Array.isArray(response.data?.periods?.week) ? response.data.periods.week : [],
      month: Array.isArray(response.data?.periods?.month) ? response.data.periods.month : [],
    };
    latest.value = Array.isArray(response.data?.latest) ? response.data.latest : [];
    warning.value = response.data?.warning || '';
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load search analytics';
  } finally {
    loading.value = false;
  }
}

onMounted(loadAnalytics);
</script>
