<template>
  <div v-if="items && items.length > 0" class="mt-8">
    <h3 class="text-xl font-bold text-slate-900 mb-4">{{ title }}</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card
        v-for="item in items"
        :key="item.id || item.externalId"
        class="cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
        @click="$emit('item-click', item)"
      >
        <div class="aspect-square bg-slate-100">
          <img
            v-if="getItemImage(item)"
            :src="getItemImage(item)"
            :alt="getItemTitle(item)"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
            <Package class="h-12 w-12" />
          </div>
        </div>
        <CardBody class="p-3">
          <h4 class="font-semibold text-sm mb-1 line-clamp-2">{{ getItemTitle(item) }}</h4>
          <p v-if="getItemPrice(item)" class="text-sm font-bold text-teal-600">{{ getItemPrice(item) }}</p>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import { Package } from 'lucide-vue-next';

defineProps<{
  items: any[];
  title?: string;
}>();

defineEmits<{
  'item-click': [item: any];
}>();

function getItemImage(item: any): string {
  if (item.coverAsset?.public_url || item.coverAsset?.thumbnail_url) {
    return item.coverAsset.thumbnail_url || item.coverAsset.public_url;
  }
  if (item.main_images && Array.isArray(item.main_images) && item.main_images[0]) {
    return item.main_images[0];
  }
  if (item.images && Array.isArray(item.images) && item.images[0]) {
    return item.images[0];
  }
  return '';
}

function getItemTitle(item: any): string {
  return item.title || item.title_en || item.name || 'Product';
}

function getItemPrice(item: any): string {
  if (item.price) {
    return `¥${item.price}`;
  }
  if (item.price_min && item.price_max) {
    return `¥${item.price_min} - ¥${item.price_max}`;
  }
  if (item.price_min) {
    return `¥${item.price_min}`;
  }
  return '';
}
</script>



