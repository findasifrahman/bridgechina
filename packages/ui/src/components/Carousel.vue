<template>
  <div class="relative">
    <div class="overflow-hidden rounded-lg">
      <div
        class="flex transition-transform duration-300 ease-in-out"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="(item, idx) in items"
          :key="idx"
          class="min-w-full"
        >
          <slot :item="item" :index="idx" />
        </div>
      </div>
    </div>
    <button
      v-if="showControls && items.length > 1"
      class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
      @click="previous"
    >
      <ChevronLeft class="h-5 w-5" />
    </button>
    <button
      v-if="showControls && items.length > 1"
      class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition-colors"
      @click="next"
    >
      <ChevronRight class="h-5 w-5" />
    </button>
    <div v-if="showDots && items.length > 1" class="flex justify-center space-x-2 mt-4">
      <button
        v-for="(_, idx) in items"
        :key="idx"
        class="h-2 rounded-full transition-all"
        :class="idx === currentIndex ? 'w-8 bg-teal-600' : 'w-2 bg-slate-300'"
        @click="currentIndex = idx"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  items: any[];
  autoplay?: boolean;
  interval?: number;
  showControls?: boolean;
  showDots?: boolean;
}>();

const currentIndex = ref(0);

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.items.length;
};

const previous = () => {
  currentIndex.value = currentIndex.value === 0 ? props.items.length - 1 : currentIndex.value - 1;
};

let autoplayInterval: number | null = null;

onMounted(() => {
  if (props.autoplay) {
    autoplayInterval = window.setInterval(next, props.interval || 5000);
  }
});

onUnmounted(() => {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
  }
});
</script>

