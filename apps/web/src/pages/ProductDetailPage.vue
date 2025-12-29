<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <div v-if="loading" class="space-y-6">
      <div class="h-8 bg-slate-200 rounded animate-pulse w-1/3"></div>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="aspect-square bg-slate-200 rounded-lg animate-pulse"></div>
        <div class="space-y-4">
          <div class="h-6 bg-slate-200 rounded animate-pulse"></div>
          <div class="h-4 bg-slate-200 rounded animate-pulse w-2/3"></div>
          <div class="h-12 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>

    <div v-else-if="product" class="space-y-6">
      <button
        @click="$router.back()"
        class="text-teal-600 hover:text-teal-700 flex items-center gap-2 mb-4"
      >
        ← Back
      </button>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Product Image -->
        <div class="aspect-square bg-slate-100 rounded-lg overflow-hidden">
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

        <!-- Product Info -->
        <div class="space-y-4">
          <div>
            <h1 class="text-3xl font-bold text-slate-900 mb-2">{{ product.title }}</h1>
            <p v-if="product.category" class="text-slate-600">{{ product.category.name }}</p>
          </div>

          <div class="text-3xl font-bold text-teal-600">
            ¥{{ product.price || 'N/A' }}
          </div>

          <div v-if="product.description" class="prose max-w-none">
            <p class="text-slate-700 whitespace-pre-line">{{ product.description }}</p>
          </div>

          <div class="pt-4 border-t border-slate-200">
            <Button variant="accent" size="lg" class="w-full">
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <EmptyState title="Product not found" description="The product you're looking for doesn't exist" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { EmptyState, Button } from '@bridgechina/ui';
import axios from '@/utils/axios';

const route = useRoute();
const product = ref<any>(null);
const loading = ref(false);

async function loadProduct() {
  loading.value = true;
  try {
    const res = await axios.get(`/api/public/shopping/products/${route.params.id}`);
    product.value = res.data;
  } catch (error) {
    console.error('Failed to load product', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadProduct();
});
</script>


