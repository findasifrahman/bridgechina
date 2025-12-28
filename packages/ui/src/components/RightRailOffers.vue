<template>
  <div class="h-full flex flex-col">
    <!-- Sticky Header -->
    <div class="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 pb-4 mb-4 z-10">
      <h3 class="text-lg font-semibold text-slate-900">Special Offers</h3>
    </div>
    
    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto no-scrollbar">
      <div v-if="loading" class="space-y-4">
        <SkeletonLoader v-for="i in 4" :key="i" class="h-32" />
      </div>
      
      <div v-else-if="displayOffers.length === 0" class="text-center py-8 text-slate-500 text-sm">
        No active offers at the moment
      </div>
      
      <div v-else class="space-y-4">
        <Card
          v-for="offer in displayOffers"
          :key="offer.id"
          class="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          @click="handleOfferClick(offer)"
        >
          <div class="relative h-32 bg-slate-200">
            <img
              v-if="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url"
              :src="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url"
              :alt="offer.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
              <Tag class="h-8 w-8 text-teal-400" />
            </div>
            <div class="absolute top-2 right-2">
              <Badge :variant="'accent'">
                {{ offer.offer_type === 'percentage' ? `${offer.value}% OFF` : `¥${offer.value} OFF` }}
              </Badge>
            </div>
          </div>
          <CardBody class="p-4">
            <h4 class="font-semibold text-sm text-slate-900 mb-1 line-clamp-2">{{ offer.title }}</h4>
            <p v-if="offer.description" class="text-xs text-slate-600 mb-3 line-clamp-2">{{ offer.description }}</p>
            <Button variant="primary" size="sm" full-width @click.stop="handleOfferClick(offer)">
              View Offer
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Tag } from 'lucide-vue-next';
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import Badge from './Badge.vue';
import Button from './Button.vue';
import SkeletonLoader from './SkeletonLoader.vue';

const props = defineProps<{
  offers?: any[];
  loading?: boolean;
}>();

const router = useRouter();
const offers = ref<any[]>([]);

watch(() => props.offers, (newOffers) => {
  if (newOffers) {
    offers.value = newOffers;
  }
}, { immediate: true });

const displayOffers = computed(() => {
  return offers.value.slice(0, 6);
});

function handleOfferClick(offer: any) {
  router.push({
    path: '/request',
    query: {
      offer_id: offer.id,
      service_type: offer.service_type,
    },
  });
}
</script>

