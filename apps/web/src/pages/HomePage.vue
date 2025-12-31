<template>
  <div class="bg-slate-50 min-h-screen">
    <!-- Offer Strip -->
    <OfferStrip :offer="spotlightOffer" @click="handleOfferClick" />

    <!-- Top Area: Search + Tabs + Results -->
    <section class="bg-white border-b border-slate-200 py-6">
      <div class="px-4 sm:px-6 lg:px-8">
        <!-- Title and Subtitle -->
        <div class="mb-4">
          <h1 class="text-xl font-bold bg-gradient-to-r from-teal-600 to-amber-500 bg-clip-text text-transparent mb-1">Find everything you need in China</h1>
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

          <!-- Transport Tab -->
          <template v-if="activeTab === 'transport'">
            <CompactCard
              v-for="transport in transportServices.slice(0, 4)"
              :key="transport.id"
              :item="transport"
              :title="transport.name || transport.type || 'Transport Service'"
              :subtitle="transport.city?.name"
              :thumbnail="transport.coverAsset?.thumbnail_url || transport.coverAsset?.public_url"
              :price="transport.price_per_km ? `¥${transport.price_per_km}/km` : undefined"
              :meta="transport.city?.name"
              :badge="transport.verified ? 'Verified' : undefined"
              @click="router.push(`/services/transport/${transport.id}`)"
            />
            <Card
              v-if="transportServices.length === 0"
              class="cursor-pointer col-span-full"
              :hover="true"
              @click="router.push('/services/transport')"
            >
              <CardBody class="p-6 text-center">
                <Car class="h-16 w-16 mx-auto mb-4 text-teal-600" />
                <h3 class="font-semibold text-lg mb-2">View All Transport Services</h3>
                <p class="text-sm text-slate-600 mb-4">Browse our complete selection of transportation options</p>
                <Button variant="primary" @click.stop="router.push('/services/transport')">View All</Button>
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

          <!-- Medical Tab -->
          <template v-if="activeTab === 'medical'">
            <CompactCard
              v-for="center in medicalCenters.slice(0, 4)"
              :key="center.id"
              :item="center"
              :title="center.name"
              :subtitle="center.city?.name"
              :thumbnail="center.coverAsset?.thumbnail_url || center.coverAsset?.public_url"
              :meta="center.type"
              :badge="center.verified ? 'Verified' : undefined"
              @click="router.push(`/services/medical/${center.id}`)"
            />
            <Card
              v-if="medicalCenters.length === 0"
              class="cursor-pointer col-span-full"
              :hover="true"
              @click="router.push('/services/medical')"
            >
              <CardBody class="p-6 text-center">
                <HeartPulse class="h-16 w-16 mx-auto mb-4 text-red-600" />
                <h3 class="font-semibold text-lg mb-2">View All Medical Centers</h3>
                <p class="text-sm text-slate-600 mb-4">Browse our complete selection of medical services</p>
                <Button variant="primary" @click.stop="router.push('/services/medical')">View All</Button>
              </CardBody>
            </Card>
          </template>

          <!-- Guide Tab -->
          <template v-if="activeTab === 'guide'">
            <CompactCard
              v-for="guide in guides.slice(0, 4)"
              :key="guide.id"
              :item="guide"
              :title="guide.display_name || guide.name || 'Guide'"
              :subtitle="guide.city?.name"
              :thumbnail="guide.coverAsset?.thumbnail_url || guide.coverAsset?.public_url"
              :rating="guide.rating"
              :price="guide.hourly_rate ? `¥${guide.hourly_rate}/hr` : undefined"
              :meta="guide.city?.name"
              :badge="guide.verified ? 'Verified' : undefined"
              @click="router.push(`/services/guide/${guide.id}`)"
            />
            <Card
              v-if="guides.length === 0"
              class="cursor-pointer col-span-full"
              :hover="true"
              @click="router.push('/services/guide')"
            >
              <CardBody class="p-6 text-center">
                <User class="h-16 w-16 mx-auto mb-4 text-teal-600" />
                <h3 class="font-semibold text-lg mb-2">View All Guides</h3>
                <p class="text-sm text-slate-600 mb-4">Browse our complete selection of local guides</p>
                <Button variant="primary" @click.stop="router.push('/services/guide')">View All</Button>
              </CardBody>
            </Card>
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

    <!-- Holiday Banner Carousel + Service Offers Carousel (Desktop: 2/3 + 1/3) -->
    <section v-if="holidayBanners.length > 0 || serviceOffers.length > 0" class="py-6 bg-white border-b border-slate-200">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Main Banner (2/3 width on desktop) -->
          <div class="lg:col-span-2">
            <Carousel v-if="holidayBanners.length > 0" :items="holidayBanners" :autoplay="true" :show-dots="true" :show-controls="true">
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
          
          <!-- Service Offers Carousel (1/3 width on desktop, same height) -->
          <div class="lg:col-span-1">
            <div v-if="serviceOffers.length > 0" class="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-slate-100">
              <Carousel :items="serviceOffers" :autoplay="true" :show-dots="true" :show-controls="true">
                <template #default="{ item }">
                  <div class="relative h-48 md:h-64 cursor-pointer group" @click.stop="handleOfferClick(item)">
                    <img
                      v-if="item.coverAsset?.public_url || item.coverAsset?.thumbnail_url"
                      :src="item.coverAsset?.public_url || item.coverAsset?.thumbnail_url"
                      :alt="item.title"
                      class="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                    />
                    <div
                      v-else
                      class="absolute inset-0 bg-gradient-to-br from-teal-400 to-amber-300 pointer-events-none"
                    ></div>
                    <!-- Optional: Add a subtle overlay for better text readability if needed -->
                    <div class="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none"></div>
                  </div>
                </template>
              </Carousel>
            </div>
          </div>
        </div>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Top Hotels</h2>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Popular Restaurants</h2>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Top Halal Food Items</h2>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Top eSIM Plans</h2>
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
            <h2 class="text-lg font-bold text-teal-600 mb-1">Must-Visit Places</h2>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Featured Tours</h2>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Top Shopping Picks</h2>
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
          <h2 class="text-xl font-bold text-teal-600 mb-1">Featured Transport</h2>
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

  <!-- Service Offer Detail Modal -->
  <Modal v-model="showOfferModal" :title="selectedOffer?.title || 'Special Offer'">
    <div v-if="selectedOffer" class="p-6">
      <div v-if="selectedOffer.coverAsset?.public_url || selectedOffer.coverAsset?.thumbnail_url" class="mb-4">
        <img
          :src="selectedOffer.coverAsset?.public_url || selectedOffer.coverAsset?.thumbnail_url"
          :alt="selectedOffer.title"
          class="w-full h-48 object-cover rounded-lg"
        />
      </div>
      <div class="space-y-4">
        <div v-if="selectedOffer.subtitle">
          <h3 class="text-lg font-semibold text-teal-600 mb-2">Description</h3>
          <p class="text-slate-700">{{ selectedOffer.subtitle }}</p>
        </div>
        <div v-if="selectedOffer.description">
          <h3 class="text-lg font-semibold text-teal-600 mb-2">Details</h3>
          <p class="text-slate-700 whitespace-pre-line">{{ selectedOffer.description }}</p>
        </div>
        <div v-if="selectedOffer.discount_percentage || selectedOffer.discount_amount">
          <h3 class="text-lg font-semibold text-teal-600 mb-2">Discount</h3>
          <p class="text-2xl font-bold text-amber-600">
            <span v-if="selectedOffer.discount_percentage">{{ selectedOffer.discount_percentage }}% OFF</span>
            <span v-else-if="selectedOffer.discount_amount">¥{{ selectedOffer.discount_amount }} OFF</span>
          </p>
        </div>
        <div v-if="selectedOffer.valid_from || selectedOffer.valid_until">
          <h3 class="text-lg font-semibold text-teal-600 mb-2">Valid Period</h3>
          <p class="text-slate-700">
            <span v-if="selectedOffer.valid_from">
              From: {{ new Date(selectedOffer.valid_from).toLocaleDateString() }}
            </span>
            <span v-if="selectedOffer.valid_from && selectedOffer.valid_until"> • </span>
            <span v-if="selectedOffer.valid_until">
              Until: {{ new Date(selectedOffer.valid_until).toLocaleDateString() }}
            </span>
          </p>
        </div>
        <div v-if="selectedOffer.service_type">
          <h3 class="text-lg font-semibold text-teal-600 mb-2">Service Type</h3>
          <Badge variant="primary">{{ selectedOffer.service_type }}</Badge>
        </div>
      </div>
      <div class="mt-6 flex gap-3 justify-end">
        <Button variant="ghost" @click="showOfferModal = false">Close</Button>
        <Button variant="primary" @click="handleRequestOffer">Request This Offer</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, inject } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Car, HeartPulse, User } from 'lucide-vue-next';
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
  Modal,
  Badge,
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
const transportServices = ref<any[]>([]); // Direct transport services for transport tab
const medicalCenters = ref<any[]>([]); // Direct medical centers for medical tab
const guides = ref<any[]>([]); // Direct guides for guide tab
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
  { value: 'transport', label: 'Transport' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'halal-food', label: 'Halal Food' },
  { value: 'medical', label: 'Medical' },
  { value: 'guide', label: 'Guide' },
  { value: 'esim', label: 'eSIM' },
  { value: 'places', label: 'Places' },
  { value: 'shopping', label: 'Shopping' },
];


const holidayBanners = ref<any[]>([]);
const serviceOffers = ref<any[]>([]);
const selectedOffer = ref<any>(null);
const showOfferModal = ref(false);

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
    const [homeResponse, offersResponse, transportResponse, medicalResponse, guidesResponse] = await Promise.all([
      axios.get(`/api/public/home?city_slug=${citySlug}`),
      axios.get('/api/public/offers').catch(() => ({ data: [] })), // Don't fail if offers endpoint fails
      axios.get('/api/public/catalog/transport').catch(() => ({ data: [] })), // Load transport services
      axios.get('/api/public/catalog/medical').catch(() => ({ data: [] })), // Load medical centers
      axios.get('/api/public/catalog/guides').catch(() => ({ data: [] })), // Load guides
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
    
    // Load transport services for transport tab (show first 4)
    transportServices.value = transportResponse.data || [];
    
    // Load medical centers for medical tab (show first 4)
    medicalCenters.value = medicalResponse.data || [];
    
    // Load guides for guide tab (show first 4)
    guides.value = guidesResponse.data || [];
    
    // Set spotlight offer (first active offer)
    const offers = offersResponse.data || [];
    spotlightOffer.value = offers.length > 0 ? offers[0] : null;
    // Set service offers for carousel (exclude the spotlight offer)
    serviceOffers.value = offers.length > 1 ? offers.slice(1) : offers;
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
    console.log('[HomePage] Loading hot products...');
    const response = await axios.get('/api/public/shopping/hot', {
      params: {
        page: 1,
        pageSize: 4, // Show 4 products in homepage tab
      },
    });
    console.log('[HomePage] Hot products response:', {
      data: response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      length: Array.isArray(response.data) ? response.data.length : 'not array',
    });
    hotProducts.value = Array.isArray(response.data) ? response.data : [];
    console.log('[HomePage] hotProducts.value set to:', hotProducts.value);
  } catch (error) {
    console.error('[HomePage] Failed to load hot products:', error);
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

function handleOfferClick(offer: any) {
  selectedOffer.value = offer;
  showOfferModal.value = true;
}

function handleRequestOffer() {
  if (selectedOffer.value) {
    router.push({
      path: '/request',
      query: {
        offer_id: selectedOffer.value.id,
        service_type: selectedOffer.value.service_type,
      },
    });
    showOfferModal.value = false;
  }
}

function getFeaturedItemsForTab(tabValue: string): any[] {
  const typeMap: Record<string, keyof typeof featuredItemsByType.value> = {
    'hotels': 'hotels',
    'transport': 'transport',
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
      router.push(`/services/transport/${item.entity.id}`);
      break;
    case 'medical':
      router.push(`/services/medical/${item.entity.id}`);
      break;
    case 'guide':
      router.push(`/services/guide/${item.entity.id}`);
      break;
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'shopping' && hotProducts.value.length === 0) {
    loadHotProducts();
  }
});

// Register modal handler with layout
const offerModalHandler = inject<{ register: (handler: (offer: any) => void) => void }>('offerModalHandler');
if (offerModalHandler) {
  offerModalHandler.register((offer: any) => {
    selectedOffer.value = offer;
    showOfferModal.value = true;
  });
}

onMounted(() => {
  loadHomepageData();
  loadBanners();
  // Load hot products if shopping tab is initially selected
  if (activeTab.value === 'shopping') {
    loadHotProducts();
  }
});
</script>
