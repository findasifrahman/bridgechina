<template>
  <div class="py-6">
    <h2 class="text-lg font-semibold text-slate-900 mb-4">{{ title || 'You might also like' }}</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <CompactCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :title="item.name || item.title"
        :subtitle="item.subtitle || item.description"
        :thumbnail="getThumbnail(item)"
        :rating="item.rating || item.star_rating"
        :price="formatPrice(item)"
        :meta="getMeta(item)"
        :badge="item.badge"
        :tags="getTags(item)"
        @click="handleClick(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CompactCard from './CompactCard.vue';

defineProps<{
  title?: string;
  items: any[];
}>();

const emit = defineEmits<{
  click: [item: any];
}>();

function getThumbnail(item: any): string | null {
  if (item.coverAsset?.public_url) return item.coverAsset.public_url;
  if (item.cover_asset_id && item.coverAsset) return item.coverAsset.public_url;
  if (item.galleryAssets && item.galleryAssets.length > 0) return item.galleryAssets[0].public_url;
  if (item.image) return item.image;
  return null;
}

function formatPrice(item: any): string | undefined {
  if (item.price_from) return `¥${item.price_from}`;
  if (item.price) return `¥${item.price}`;
  if (item.base_price) return `¥${item.base_price}`;
  return undefined;
}

function getMeta(item: any): string | undefined {
  if (item.city?.name) return item.city.name;
  if (item.duration_text) return item.duration_text;
  if (item.region_text) return item.region_text;
  return undefined;
}

function getTags(item: any): string[] {
  const tags: string[] = [];
  if (item.verified) tags.push('Verified');
  if (item.halal_verified) tags.push('Halal');
  if (item.is_family_friendly) tags.push('Family');
  if (item.is_pet_friendly) tags.push('Pet Friendly');
  return tags;
}

function handleClick(item: any) {
  emit('click', item);
}
</script>







