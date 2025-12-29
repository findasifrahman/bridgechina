<template>
  <Card
    class="cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    @click="$emit('click')"
  >
    <div class="aspect-square bg-slate-100 relative">
      <img
        v-if="thumbnail"
        :src="thumbnail"
        :alt="title"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
        <span class="text-4xl text-slate-400">{{ title?.charAt(0) || '?' }}</span>
      </div>
      <div v-if="badge" class="absolute top-2 right-2">
        <Badge :variant="badgeVariant || 'accent'" size="sm">{{ badge }}</Badge>
      </div>
    </div>
    <CardBody class="p-3">
      <h3 class="font-semibold text-sm mb-1 line-clamp-1">{{ title || 'N/A' }}</h3>
      <p v-if="subtitle" class="text-xs text-slate-600 mb-1 line-clamp-1">{{ subtitle }}</p>
      <div class="flex items-center justify-between mb-2">
        <span v-if="price" class="text-sm font-bold text-teal-600">{{ price }}</span>
        <span v-else-if="rating" class="text-xs text-slate-500">⭐ {{ rating }}</span>
        <span v-else class="flex-1"></span>
        <span v-if="meta" class="text-xs text-slate-500">{{ meta }}</span>
      </div>
      <div v-if="tags && tags.length > 0" class="flex gap-1 flex-wrap mt-2">
        <Badge
          v-for="(tag, idx) in tags"
          :key="idx"
          variant="primary"
          size="sm"
        >
          {{ tag }}
        </Badge>
      </div>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import Badge from './Badge.vue';

defineProps<{
  item?: any;
  title?: string;
  subtitle?: string;
  thumbnail?: string;
  rating?: number;
  price?: string;
  meta?: string;
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'accent' | 'danger' | 'success' | 'warning';
  tags?: string[];
}>();

defineEmits<{
  click: [];
}>();
</script>



