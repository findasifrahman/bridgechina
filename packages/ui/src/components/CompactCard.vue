<template>
  <Card class="cursor-pointer group" :hover="true" @click="$emit('click', item)">
    <div class="relative aspect-square bg-slate-200 rounded-t-2xl overflow-hidden">
      <img
        v-if="thumbnail"
        :src="thumbnail"
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
    </div>
    <CardBody class="p-4">
      <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2 text-sm">{{ title }}</h3>

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
import { Image as ImageIcon } from 'lucide-vue-next';
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import Badge from './Badge.vue';
import { Star } from 'lucide-vue-next';

defineProps<{
  item: any;
  title: string;
  subtitle?: string;
  thumbnail?: string | null;
  rating?: number;
  price?: string;
  meta?: string;
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'secondary';
  tags?: string[];
  icon?: any;
}>();

defineEmits<{
  click: [item: any];
}>();

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e2e8f0" width="400" height="300"/%3E%3C/svg%3E';
}
</script>



