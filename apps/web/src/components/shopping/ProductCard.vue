<template>
  <Card
    class="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-slate-200"
    @click="$emit('click', product)"
  >
    <div class="relative aspect-square overflow-hidden bg-slate-100">
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.title"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
        <Package class="h-16 w-16" />
      </div>
      <!-- Hover Actions -->
      <div class="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
        <div class="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            class="bg-teal/90 hover:bg-white text-slate-900"
            @click.stop="$emit('click', product)"
          >
            View
          </Button>
        </div>
      </div>
    </div>
    <CardBody class="p-4">
      <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2 min-h-[2.5rem]">{{ product.title }}</h3>
      <p v-if="product.sellerName" class="text-xs text-slate-500 mb-2">{{ product.sellerName }}</p>
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-teal-600">
          <span v-if="product.priceMin && product.priceMax">
            ¥{{ product.priceMin }}{{ product.priceMin !== product.priceMax ? ' - ¥' + product.priceMax : '' }}
          </span>
          <span v-else-if="product.priceMin">¥{{ product.priceMin }}</span>
          <span v-else class="text-slate-500 text-sm">Price on request</span>
        </span>
      </div>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next';
import { Card, CardBody, Button } from '@bridgechina/ui';

defineProps<{
  product: {
    externalId: string;
    title: string;
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    imageUrl?: string;
    sellerName?: string;
  };
}>();

defineEmits<{
  click: [product: any];
  'request-buy': [product: any];
}>();
</script>

