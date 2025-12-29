<template>
  <Carousel
    :items="imageItems"
    :autoplay="autoplay"
    :show-dots="showDots"
    :show-controls="showControls"
  >
    <template #default="{ item }">
      <div class="relative w-full h-full">
        <img
          :src="item.url"
          :alt="item.alt || 'Image'"
          class="w-full h-full object-cover"
        />
      </div>
    </template>
  </Carousel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Carousel from './Carousel.vue';

const props = withDefaults(defineProps<{
  images: string[] | Array<{ url: string; alt?: string }>;
  autoplay?: boolean;
  showDots?: boolean;
  showControls?: boolean;
}>(), {
  autoplay: false,
  showDots: true,
  showControls: true,
});

const imageItems = computed(() => {
  if (!props.images || props.images.length === 0) {
    return [];
  }
  return props.images.map((img) => {
    if (typeof img === 'string') {
      return { url: img, alt: 'Image' };
    }
    return img;
  });
});
</script>


