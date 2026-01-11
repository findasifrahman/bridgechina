<template>
  <div class="min-h-screen bg-white">
    <!-- Minimal Header (no banner) -->
    <div class="border-b border-slate-200 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 ">Shopping</h1>
            <p class="text-sm text-slate-600 mt-1">Discover quality products from trusted sellers in China</p>
          </div>
          <Button
            variant="ghost"
            @click="router.push('/shopping/cart')"
            class="relative"
          >
            <ShoppingCart class="h-5 w-5" />
            <span v-if="totalItems > 0" class="absolute -top-1 -right-1 bg-teal-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {{ totalItems > 9 ? '9+' : totalItems }}
            </span>
          </Button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Unified Search Section -->
      <div class="bg-gradient-to-r from-teal-50 to-amber-50 rounded-xl shadow-md border border-teal-100 p-6 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div class="flex items-center gap-2">
            <Search class="h-5 w-5 text-teal-600" />
            <h2 class="text-lg font-semibold text-slate-900">Search Products</h2>
          </div>
          <div class="flex flex-wrap gap-2 sm:justify-end">
          <!-- Language Tabs -->
          <div class="flex gap-2 border border-teal-200 rounded-lg p-1 bg-white">
            <button
              @click="selectedLanguage = 'zh'"
              :class="[
                'px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors',
                selectedLanguage === 'zh'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50'
              ]"
            >
              中文
            </button>
            <button
              @click="selectedLanguage = 'en'"
              :class="[
                'px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors',
                selectedLanguage === 'en'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50'
              ]"
            >
              English
            </button>
            </div>
            <!-- Currency Selector -->
            <div class="flex gap-1 sm:gap-2 border border-teal-200 rounded-lg p-1 bg-white">
              <button
                v-for="curr in ['CNY', 'BDT', 'USD'] as const"
                :key="curr"
                @click="selectedCurrency = curr"
                :class="[
                  'px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors',
                  selectedCurrency === curr
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50'
                ]"
              >
                {{ curr }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Single Unified Search Bar -->
        <div class="flex flex-col md:flex-row gap-3">
          <!-- Search Input with Camera Icon Inside -->
          <div class="flex-1 relative">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileSelect"
            />
            <Input
              v-model="searchQuery"
              :placeholder="selectedImage ? 'Image selected - click Search' : 'Search 100+ millions of products'"
              class="w-full"
              :disabled="!!selectedImage"
              @keyup.enter="handleUnifiedSearch"
            >
              <template #prefix>
                <Search class="h-4 w-4 text-slate-400" />
              </template>
              <template #suffix>
                <!-- Camera Icon Inside Search Bar - Red Color -->
                <button
                  type="button"
                  @click.stop="fileInput?.click()"
                  class="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                  :title="selectedImage ? 'Change image' : 'Search by image'"
                >
                  <Camera class="h-5 w-5" />
                </button>
              </template>
            </Input>
            <!-- Image Preview Badge -->
            <div v-if="selectedImage" class="mt-2 flex items-center gap-2 p-2 bg-white rounded-lg border border-teal-200">
              <div class="relative w-12 h-12 rounded overflow-hidden border border-teal-300 flex-shrink-0">
                <img :src="imagePreview" alt="Preview" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-slate-900 truncate">{{ selectedImage.name }}</p>
                <p class="text-xs text-slate-600">Image ready to search</p>
              </div>
              <button
                type="button"
                @click="clearImage"
                class="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Remove image"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <!-- Category Dropdown -->
          <div class="w-full md:w-48">
            <Select
              v-model="selectedCategory"
              :options="categoryOptions"
              placeholder="All Categories"
              class="w-full"
            />
          </div>
          
          <!-- Search Button -->
          <Button 
            variant="primary" 
            @click="handleUnifiedSearch"
            :disabled="!searchQuery.trim() && !selectedImage"
            :loading="uploadingImage"
            class="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-md px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search class="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <!-- Recent Searches -->
      <div v-if="recentSearches.length > 0" class="mb-6">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">Recent Searches</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(keyword, idx) in recentSearches"
            :key="idx"
            @click="handleRecentSearchClick(keyword)"
            class="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
          >
            {{ keyword }}
          </button>
        </div>
      </div>

      <!-- Categories (compact chips) + Subcategories -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">Browse by Category</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat.slug"
            type="button"
            @click="handleCategoryChipClick(cat.slug)"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2',
              selectedCategory === cat.slug
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
            ]"
          >
            <span class="text-base">{{ cat.icon || '📦' }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>
        <div v-if="selectedCategory && currentSubcategories.length > 0" class="mt-3">
          <div class="text-xs font-semibold text-slate-600 mb-2">Subcategories</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="sub in currentSubcategories"
              :key="sub"
              type="button"
              @click="handleSubcategoryChipClick(sub)"
              class="px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
            >
              {{ sub }}
            </button>
          </div>
        </div>
      </div>

      <!-- Hot Products Section (shown when no search) -->
      <div v-if="!hasSearchResults && !loading" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-slate-900">Hot Products</h2>
          <Button variant="ghost" size="sm" @click="loadHotItems()">
            <RefreshCw class="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div v-if="hotItems.length === 0" class="text-center py-12 text-slate-500">
          <Package class="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <p>No hot products available. Try searching for products above.</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProductCard
            v-for="item in hotItems"
            :key="item.externalId"
            :product="item"
            :selected-currency="selectedCurrency"
            :conversion-rates="conversionRates"
            @click="handleProductClick(item)"
            @request-buy="handleRequestBuy(item)"
            @add-to-cart="handleAddToCart"
          />
        </div>
      </div>

      <!-- Search Results -->
      <div v-if="hasSearchResults" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-slate-900">
            {{ totalCount || searchResults.length }} Results
            <span v-if="totalCount && totalCount !== searchResults.length" class="text-sm font-normal text-slate-600">
              (showing {{ searchResults.length }})
            </span>
          </h2>
          <Button variant="ghost" size="sm" @click="clearSearch">
            Clear Search
          </Button>
        </div>
        <div v-if="searchResults.length === 0 && !loading" class="text-center py-12">
          <EmptyState
            title="No products found"
            description="Try adjusting your search or filters"
          />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <ProductCard
            v-for="item in searchResults"
            :key="item.externalId"
            :product="item"
            :selected-currency="selectedCurrency"
            :conversion-rates="conversionRates"
            @click="handleProductClick(item)"
            @request-buy="handleRequestBuy(item)"
            @add-to-cart="handleAddToCart"
          />
        </div>
        
        <!-- Pagination -->
        <div v-if="hasSearchResults && searchResults.length > 0" class="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="ghost"
            size="sm"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
            Previous
          </Button>
          <span class="text-sm text-slate-600">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <Button
            variant="ghost"
            size="sm"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Next
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card v-for="i in 8" :key="i" class="animate-pulse">
          <div class="h-48 bg-slate-200 rounded-t-lg" />
          <CardBody>
            <div class="h-4 bg-slate-200 rounded mb-2" />
            <div class="h-4 bg-slate-200 rounded w-2/3" />
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { Search, X, Package, RefreshCw, ChevronLeft, ChevronRight, Camera, ShoppingCart } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Input,
  Select,
  Button,
  EmptyState,
} from '@bridgechina/ui';
import ProductCard from '@/components/shopping/ProductCard.vue';

const router = useRouter();
const toast = useToast();
const { totalItems, addToCart: addToCartComposable } = useShoppingCart();

const categories = ref<any[]>([]);
const hotItems = ref<any[]>([]);
const searchResults = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedImage = ref<File | null>(null);
const imagePreview = ref<string>('');
const uploadingImage = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(1);
const totalCount = ref<number | null>(null);
const selectedLanguage = ref<'en' | 'zh'>('zh');
const selectedCurrency = ref<'CNY' | 'BDT' | 'USD'>('CNY');
const recentSearches = ref<string[]>([]);
const conversionRates = ref<{ CNY_TO_BDT?: number; CNY_TO_USD?: number }>({});
const selectedSubcategory = ref<string>('');
const topSalesProducts = ref<any[]>([]);
const lowestPriceProducts = ref<any[]>([]);

const categoryOptions = computed(() => {
  const options = [{ value: '', label: 'All Categories' }];
  // Add categories with icons (avoid duplicates)
  const seen = new Set<string>();
  categories.value.forEach((c) => {
    if (!seen.has(c.slug)) {
      seen.add(c.slug);
      options.push({ 
        value: c.slug, 
        label: `${c.icon || '📦'} ${c.name}` 
      });
    }
  });
  return options;
});

const hasSearchResults = computed(() => {
  // Show search results section if:
  // 1. We have actual results, OR
  // 2. We're currently loading a search, OR
  // 3. We have a search query and have finished loading (even if empty)
  return searchResults.value.length > 0 || loading.value || (searchQuery.value.trim().length > 0 && !loading.value);
});

const currentSubcategories = computed<string[]>(() => {
  if (!selectedCategory.value) return [];
  const cat = categories.value.find((c: any) => c.slug === selectedCategory.value);
  return Array.isArray(cat?.subcategories) ? cat.subcategories.slice(0, 10) : [];
});

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedImage.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

function clearImage() {
  selectedImage.value = null;
  imagePreview.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function handleUnifiedSearch() {
  // Reset to page 1 when starting a new search
  currentPage.value = 1;
  
  // If image is selected, do image search
  if (selectedImage.value) {
    await handleImageSearch();
    return;
  }
  
  // Otherwise, do keyword search
  await handleKeywordSearch();
}

async function handleImageSearch() {
  if (!selectedImage.value) return;

  uploadingImage.value = true;
  loading.value = true;
  // Don't reset currentPage here - let goToPage handle it

  try {
    // Step 1: Upload image to backend (server-side upload to R2 - avoids CORS)
    const formData = new FormData();
    formData.append('image', selectedImage.value);

    const uploadRes = await axios.post('/api/public/shopping/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Step 2: Search by image using the public URL
    const searchRes = await axios.post('/api/public/shopping/search/image', {
      r2_public_url: uploadRes.data.publicUrl,
      category: selectedCategory.value || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
      language: selectedLanguage.value,
      sort: 'sales', // Default to sales sort
    });

    console.log('[ShoppingPage] Image search response:', {
      data: searchRes.data,
      dataLength: Array.isArray(searchRes.data?.items) ? searchRes.data.items.length : 'not array',
      dataType: typeof searchRes.data,
      pagination: searchRes.data?.totalCount ? {
        totalCount: searchRes.data.totalCount,
        page: searchRes.data.page,
        totalPages: searchRes.data.totalPages,
      } : 'no pagination',
    });
    
    // Handle both old format (array) and new format (object with items)
    if (Array.isArray(searchRes.data)) {
      searchResults.value = searchRes.data;
      totalPages.value = 1; // Old format, no pagination info
    } else if (searchRes.data?.items) {
      searchResults.value = searchRes.data.items;
      totalPages.value = searchRes.data.totalPages || 1;
    } else {
      searchResults.value = [];
      totalPages.value = 1;
    }
    
    toast.success(`Found ${searchRes.data?.totalCount || searchResults.value.length} products`);
  } catch (error: any) {
    console.error('Image search failed:', error);
    toast.error(error.response?.data?.error || 'Failed to search by image');
    searchResults.value = [];
  } finally {
    uploadingImage.value = false;
    loading.value = false;
  }
}


function handleRecentSearchClick(keyword: string) {
  searchQuery.value = keyword;
  handleKeywordSearch();
}

function handleCategoryChipClick(slug: string) {
  selectedCategory.value = slug;
  selectedSubcategory.value = '';
  // keep behavior: refresh hot items for selected category
  loadHotItems();
}

function handleSubcategoryChipClick(sub: string) {
  selectedSubcategory.value = sub;
  searchQuery.value = sub;
  currentPage.value = 1;
  handleKeywordSearch();
}

async function handleKeywordSearch() {
  const keyword = searchQuery.value.trim();
  if (!keyword && !selectedCategory.value) {
    toast.error('Please enter a search keyword or select a category');
    return;
  }

  loading.value = true;
  // Don't reset currentPage here - let goToPage handle it

  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
      language: selectedLanguage.value,
      sort: 'sales', // Default to sales sort
    };
    
    if (keyword) {
      params.keyword = keyword;
    }
    
    if (selectedCategory.value) {
      params.category = selectedCategory.value;
    }

    const response = await axios.get('/api/public/shopping/search', { params });
    
    console.log('[ShoppingPage] Keyword search response:', {
      data: response.data,
      dataLength: Array.isArray(response.data?.items) ? response.data.items.length : 'not array',
      dataType: typeof response.data,
      pagination: response.data?.totalCount ? {
        totalCount: response.data.totalCount,
        page: response.data.page,
        totalPages: response.data.totalPages,
      } : 'no pagination',
    });
    
    // Handle both old format (array) and new format (object with items)
    if (Array.isArray(response.data)) {
      searchResults.value = response.data;
      totalPages.value = 1; // Old format, no pagination info
    } else if (response.data?.items) {
      searchResults.value = response.data.items;
      totalPages.value = response.data.totalPages || 1;
      currentPage.value = response.data.page || currentPage.value;
      totalCount.value = response.data.totalCount || null;
      // Update total count display
      if (response.data.totalCount) {
        console.log('[ShoppingPage] Total products found:', response.data.totalCount);
      }
    } else {
      searchResults.value = [];
      totalPages.value = 1;
    }
    
    if (searchResults.value.length === 0) {
      toast.info('No products found. Try different keywords or category.');
    } else {
      toast.success(`Found ${response.data?.totalCount || searchResults.value.length} products`);
    }
  } catch (error: any) {
    console.error('Keyword search failed:', error);
    toast.error(error.response?.data?.error || error.message || 'Failed to search products');
    searchResults.value = [];
  } finally {
    loading.value = false;
  }
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  
  currentPage.value = page;
  
  if (selectedImage.value) {
    await handleImageSearch();
  } else {
    await handleKeywordSearch();
  }
}

function clearSearch() {
  searchQuery.value = '';
  searchResults.value = [];
  selectedImage.value = null;
  imagePreview.value = '';
  currentPage.value = 1;
  totalCount.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  // Reload hot items
  loadHotItems();
}

function handleProductClick(product: any) {
  router.push({
    path: `/shopping/tmapi/${product.externalId}`,
    query: { language: selectedLanguage.value },
  });
}

function handleRequestBuy(product: any) {
  // Add to cart instead of direct request
  addToCartComposable(product, 1);
  toast.success('Added to cart!');
}

function handleAddToCart(product: any) {
  addToCartComposable(product, 1);
  toast.success('Added to cart!');
}

async function loadCategories() {
  try {
    const response = await axios.get('/api/public/shopping/categories');
    categories.value = response.data || [];
  } catch (error) {
    console.error('Failed to load categories', error);
  }
}

async function loadHotItems() {
  loading.value = true;
  try {
    console.log('[ShoppingPage] Loading hot items from database...');
    const params: any = {
      page: 1,
      pageSize: 12, // Show max 12 items on shopping page
    };
    if (selectedCategory.value) {
      params.category = selectedCategory.value;
    }
    const response = await axios.get('/api/public/shopping/hot', { params });
    console.log('[ShoppingPage] Hot items response:', {
      data: response.data,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
      dataType: typeof response.data,
    });
    hotItems.value = Array.isArray(response.data) ? response.data : [];
    console.log('[ShoppingPage] Loaded', hotItems.value.length, 'hot items');
    
    // Load top sales and lowest price
    await loadTopSalesAndLowestPrice();
  } catch (error) {
    console.error('[ShoppingPage] Failed to load hot items:', error);
    hotItems.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadTopSalesAndLowestPrice() {
  try {
    // Get top sales - search with sort=sales, limit to 4
    const topSalesRes = await axios.get('/api/public/shopping/search', {
      params: {
        keyword: selectedCategory.value || 'products',
        page: 1,
        pageSize: 4,
        sort: 'sales',
        language: selectedLanguage.value,
      },
    });
    
    if (topSalesRes.data?.items) {
      // Sort by totalSold if available
      topSalesProducts.value = topSalesRes.data.items
        .filter((item: any) => item.totalSold)
        .sort((a: any, b: any) => (b.totalSold || 0) - (a.totalSold || 0))
        .slice(0, 4);
    }
    
    // Get lowest price - TMAPI sort: price_up
    const lowestPriceRes = await axios.get('/api/public/shopping/search', {
      params: {
        keyword: selectedCategory.value || 'products',
        page: 1,
        pageSize: 4,
        sort: 'price_up',
        language: selectedLanguage.value,
      },
    });
    
    if (lowestPriceRes.data?.items) {
      // Sort by priceMin
      lowestPriceProducts.value = lowestPriceRes.data.items
        .filter((item: any) => item.priceMin)
        .sort((a: any, b: any) => (a.priceMin || Infinity) - (b.priceMin || Infinity))
        .slice(0, 4);
    }
  } catch (error) {
    console.error('[ShoppingPage] Failed to load top sales/lowest price:', error);
  }
}


async function loadRecentSearches() {
  try {
    const response = await axios.get('/api/public/shopping/recent-searches', {
      params: {
        limit: 8,
        language: selectedLanguage.value,
      },
    });
    recentSearches.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load recent searches:', error);
    recentSearches.value = [];
  }
}

async function loadConversionRates() {
  // In a real app, these would come from an API or env
  // For now, use defaults or fetch from backend
  conversionRates.value = {
    CNY_TO_BDT: 15, // Default fallback
    CNY_TO_USD: 0.14, // Default fallback
  };
  
  // Try to get from backend if available
  try {
    // Backend could expose these via env or API
    // For now, use defaults
  } catch (error) {
    console.warn('Failed to load conversion rates, using defaults');
  }
}

onMounted(() => {
  loadCategories();
  loadHotItems(); // Load hot products on mount
  loadRecentSearches();
  loadConversionRates();
});
</script>





