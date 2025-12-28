<template>
  <div class="min-h-screen bg-white">
    <!-- Minimal Header (no banner) -->
    <div class="border-b border-slate-200 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-2xl font-bold text-slate-900">Shopping</h1>
        <p class="text-sm text-slate-600 mt-1">Discover quality products from trusted sellers in China</p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Unified Search Section -->
      <div class="bg-gradient-to-r from-teal-50 to-amber-50 rounded-xl shadow-md border border-teal-100 p-6 mb-6">
        <div class="flex items-center gap-2 mb-4">
          <Search class="h-5 w-5 text-teal-600" />
          <h2 class="text-lg font-semibold text-slate-900">Search Products</h2>
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

      <!-- Category Pills - Enhanced Styling -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">Browse by Category</h3>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="cat in categories"
            :key="cat.slug"
            @click="handleCategoryClick(cat.slug)"
            :class="[
              'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm',
              selectedCategory === cat.slug
                ? 'bg-teal-600 text-white shadow-md scale-105'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
            ]"
          >
            {{ cat.name }}
          </button>
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
            @click="handleProductClick(item)"
            @request-buy="handleRequestBuy(item)"
          />
        </div>
      </div>

      <!-- Search Results -->
      <div v-if="hasSearchResults" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-slate-900">
            {{ searchResults.length }} Results
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
            @click="handleProductClick(item)"
            @request-buy="handleRequestBuy(item)"
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Search, Upload, X, Package, RefreshCw, ChevronLeft, ChevronRight, Camera } from 'lucide-vue-next';
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

const categoryOptions = computed(() => [
  { value: '', label: 'All Categories' },
  ...categories.value.map((c) => ({ value: c.slug, label: c.name })),
]);

const hasSearchResults = computed(() => {
  // Show search results section if:
  // 1. We have actual results, OR
  // 2. We're currently loading a search, OR
  // 3. We have a search query and have finished loading (even if empty)
  return searchResults.value.length > 0 || loading.value || (searchQuery.value.trim().length > 0 && !loading.value);
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
  currentPage.value = 1;

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
    });

    console.log('[ShoppingPage] Image search response:', {
      data: searchRes.data,
      dataLength: Array.isArray(searchRes.data) ? searchRes.data.length : 'not array',
      dataType: typeof searchRes.data,
    });
    searchResults.value = Array.isArray(searchRes.data) ? searchRes.data : [];
    toast.success(`Found ${searchResults.value.length} products`);
  } catch (error: any) {
    console.error('Image search failed:', error);
    toast.error(error.response?.data?.error || 'Failed to search by image');
    searchResults.value = [];
  } finally {
    uploadingImage.value = false;
    loading.value = false;
  }
}

function handleCategoryClick(categorySlug: string) {
  selectedCategory.value = categorySlug;
  // Load hot products for this category
  loadHotItems();
}

async function handleKeywordSearch() {
  const keyword = searchQuery.value.trim();
  if (!keyword && !selectedCategory.value) {
    toast.error('Please enter a search keyword or select a category');
    return;
  }

  loading.value = true;
  currentPage.value = 1;

  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
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
      dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
      dataType: typeof response.data,
    });
    searchResults.value = Array.isArray(response.data) ? response.data : [];
    
    if (searchResults.value.length === 0) {
      toast.info('No products found. Try different keywords or category.');
    } else {
      toast.success(`Found ${searchResults.value.length} products`);
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
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  // Reload hot items
  loadHotItems();
}

function handleProductClick(product: any) {
  router.push(`/shopping/tmapi/${product.externalId}`);
}

function handleRequestBuy(product: any) {
  router.push({
    path: '/request',
    query: {
      category: 'shopping',
      external_id: product.externalId,
      title: product.title,
      image_url: product.imageUrl,
      source_url: product.sourceUrl,
      price_min: product.priceMin,
      price_max: product.priceMax,
    },
  });
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
    const params: any = {
      page: 1,
      pageSize: 20,
    };
    if (selectedCategory.value) {
      params.category = selectedCategory.value;
    }
    const response = await axios.get('/api/public/shopping/hot', { params });
    console.log('[ShoppingPage] Hot items response:', {
      data: response.data,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
    });
    hotItems.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load hot items', error);
    hotItems.value = [];
  } finally {
    loading.value = false;
  }
}


onMounted(() => {
  loadCategories();
  loadHotItems(); // Load hot products on mount
});
</script>
