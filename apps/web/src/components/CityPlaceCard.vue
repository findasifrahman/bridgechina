<template>
  <Card class="group cursor-pointer hover:shadow-lg transition-all h-full flex flex-col" @click="handleClick">
    <div class="relative aspect-video overflow-hidden rounded-t-lg flex-shrink-0 bg-slate-200">
      <img
        v-if="getPlaceImage() && !imageError"
        :src="getPlaceImage()"
        :alt="place.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center">
        <MapPin class="h-12 w-12 text-teal-400" />
      </div>
      <div class="absolute top-2 right-2 flex gap-1">
        <Badge v-if="place.is_family_friendly" variant="success" size="sm">Family</Badge>
        <Badge v-if="place.is_pet_friendly" variant="success" size="sm">Pet</Badge>
      </div>
      <div v-if="place.star_rating" class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1">
        <Star :class="place.star_rating >= 4 ? 'fill-amber-400 text-amber-400' : 'fill-slate-300 text-slate-300'" class="h-4 w-4" />
        <span class="text-sm font-semibold">{{ place.star_rating.toFixed(1) }}</span>
        <span v-if="place.review_count" class="text-xs text-slate-500">({{ place.review_count }})</span>
      </div>
    </div>
    <CardBody class="p-4 flex-1 flex flex-col">
      <h3 class="font-semibold text-base mb-1 line-clamp-1">{{ place.name }}</h3>
      <p v-if="place.short_description" class="text-xs text-slate-600 mb-2 line-clamp-2 flex-1">
        {{ place.short_description }}
      </p>
      <div class="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <MapPin class="h-4 w-4" />
        <span class="line-clamp-1">{{ place.address }}</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span v-if="place.cost_range" class="text-sm font-medium text-teal-600">{{ place.cost_range }}</span>
          <span v-if="place.city" class="text-xs text-slate-400">{{ place.city.name }}</span>
        </div>
        <Button variant="ghost" size="sm" @click="$emit('view', place)">
          View Details
        </Button>
      </div>
      <div v-if="place.tourLinks && place.tourLinks.length > 0" class="mt-2 pt-2 border-t border-slate-200">
        <p class="text-xs text-slate-500 mb-1">Available Tours:</p>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="link in place.tourLinks.slice(0, 2)"
            :key="link.tour.id"
            variant="default"
            size="sm"
            class="text-xs"
          >
            {{ link.tour.name }}
          </Badge>
          <span v-if="place.tourLinks.length > 2" class="text-xs text-slate-400">+{{ place.tourLinks.length - 2 }} more</span>
        </div>
      </div>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MapPin, Star } from 'lucide-vue-next';
import { Card, CardBody, Badge, Button } from '@bridgechina/ui';
import { useRouter } from 'vue-router';

const router = useRouter();
const imageError = ref(false);

const props = defineProps<{
  place: {
    id: string;
    name: string;
    slug?: string;
    short_description?: string;
    address: string;
    star_rating?: number;
    review_count?: number;
    cost_range?: string;
    is_family_friendly: boolean;
    is_pet_friendly: boolean;
    coverAsset?: { public_url: string; thumbnail_url?: string | null };
    galleryAssets?: Array<{ public_url: string; thumbnail_url?: string | null }>;
    images?: Array<{ asset: { public_url: string; thumbnail_url?: string | null } }>;
    city?: { name: string };
    tourLinks?: Array<{ tour: { id: string; name: string } }>;
  };
}>();

function getPlaceImage(): string | null {
  // Try coverAsset thumbnail first
  if (props.place.coverAsset?.thumbnail_url) {
    return props.place.coverAsset.thumbnail_url;
  }
  // Try coverAsset public_url
  if (props.place.coverAsset?.public_url) {
    return props.place.coverAsset.public_url;
  }
  // Try first gallery asset thumbnail
  if (props.place.galleryAssets?.[0]?.thumbnail_url) {
    return props.place.galleryAssets[0].thumbnail_url;
  }
  // Try first gallery asset public_url
  if (props.place.galleryAssets?.[0]?.public_url) {
    return props.place.galleryAssets[0].public_url;
  }
  // Fallback to old images format
  if (props.place.images?.[0]?.asset.thumbnail_url) {
    return props.place.images[0].asset.thumbnail_url;
  }
  if (props.place.images?.[0]?.asset.public_url) {
    return props.place.images[0].asset.public_url;
  }
  return null;
}

function getImageUrl(asset: { public_url: string; thumbnail_url?: string | null }): string {
  // Use thumbnail if available for faster loading, fallback to full image
  if (asset.thumbnail_url) {
    return asset.thumbnail_url;
  }
  return asset.public_url;
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  // If thumbnail failed, try full image
  if (img.src.includes('thumbnail')) {
    // Try coverAsset public_url
    if (props.place.coverAsset?.public_url) {
      img.src = props.place.coverAsset.public_url;
      imageError.value = false;
      return;
    }
    // Try first gallery asset
    if (props.place.galleryAssets?.[0]?.public_url) {
      img.src = props.place.galleryAssets[0].public_url;
      imageError.value = false;
      return;
    }
    // Try old images format
    if (props.place.images?.[0]?.asset.public_url) {
      img.src = props.place.images[0].asset.public_url;
      imageError.value = false;
      return;
    }
  }
  imageError.value = true;
}

function handleClick() {
  if (props.place.slug) {
    router.push(`/places/${props.place.slug}`);
  } else {
    router.push(`/places/${props.place.id}`);
  }
}

defineEmits<{
  view: [place: any];
}>();
</script>

