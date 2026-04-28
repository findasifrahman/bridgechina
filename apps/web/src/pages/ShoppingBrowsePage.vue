<template>
  <div class="min-h-screen bg-[#eef3f9] text-[12px] text-slate-700">
    <main class="min-w-0">
      <div class="border-b border-slate-200 bg-white px-3 py-3 sm:px-4 lg:px-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-700">ChinaBuyBD Marketplace</p>
            <h1 class="mt-1 text-[18px] font-black tracking-tight text-slate-950">
              {{ heading }}
            </h1>
            <p class="mt-1 text-[11px] text-slate-500">Search by text or image, premium products first, then OTAPI products below.</p>
          </div>

          <div class="flex w-full items-center gap-2 lg:w-auto lg:min-w-[620px]">
            <div class="flex h-11 flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <Search class="h-4 w-4 text-slate-400" />
              <input
                v-model="searchQuery"
                :placeholder="selectedCategory ? 'Search within category...' : 'Search products, factories, or keywords...'"
                class="ml-3 w-full bg-transparent text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                @keyup.enter="runSearch"
              />
            </div>
            <button
              class="inline-flex h-11 items-center justify-center rounded-full bg-teal-600 px-5 text-[12px] font-semibold text-white hover:bg-teal-700"
              @click="runSearch"
            >
              Search
            </button>
            <button
              class="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[12px] font-semibold text-slate-700 hover:border-slate-300"
              @click="clearSearch"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div class="w-full px-3 py-4 sm:px-4 lg:px-5">
        <div class="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span class="rounded-full bg-white px-3 py-1.5 shadow-sm">Shipping time: 12-14 days</span>
          <span class="rounded-full bg-white px-3 py-1.5 shadow-sm">BDT default</span>
          <span class="rounded-full bg-white px-3 py-1.5 shadow-sm">Premium products shown first</span>
        </div>

        <section v-if="localItems.length > 0" class="mb-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Premium factory products</p>
            </div>
            <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">MOQ required</span>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
            <ProductCard
              v-for="product in localItems"
              :key="product.externalId"
              :product="product"
              :selected-currency="selectedCurrency"
              :conversion-rates="conversionRates"
              @click="handleProductClick"
              @request-buy="handleAddToCart"
            />
          </div>
        </section>

        <section class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-[16px] font-black tracking-tight text-slate-950">Marketplace results</h2>
            </div>
            <span class="text-[11px] text-slate-500">{{ totalCount }} items</span>
          </div>

          <div v-if="loading" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
            <div v-for="i in 8" :key="i" class="h-80 animate-pulse rounded-[24px] bg-slate-100" />
          </div>

          <div v-else-if="otapiItems.length > 0" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
            <ProductCard
              v-for="product in otapiItems"
              :key="product.externalId"
              :product="product"
              :selected-currency="selectedCurrency"
              :conversion-rates="conversionRates"
              @click="handleProductClick"
              @request-buy="handleAddToCart"
            />
          </div>

          <div v-else class="mt-8 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            No products found. Try another category or keyword.
          </div>

          <div v-if="totalPages > 1" class="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div class="text-[11px] text-slate-500">
              Showing page {{ currentPage }} of {{ totalPages }}
            </div>
            <div class="flex items-center gap-2">
              <button
                class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="currentPage <= 1 || loading"
                @click="goToPage(currentPage - 1)"
              >
                Prev
              </button>
              <button
                v-for="page in paginationPages"
                :key="page"
                class="min-w-9 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                :class="page === currentPage ? 'bg-teal-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
              <button
                class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="currentPage >= totalPages || loading"
                @click="goToPage(currentPage + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import ProductCard from '@/components/shopping/ProductCard.vue';
import { Search } from 'lucide-vue-next';
import { useShoppingCart } from '@/composables/useShoppingCart';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { addToCart } = useShoppingCart();

const loading = ref(false);
const searchQuery = ref(String(route.query.q || ''));
const selectedCategory = ref(String(route.query.category || ''));
const imageSearchKey = ref(String(route.query.imageSearchKey || ''));
const currentPage = ref(Math.max(1, Number(route.query.page || 1)));
const pageSize = ref(24);
const totalPages = ref(1);
const totalCount = ref(0);
const selectedCurrency = ref<'BDT' | 'CNY' | 'USD'>('BDT');
const conversionRates = ref({ CNY_TO_BDT: 15, CNY_TO_USD: 0.14 });
const localItems = ref<any[]>([]);
const otapiItems = ref<any[]>([]);
let searchRequestId = 0;
const paginationPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
});

const heading = computed(() => {
  if (searchQuery.value.trim()) return `Search results for "${searchQuery.value.trim()}"`;
  if (selectedCategory.value) return `Browsing ${selectedCategory.value}`;
  return 'All shopping products';
});

function handleProductClick(product: any) {
  router.push({
    path: `/shopping/item/${product.externalId}`,
    query: { language: 'en' },
  });
}

function handleAddToCart(product: any) {
  addToCart(product, 1);
  toast.success('Added to cart');
}

async function runSearch() {
  const requestId = ++searchRequestId;
  imageSearchKey.value = String(route.query.imageSearchKey || '');
  if (imageSearchKey.value) {
    await runImageSearch();
    return;
  }
  loading.value = true;
  try {
    const response = await axios.get('/api/public/shopping/search', {
      params: {
        keyword: searchQuery.value.trim() || undefined,
        category: selectedCategory.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
        language: 'en',
        sort: 'sales',
      },
    });
    if (requestId !== searchRequestId) return;
    localItems.value = Array.isArray(response.data?.localItems) ? response.data.localItems : [];
    otapiItems.value = Array.isArray(response.data?.otapiItems) ? response.data.otapiItems : [];
    totalPages.value = Number(response.data?.totalPages || response.data?.pageSize ? Math.ceil(Number(response.data?.totalCount || otapiItems.value.length || 0) / pageSize.value) : 1) || 1;
    totalCount.value = Number(response.data?.totalCount || localItems.value.length + otapiItems.value.length || 0);
  } catch (error) {
    console.error('Search failed', error);
    toast.error('Failed to load products');
  } finally {
    loading.value = false;
  }
}

async function runImageSearch() {
  const requestId = ++searchRequestId;
  const stored = imageSearchKey.value ? sessionStorage.getItem(imageSearchKey.value) : null;
  if (!stored) {
    imageSearchKey.value = '';
    await runSearch();
    return;
  }

  loading.value = true;
  try {
    const blob = await (await fetch(stored)).blob();
    const file = new File([blob], 'shopping-image-search.png', { type: blob.type || 'image/png' });
    const formData = new FormData();
    formData.append('image', file);

    const uploadRes = await axios.post('/api/public/shopping/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const searchRes = await axios.post('/api/public/shopping/search/image', {
      r2_public_url: uploadRes.data.publicUrl,
      category: selectedCategory.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
      language: 'en',
      sort: 'sales',
    });
    if (requestId !== searchRequestId) return;

    localItems.value = [];
    if (Array.isArray(searchRes.data)) {
      otapiItems.value = searchRes.data;
    } else if (searchRes.data?.items) {
      otapiItems.value = searchRes.data.items;
    } else {
      otapiItems.value = [];
    }
    totalPages.value = Number(searchRes.data?.totalPages || 1);
    totalCount.value = Number(searchRes.data?.totalCount || otapiItems.value.length || 0);
  } catch (error) {
    console.error('Image search failed', error);
    toast.error('Failed to search by image');
    if (requestId !== searchRequestId) return;
    localItems.value = [];
    otapiItems.value = [];
  } finally {
    if (requestId !== searchRequestId) return;
    loading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = '';
  selectedCategory.value = '';
  imageSearchKey.value = '';
  router.replace({ name: 'shopping-browse', query: {} });
  runSearch();
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  await router.replace({
    name: 'shopping-browse',
    query: {
      q: searchQuery.value || undefined,
      category: selectedCategory.value || undefined,
      imageSearchKey: imageSearchKey.value || undefined,
      page: String(page),
    },
  });
  await runSearch();
}

watch(
  () => [route.query.q, route.query.category, route.query.imageSearchKey, route.query.page].join('|'),
  (query) => {
    const routeQuery = route.query as Record<string, string | undefined>;
    searchQuery.value = String(routeQuery.q || '');
    selectedCategory.value = String(routeQuery.category || '');
    imageSearchKey.value = String(routeQuery.imageSearchKey || '');
    currentPage.value = Math.max(1, Number(routeQuery.page || 1));
    runSearch();
  },
  { immediate: true }
);
</script>
