<template>
  <div class="h-full flex flex-col">
    <!-- Sticky Header -->

    
    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto no-scrollbar">
      <div v-if="loading" class="space-y-4">
        <SkeletonLoader v-for="i in 4" :key="i" class="h-32" />
      </div>
      
      <div v-else-if="displayOffers.length === 0" class="text-center py-8 text-slate-500 text-sm">
        No active offers at the moment
      </div>
      
      <div v-else class="space-y-4">
        <div
          v-for="offer in displayOffers"
          :key="offer.id"
          class="cursor-pointer group"
          @click="handleOfferClick(offer)"
        >
          <!-- Framed Image -->
          <div class="relative bg-white p-3 rounded-xl shadow-lg border-2 border-slate-200 hover:border-teal-400 transition-all duration-300 hover:shadow-xl">
            <div class="relative h-48 md:h-56 bg-slate-200 rounded-lg overflow-hidden">
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
import { ref, watch, computed } from 'vue';
import { Tag } from 'lucide-vue-next';
import Badge from './Badge.vue';
import SkeletonLoader from './SkeletonLoader.vue';

const props = defineProps<{
  offers?: any[];
  loading?: boolean;
}>();

const offers = ref<any[]>([]);

watch(() => props.offers, (newOffers) => {
  if (newOffers) {
    offers.value = newOffers;
  }
}, { immediate: true });

const displayOffers = computed(() => {
  return offers.value.slice(0, 6);
});

const emit = defineEmits<{
  click: [offer: any];
}>();

function handleOfferClick(offer: any) {
  emit('click', offer);
}
</script>

