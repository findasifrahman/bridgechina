<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <PageHeader title="City Places" subtitle="Discover interesting places in China" />
    
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div v-for="i in 6" :key="i" class="h-64 bg-slate-200 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="places.length === 0" class="text-center py-12 mt-6">
      <EmptyState title="No places" description="City places will appear here" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div
        v-for="place in places"
        :key="place.id"
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
        @click="$router.push(`/places/${place.id}`)"
      >
        <div class="aspect-video bg-slate-100">
          <img
            v-if="place.coverAsset?.public_url"
            :src="place.coverAsset.public_url"
            :alt="place.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
            No Image
          </div>
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-slate-900 mb-1">{{ place.name }}</h3>
          <p v-if="place.city" class="text-sm text-slate-600 mb-2">{{ place.city.name }}</p>
          <p v-if="place.description" class="text-sm text-slate-700 line-clamp-2">{{ place.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PageHeader, EmptyState } from '@bridgechina/ui';
import axios from '@/utils/axios';

const places = ref<any[]>([]);
const loading = ref(false);

async function loadPlaces() {
  loading.value = true;
  try {
    const res = await axios.get('/api/public/catalog/cityplaces');
    places.value = res.data;
  } catch (error) {
    console.error('Failed to load places', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadPlaces();
});
</script>


