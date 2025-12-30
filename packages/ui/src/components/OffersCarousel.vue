<template>
  <div v-if="offers.length > 0" class="lg:hidden mb-6">
    <div class="flex items-center justify-between mb-3 px-4">
      <h3 class="text-lg font-semibold text-slate-900">Special Offers</h3>
      <span class="text-xs text-slate-500">{{ offers.length }} offers</span>
    </div>
    <div class="overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-2">
      <div class="flex gap-4">
        <Card
          v-for="offer in offers"
          :key="offer.id"
          class="flex-shrink-0 w-[280px] snap-center cursor-pointer hover:shadow-md transition-shadow"
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
import { useRouter } from 'vue-router';
import { Tag } from 'lucide-vue-next';
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import Badge from './Badge.vue';
import Button from './Button.vue';

const props = defineProps<{
  offers?: any[];
}>();

const router = useRouter();

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

