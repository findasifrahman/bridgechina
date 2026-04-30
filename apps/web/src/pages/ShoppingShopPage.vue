<template>
  <div class="min-h-screen bg-[#eef3f9] text-slate-700">
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-[1600px] px-3 py-3 sm:px-4 lg:px-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            @click="goBack"
          >
            <ArrowLeft class="h-4 w-4" />
            Back to results
          </button>

          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">Shop storefront</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Shop-only search</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Brand aware when supported</span>
          </div>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section class="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Shop detail</p>
                <h1 class="mt-1 text-[26px] font-black leading-tight tracking-tight text-slate-950 sm:text-[32px]">
                  {{ shopTitle }}
                </h1>
                <p class="mt-2 max-w-3xl text-[12px] leading-6 text-slate-600 sm:text-[13px]">
                  {{ shopScopeCopy }}
                </p>
                <p class="mt-2 text-[11px] font-medium text-slate-500">
                  {{ shopSubtitle }}
                </p>
              </div>

              <div class="flex shrink-0 flex-col items-end gap-2">
                <span class="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                  {{ productCountLabel }}
                </span>
                <a
                  v-if="shopUrl"
                  :href="shopUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100"
                >
                  Open source shop
                  <ExternalLink class="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div v-if="brandInsight.terms.length > 0" class="mt-4 rounded-[22px] border border-teal-200 bg-teal-50/80 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">
                  <Sparkles class="h-3.5 w-3.5" />
                  Brand focus
                </span>
                <span class="rounded-full bg-white px-3 py-1 text-[12px] font-black text-teal-700">
                  {{ brandInsight.label }}
                </span>
                <span class="text-[11px] font-medium text-teal-800">
                  {{ brandInsightCopy }}
                </span>
              </div>
            </div>
            <div v-else class="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600">
              No strong brand signal was returned for this storefront. We still keep the search scoped to this shop so you only see products from one seller.
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="badge in shopBadges.slice(0, 5)"
                :key="badge"
                class="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-teal-700 shadow-sm"
              >
                {{ badge }}
              </span>
              <span v-if="shopIdentity?.vendorId" class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">
                Vendor {{ shopIdentity.vendorId }}
              </span>
            </div>
          </section>

          <section class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Search within shop</p>
                <h2 class="mt-1 text-[16px] font-black tracking-tight text-slate-950">Refine this storefront</h2>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Shop-scoped only</span>
            </div>

            <form class="mt-4 space-y-3" @submit.prevent="submitSearch">
              <div class="flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] focus-within:border-teal-300">
                <Search class="h-4 w-4 text-slate-400" />
                <input
                  v-model="searchQuery"
                  :placeholder="searchPlaceholder"
                  class="ml-3 w-full bg-transparent text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="submit"
                  class="inline-flex h-10 items-center justify-center rounded-full bg-teal-600 px-4 text-[11px] font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  Search shop
                </button>
                <button
                  type="button"
                  class="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300"
                  @click="clearSearch"
                >
                  Clear
                </button>
              </div>
            </form>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Results</div>
                <div class="mt-1 text-[14px] font-black text-slate-950">{{ productCountLabel }}</div>
              </div>
              <div class="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Scope</div>
                <div class="mt-1 text-[14px] font-black text-slate-950">One shop only</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 lg:px-6">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
          {{ shopScopeShort }}
        </span>
        <span v-if="selectedCategory" class="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
          Category: {{ selectedCategory }}
        </span>
        <span v-if="searchQuery.trim()" class="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
          Query: "{{ searchQuery.trim() }}"
        </span>
      </div>

      <section class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Shop products</p>
            <h2 class="mt-1 text-[18px] font-black tracking-tight text-slate-950">Products from this storefront</h2>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-semibold text-teal-700">{{ productCountLabel }}</span>
            <span class="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-600">Page {{ currentPage }} of {{ totalPages }}</span>
          </div>
        </div>

        <div v-if="loading" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
          <div v-for="i in 8" :key="i" class="h-80 animate-pulse rounded-[24px] bg-slate-100" />
        </div>

        <div v-else-if="shopProducts.length > 0" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
          <ProductCard
            v-for="product in shopProducts"
            :key="product.externalId"
            :product="product"
            :selected-currency="selectedCurrency"
            :conversion-rates="conversionRates"
            @click="handleProductClick"
          />
        </div>

        <div v-else class="mt-8 rounded-[24px] border border-dashed border-slate-200 p-8 text-center text-[12px] text-slate-500">
          <div class="flex flex-col items-center gap-3">
            <Package class="h-8 w-8 text-slate-300" />
            <div>No products found in this shop for the current search.</div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import ProductCard from '@/components/shopping/ProductCard.vue';
import { ArrowLeft, ExternalLink, Package, Search, Sparkles } from 'lucide-vue-next';
import { deriveBrandInsight, extractShopIdentity, formatShopSubtitle } from '@/utils/shop';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(false);
const searchQuery = ref(String(route.query.q || ''));
const selectedCategory = ref(String(route.query.category || ''));
const currentPage = ref(Math.max(1, Number(route.query.page || 1)));
const selectedLanguage = ref(String(route.query.language || 'en') === 'zh' ? 'zh' : 'en');
const pageSize = ref(24);
const totalPages = ref(1);
const totalCount = ref(0);
const selectedCurrency = ref<'BDT' | 'CNY' | 'USD'>('BDT');
const conversionRates = ref({ CNY_TO_BDT: 15, CNY_TO_USD: 0.14 });
const shopVendor = ref<any>(null);
const shopProducts = ref<any[]>([]);
let loadRequestId = 0;

const vendorId = computed(() => String(route.params.vendorId || '').trim());
const shopIdentity = computed(() => (
  extractShopIdentity({
    vendorId: vendorId.value,
    vendorInfo: shopVendor.value,
    sellerInfo: shopVendor.value,
    shop: {
      vendorId: vendorId.value,
      raw: shopVendor.value,
    },
    raw: shopVendor.value,
  }) || extractShopIdentity(shopProducts.value[0]) || null
));

const shopTitle = computed(() => shopIdentity.value?.name || vendorId.value || 'Shop storefront');
const shopUrl = computed(() => shopIdentity.value?.url || String(shopVendor.value?.ShopUrl || shopVendor.value?.shopUrl || shopVendor.value?.Url || shopVendor.value?.url || '').trim() || '');
const shopBadges = computed(() => shopIdentity.value?.badges || []);
const productCountLabel = computed(() => `${totalCount.value.toLocaleString('en-US')} products`);
const totalSold = computed(() => shopProducts.value.reduce((sum, product) => sum + Number(product?.totalSold || 0), 0));
const shopSubtitle = computed(() => formatShopSubtitle({ itemCount: totalCount.value || shopProducts.value.length, totalSold: totalSold.value }));
const shopScopeCopy = computed(() => {
  const query = searchQuery.value.trim();
  if (query) {
    return `This storefront is scoped to ${shopTitle.value}. We only search within this shop, so the products below are the matching results for "${query}".`;
  }
  return `This storefront is scoped to ${shopTitle.value}. Search here stays inside this shop and will not mix in results from other sellers.`;
});
const shopScopeShort = computed(() => {
  const query = searchQuery.value.trim();
  if (query) {
    return `Shop-scoped search for "${query}"`;
  }
  return 'Shop-scoped storefront';
});
const searchPlaceholder = computed(() => `Search within ${shopTitle.value}...`);
const paginationPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
});
const brandInsight = computed(() => deriveBrandInsight(searchQuery.value || shopTitle.value, shopProducts.value, shopTitle.value));
const brandInsightCopy = computed(() => {
  if (brandInsight.value.source === 'mixed') {
    return 'Matched from your search term and reinforced by this shop inventory.';
  }
  if (brandInsight.value.source === 'query') {
    return 'Inferred from your search term, similar to the brand chips shown in marketplace apps.';
  }
  if (brandInsight.value.source === 'inventory') {
    return 'Inferred from repeated brand-like terms in this shop inventory.';
  }
  return 'No reliable brand signal yet.';
});

function normalizedProducts(payload: any): any[] {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function loadShop() {
  const requestId = ++loadRequestId;
  const id = vendorId.value;
  if (!id) return;

  loading.value = true;
  try {
    const response = await axios.get(`/api/public/shopping/vendor/${encodeURIComponent(id)}`, {
      params: {
        q: searchQuery.value.trim() || undefined,
        keyword: searchQuery.value.trim() || undefined,
        category: selectedCategory.value || undefined,
        page: currentPage.value,
        pageSize: pageSize.value,
        language: selectedLanguage.value,
        sort: 'sales',
      },
    });

    if (requestId !== loadRequestId) return;

    shopVendor.value = response.data?.vendor || null;
    const productsPayload = response.data?.products;
    const products = normalizedProducts(productsPayload);
    shopProducts.value = products;
    totalCount.value = Number(productsPayload?.totalCount || productsPayload?.total || products.length || 0);
    totalPages.value = Number(productsPayload?.totalPages || Math.max(1, Math.ceil((totalCount.value || products.length || 0) / pageSize.value)));
  } catch (error) {
    console.error('Failed to load shop storefront', error);
    if (requestId === loadRequestId) {
      shopVendor.value = null;
      shopProducts.value = [];
      totalCount.value = 0;
      totalPages.value = 1;
    }
    toast.error('Failed to load shop storefront');
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

function syncFromRoute() {
  searchQuery.value = String(route.query.q || '');
  selectedCategory.value = String(route.query.category || '');
  currentPage.value = Math.max(1, Number(route.query.page || 1));
  selectedLanguage.value = String(route.query.language || 'en') === 'zh' ? 'zh' : 'en';
}

function submitSearch() {
  currentPage.value = 1;
  router.replace({
    name: 'shopping-shop',
    params: { vendorId: vendorId.value },
    query: {
      q: searchQuery.value.trim() || undefined,
      category: selectedCategory.value || undefined,
      page: '1',
      language: selectedLanguage.value,
    },
  });
}

function clearSearch() {
  searchQuery.value = '';
  currentPage.value = 1;
  router.replace({
    name: 'shopping-shop',
    params: { vendorId: vendorId.value },
    query: {
      category: selectedCategory.value || undefined,
      language: selectedLanguage.value,
    },
  });
}

function goBack() {
  router.push({
    name: 'shopping-browse',
    query: {
      q: searchQuery.value.trim() || undefined,
      category: selectedCategory.value || undefined,
    },
  });
}

function handleProductClick(product: any) {
  router.push({
    path: `/shopping/item/${product.externalId}`,
    query: { language: selectedLanguage.value },
  });
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  router.replace({
    name: 'shopping-shop',
    params: { vendorId: vendorId.value },
    query: {
      q: searchQuery.value.trim() || undefined,
      category: selectedCategory.value || undefined,
      page: String(page),
      language: selectedLanguage.value,
    },
  });
}

watch(
  () => [route.params.vendorId, route.query.q, route.query.category, route.query.page, route.query.language].join('|'),
  () => {
    syncFromRoute();
    loadShop();
  },
  { immediate: true }
);
</script>
