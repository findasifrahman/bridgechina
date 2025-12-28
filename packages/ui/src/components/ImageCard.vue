<template>
  <Card class="cursor-pointer group" :hover="true" @click="$emit('click', item)">
    <div class="relative aspect-video bg-slate-200 rounded-t-2xl overflow-hidden">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-amber-100">
        <component :is="icon" class="h-12 w-12 text-teal-400" />
      </div>
      <div v-if="badge" class="absolute top-2 right-2">
        <Badge :variant="badgeVariant" size="sm">{{ badge }}</Badge>
      </div>
      <div v-if="overlay" class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
        <div class="p-3 text-white w-full">
          <h3 class="font-semibold text-sm mb-1">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-white/90">{{ subtitle }}</p>
        </div>
      </div>
    </div>
    <CardBody v-if="!overlay" class="p-4">
      <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2 text-sm">{{ title }}</h3>
      <p v-if="subtitle" class="text-xs text-slate-600 mb-2 line-clamp-1">{{ subtitle }}</p>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div v-if="rating" class="flex items-center gap-1">
            <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
            <span class="text-xs font-medium">{{ rating.toFixed(1) }}</span>
          </div>
          <span v-if="meta" class="text-xs text-slate-500">{{ meta }}</span>
        </div>
        <div v-if="price" class="text-sm font-semibold text-teal-600">{{ price }}</div>
      </div>
      <div v-if="tags && tags.length > 0" class="flex flex-wrap gap-1 mt-2">
        <Badge v-for="tag in tags.slice(0, 2)" :key="tag" variant="secondary" size="xs">{{ tag }}</Badge>
      </div>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Image as ImageIcon, Star } from 'lucide-vue-next';
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import Badge from './Badge.vue';

const props = defineProps<{
  item?: any;
  title: string;
  subtitle?: string;
  thumbnail?: string | null;
  coverAsset?: any;
  galleryAssets?: any[];
  rating?: number;
  price?: string;
  meta?: string;
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'secondary';
  tags?: string[];
  icon?: any;
  overlay?: boolean;
}>();

defineEmits<{
  click: [item: any];
}>();

// Prefer thumbnail_url, fallback to public_url, then gallery, then null
const imageUrl = computed(() => {
  if (props.thumbnail) return props.thumbnail;
  if (props.coverAsset?.thumbnail_url) return props.coverAsset.thumbnail_url;
  if (props.coverAsset?.public_url) return props.coverAsset.public_url;
  if (props.galleryAssets && props.galleryAssets.length > 0) {
    const first = props.galleryAssets[0];
    return first.thumbnail_url || first.public_url;
  }
  return null;
});

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}
</script>

