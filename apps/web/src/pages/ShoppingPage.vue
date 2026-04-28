<template>
  <div class="min-h-screen bg-[#eef3f9] text-[12px] text-slate-700">
    <div :class="layoutClass" class="grid min-h-screen">
      <main class="min-w-0">
        <section class="relative overflow-hidden border-b border-slate-200 bg-white">

          <div class="relative grid items-start lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.88fr)]">
            <div class="px-4 py-3 sm:px-5 lg:px-6 lg:py-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">Premium shopping</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">Factory direct</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">Bangladesh support</span>
              </div>

              <div class="mt-3 max-w-3xl">
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-teal-700">ChinaBuyBD Marketplace</p>
                <p class="mt-2 max-w-5xl text-[12px] leading-5 text-slate-600 sm:text-[13px]">
                  Search by product name or image, compare price, add cart and shipping address , upload payment document, Recieve product and pay shipment fee once reached to your destination.
                </p>
              </div>

              <div class="mt-4">
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div class="flex-1">
                    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

                    <div class="flex h-12 items-center rounded-full border border-slate-200 bg-white/96 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-shadow focus-within:border-teal-300 focus-within:shadow-[0_12px_30px_rgba(13,148,136,0.14)]">
                      <span class="pl-4 text-slate-400">
                        <Search class="h-4 w-4" />
                      </span>
                      <input
                        v-model="searchQuery"
                        :placeholder="selectedImage ? 'Image selected - press Search' : 'Search products, factories, or keywords...'"
                        class="w-full bg-transparent px-3 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        :disabled="!!selectedImage"
                        @keyup.enter="handleUnifiedSearch"
                      />
                      <button
                        type="button"
                        @click.stop="fileInput?.click()"
                        class="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-teal-50 hover:text-teal-700"
                        :title="selectedImage ? 'Change image' : 'Search by image'"
                      >
                        <Camera class="h-4 w-4" />
                      </button>
                    </div>

                    <div v-if="selectedImage" class="mt-3 flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-3 py-2">
                      <img :src="imagePreview" alt="Preview" class="h-11 w-11 rounded-xl object-cover" />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-[12px] font-semibold text-slate-900">{{ selectedImage.name }}</p>
                        <p class="text-[10px] text-slate-500">Image search ready</p>
                      </div>
                      <button type="button" class="rounded-full p-2 text-slate-500 hover:bg-white hover:text-rose-600" @click="clearImage">
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-[12px] font-semibold text-white shadow-[0_12px_30px_rgba(13,148,136,0.2)] transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      @click="handleUnifiedSearch"
                      :disabled="!searchQuery.trim() && !selectedImage"
                    >
                      <Search class="h-4 w-4" />
                      Search
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      @click="clearSearch"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                <button
                  v-for="curr in ['BDT', 'CNY', 'USD'] as const"
                  :key="curr"
                  type="button"
                  @click="selectedCurrency = curr"
                  :class="[
                    'rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
                    selectedCurrency === curr
                      ? 'border-teal-600 bg-teal-600 text-white shadow-[0_8px_22px_rgba(13,148,136,0.18)]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700'
                  ]"
                >
                  {{ curr }}
                </button>
                <button
                  type="button"
                  @click="selectedLanguage = 'zh'"
                  :class="[
                    'rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
                    selectedLanguage === 'zh'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  ]"
                >
                  中文
                </button>
                <button
                  type="button"
                  @click="selectedLanguage = 'en'"
                  :class="[
                    'rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
                    selectedLanguage === 'en'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  ]"
                >
                  English
                </button>
                <span class="ml-1 rounded-full bg-slate-50 px-3 py-2 text-[11px] text-slate-500">Fast quoting</span>
                <span class="rounded-full bg-slate-50 px-3 py-2 text-[11px] text-slate-500">Safe sourcing</span>
                <span class="rounded-full bg-slate-50 px-3 py-2 text-[11px] text-slate-500">Agent assisted</span>
              </div>

            </div>

            <div class="relative hidden overflow-hidden border-l border-slate-100 px-5 py-3 lg:block">
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(13,148,136,0.12),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(15,23,42,0.08),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(34,197,94,0.08),transparent_26%)]" />
              <div class="relative flex flex-col gap-4">
                <div
                  class="rounded-[30px] border border-white/80 bg-white/78 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur"
                  role="button"
                  tabindex="0"
                  @click="openBannerModal(currentHeroSlide)"
                  @keyup.enter="openBannerModal(currentHeroSlide)"
                >
                  <img :src="currentHeroSlide.image" :alt="currentHeroSlide.title" class="h-32 w-full rounded-[24px] object-cover opacity-90" />
                  <div class="mt-3 flex items-center justify-between">
                    <div>
                      <p class="mt-1 text-[14px] font-black tracking-tight text-slate-900">{{ currentHeroSlide.title }}</p>
                      <p v-if="currentHeroSlide.subtitle" class="mt-1 line-clamp-2 text-[11px] text-slate-500">{{ currentHeroSlide.subtitle }}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700"
                        @click.stop="openBannerModal(currentHeroSlide)"
                      >
                        View details
                      </button>
                      <button
                        v-for="(slide, index) in carouselItems"
                        :key="slide.key"
                        type="button"
                        class="h-2.5 rounded-full transition-all"
                        :class="currentHeroSlideIndex === index ? 'w-8 bg-teal-600' : 'w-2.5 bg-slate-300'"
                        @click.stop="currentHeroSlideIndex = index"
                        :aria-label="`Show hero slide ${index + 1}`"
                      />
                    </div>
                  </div>
                </div>

 
              </div>
            </div>
          </div>
        </section>

        <section class="px-2 pt-4 sm:px-3 lg:px-0 lg:py-0">
              <div v-if="displayProducts.length > 0" class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] mt-6 sm:p-5">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Product grid</p>
                    <h3 class="mt-1 text-[15px] font-black tracking-tight text-slate-950">Hot products</h3>
                  </div>
                  <span class="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600">
                    {{ hasSearchResults ? `${displayProducts.length} matched` : 'Live feed' }}
                  </span>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  <button
                    v-for="item in displayProducts.slice(0, 6)"
                    :key="`hero-${item.externalId}`"
                    type="button"
                    class="overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-transform hover:-translate-y-0.5"
                    @click="handleProductClick(item)"
                  >
                    <div class="aspect-[4/3] bg-slate-100">
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.title"
                        class="h-full w-full object-cover"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                        <Package class="h-6 w-6" />
                      </div>
                    </div>
                    <div class="p-2.5">
                      <p class="line-clamp-2 text-[11px] font-semibold leading-4 text-slate-900">{{ item.title }}</p>
                      <div class="mt-1 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-black text-rose-500">{{ formatPrice(item.priceMin ?? item.priceMax ?? 0) }}</span>
                        <span class="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-semibold text-teal-700">MOQ {{ item.minimumOrderQty || shoppingSettings.moqRule?.minimum_product || 3 }}</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
          </section>
        <section v-if="premiumProducts.length > 0" class="px-2 pt-4 sm:px-3 lg:px-0">
          <div class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="mt-1 text-[17px] font-black tracking-tight text-red-400">Premium factory products</h2>
              </div>
              <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">Top 4 highlighted</span>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                v-for="product in premiumProducts"
                :key="product.id"
                type="button"
                class="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 text-left transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                @click="handleProductClick(product)"
              >
                <div class="aspect-[4/3] bg-slate-100">
                  <img
                    v-if="collectImageCandidates(product.imageUrl).length > 0 || collectImageCandidates(product.images).length > 0"
                    :src="proxyImageUrl(collectImageCandidates(product.imageUrl)[0] || collectImageCandidates(product.images)[0])"
                    :alt="product.title"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                    <Package class="h-8 w-8" />
                  </div>
                </div>
                <div class="p-3">
                  <p class="line-clamp-2 text-[12px] font-semibold leading-5 text-slate-900">{{ product.title }}</p>
                  <div class="mt-2 flex items-center justify-between gap-2">
                    <span class="text-[13px] font-black text-rose-500">{{ formatPrice(product.priceMin ?? product.priceMax ?? 0) }}</span>
                    <span class="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700">
                      MOQ {{ product.minimumOrderQty || shoppingSettings.moqRule?.minimum_product || 3 }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section class="px-2 pt-4 sm:px-3 lg:px-0">
          <div class="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">How it works</p>
                <h2 class="mt-1 text-[17px] font-black tracking-tight text-slate-950">Four steps from search to shipment</h2>
              </div>
              <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">B2B service from China</span>
            </div>

            <div class="mt-4 grid gap-3 lg:grid-cols-4">
              <div class="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white">
                  <Package class="h-5 w-5" />
                </div>
                <h3 class="mt-3 text-[13px] font-black text-red-500">Choose product</h3>
                <p class="mt-1 text-[11px] leading-5 text-slate-500">Browse categories and discover factory listings that fit your business needs.</p>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
                  <Search class="h-5 w-5" />
                </div>
                <h3 class="mt-3 text-[13px] font-black text-green-500">Search by text or image</h3>
                <p class="mt-1 text-[11px] leading-5 text-slate-500">Type a keyword or upload a photo to find the closest match fast.</p>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white">
                  <ShoppingCart class="h-5 w-5" />
                </div>
                <h3 class="mt-3 text-[13px] font-black text-red-500">Click product and checkout</h3>
                <p class="mt-1 text-[11px] leading-5 text-slate-500">Review the detail page, confirm quantity, and add items to checkout.</p>
              </div>
              <div class="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <Truck class="h-5 w-5" />
                </div>
                <h3 class="mt-3 text-[13px] font-black text-blue-500">Payment and shipment</h3>
                  <p class="mt-1 text-[11px] leading-5 text-slate-500">Confirm payment, then get shipment in 12-14 days. Contact us in China for B2B help.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="px-2 pt-4 sm:px-3 lg:px-0">
          <div class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Curated categories</p>
                <h2 class="mt-1 text-[17px] font-black tracking-tight text-slate-950">iPhone, bags, jewelry, and kitchenware</h2>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition-colors hover:border-teal-200 hover:text-teal-700"
                @click="loadCuratedSections"
              >
                <RefreshCw class="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <div
                v-for="section in curatedSections"
                :key="section.slug"
                class="rounded-[22px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{{ section.label }}</p>
                    <p class="mt-1 text-[12px] font-semibold text-slate-700">Premium Items</p>
                  </div>
                  <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">Platform backed</span>
                </div>

                <div class="mt-3 grid grid-cols-2 gap-2">
                  <button
                    v-for="item in section.items.slice(0, 2)"
                    :key="item.externalId"
                    type="button"
                    class="overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-transform hover:-translate-y-0.5"
                    @click="handleProductClick(item)"
                  >
                    <div class="aspect-[4/3] bg-slate-100">
                      <img
                        v-if="collectImageCandidates(item.imageUrl).length > 0 || collectImageCandidates(item.images).length > 0"
                        :src="proxyImageUrl(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0])"
                        :alt="item.title"
                        class="h-full w-full object-cover"
                      />
                      <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                        <Package class="h-6 w-6" />
                      </div>
                    </div>
                    <div class="p-2.5">
                      <p class="line-clamp-2 text-[11px] font-semibold leading-4 text-slate-900">{{ item.title }}</p>
                      <div class="mt-1 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-black text-rose-500">{{ formatPrice(item.priceMin ?? item.priceMax ?? 0) }}</span>
                        <span class="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-semibold text-teal-700">ID</span>
                      </div>
                    </div>
                  </button>

                  <div v-if="section.items.length === 0" class="col-span-2 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500">
                    Search one of these categories to populate the saved picks: {{ section.label }}.
                  </div>
                </div>
              </div>
            </div>

            <div v-if="curatedSections.length === 0" class="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-slate-500">
              We will show saved category picks once  search results are stored in the database.
            </div>
          </div>
        </section>

        <section v-if="recentSearches.length > 0" class="px-2 pt-4 sm:px-3 lg:px-0">
          <div class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Recent searches</p>
                <h2 class="mt-1 text-[16px] font-black tracking-tight text-slate-950">Pick up where you left off</h2>
              </div>
              <button
                type="button"
                class="text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                @click="loadRecentSearches"
              >
                Refresh
              </button>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                v-for="keyword in recentSearches"
                :key="keyword"
                type="button"
                @click="handleRecentSearchClick(keyword)"
                class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                {{ keyword }}
              </button>
            </div>
          </div>
        </section>
      </main>

      <aside class="hidden border-l border-white/70 bg-[#eef3f9] xl:flex xl:flex-col">
        <div class="sticky top-0 flex h-screen flex-col gap-4 p-4">
          <div class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Offers</p>
                <h3 class="mt-1 text-[16px] font-black text-slate-950">Featured deals</h3>
              </div>
              <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">
                {{ offers.length > 0 ? `${offers.length} live` : 'No live offers' }}
              </span>
            </div>

            <div v-if="displayOffers.length === 0" class="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[11px] text-slate-500">
              No live offers yet.
            </div>

            <div class="mt-4 space-y-3">
              <button
                v-for="offer in displayOffers"
                :key="offer.id"
                type="button"
                @click="handleOfferClick(offer)"
                class="group w-full overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 text-left transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
              >
                <div v-if="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url" class="aspect-[16/10] bg-slate-100">
                  <img
                    :src="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url"
                    :alt="offer.title"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div v-else class="flex h-24 items-center justify-center bg-gradient-to-br from-teal-100 to-cyan-100">
                  <div class="flex flex-col items-center gap-1 text-teal-600">
                    <Sparkles class="h-7 w-7" />
                    <span class="text-[10px] font-semibold uppercase tracking-[0.22em]">Featured deal</span>
                  </div>
                </div>
                <div class="p-4">
                  <div class="flex items-center gap-2">

                    <p class="truncate text-[12px] font-semibold text-slate-900">{{ offer.title || 'Special offer' }}</p>
                  </div>
                  <p class="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-500">
                    {{ offer.description || 'Tap to view the promotion details.' }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div class="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Shipping rates</p>
            <div class="mt-4 space-y-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-green-500">Air shipping</span>
                  <span class="text-[11px] text-slate-500">12-14 days</span>
                </div>
                <p class="mt-1 text-[11px] text-slate-600">{{ shippingRateItems.air }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-red-500">Sea shipping</span>
                  <span class="text-[11px] text-slate-500">12-14 days</span>
                </div>
                <p class="mt-1 text-[11px] text-slate-600">{{ shippingRateItems.sea }}</p>
              </div>
              <div class="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-semibold text-slate-900">MOQ rule</span>
                  <span class="text-[11px] text-slate-500">{{ shoppingSettings.moqRule?.minimum_product || 1 }} pcs</span>
                </div>
                <p class="mt-1 text-[11px] text-slate-600">
                  Minimum order value {{ shoppingSettings.moqRule?.currency || 'BDT' }} {{ Number(shoppingSettings.moqRule?.minimum_price_threshold || 0).toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <Modal v-model="showBannerModal" :title="selectedBanner?.title || 'Banner details'" size="lg">
      <div v-if="selectedBanner" class="space-y-4">
        <div class="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
          <img
            :src="selectedBanner.coverAsset?.public_url || selectedBanner.coverAsset?.thumbnail_url || selectedBanner.imageUrl || selectedBanner.image"
            :alt="selectedBanner.title"
            class="h-56 w-full object-cover"
          />
        </div>
        <div class="space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Homepage banner</p>
          <h3 class="text-[18px] font-black tracking-tight text-slate-950">{{ selectedBanner.title }}</h3>
          <p v-if="selectedBanner.subtitle" class="text-[12px] leading-6 text-slate-600">{{ selectedBanner.subtitle }}</p>
          <div v-if="selectedBanner.link" class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            Link: {{ selectedBanner.link }}
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button v-if="selectedBanner.link" variant="primary" @click="handleOfferClick(selectedBanner)">
            Open link
          </Button>
          <Button variant="ghost" @click="showBannerModal = false">Close</Button>
        </div>
      </div>
    </Modal>

    <div class="px-3 pb-5 lg:hidden">
      <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          @click="selectAllCategories"
          :class="[
            'shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
            !selectedCategory ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700'
          ]"
        >
          All products
        </button>
        <button
          v-for="cat in categories"
          :key="`mobile-${cat.slug}`"
          type="button"
          @click="handleCategorySelect(cat.slug)"
          :class="[
            'shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold transition-all',
            selectedCategory === cat.slug ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700'
          ]"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { useShoppingCart } from '@/composables/useShoppingCart';
import { Modal } from '@bridgechina/ui';
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Gem,
  Home,
  Shirt,
  Sparkles,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Stars,
  Truck,
  Watch,
  Package,
  RefreshCw,
  Search,
  X,
} from 'lucide-vue-next';
import { EmptyState } from '@bridgechina/ui';
import ProductCard from '@/components/shopping/ProductCard.vue';

type HeroSlide = {
  key: string;
  title: string;
  image: string;
};

type CarouselItem = {
  key: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string | null;
  ctaText?: string | null;
  banner?: any;
};

function heroSvg(title: string, subtitle: string, accent: string, accent2: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accent2}" />
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)"/>
      <circle cx="240" cy="180" r="150" fill="rgba(255,255,255,0.18)" filter="url(#blur)"/>
      <circle cx="1260" cy="140" r="200" fill="rgba(255,255,255,0.16)" filter="url(#blur)"/>
      <rect x="980" y="520" width="430" height="220" rx="42" fill="rgba(255,255,255,0.16)"/>
      <rect x="1080" y="565" width="180" height="120" rx="30" fill="rgba(255,255,255,0.24)"/>
      <rect x="1280" y="565" width="90" height="90" rx="24" fill="rgba(255,255,255,0.28)"/>
      <rect x="1100" y="610" width="140" height="20" rx="10" fill="rgba(255,255,255,0.55)"/>
      <rect x="1100" y="642" width="110" height="14" rx="7" fill="rgba(255,255,255,0.36)"/>
      <rect x="102" y="510" width="530" height="230" rx="44" fill="rgba(255,255,255,0.18)"/>
      <rect x="150" y="550" width="168" height="140" rx="24" fill="rgba(255,255,255,0.24)"/>
      <rect x="336" y="550" width="168" height="140" rx="24" fill="rgba(255,255,255,0.18)"/>
      <rect x="522" y="550" width="70" height="140" rx="20" fill="rgba(255,255,255,0.28)"/>
      <path d="M180 590h108v18H180zM180 622h120v14H180z" fill="rgba(255,255,255,0.66)"/>
      <path d="M362 590h108v18H362zM362 622h120v14H362z" fill="rgba(255,255,255,0.54)"/>
      <path d="M540 585h18v100h-18zM560 600h18v70h-18z" fill="rgba(255,255,255,0.56)"/>
      <rect x="84" y="100" width="640" height="250" rx="40" fill="rgba(255,255,255,0.2)"/>
      <text x="136" y="185" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="white">${title}</text>
      <text x="136" y="245" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">${subtitle}</text>
      <rect x="136" y="280" width="170" height="16" rx="8" fill="rgba(255,255,255,0.55)"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const heroSlides: HeroSlide[] = [
  {
    key: 'factory',
    title: 'Factory direct sourcing',
    image: '/home/hero-01.jpg',
  },
  {
    key: 'shipment',
    title: 'Fast delivery flow',
    image: '/home/hero-02.jpg',
  },
  {
    key: 'image-search',
    title: 'Search by image',
    image: '/home/hero-01.jpg',
  },
];

const router = useRouter();
const toast = useToast();
const { addToCart: addToCartComposable } = useShoppingCart();

const categories = ref<any[]>([]);
const hotItems = ref<any[]>([]);
const searchResults = ref<any[]>([]);
const offers = ref<any[]>([]);
const homepageBanners = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedCategory = ref('');
const expandedCategorySlug = ref('');
const selectedImage = ref<File | null>(null);
const imagePreview = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const searchTriggered = ref(false);
const currentPage = ref(1);
const pageSize = ref(12);
const totalPages = ref(1);
const totalCount = ref<number | null>(null);
const selectedLanguage = ref<'en' | 'zh'>('en');
const selectedCurrency = ref<'BDT' | 'CNY' | 'USD'>('BDT');
const recentSearches = ref<string[]>([]);
const premiumProducts = ref<any[]>([]);
const curatedSections = ref<Array<{ slug: string; label: string; items: any[] }>>([]);
const showBannerModal = ref(false);
const selectedBanner = ref<any>(null);
const shoppingSettings = ref<any>({});
const conversionRates = ref<{ CNY_TO_BDT?: number; CNY_TO_USD?: number }>({
  CNY_TO_BDT: 15,
  CNY_TO_USD: 0.14,
});
const heroSlideIndex = ref(0);
const currentHeroSlideIndex = heroSlideIndex;

let heroTimer: number | undefined;

const layoutClass = computed(() => 'xl:grid-cols-[minmax(0,1fr)_300px]');

const carouselItems = computed<CarouselItem[]>(() => {
  if (homepageBanners.value.length > 0) {
    return homepageBanners.value.map((banner: any) => ({
      key: banner.id,
      title: banner.title || 'Homepage banner',
      subtitle: banner.subtitle || '',
      image: banner.coverAsset?.public_url || banner.coverAsset?.thumbnail_url || heroSlides[0].image,
      link: banner.link || null,
      ctaText: banner.cta_text || 'Learn more',
      banner,
    }));
  }

  return heroSlides.map((slide) => ({
    key: slide.key,
    title: slide.title,
    subtitle: '',
    image: slide.image,
    link: null,
    ctaText: 'Learn more',
    banner: null,
  }));
});

const currentHeroSlide = computed<CarouselItem>(() => {
  const items = carouselItems.value;
  if (items.length === 0) {
    return {
      key: 'fallback',
      title: 'Shopping preview',
      image: heroSlides[0].image,
      subtitle: '',
      banner: null,
    };
  }
  return items[heroSlideIndex.value % items.length];
});
const hasSearchResults = computed(() => searchTriggered.value);
const visibleProducts = computed(() => (hasSearchResults.value ? searchResults.value : hotItems.value));
const displayProducts = computed(() => visibleProducts.value);
const displayOffers = computed(() => offers.value.slice(0, 3));
const hasOfferRail = computed(() => displayOffers.value.length > 0);
const shippingRateSummary = computed(() => {
  const rates = shoppingSettings.value.shippingRates || [];
  const air = rates.find((rate: any) => rate.method === 'air');
  const sea = rates.find((rate: any) => rate.method === 'sea');
  const parts: string[] = [];
  if (air) parts.push(`Air ${air.currency} ${air.min_rate_per_kg}-${air.max_rate_per_kg}/kg`);
  if (sea) parts.push(`Sea ${sea.currency} ${sea.min_rate_per_kg}-${sea.max_rate_per_kg}/kg`);
  return parts.join(' • ');
});
const shippingRateItems = computed(() => {
  const rates = Array.isArray(shoppingSettings.value.shippingRates) ? shoppingSettings.value.shippingRates : [];
  const air = rates.find((rate: any) => rate.method === 'air');
  const sea = rates.find((rate: any) => rate.method === 'sea');
  return {
    air: air ? `${air.currency || 'BDT'} ${Number(air.min_rate_per_kg || 0).toLocaleString()} - ${Number(air.max_rate_per_kg || 0).toLocaleString()} /kg` : 'Not set',
    sea: sea ? `${sea.currency || 'BDT'} ${Number(sea.min_rate_per_kg || 0).toLocaleString()} - ${Number(sea.max_rate_per_kg || 0).toLocaleString()} /kg` : 'Not set',
  };
});
const currentSubcategories = computed(() => {
  if (!selectedCategory.value) return [];
  const cat = categories.value.find((item: any) => item.slug === selectedCategory.value);
  return Array.isArray(cat?.children) ? cat.children.slice(0, 10).map((child: any) => child.name) : [];
});

const iconMap: Record<string, any> = {
  'shopping-bag': ShoppingBag,
  gem: Gem,
  glasses: Package,
  laptop: Package,
  monitor: Package,
  smartphone: Package,
  watch: Watch,
  shirt: Shirt,
  home: Home,
  truck: Truck,
  camera: Package,
  headphones: Package,
  'gamepad-2': Package,
  'book-open': Package,
  sprout: Package,
  'badge-percent': Package,
  package: Package,
  shield: Shield,
  star: Stars,
  sparkles: Sparkles,
  cpu: Cpu,
};

function categoryIcon(icon?: string) {
  return iconMap[String(icon || '').toLowerCase()] || Package;
}

function formatPrice(price: number): string {
  const currency = selectedCurrency.value;
  if (currency === 'CNY') {
    return `CNY ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (currency === 'BDT') {
    const rate = conversionRates.value.CNY_TO_BDT || 15;
    return `BDT ${(price * rate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  const rate = conversionRates.value.CNY_TO_USD || 0.14;
  return `USD ${(price * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSales(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function proxyImageUrl(url: string | null | undefined): string {
  const text = String(url || '').trim();
  if (!text) return '';
  if (text.startsWith('/api/public/image-proxy')) return text;
  if (text.startsWith('data:image/')) return text;
  if (text.startsWith('/')) return text;
  try {
    const parsed = new URL(text);
    const host = parsed.hostname.toLowerCase();
    const shouldProxy = ['alicdn.com', '1688.com', 'detail.1688.com'].some((domain) => {
      const normalized = domain.toLowerCase();
      return host === normalized || host.endsWith(`.${normalized}`) || host.includes(normalized);
    });
    if (shouldProxy && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return `/api/public/image-proxy?url=${encodeURIComponent(text)}`;
    }
  } catch {
    return text;
  }
  return text;
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

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  selectedImage.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = String(e.target?.result || '');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  selectedImage.value = null;
  imagePreview.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

function clearSearchResults() {
  searchResults.value = [];
  totalCount.value = null;
  totalPages.value = 1;
  currentPage.value = 1;
}

function selectAllCategories() {
  selectedCategory.value = '';
  router.push({ name: 'shopping-browse' });
}

function handleCategorySelect(slug: string) {
  router.push({ name: 'shopping-browse', query: { category: slug } });
}

function toggleSidebarCategory(slug: string) {
  expandedCategorySlug.value = expandedCategorySlug.value === slug ? '' : slug;
}

function handleRecentSearchClick(keyword: string) {
  searchQuery.value = keyword;
  currentPage.value = 1;
  handleKeywordSearch();
}

async function handleUnifiedSearch() {
  const query: Record<string, string> = {};
  const keyword = searchQuery.value.trim();
  if (keyword) query.q = keyword;
  if (selectedCategory.value) query.category = selectedCategory.value;
  if (selectedImage.value) {
    const key = `shopping-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = imagePreview.value || '';
    if (previewUrl) {
      sessionStorage.setItem(key, previewUrl);
      query.imageSearchKey = key;
    }
  }

  await router.push({ name: 'shopping-browse', query });
}

async function handleImageSearch() {
  await handleUnifiedSearch();
}

async function handleKeywordSearch() {
  await handleUnifiedSearch();
}

async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  if (selectedImage.value) {
    await handleImageSearch();
    return;
  }
  await handleKeywordSearch();
}

function clearSearch() {
  searchQuery.value = '';
  selectedCategory.value = '';
  searchTriggered.value = false;
  clearSearchResults();
  clearImage();
  loadHotItems();
}

function handleProductClick(product: any) {
  const externalId = product.externalId || product.external_id || product.id;
  if (!externalId) return;
  router.push({
    path: `/shopping/item/${externalId}`,
    query: { language: selectedLanguage.value },
  });
}

function handleAddToCart(product: any) {
  addToCartComposable(product, 1);
  toast.success('Added to cart');
}

function handleOfferClick(offer: any) {
  const link = String(offer?.link || '').trim();
  if (!link) return;
  if (/^https?:\/\//i.test(link)) {
    window.open(link, '_blank', 'noopener,noreferrer');
    return;
  }
  router.push(link);
}

function openBannerModal(banner: CarouselItem | null | undefined) {
  if (!banner) return;
  selectedBanner.value = banner.banner || {
    title: banner.title,
    subtitle: banner.subtitle,
    link: banner.link,
    cta_text: banner.ctaText,
    coverAsset: banner.image ? { public_url: banner.image, thumbnail_url: banner.image } : null,
  };
  showBannerModal.value = true;
}

async function loadCategories() {
  try {
    const response = await axios.get('/api/public/shopping/categories');
    categories.value = Array.isArray(response.data) ? response.data : [];
    if (!expandedCategorySlug.value) {
      expandedCategorySlug.value = categories.value[0]?.slug || '';
    }
  } catch (error) {
    console.error('Failed to load categories', error);
    categories.value = [];
  }
}

async function loadHotItems() {
  searchTriggered.value = false;
  loading.value = true;
  try {
    const params: Record<string, any> = { page: 1, pageSize: 12 };
    if (selectedCategory.value) params.category = selectedCategory.value;
    const response = await axios.get('/api/public/shopping/hot', { params });
    hotItems.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[ShoppingPage] Failed to load hot items:', error);
    hotItems.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadCuratedSections() {
  try {
    const response = await axios.get('/api/public/shopping/home-curated');
    curatedSections.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[ShoppingPage] Failed to load curated sections:', error);
    curatedSections.value = [];
  }
}

async function loadOffers() {
  try {
    const response = await axios.get('/api/public/offers');
    offers.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load offers', error);
    offers.value = [];
  }
}

async function loadHomepageBanners() {
  try {
    const response = await axios.get('/api/public/homepage-banners');
    homepageBanners.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load homepage banners:', error);
    homepageBanners.value = [];
  }
}

async function loadPremiumProducts() {
  try {
    const response = await axios.get('/api/public/shopping/premium-products', {
      params: { limit: 4 },
    });
    premiumProducts.value = Array.isArray(response.data) ? response.data.slice(0, 4) : [];
  } catch (error) {
    console.error('Failed to load premium products:', error);
    premiumProducts.value = [];
  }
}

async function loadShopSettings() {
  try {
    const response = await axios.get('/api/public/shopping/settings');
    shoppingSettings.value = response.data || {};
  } catch (error) {
    console.error('Failed to load shopping settings:', error);
    shoppingSettings.value = {};
  }
}

async function loadRecentSearches() {
  try {
    const response = await axios.get('/api/public/shopping/recent-searches', {
      params: { limit: 8, language: selectedLanguage.value },
    });
    recentSearches.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load recent searches:', error);
    recentSearches.value = [];
  }
}

async function loadConversionRates() {
  conversionRates.value = { CNY_TO_BDT: 15, CNY_TO_USD: 0.14 };
}

onMounted(() => {
  heroTimer = window.setInterval(() => {
    const count = carouselItems.value.length || heroSlides.length || 1;
    heroSlideIndex.value = (heroSlideIndex.value + 1) % count;
  }, 4200);

  loadCategories();
  loadHotItems();
  loadOffers();
  loadHomepageBanners();
  loadPremiumProducts();
  loadCuratedSections();
  loadShopSettings();
  loadRecentSearches();
  loadConversionRates();
});

onBeforeUnmount(() => {
  if (heroTimer) window.clearInterval(heroTimer);
});
</script>
