<template>
  <Card
    class="group cursor-pointer overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(15,23,42,0.12)]"
    @click="$emit('click', product)"
  >
    <div class="relative aspect-square overflow-hidden bg-slate-100">
      <img
        v-if="imageSrc && !imageFailed"
        :src="imageSrc"
        :alt="product.title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        @error="imageFailed = true"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
        <Package class="h-14 w-14" />
      </div>
      <div class="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors hover:bg-black/10 hover:opacity-100">
        <div class="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            class="rounded-full bg-white/95 px-3 text-[12px] text-black shadow-lg hover:bg-white"
            @click.stop="$emit('click', product)"
          >
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            class="rounded-full bg-slate-900/90 px-3 text-[12px] text-black shadow-lg hover:bg-slate-900"
            @click.stop="$emit('add-to-cart', product)"
          >
            <ShoppingCart class="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      </div>
    </div>

    <CardBody class="p-4">
      <h3 class="mb-1 min-h-[2.2rem] text-[13px] font-semibold leading-5 text-slate-900 line-clamp-2">{{ product.title }}</h3>
      <div v-if="product.totalSold" class="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
        {{ formatSales(product.totalSold) }} sold
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[15px] font-black text-rose-500">
          <span v-if="product.priceMin && product.priceMax">
            {{ formatPrice(product.priceMin) }}{{ product.priceMin !== product.priceMax ? ' - ' + formatPrice(product.priceMax) : '' }}
          </span>
          <span v-else-if="product.priceMin">{{ formatPrice(product.priceMin) }}</span>
          <span v-else class="text-[12px] text-slate-500">Price on request</span>
        </span>
        <span v-if="product.totalSold" class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
          {{ formatSales(product.totalSold) }} sold
        </span>
      </div>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
    images?: string[];
    sellerName?: string;
    totalSold?: number;
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

function isRenderableImageUrl(url: string): boolean {
  const text = String(url || '').trim();
  if (!text) return false;
  if (text.startsWith('/api/public/image-proxy')) return true;
  if (text.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(text);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function shouldProxyImageUrl(url: string): boolean {
  const text = String(url || '').trim();
  if (!text) return false;
  if (text.startsWith('/api/public/image-proxy')) return false;
  if (text.startsWith('/')) return false;
  if (text.startsWith('data:image/') || text.startsWith('blob:')) return false;
  try {
    const parsed = new URL(text);
    const host = parsed.hostname.toLowerCase();
    return ['alicdn.com', '1688.com', 'detail.1688.com'].some((domain) => {
      const normalized = domain.toLowerCase();
      return host === normalized || host.endsWith(`.${normalized}`) || host.includes(normalized);
    });
  } catch {
    return false;
  }
}

function collectImageCandidates(input: any): string[] {
  if (!input) return [];
  if (typeof input === 'string') return [input];
  if (Array.isArray(input)) return input.flatMap((item) => collectImageCandidates(item));
  if (typeof input !== 'object') return [];

  const keys = ['imageUrl', 'image_url', 'publicUrl', 'public_url', 'thumbnail_url', 'thumbnailUrl', 'url', 'src', 'mainImage', 'mainImageUrl'];
  const values: string[] = [];
  for (const key of keys) {
    if (key in input) values.push(...collectImageCandidates(input[key]));
  }
  return values;
}

function proxyImageUrl(url: string): string {
  const text = String(url || '').trim();
  if (!text) return '';
  if (text.startsWith('/api/public/image-proxy')) return text;
  if (text.startsWith('data:image/')) return text;
  if (!shouldProxyImageUrl(text)) return text;
  try {
    const parsed = new URL(text);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `/api/public/image-proxy?url=${encodeURIComponent(text)}`;
    }
  } catch {
    return text;
  }
  return text;
}

function pickBestImage(product: any): string {
  const sources = [
    ...collectImageCandidates(product?.imageUrl),
    ...collectImageCandidates(product?.images),
  ]
    .map((img) => String(img || '').trim())
    .filter(Boolean);

  const renderable = sources.find(isRenderableImageUrl);
  return proxyImageUrl(renderable || sources[0] || '');
}

const imageSrc = computed(() => pickBestImage(props.product));
const imageFailed = ref(false);

watch(imageSrc, () => {
  imageFailed.value = false;
});

function formatPrice(price: number): string {
  const currency = props.selectedCurrency || 'CNY';

  if (currency === 'CNY') {
    return `CNY ${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  if (currency === 'BDT') {
    const rate = props.conversionRates?.CNY_TO_BDT || 15;
    const bdtPrice = price * rate;
    return `BDT ${bdtPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  if (currency === 'USD') {
    const rate = props.conversionRates?.CNY_TO_USD || 0.14;
    const usdPrice = price * rate;
    return `USD ${usdPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `CNY ${price}`;
}

function formatSales(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}
</script>
