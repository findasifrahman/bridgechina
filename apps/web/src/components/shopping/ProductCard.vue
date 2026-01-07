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
          <Button
            variant="secondary"
            size="sm"
            class="bg-white/90 hover:bg-white text-slate-900"
            @click.stop="$emit('add-to-cart', product)"
          >
            <ShoppingCart class="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
    <CardBody class="p-4">
      <h3 class="font-semibold text-slate-900 mb-1 line-clamp-2 min-h-[2.5rem]">{{ product.title }}</h3>
      <div v-if="product.totalSold" class="flex items-center gap-3 mb-2 text-xs">
        <p v-if="product.totalSold" class="text-slate-500">{{ formatSales(product.totalSold) }} sold</p>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-teal-600">
          <span v-if="product.priceMin && product.priceMax">
            {{ formatPrice(product.priceMin) }}{{ product.priceMin !== product.priceMax ? ' - ' + formatPrice(product.priceMax) : '' }}
          </span>
          <span v-else-if="product.priceMin">{{ formatPrice(product.priceMin) }}</span>
          <span v-else class="text-slate-500 text-sm">Price on request</span>
        </span>
      </div>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Package, ShoppingCart } from 'lucide-vue-next';
import { Card, CardBody, Button } from '@bridgechina/ui';

const props = defineProps<{
  product: {
    externalId: string;
    title: string;
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    imageUrl?: string;
    sellerName?: string;
  };
  selectedCurrency?: 'CNY' | 'BDT' | 'USD';
  conversionRates?: {
    CNY_TO_BDT?: number;
    CNY_TO_USD?: number;
  };
}>();

defineEmits<{
  click: [product: any];
  'request-buy': [product: any];
  'add-to-cart': [product: any];
}>();

function formatPrice(price: number): string {
  const currency = props.selectedCurrency || 'CNY';
  
  if (currency === 'CNY') {
    return `¥${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (currency === 'BDT') {
    const rate = props.conversionRates?.CNY_TO_BDT || 15; // Fallback rate
    const bdtPrice = price * rate;
    return `৳${bdtPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  if (currency === 'USD') {
    const rate = props.conversionRates?.CNY_TO_USD || 0.14; // Fallback rate
    const usdPrice = price * rate;
    return `$${usdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  return `¥${price}`;
}

function formatSales(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}
</script>

