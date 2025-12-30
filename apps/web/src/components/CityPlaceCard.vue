<template>
  <Card class="group cursor-pointer hover:shadow-2xl transition-all duration-300 h-full flex flex-col border-2 border-slate-200 hover:border-teal-400 overflow-hidden" @click="handleClick">
    <div class="relative aspect-[4/3] overflow-hidden flex-shrink-0 bg-gradient-to-br from-teal-100 via-blue-100 to-purple-100">
      <img
        v-if="getPlaceImage() && !imageError"
        :src="getPlaceImage()"
        :alt="place.name"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-teal-200 via-blue-200 to-purple-200 flex items-center justify-center">
        <MapPin class="h-16 w-16 text-teal-500" />
      </div>
      
      <!-- Overlay Gradient -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <!-- Badges -->
      <div class="absolute top-3 right-3 flex flex-col gap-2">
        <Badge v-if="place.is_family_friendly" variant="success" size="sm" class="shadow-lg backdrop-blur-sm bg-green-500/90">
          👨‍👩‍👧 Family
        </Badge>
        <Badge v-if="place.is_pet_friendly" variant="success" size="sm" class="shadow-lg backdrop-blur-sm bg-green-500/90">
          🐾 Pet Friendly
        </Badge>
      </div>
      
      <!-- Rating Badge -->
      <div v-if="place.star_rating" class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg border border-amber-200">
        <Star :class="place.star_rating >= 4 ? 'fill-amber-400 text-amber-400' : 'fill-slate-300 text-slate-300'" class="h-4 w-4" />
        <span class="text-sm font-bold text-slate-900">{{ place.star_rating.toFixed(1) }}</span>
        <span v-if="place.review_count" class="text-xs text-slate-600">({{ place.review_count }})</span>
      </div>
    </div>
    
    <CardBody class="p-5 flex-1 flex flex-col bg-white">
      <h3 class="font-bold text-lg mb-2 line-clamp-2 text-slate-900 group-hover:text-teal-600 transition-colors">
        {{ place.name }}
      </h3>
      <p v-if="place.short_description" class="text-sm text-slate-600 mb-3 line-clamp-3 flex-1 leading-relaxed">
        {{ place.short_description }}
      </p>
      
      <div class="flex items-start gap-2 text-sm text-slate-600 mb-3 bg-slate-50 rounded-lg p-2">
        <MapPin class="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
        <span class="line-clamp-2 text-xs">{{ place.address }}</span>
      </div>
      
      <div class="flex items-center justify-between mb-3 pt-2 border-t border-slate-200">
        <div class="flex flex-col gap-1">
          <span v-if="place.cost_range" class="text-base font-bold text-teal-600">{{ place.cost_range }}</span>
          <span v-if="place.city" class="text-xs text-slate-500 flex items-center gap-1">
            <MapPin class="h-3 w-3" />
            {{ place.city.name }}
          </span>
        </div>
        <Button variant="primary" size="sm" class="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 shadow-md">
          Explore →
        </Button>
      </div>
      
      <div v-if="place.tourLinks && place.tourLinks.length > 0" class="mt-2 pt-3 border-t border-slate-200">
        <p class="text-xs font-semibold text-slate-700 mb-2">Available Tours:</p>
        <div class="flex flex-wrap gap-1.5">
          <Badge
            v-for="link in place.tourLinks.slice(0, 2)"
            :key="link.tour.id"
            variant="secondary"
            size="sm"
            class="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            {{ link.tour.name }}
          </Badge>
          <span v-if="place.tourLinks.length > 2" class="text-xs text-slate-500 self-center">+{{ place.tourLinks.length - 2 }} more</span>
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

