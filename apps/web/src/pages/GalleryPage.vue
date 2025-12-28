<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <PageHeader :title="`Gallery - ${currentCity?.name || 'China Highlights'}`" subtitle="Explore images from our services" />
    
    <div class="mt-6 mb-4 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <MapPin class="h-4 w-4 text-slate-400" />
        <span class="text-sm text-slate-600">Showing images for {{ currentCity?.name || 'all cities' }}</span>
      </div>
      <Select
        v-model="selectedCityId"
        :options="cityOptions"
        placeholder="Filter by city"
        class="w-48"
        @update:model-value="loadGallery"
      />
    </div>

    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="aspect-square bg-slate-200 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="images.length === 0" class="text-center py-12">
      <EmptyState title="No images" description="Gallery images will appear here" />
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="image in images"
        :key="image.id"
        class="aspect-square bg-slate-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        @click="selectedImage = image"
      >
        <img :src="image.asset.public_url" :alt="image.title" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Image Modal -->
    <Modal v-model="!!selectedImage" title="" @close="selectedImage = null">
      <div v-if="selectedImage" class="space-y-4">
        <img :src="selectedImage.asset.public_url" :alt="selectedImage.title" class="w-full rounded-lg" />
        <div>
          <h3 class="font-semibold text-slate-900 mb-1">{{ selectedImage.title }}</h3>
          <p v-if="selectedImage.city" class="text-sm text-slate-600">{{ selectedImage.city.name }}</p>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MapPin } from 'lucide-vue-next';
import { PageHeader, Select, EmptyState, Modal } from '@bridgechina/ui';
import axios from '@/utils/axios';

const currentCity = ref<any>(null);
const images = ref<any[]>([]);
const cities = ref<any[]>([]);
const selectedCityId = ref<string>('');
const selectedImage = ref<any>(null);
const loading = ref(false);

const cityOptions = computed(() => [
  { value: '', label: 'All Cities' },
  ...cities.value.map((c) => ({ value: c.id, label: c.name })),
]);

async function loadGeo() {
  try {
    const res = await axios.get('/api/public/geo');
    currentCity.value = res.data.city;
    selectedCityId.value = res.data.city?.id || '';
  } catch (error) {
    console.error('Failed to load geo', error);
  }
}

async function loadCities() {
  try {
    const res = await axios.get('/api/public/cities');
    cities.value = res.data;
  } catch (error) {
    console.error('Failed to load cities', error);
  }
}

async function loadGallery() {
  loading.value = true;
  try {
    const params: any = {};
    if (selectedCityId.value) {
      params.city_id = selectedCityId.value;
    }
    const res = await axios.get('/api/public/gallery', { params });
    images.value = res.data;
  } catch (error) {
    console.error('Failed to load gallery', error);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadGeo(), loadCities()]);
  await loadGallery();
});
</script>

