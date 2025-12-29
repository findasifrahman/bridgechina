<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <PageHeader title="Shopping" subtitle="Discover products from our marketplace" />
    
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <div v-for="i in 8" :key="i" class="aspect-square bg-slate-200 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="products.length === 0" class="text-center py-12 mt-6">
      <EmptyState title="No products" description="Products will appear here" />
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <div
        v-for="product in products"
        :key="product.id"
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
        @click="$router.push(`/shopping/${product.id}`)"
      >
        <div class="aspect-square bg-slate-100">
          <img
            v-if="product.coverAsset?.public_url"
            :src="product.coverAsset.public_url"
            :alt="product.title"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
            No Image
          </div>
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2">{{ product.title }}</h3>
          <p v-if="product.category" class="text-sm text-slate-600 mb-2">{{ product.category.name }}</p>
          <p class="text-lg font-bold text-teal-600">¥{{ product.price || 'N/A' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PageHeader, EmptyState } from '@bridgechina/ui';
import axios from '@/utils/axios';

const products = ref<any[]>([]);
const loading = ref(false);

async function loadProducts() {
  loading.value = true;
  try {
    const res = await axios.get('/api/public/shopping/products');
    products.value = res.data;
  } catch (error) {
    console.error('Failed to load products', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProducts();
});
</script>


