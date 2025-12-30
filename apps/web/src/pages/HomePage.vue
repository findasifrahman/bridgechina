<template>
  <div class="bg-slate-50 min-h-screen">
    <!-- Offer Strip -->
    <OfferStrip :offer="spotlightOffer" />

    <!-- Top Area: Search + Tabs + Results -->
    <section class="bg-white border-b border-slate-200 py-6">
      <div class="px-4 sm:px-6 lg:px-8">
        <!-- Title and Subtitle -->
        <div class="mb-4">
          <h1 class="text-xl font-bold text-slate-900 mb-1">Find everything you need in China</h1>
          <p class="text-sm text-slate-600">Hotels, transport, food, medical help, eSIM, and more</p>
        </div>

        <!-- Universal Search Bar -->
        <div class="mb-4">
          <AiSearchBar
            placeholder="Search hotels, places, guides, eSIM plans…"
            @search="handleSearch"
            @select="handleSearchSelect"
          />
        </div>

        <!-- Tabs Row -->
        <Tabs v-model="activeTab" :tabs="tabOptions" class="mb-4" />

        <!-- Tab Content: Top 4 Entries -->
        <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonLoader v-for="i in 4" :key="i" class="h-48" />
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Hotels Tab -->
          <template v-if="activeTab === 'hotels'">
            <CompactCard
              v-for="item in getFeaturedItemsForTab('hotels')"
              :key="item.id"
              :item="item.entity"
              :title="item.title_override || item.entity?.name || 'N/A'"
              :subtitle="item.subtitle_override || item.entity?.city?.name"
              :thumbnail="item.entity?.coverAsset?.thumbnail_url || item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
              :rating="item.entity?.rating"
              :price="item.entity?.price_from ? `¥${item.entity.price_from}` : undefined"
              :meta="item.entity?.city?.name"
              :badge="'Featured'"
              @click="handleFeaturedItemClick(item)"
            />
          </template>

          <!-- Pickup Tab -->
          <template v-if="activeTab === 'pickup'">
            <Card
              v-for="option in transportOptions"
              :key="option.id"
              class="cursor-pointer"
              :hover="true"
              @click="handleTransportClick(option)"
            >
              <CardBody class="p-4 text-center">
                <component :is="option.icon" class="h-12 w-12 mx-auto mb-3 text-teal-600" />
                <h3 class="font-semibold text-sm mb-2">{{ option.name }}</h3>
                <p class="text-xs text-slate-600 mb-3">{{ option.description }}</p>
                <Button variant="primary" size="sm" class="w-full">Request</Button>
              </CardBody>
            </Card>
          </template>

          <!-- Restaurants Tab -->
          <template v-if="activeTab === 'restaurants'">
            <CompactCard
              v-for="item in getFeaturedItemsForTab('restaurants')"
              :key="item.id"
              :item="item.entity"
              :title="item.title_override || item.entity?.name || 'N/A'"
              :subtitle="item.subtitle_override || item.entity?.city?.name"
              :thumbnail="item.entity?.coverAsset?.thumbnail_url || item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
              :rating="item.entity?.rating"
              :price="item.entity?.price_from ? `¥${item.entity.price_from}` : undefined"
              :meta="item.entity?.city?.name"
              :badge="item.entity?.halal_verified ? 'Halal Verified' : undefined"
              @click="handleFeaturedItemClick(item)"
            />
          </template>

          <!-- Halal Food Tab -->
          <template v-if="activeTab === 'halal-food'">
            <CompactCard
              v-for="item in getFeaturedItemsForTab('halal-food')"
              :key="item.id"
              :item="item.entity"
              :title="item.title_override || item.entity?.name || 'N/A'"
              :subtitle="item.subtitle_override || item.entity?.restaurant?.name"
              :thumbnail="item.entity?.coverAsset?.thumbnail_url || item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
              :price="`¥${item.entity?.price || 'N/A'}`"
              :meta="item.entity?.restaurant?.name"
              :badge="item.entity?.is_halal ? 'Halal' : undefined"
              @click="handleFeaturedItemClick(item)"
            />
          </template>

          <!-- eSIM Tab -->
          <template v-if="activeTab === 'esim'">
            <CompactCard
              v-for="item in getFeaturedItemsForTab('esim')"
              :key="item.id"
              :item="item.entity"
              :title="item.title_override || item.entity?.name || 'N/A'"
              :subtitle="item.subtitle_override || item.entity?.region_text"
              :thumbnail="item.entity?.coverAsset?.thumbnail_url || item.entity?.coverAsset?.public_url"
              :price="`¥${item.entity?.price || 'N/A'}`"
              :meta="`${item.entity?.data_text || ''} • ${item.entity?.validity_days || ''} days`"
              :badge="item.entity?.number_available ? 'With Number' : undefined"
              @click="handleFeaturedItemClick(item)"
            />
          </template>

          <!-- Places Tab -->
          <template v-if="activeTab === 'places'">
            <CompactCard
              v-for="item in getFeaturedItemsForTab('places')"
              :key="item.id"
              :item="item.entity"
              :title="item.title_override || item.entity?.name || 'N/A'"
              :subtitle="item.subtitle_override || item.entity?.short_description"
              :thumbnail="item.entity?.coverAsset?.thumbnail_url || item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
              :rating="item.entity?.star_rating"
              :meta="item.entity?.city?.name"
              :tags="getPlaceTags(item.entity)"
              @click="handleFeaturedItemClick(item)"
            />
          </template>

          <!-- Shopping Tab -->
          <template v-if="activeTab === 'shopping'">
            <ProductCard
              v-for="product in hotProducts"
              :key="product.externalId"
              :product="product"
              @click="handleShoppingProductClick(product)"
              @request-buy="handleShoppingRequestBuy(product)"
            />
          </template>
        </div>
      </div>
    </section>

    <!-- Holiday Banner Carousel -->
    <section v-if="holidayBanners.length > 0" class="py-6 bg-white border-b border-slate-200">
      <div class="px-4 sm:px-6 lg:px-8">
        <Carousel :items="holidayBanners" :autoplay="true" :show-dots="true" :show-controls="true">
          <template #default="{ item }">
            <div class="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-slate-100">
              <!-- Background Image or Gradient -->
              <img
                v-if="item.coverAsset?.public_url || item.coverAsset?.thumbnail_url"
                :src="item.coverAsset?.public_url || item.coverAsset?.thumbnail_url"
                :alt="item.title"
                class="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div
                v-else
                class="absolute inset-0 bg-gradient-to-r from-teal-500 to-amber-400"
              ></div>
              
              <!-- Content Overlay -->
              <div class="absolute inset-0 flex items-center justify-center p-8">
                <div class="text-center text-white">
                  <h2 class="text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">{{ item.title }}</h2>
                  <p v-if="item.subtitle" class="text-lg mb-4 drop-shadow-md">{{ item.subtitle }}</p>
                  <Button
                    v-if="item.cta_text || item.link"
                    variant="accent"
                    @click="item.link ? router.push(item.link) : null"
                  >
                    {{ item.cta_text || 'Learn More' }}
                  </Button>
                </div>
              </div>
            </div>
          </template>
        </Carousel>
      </div>
    </section>

    <!-- Hotel Booking Bar -->
    <section class="py-6 bg-teal-50 border-b border-slate-200">
      <div class="px-4 sm:px-6 lg:px-8">
        <Card class="p-4">
          <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1 w-full md:w-auto">
              <label class="block text-xs font-medium text-slate-700 mb-1">Destination / Hotel</label>
              <Input
                v-model="bookingForm.destination"
                placeholder="City or hotel name"
                class="w-full"
              />
            </div>
            <div class="flex-1 w-full md:w-auto">
              <label class="block text-xs font-medium text-slate-700 mb-1">Check-in</label>
              <Input
                v-model="bookingForm.checkIn"
                type="date"
                class="w-full"
              />
            </div>
            <div class="flex-1 w-full md:w-auto">
              <label class="block text-xs font-medium text-slate-700 mb-1">Check-out</label>
              <Input
                v-model="bookingForm.checkOut"
                type="date"
                class="w-full"
              />
            </div>
            <div class="w-full md:w-48">
              <label class="block text-xs font-medium text-slate-700 mb-1">Rooms & Guests</label>
              <Select
                v-model="bookingForm.roomsGuests"
                :options="roomsGuestsOptions"
                class="w-full"
              />
            </div>
            <Button variant="primary" @click="handleHotelSearch" class="w-full md:w-auto">
              <Search class="h-4 w-4 mr-2" />
              Search Hotels
            </Button>
          </div>
        </Card>
      </div>
    </section>

    <!-- Featured Items Sections by Type -->
    <div class="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Top Hotels -->
      <section v-if="featuredItemsByType.hotels.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Top Hotels</h2>
          <p class="text-sm text-slate-600">Top recommended accommodations</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.hotels"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :rating="item.entity?.rating"
            :price="item.entity?.price_from ? `¥${item.entity.price_from}` : undefined"
            :meta="item.entity?.city?.name"
            :badge="'Featured'"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Popular Restaurants -->
      <section v-if="featuredItemsByType.restaurants.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Popular Restaurants</h2>
          <p class="text-sm text-slate-600">Best halal dining experiences</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.restaurants"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :rating="item.entity?.rating"
            :meta="item.entity?.city?.name"
            :badge="item.entity?.halal_verified ? 'Halal' : undefined"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Top Halal Food Items -->
      <section v-if="featuredItemsByType.food_items.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Top Halal Food Items</h2>
          <p class="text-sm text-slate-600">Popular dishes and meals</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.food_items"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :price="`¥${item.entity?.price || 'N/A'}`"
            :meta="item.entity?.restaurant?.name"
            :badge="item.entity?.is_halal ? 'Halal' : undefined"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Top eSIM Plans -->
      <section v-if="featuredItemsByType.esim_plans.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Top eSIM Plans</h2>
          <p class="text-sm text-slate-600">Best data plans for travelers</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.esim_plans"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url"
            :price="`¥${item.entity?.price || 'N/A'}`"
            :meta="`${item.entity?.data_text || ''} • ${item.entity?.validity_days || ''} days`"
            :badge="item.entity?.number_available ? 'With Number' : undefined"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Must-Visit Places -->
      <section v-if="featuredItemsByType.cityplaces.length > 0">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900 mb-1">Must-Visit Places</h2>
            <p class="text-xs text-slate-600">Top attractions and landmarks</p>
          </div>
          <Button variant="ghost" size="sm" @click="router.push('/places')" class="text-sm">
            View All →
          </Button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.cityplaces"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :rating="item.entity?.star_rating"
            :meta="item.entity?.city?.name"
            :badge="'Featured'"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Featured Tours -->
      <section v-if="featuredItemsByType.tours.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Featured Tours</h2>
          <p class="text-sm text-slate-600">Curated travel experiences</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.tours"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :price="item.entity?.price_from ? `¥${item.entity.price_from}` : undefined"
            :meta="item.entity?.city?.name"
            :badge="'Featured'"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Top Shopping Picks -->
      <section v-if="featuredItemsByType.products.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Top Shopping Picks</h2>
          <p class="text-sm text-slate-600">Popular shopping items</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.products"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.title || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :price="`¥${item.entity?.price || 'N/A'}`"
            :meta="item.entity?.category?.name"
            :badge="'Featured'"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>

      <!-- Featured Transport -->
      <section v-if="featuredItemsByType.transport.length > 0">
        <div class="mb-4">
          <h2 class="text-xl font-bold text-slate-900 mb-1">Featured Transport</h2>
          <p class="text-sm text-slate-600">Reliable transportation options</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CompactCard
            v-for="item in featuredItemsByType.transport"
            :key="item.id"
            :item="item.entity"
            :title="item.title_override || item.entity?.name || item.entity?.type || 'N/A'"
            :subtitle="item.subtitle_override || getFeaturedSubtitle(item)"
            :thumbnail="item.entity?.coverAsset?.public_url || item.entity?.galleryAssets?.[0]?.public_url"
            :price="item.entity?.base_price ? `¥${item.entity.base_price}` : undefined"
            :meta="item.entity?.city?.name"
            :badge="'Featured'"
            @click="handleFeaturedItemClick(item)"
          />
        </div>
      </section>
    </div>

    <!-- Full Width Sections -->
    <!-- Removed duplicate sections: Must-Visit Places, Top Hotels, Top eSIM Plans are already shown above in Featured Items Sections -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Car, MapPin, Calendar } from 'lucide-vue-next';
import {
  OfferStrip,
  AiSearchBar,
  Tabs,
  Carousel,
  Card,
  CardBody,
  Button,
  Input,
  Select,
  CompactCard,
  SkeletonLoader,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import ProductCard from '@/components/shopping/ProductCard.vue';

const router = useRouter();

const spotlightOffer = ref<any>(null);
const currentCity = ref<any>(null);
const activeTab = ref('hotels');
const loading = ref(true);

const topHotels = ref<any[]>([]);
const topCityPlaces = ref<any[]>([]);
const topEsimPlans = ref<any[]>([]);
const topProducts = ref<any[]>([]);
const topRestaurants = ref<any[]>([]);
const featuredCards = ref<any[]>([]);
const featuredItems = ref<any[]>([]);
const hotProducts = ref<any[]>([]); // TMAPI hot products for shopping tab
const featuredItemsByType = ref<any>({
  hotels: [],
  restaurants: [],
  food_items: [],
  esim_plans: [],
  cityplaces: [],
  tours: [],
  products: [],
  transport: [],
});

const bookingForm = ref({
  destination: '',
  checkIn: '',
  checkOut: '',
  roomsGuests: '1 room, 2 guests',
});

const roomsGuestsOptions = [
  { value: '1 room, 2 guests', label: '1 room, 2 guests' },
  { value: '1 room, 1 guest', label: '1 room, 1 guest' },
  { value: '2 rooms, 4 guests', label: '2 rooms, 4 guests' },
  { value: '2 rooms, 2 guests', label: '2 rooms, 2 guests' },
];

const tabOptions = [
  { value: 'hotels', label: 'Hotels' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'halal-food', label: 'Halal Food' },
  { value: 'esim', label: 'eSIM' },
  { value: 'places', label: 'Places' },
  { value: 'shopping', label: 'Shopping' },
];

const transportOptions = [
  {
    id: 'airport-pickup',
    name: 'Airport Pickup',
    description: 'Safe and reliable airport transfers',
    icon: Car,
  },
  {
    id: 'point-to-point',
    name: 'Point to Point',
    description: 'Direct transfers between locations',
    icon: MapPin,
  },
  {
    id: 'charter',
    name: 'Full Day Charter',
    description: 'Rent a car with driver for the day',
    icon: Calendar,
  },
  {
    id: 'day-trip',
    name: 'Day Trip',
    description: 'Guided day trips to nearby attractions',
    icon: MapPin,
  },
];

const holidayBanners = ref<any[]>([]);

async function loadBanners() {
  try {
    const response = await axios.get('/api/public/banners');
    if (response.data && response.data.length > 0) {
      holidayBanners.value = response.data;
    } else {
      // Fallback to default banners if none in database
      holidayBanners.value = [
        {
          id: 'new-year',
          title: 'Happy New Year!',
          subtitle: 'Special discounts on all services',
          link: '/services',
          cta_text: 'Explore Offers',
        },
        {
          id: 'eid',
          title: 'Eid Mubarak!',
          subtitle: 'Halal food delivery specials',
          link: '/services/halal-food',
          cta_text: 'Order Now',
        },
        {
          id: 'canton-fair',
          title: 'Canton Fair 2024',
          subtitle: 'Exclusive transport and accommodation packages',
          link: '/services',
          cta_text: 'Learn More',
        },
      ];
    }
  } catch (error) {
    console.error('Failed to load banners:', error);
    // Fallback to default banners on error
    holidayBanners.value = [
      {
        id: 'new-year',
        title: 'Happy New Year!',
        subtitle: 'Special discounts on all services',
        link: '/services',
        cta_text: 'Explore Offers',
      },
    ];
  }
}

function getPlaceTags(place: any): string[] {
  const tags: string[] = [];
  if (place.is_family_friendly) tags.push('Family');
  if (place.is_pet_friendly) tags.push('Pet Friendly');
  return tags;
}

async function loadHomepageData() {
  loading.value = true;
  try {
    const citySlug = currentCity.value?.slug || 'guangzhou';
    const [homeResponse, offersResponse] = await Promise.all([
      axios.get(`/api/public/home?city_slug=${citySlug}`),
      axios.get('/api/public/offers').catch(() => ({ data: [] })), // Don't fail if offers endpoint fails
    ]);
    
    topHotels.value = homeResponse.data.top_hotels || [];
    topCityPlaces.value = homeResponse.data.top_city_places || [];
    topEsimPlans.value = homeResponse.data.top_esim_plans || [];
    topProducts.value = homeResponse.data.top_products || [];
    topRestaurants.value = homeResponse.data.top_restaurants || [];
    featuredCards.value = homeResponse.data.featured_cards || [];
    featuredItems.value = homeResponse.data.featured_items || [];
    featuredItemsByType.value = homeResponse.data.featured_items_by_type || {
      hotels: [],
      restaurants: [],
      food_items: [],
      esim_plans: [],
      cityplaces: [],
      tours: [],
      products: [],
      transport: [],
    };
    currentCity.value = homeResponse.data.city;
    
    // Set spotlight offer (first active offer)
    const offers = offersResponse.data || [];
    spotlightOffer.value = offers.length > 0 ? offers[0] : null;
  } catch (error) {
    console.error('Failed to load homepage data', error);
  } finally {
    loading.value = false;
  }
}

function handleSearch(query: string) {
  // Search is handled by AiSearchBar component
}

function handleSearchSelect(suggestion: any) {
  router.push(suggestion.action || '/services');
}

function handleTransportClick(option: any) {
  router.push({
    path: '/request',
    query: { category: 'transport', type: option.id },
  });
}

function handleHotelSearch() {
  router.push({
    path: '/services/hotel',
    query: {
      destination: bookingForm.value.destination,
      checkin: bookingForm.value.checkIn,
      checkout: bookingForm.value.checkOut,
    },
  });
}

function getFeaturedSubtitle(item: any): string {
  if (!item.entity) return '';
  switch (item.entity_type) {
    case 'hotel':
      return `${item.entity.city?.name || ''} • ¥${item.entity.price_from || 'N/A'}`;
    case 'restaurant':
      return `${item.entity.city?.name || ''} • ${item.entity.cuisine_type || ''}`;
    case 'food_item':
      return `${item.entity.restaurant?.name || ''} • ¥${item.entity.price || 'N/A'}`;
    case 'cityplace':
      return `${item.entity.city?.name || ''}`;
    case 'tour':
      return `${item.entity.city?.name || ''} • ¥${item.entity.price_from || 'N/A'}`;
    case 'esim_plan':
      return `${item.entity.data_text || ''} • ¥${item.entity.price || 'N/A'}`;
    case 'product':
      return `${item.entity.category?.name || ''} • ¥${item.entity.price || 'N/A'}`;
    default:
      return '';
  }
}

function getFeaturedPrice(item: any): string | undefined {
  if (!item.entity) return undefined;
  switch (item.entity_type) {
    case 'hotel':
      return item.entity.price_from ? `¥${item.entity.price_from}` : undefined;
    case 'food_item':
      return `¥${item.entity.price || 'N/A'}`;
    case 'tour':
      return item.entity.price_from ? `¥${item.entity.price_from}` : undefined;
    case 'esim_plan':
      return `¥${item.entity.price || 'N/A'}`;
    case 'product':
      return `¥${item.entity.price || 'N/A'}`;
    default:
      return undefined;
  }
}

function getFeaturedMeta(item: any): string | undefined {
  if (!item.entity) return undefined;
  switch (item.entity_type) {
    case 'hotel':
      return item.entity.city?.name;
    case 'restaurant':
      return item.entity.city?.name;
    case 'food_item':
      return item.entity.restaurant?.name;
    case 'cityplace':
      return item.entity.city?.name;
    case 'tour':
      return item.entity.city?.name;
    case 'product':
      return item.entity.category?.name;
    default:
      return undefined;
  }
}

async function loadHotProducts() {
  try {
    const response = await axios.get('/api/public/shopping/hot', {
      params: {
        page: 1,
        pageSize: 4, // Show 4 products in homepage tab
      },
    });
    hotProducts.value = response.data || [];
  } catch (error) {
    console.error('Failed to load hot products:', error);
    hotProducts.value = [];
  }
}

function handleShoppingProductClick(product: any) {
  router.push(`/shopping/tmapi/${product.externalId}`);
}

function handleShoppingRequestBuy(product: any) {
  router.push({
    path: '/request',
    query: {
      category: 'shopping',
      external_id: product.externalId,
      title: product.title,
      image_url: product.imageUrl,
      source_url: product.sourceUrl,
      price_min: product.priceMin,
      price_max: product.priceMax,
    },
  });
}

function getFeaturedItemsForTab(tabValue: string): any[] {
  const typeMap: Record<string, keyof typeof featuredItemsByType.value> = {
    'hotels': 'hotels',
    'restaurants': 'restaurants',
    'halal-food': 'food_items',
    'esim': 'esim_plans',
    'places': 'cityplaces',
    'shopping': 'products',
  };
  const key = typeMap[tabValue];
  if (!key) return [];
  const items = featuredItemsByType.value[key] || [];
  return items.slice(0, 4); // Max 4 items per tab
}

function handleFeaturedItemClick(item: any) {
  if (!item.entity) return;
  switch (item.entity_type) {
    case 'hotel':
      router.push('/services/hotel');
      break;
    case 'restaurant':
      router.push('/services/halal-food');
      break;
    case 'food_item':
      router.push(`/services/halal-food`);
      break;
    case 'cityplace':
      router.push(`/places/${item.entity.id}`);
      break;
    case 'tour':
      router.push(`/services/tours`);
      break;
    case 'esim_plan':
      router.push('/services/esim');
      break;
    case 'product':
      router.push(`/shopping/${item.entity.id}`);
      break;
    case 'transport':
      router.push('/services/transport');
      break;
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'shopping' && hotProducts.value.length === 0) {
    loadHotProducts();
  }
});

onMounted(() => {
  loadHomepageData();
  loadBanners();
  // Load hot products if shopping tab is initially selected
  if (activeTab.value === 'shopping') {
    loadHotProducts();
  }
});
</script>
