<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <div v-if="loading" class="space-y-6">
      <div class="h-8 bg-slate-200 rounded animate-pulse w-1/3"></div>
      <div class="h-96 bg-slate-200 rounded-lg animate-pulse"></div>
    </div>

    <div v-else-if="place" class="space-y-6">
      <button
        @click="$router.back()"
        class="text-teal-600 hover:text-teal-700 flex items-center gap-2 mb-4"
      >
        ← Back
      </button>

      <div>
        <h1 class="text-3xl font-bold text-slate-900 mb-2">{{ place.name }}</h1>
        <p v-if="place.city" class="text-slate-600">{{ place.city.name }}</p>
      </div>

      <div v-if="place.coverAsset?.public_url" class="aspect-video bg-slate-100 rounded-lg overflow-hidden">
        <img
          :src="place.coverAsset.public_url"
          :alt="place.name"
          class="w-full h-full object-cover"
        />
      </div>

      <div v-if="place.description" class="prose max-w-none">
        <p class="text-slate-700 whitespace-pre-line">{{ place.description }}</p>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <EmptyState title="Place not found" description="The place you're looking for doesn't exist" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { EmptyState } from '@bridgechina/ui';
import axios from '@/utils/axios';

const route = useRoute();
const place = ref<any>(null);
const loading = ref(false);

async function loadPlace() {
  loading.value = true;
  try {
    const res = await axios.get(`/api/public/catalog/cityplaces/${route.params.id}`);
    place.value = res.data;
  } catch (error) {
    console.error('Failed to load place', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadPlace();
});
</script>


