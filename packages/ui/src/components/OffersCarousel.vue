<template>
  <div v-if="offers.length > 0" class="lg:hidden mb-6">
    <div class="flex items-center justify-between mb-3 px-4">
      <h3 class="text-lg font-semibold text-teal-600">Special Offers</h3>
      <span class="text-xs text-slate-500">{{ offers.length }} offers</span>
    </div>
    <div class="overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-2">
      <div class="flex gap-4">
        <div
          v-for="offer in offers"
          :key="offer.id"
          class="flex-shrink-0 w-[280px] snap-center cursor-pointer group"
          @click="handleOfferClick(offer)"
        >
          <!-- Framed Image (same style as desktop) -->
          <div class="relative bg-white p-3 rounded-xl shadow-lg border-2 border-slate-200 hover:border-teal-400 transition-all duration-300 hover:shadow-xl">
            <div class="relative h-48 bg-slate-200 rounded-lg overflow-hidden">
              <img
                v-if="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url"
                :src="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url"
                :alt="offer.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
                <Tag class="h-12 w-12 text-teal-400" />
              </div>
              <div class="absolute top-2 right-2">
                <Badge :variant="'accent'" class="shadow-lg">
                  {{ offer.offer_type === 'percentage' ? `${offer.value}% OFF` : `¥${offer.value} OFF` }}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tag } from 'lucide-vue-next';
import Badge from './Badge.vue';

const props = defineProps<{
  offers?: any[];
}>();

const emit = defineEmits<{
  click: [offer: any];
}>();

function handleOfferClick(offer: any) {
  emit('click', offer);
}
</script>

