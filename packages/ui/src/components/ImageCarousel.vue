<template>
  <div class="relative">
    <!-- Main Image -->
    <div class="relative aspect-video bg-slate-200 rounded-2xl overflow-hidden">
      <img
        v-if="images.length > 0 && currentIndex < images.length"
        :src="images[currentIndex]"
        :alt="`Image ${currentIndex + 1}`"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
        <ImageIcon class="h-16 w-16 text-teal-400" />
      </div>

      <!-- Navigation Arrows -->
      <button
        v-if="images.length > 1"
        @click="previous"
        class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
        aria-label="Previous image"
      >
        <ChevronLeft class="h-5 w-5 text-slate-700" />
      </button>
      <button
        v-if="images.length > 1"
        @click="next"
        class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
        aria-label="Next image"
      >
        <ChevronRight class="h-5 w-5 text-slate-700" />
      </button>

      <!-- Image Counter -->
      <div v-if="images.length > 1" class="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs">
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>
    </div>

    <!-- Thumbnail Strip -->
    <div v-if="images.length > 1" class="mt-4 flex gap-2 overflow-x-auto pb-2">
      <button
        v-for="(img, idx) in images"
        :key="idx"
        @click="currentIndex = idx"
        class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all"
        :class="currentIndex === idx ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'"
      >
        <img
          :src="img"
          :alt="`Thumbnail ${idx + 1}`"
          class="w-full h-full object-cover"
          @error="handleImageError"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-vue-next';

const props = defineProps<{
  images: string[];
}>();

const currentIndex = ref(0);

function next() {
  currentIndex.value = (currentIndex.value + 1) % props.images.length;
}

function previous() {
  currentIndex.value = currentIndex.value === 0 ? props.images.length - 1 : currentIndex.value - 1;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e2e8f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="Arial" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
}
</script>






