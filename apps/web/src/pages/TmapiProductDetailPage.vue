<template>
  <div class="min-h-screen overflow-x-hidden bg-[#eef3f9] text-slate-800">
    <div v-if="loading" class="w-full px-2 py-3">
      <div class="animate-pulse space-y-3">
        <div class="h-4 w-28 rounded bg-slate-200" />
        <div class="grid gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,0.9fr)_320px]">
          <div class="h-[680px] rounded-[24px] bg-slate-200" />
          <div class="h-[680px] rounded-[24px] bg-slate-200" />
          <div class="h-[680px] rounded-[24px] bg-slate-200" />
        </div>
      </div>
    </div>

    <div v-else-if="product" class="w-full px-2 py-3">
      <Button variant="ghost" size="sm" @click="$router.push('/shopping')" class="mb-3 px-0 text-[12px] font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft class="mr-1 h-4 w-4" />
        Back to Shopping
      </Button>

      <div class="space-y-3 xl:hidden">
        <section class="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <div class="group relative h-[34vh] max-h-[280px] min-h-[220px] w-full overflow-hidden rounded-[20px] bg-slate-100" @click="openFullscreen(activeMediaUrl)">
            <video
              v-if="showVideo"
              ref="videoRef"
              :src="product.videoUrl"
              :autoplay="videoMode === 'auto'"
              :muted="videoMode === 'auto'"
              playsinline
              loop
              controls
              class="h-full w-full object-contain object-center"
              @click.stop
            />
            <img
              v-else-if="activeMediaUrl"
              :src="activeMediaUrl"
              :alt="product.title"
              class="h-full w-full object-contain object-center"
              @error="markBrokenImage(activeMediaUrl)"
            />
            <div v-else class="flex h-full items-center justify-center text-slate-400">
              <Package class="h-20 w-20" />
            </div>

            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-teal-700 shadow-sm">BDT</span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-700 shadow-sm">Factory direct</span>
            </div>
          </div>

          <div class="mt-3 flex max-w-full flex-nowrap overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              v-for="img in galleryImages"
              :key="img"
              type="button"
              class="h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50"
              @click="selectImage(img)"
            >
              <img :src="img" :alt="product.title" class="h-full w-full object-cover" @error="markBrokenImage(img)" />
            </button>
          </div>
        </section>

        <section class="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">Shopping</span>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">Agent assisted</span>
          </div>

          <h1 class="mt-2.5 text-[24px] font-black leading-[1.12] tracking-tight text-slate-950">{{ product.title }}</h1>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span v-if="product.sellerName">Seller: {{ product.sellerName }}</span>
            <span v-if="product.totalSold">{{ formatNumber(product.totalSold) }} sold</span>
          </div>

          <div class="mt-3.5 border-y border-slate-200 py-3.5">
            <div class="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Price</div>
            <div class="mt-1 text-[26px] font-black tracking-tight text-teal-700">
              <span v-if="product.priceMin && product.priceMax && product.priceMin !== product.priceMax">{{ formatPrice(product.priceMin) }} - {{ formatPrice(product.priceMax) }}</span>
              <span v-else-if="product.priceMin">{{ formatPrice(product.priceMin) }}</span>
              <span v-else>BDT on request</span>
            </div>

            <div class="mt-2 flex gap-1 rounded-full border border-slate-200 bg-white p-1">
              <button
                v-for="curr in ['BDT', 'CNY', 'USD'] as const"
                :key="curr"
                type="button"
                @click="selectedCurrency = curr"
                :class="['rounded-full px-3 py-1 text-[11px] font-semibold transition-colors', selectedCurrency === curr ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100']"
              >
                {{ curr }}
              </button>
            </div>

            <div v-if="product.minimumOrderQty || product.shipping?.minimumOrderQty || shippingRateSummary" class="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
              <span v-if="product.minimumOrderQty || product.shipping?.minimumOrderQty" class="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">MOQ {{ product.minimumOrderQty || product.shipping?.minimumOrderQty || 1 }}</span>
              <span v-if="shippingRateSummary" class="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">{{ shippingRateSummary }}</span>
            </div>

            <div class="mt-2.5 grid gap-2">
              <div v-if="hasWeightInfo" class="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <span class="font-semibold text-slate-800">Weight:</span>
                {{ estimatedWeightLabel }}
                <div v-if="estimatedAirShippingRangeLabel" class="mt-1 text-[10px] font-semibold text-teal-700">
                  {{ estimatedAirShippingRangeLabel }}
                </div>
              </div>
              <div v-else class="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                Weight unknown - agent will confirm
              </div>
            </div>
          </div>

          <div class="mt-3.5 rounded-[18px] border border-slate-200 bg-white p-3">
            <div class="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <span class="inline-flex items-center gap-2">
                <Package class="h-4 w-4 text-slate-500" />
                Variants
              </span>
              <span class="text-[10px] text-slate-400">Pick color, size, quantity</span>
            </div>
            <div v-if="hasVariantRows" class="mt-2 max-h-[220px] divide-y divide-slate-100 overflow-auto">
              <div v-for="({ sku, idx, label }) in variantRows" :key="sku.specid || sku.skuid || idx" class="flex items-center gap-3 py-2.5">
                <button
                  v-if="sku.imageUrl"
                  type="button"
                  class="h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  @click="selectImage(sku.imageUrl)"
                >
                  <img
                    :src="proxyImageUrl(sku.imageUrl)"
                    :alt="label"
                    class="h-full w-full object-cover"
                    @error="markBrokenImage(sku.imageUrl)"
                  />
                </button>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-[11px] font-semibold text-slate-900">{{ label }}</div>
                  <div class="mt-1 text-[10px] text-slate-500">
                    <span v-if="Number(sku.sale_price || sku.price || 0) > 0">{{ formatPrice(Number(sku.sale_price || sku.price || 0)) }}</span>
                    <span v-else>Price on request</span>
                    · Stock {{ formatNumber(sku.stock || 0) }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    :disabled="!selectedSkus[sku.specid || idx] || selectedSkus[sku.specid || idx] <= 0"
                    @click="updateSkuQuantity(sku, -1)"
                  >
                    <Minus class="h-3.5 w-3.5" />
                  </button>
                  <input
                    v-model.number="selectedSkus[sku.specid || idx]"
                    type="number"
                    min="0"
                    class="h-8 w-14 rounded-lg border border-slate-200 text-center text-[11px] focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50" @click="updateSkuQuantity(sku, 1)">
                    <Plus class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600">Quantity</label>
                <div class="mt-1 flex items-center gap-2">
                  <button type="button" @click="quantity = Math.max(1, quantity - 1)" class="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    <Minus class="h-3.5 w-3.5" />
                  </button>
                  <Input v-model.number="quantity" type="number" :min="1" class="h-9 w-24 text-center text-[11px]" />
                  <button type="button" @click="quantity++" class="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50">
                    <Plus class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="totalQuantity > 0 && getUnitPrice() > 0" class="mt-3 rounded-[16px] border border-teal-200 bg-teal-50 px-3 py-2 text-[11px]">
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-slate-700">Total amount</span>
                <span class="text-[15px] font-black text-teal-700">{{ formatTotalAmount() }}</span>
              </div>
              <div class="mt-1 text-slate-500">{{ totalQuantity }} x {{ formatPrice(getUnitPrice()) }}</div>
            </div>

            <div class="mt-3 grid gap-2">
              <Button variant="primary" @click="buyNow" class="h-11 w-full text-[12px] font-semibold shadow-none">
                <Truck class="mr-2 h-4 w-4" />
                Buy Now
              </Button>
              <Button variant="accent" style="color: white;" @click="addToCart" class="h-11 w-full text-[12px] font-semibold shadow-none" :disabled="totalQuantity <= 0" :class="totalQuantity <= 0 ? 'cursor-not-allowed opacity-60' : ''">
                <ShoppingCart class="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
              <Button @click="openWhatsApp" class="h-11 w-full border-0 bg-green-600 text-[12px] font-semibold text-white shadow-none hover:bg-green-700">
                <MessageCircle class="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            <div class="mt-3 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tab in tabs"
                  :key="tab.key"
                  type="button"
                  @click="activeTab = tab.key"
                  :class="['rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors', activeTab === tab.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100']"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div class="mt-3 space-y-2">
                <div v-if="activeTab === 'spec'" class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="border-b border-slate-200 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Specification</div>
                  <div v-if="specRows.length > 0" class="divide-y divide-slate-100">
                    <div v-for="row in specRows.slice(0, 8)" :key="row.label" class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                  <div v-else class="py-3 text-[11px] text-slate-500">No structured specification was returned by the provider.</div>
                </div>

                <div v-else-if="activeTab === 'overview'" class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overview</div>
                  <div class="mt-3 space-y-2 text-[11px] text-slate-600">
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Source:</span> Factory sourcing</div>
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Support:</span> B2B concierge in China</div>
                    <div v-if="product.totalSold" class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Sold:</span> {{ formatNumber(product.totalSold) }}</div>
                  </div>
                </div>

                <div v-else-if="activeTab === 'seller'" class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="border-b border-slate-200 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Seller info</div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="row in sellerRows.slice(0, 6)" :key="row.label" class="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                </div>

                <div v-else class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Description</div>
                  <div class="prose prose-sm mt-3 max-w-none text-[11px] leading-6 text-slate-700" v-html="organizedDescription" />
                </div>
              </div>
            </div>

            <div class="mt-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Suggestions</p>
                  <h2 class="mt-1 text-[15px] font-black tracking-tight text-slate-950">Similar products</h2>
                </div>
                <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600" @click="loadSimilarProducts">
                  <RefreshCw class="inline-block h-3.5 w-3.5" />
                </button>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2">
                <button
                  v-for="item in similarProducts.slice(0, 4)"
                  :key="item.externalId"
                  type="button"
                  class="overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 text-left hover:border-teal-200 hover:bg-teal-50/60"
                  @click="handleProductClick(item)"
                >
                  <div class="aspect-square bg-white">
                    <img
                      v-if="collectImageCandidates(item.imageUrl).length > 0 || collectImageCandidates(item.images).length > 0 || collectImageCandidates(item.raw).length > 0"
                      :src="proxyImageUrl(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0] || collectImageCandidates(item.raw)[0])"
                      :alt="item.title"
                      class="h-full w-full object-cover"
                      @error="markBrokenImage(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0] || collectImageCandidates(item.raw)[0])"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                      <Package class="h-6 w-6" />
                    </div>
                  </div>
                  <div class="p-2">
                    <p class="line-clamp-2 text-[11px] font-semibold leading-5 text-slate-900">{{ item.title }}</p>
                    <div class="mt-1 text-[10px] font-bold text-teal-700">
                      <span v-if="item.priceMin">{{ formatPrice(item.priceMin) }}</span>
                      <span v-else>BDT on request</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="hidden xl:grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="min-w-0 space-y-3">
          <div class="grid gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,0.9fr)]">
            <section class="order-1 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)] xl:order-none">
              <div class="min-w-0 w-full">
                <div class="group relative h-[42vh] w-full max-w-full overflow-hidden rounded-[20px] bg-slate-100 sm:h-auto sm:aspect-[0.94/1]" @click="openFullscreen(activeMediaUrl)">
                  <video
                    v-if="showVideo"
                    ref="videoRef"
                    :src="product.videoUrl"
                    :autoplay="videoMode === 'auto'"
                    :muted="videoMode === 'auto'"
                    playsinline
                    loop
                    controls
                    class="h-full w-full max-w-full object-contain object-center"
                    @click.stop
                  />
                  <img
                    v-else-if="activeMediaUrl"
                    :src="activeMediaUrl"
                    :alt="product.title"
                    class="h-full w-full max-w-full object-contain object-center"
                    @error="markBrokenImage(activeMediaUrl)"
                  />
                  <div v-else class="flex h-full items-center justify-center text-slate-400">
                    <Package class="h-24 w-24" />
                  </div>

                  <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-teal-700 shadow-sm">BDT</span>
                    <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-700 shadow-sm">Factory direct</span>
                  </div>
                </div>

                <div v-if="showGalleryThumbs" class="mt-3 flex max-w-full flex-nowrap overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" :class="desktopThumbTrackClass">
                  <button
                    v-if="product.videoUrl"
                    type="button"
                    class="shrink-0 overflow-hidden rounded-[16px] border bg-slate-50 transition-all"
                    :class="[desktopThumbButtonClass, selectedImage === product.videoUrl ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200 hover:border-teal-300']"
                    @click="selectVideo()"
                  >
                    <Play class="h-4 w-4 text-slate-600" />
                  </button>
                  <button
                    v-for="(img, idx) in galleryImages"
                    :key="`${img}-${idx}`"
                    type="button"
                    class="shrink-0 overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 transition-all"
                    :class="[desktopThumbButtonClass, selectedImage === img ? 'border-teal-500 ring-2 ring-teal-100' : 'hover:border-teal-300']"
                    @click="selectImage(img)"
                  >
                    <img :src="img" :alt="`${product.title} ${idx + 1}`" class="h-full w-full object-cover" @error="markBrokenImage(img)" />
                  </button>
                </div>
              </div>

              <div v-if="product.shippingInfo" class="mt-4 hidden rounded-[18px] border border-slate-200 bg-gradient-to-r from-teal-50 to-amber-50 p-3.5 sm:block">
                <div class="flex items-center gap-2 text-slate-900">
                  <Truck class="h-4 w-4 text-teal-600" />
                  <h3 class="text-[11px] font-black uppercase tracking-[0.22em]">Shipping & delivery</h3>
                </div>
                <div class="mt-2.5 grid gap-2 text-[10px] text-slate-600 sm:grid-cols-2">
                  <div v-if="product.shippingInfo.areaFrom" class="rounded-2xl bg-white/70 px-3 py-2">
                    <span class="font-semibold text-slate-800">Ship from:</span> {{ product.shippingInfo.areaFrom.join(', ') }}
                  </div>
                  <div v-if="product.shippingInfo.freeShipping" class="rounded-2xl bg-white/70 px-3 py-2">Free shipping available</div>
                  <div v-if="product.shippingInfo.shipIn48h" class="rounded-2xl bg-white/70 px-3 py-2">Ships within 48 hours</div>
                  <div class="rounded-2xl bg-white/70 px-3 py-2">Final shipping and delivery cost are confirmed by the agent.</div>
                </div>
              </div>
            </section>

            <section class="order-2 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-4 xl:order-none">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">Shopping</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">Agent assisted</span>
                <span v-if="product.totalSold" class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">{{ formatNumber(product.totalSold) }} sold</span>
              </div>

              <h1 class="mt-2.5 text-[24px] font-black leading-[1.12] tracking-tight text-slate-950 sm:text-[28px]">{{ product.title }}</h1>

                <div class="mt-2.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                  <div v-if="product.rating" class="flex items-center gap-1">
                    <Star v-for="i in 5" :key="i" class="h-3.5 w-3.5" :class="i <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'" />
                    <span class="ml-1 font-semibold text-slate-700">{{ product.rating.toFixed(1) }}</span>
                  <span v-if="product.ratingCount">({{ product.ratingCount }})</span>
                </div>
                <span v-if="product.sellerName">Seller: {{ product.sellerName }}</span>
              </div>

              <div class="mt-3.5 border-y border-slate-200 py-3.5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Price</div>
                    <div class="mt-1 text-[26px] font-black tracking-tight text-teal-700">
                      <span v-if="product.priceMin && product.priceMax && product.priceMin !== product.priceMax">{{ formatPrice(product.priceMin) }} - {{ formatPrice(product.priceMax) }}</span>
                      <span v-else-if="product.priceMin">{{ formatPrice(product.priceMin) }}</span>
                      <span v-else>BDT on request</span>
                    </div>
                  </div>

                  <div class="flex gap-1 rounded-full border border-slate-200 bg-white p-1">
                    <button
                      v-for="curr in ['BDT', 'CNY', 'USD'] as const"
                      :key="curr"
                      type="button"
                      @click="selectedCurrency = curr"
                      :class="['rounded-full px-3 py-1 text-[11px] font-semibold transition-colors', selectedCurrency === curr ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100']"
                    >
                      {{ curr }}
                    </button>
                  </div>
                </div>

                <div v-if="product.minimumOrderQty || product.shipping?.minimumOrderQty || shippingRateSummary" class="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                  <span v-if="product.minimumOrderQty || product.shipping?.minimumOrderQty" class="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">MOQ {{ product.minimumOrderQty || product.shipping?.minimumOrderQty || 1 }}</span>
                  <span v-if="shippingRateSummary" class="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">{{ shippingRateSummary }}</span>
                </div>

                <div class="mt-2.5 grid gap-2 sm:grid-cols-2">
                  <div v-if="hasWeightInfo" class="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <span class="font-semibold text-slate-800">Weight:</span>
                    {{ estimatedWeightLabel }}
                    <div v-if="estimatedAirShippingRangeLabel" class="mt-1 text-[10px] font-semibold text-teal-700">
                      {{ estimatedAirShippingRangeLabel }}
                    </div>
                  </div>
                  <div v-else class="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                    Weight unknown - agent will confirm
                  </div>
                  <div v-if="product.availableQuantity !== undefined" class="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <span class="font-semibold text-slate-800">Available:</span>
                    {{ formatNumber(product.availableQuantity) }}
                  </div>
                  <div v-if="product.totalSold" class="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <span class="font-semibold text-slate-800">Sold:</span>
                    {{ formatNumber(product.totalSold) }}
                  </div>
                </div>

                <div v-if="product.tieredPricing && product.tieredPricing.length > 0" class="mt-3.5 rounded-[18px] border border-slate-200 bg-white">
                  <div class="border-b border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Tiered pricing</div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="(tier, idx) in product.tieredPricing.slice(0, 6)" :key="idx" class="flex items-center justify-between px-3 py-2 text-[11px]">
                      <span class="text-slate-600">{{ tier.minQty }}{{ tier.maxQty ? ` - ${tier.maxQty}` : '+' }} pcs</span>
                      <span class="font-semibold text-teal-700">{{ formatPrice(tier.price) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-3.5">
                <div v-if="hasVariantRows" class="rounded-[18px] border border-slate-200">
                  <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      <Package class="h-4 w-4 text-slate-500" />
                      Variants
                    </div>
                    <div class="text-[10px] text-slate-400">Pick color, size, quantity</div>
                  </div>
                  <div class="max-h-[260px] divide-y divide-slate-100 overflow-auto">
                    <div v-for="({ sku, idx, label }) in variantRows" :key="sku.specid || sku.skuid || idx" class="flex items-center gap-3 px-3 py-2.5">
                      <button
                        v-if="sku.imageUrl"
                        type="button"
                        class="h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        @click="selectImage(sku.imageUrl)"
                      >
                        <img
                          :src="proxyImageUrl(sku.imageUrl)"
                          :alt="label"
                          class="h-full w-full object-cover"
                          @error="markBrokenImage(sku.imageUrl)"
                        />
                      </button>
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-[11px] font-semibold text-slate-900">{{ label }}</div>
                        <div class="mt-1 text-[10px] text-slate-500">
                          <span v-if="Number(sku.sale_price || sku.price || 0) > 0">{{ formatPrice(Number(sku.sale_price || sku.price || 0)) }}</span>
                          <span v-else>Price on request</span>
                          · Stock {{ formatNumber(sku.stock || 0) }}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                          :disabled="!selectedSkus[sku.specid || idx] || selectedSkus[sku.specid || idx] <= 0"
                          @click="updateSkuQuantity(sku, -1)"
                        >
                          <Minus class="h-3.5 w-3.5" />
                        </button>
                        <input
                          v-model.number="selectedSkus[sku.specid || idx]"
                          type="number"
                          min="0"
                          class="h-8 w-14 rounded-lg border border-slate-200 text-center text-[11px] focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                        />
                        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50" @click="updateSkuQuantity(sku, 1)">
                          <Plus class="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div v-if="totalQuantity > 0 && getUnitPrice() > 0" class="border-t border-slate-200 px-3 py-3">
                    <div class="rounded-[16px] border border-teal-200 bg-teal-50 px-3 py-2 text-[11px]">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold text-slate-700">Total amount</span>
                        <span class="text-[15px] font-black text-teal-700">{{ formatTotalAmount() }}</span>
                      </div>
                      <div class="mt-1 text-slate-500">{{ totalQuantity }} x {{ formatPrice(getUnitPrice()) }}</div>
                    </div>
                  </div>
                </div>

                <div v-else class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-600">Quantity</label>
                    <div class="mt-1 flex items-center gap-2">
                      <button type="button" @click="quantity = Math.max(1, quantity - 1)" class="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                        <Minus class="h-3.5 w-3.5" />
                      </button>
                      <Input v-model.number="quantity" type="number" :min="1" class="h-9 w-24 text-center text-[11px]" />
                      <button type="button" @click="quantity++" class="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50">
                        <Plus class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div v-if="totalQuantity > 0 && getUnitPrice() > 0" class="rounded-[16px] border border-teal-200 bg-teal-50 px-3 py-2 text-[11px]">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-semibold text-slate-700">Total amount</span>
                      <span class="text-[15px] font-black text-teal-700">{{ formatTotalAmount() }}</span>
                    </div>
                    <div class="mt-1 text-slate-500">{{ totalQuantity }} x {{ formatPrice(getUnitPrice()) }}</div>
                  </div>
                </div>
              </div>

              <div class="mt-3.5">
                <div class="grid gap-2 lg:grid-cols-3">
                  <Button variant="primary" @click="buyNow" class="h-11 w-full text-[12px] font-semibold shadow-none">
                    <Truck class="mr-2 h-4 w-4" />
                    Buy Now
                  </Button>
                  <Button variant="accent" style="color: white;" @click="addToCart" class="h-11 w-full text-[12px] font-semibold shadow-none" :disabled="totalQuantity <= 0" :class="totalQuantity <= 0 ? 'cursor-not-allowed opacity-60' : ''">
                    <ShoppingCart class="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button @click="openWhatsApp" class="h-11 w-full border-0 bg-green-600 text-[12px] font-semibold text-white shadow-none hover:bg-green-700">
                    <MessageCircle class="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
                <p class="mt-2 text-center text-[10px] text-slate-500">Payment → we purchase → shipment → get shipment → shipping fee → Happy sourcing.</p>
              </div>
            </section>
          </div>

          <section class="hidden rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                @click="activeTab = tab.key"
                :class="['rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors', activeTab === tab.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100']"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="mt-3">
              <div v-if="activeTab === 'spec'" class="grid gap-3 lg:grid-cols-2">
                <div class="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                  <div class="border-b border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Specification</div>
                  <div v-if="specRows.length > 0" class="divide-y divide-slate-100">
                    <div v-for="row in specRows.slice(0, Math.ceil(specRows.length / 2))" :key="row.label" class="grid grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-3 px-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                  <div v-else class="px-3 py-3 text-[11px] text-slate-500">No structured specification was returned by the provider.</div>
                </div>
                <div class="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                  <div class="border-b border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Specification</div>
                  <div v-if="specRows.length > 0" class="divide-y divide-slate-100">
                    <div v-for="row in specRows.slice(Math.ceil(specRows.length / 2))" :key="row.label" class="grid grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-3 px-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                  <div v-else class="px-3 py-3 text-[11px] text-slate-500">No structured specification was returned by the provider.</div>
                </div>
              </div>

              <div v-else-if="activeTab === 'overview'" class="grid gap-3 lg:grid-cols-2">
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overview</div>
                  <div class="mt-3 space-y-2 text-[11px] text-slate-600">
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Source:</span> Factory sourcing</div>
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Support:</span> B2B concierge in China</div>
                    <div v-if="product.totalSold" class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Sold:</span> {{ formatNumber(product.totalSold) }}</div>
                  </div>
                </div>
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Highlights</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <Badge v-for="tag in product.serviceTags || []" :key="tag" variant="success" class="text-[10px]">{{ tag }}</Badge>
                    <span v-if="!product.serviceTags || product.serviceTags.length === 0" class="text-[11px] text-slate-500">No extra tags provided.</span>
                  </div>
                </div>
              </div>



              <div v-else-if="activeTab === 'seller'" class="grid gap-3 lg:grid-cols-2">
                <div class="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                  <div class="border-b border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Seller info</div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="row in sellerRows.slice(0, Math.ceil(sellerRows.length / 2))" :key="row.label" class="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3 px-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                </div>
                <div class="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                  <div class="border-b border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Seller info</div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="row in sellerRows.slice(Math.ceil(sellerRows.length / 2))" :key="row.label" class="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3 px-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Description</div>
                  <div
                    class="prose prose-sm mt-3 max-w-none columns-1 gap-6 text-[11px] leading-6 text-slate-700 lg:columns-2 lg:gap-10"
                    v-html="organizedDescription"
                  />
                </div>
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overview</div>
                  <div class="mt-3 grid gap-2">
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Source:</span> Factory sourcing</div>
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Support:</span> B2B concierge in China</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                @click="activeTab = tab.key"
                :class="['rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors', activeTab === tab.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100']"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="mt-3">
              <div v-if="activeTab === 'spec'" class="space-y-2">
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="border-b border-slate-200 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Specification</div>
                  <div v-if="specRows.length > 0" class="divide-y divide-slate-100">
                    <div v-for="row in specRows" :key="row.label" class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                  <div v-else class="py-3 text-[11px] text-slate-500">No structured specification was returned by the provider.</div>
                </div>
              </div>

              <div v-else-if="activeTab === 'overview'" class="space-y-2">
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overview</div>
                  <div class="mt-3 space-y-2 text-[11px] text-slate-600">
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Source:</span> Factory sourcing</div>
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Support:</span> B2B concierge in China</div>
                    <div v-if="product.totalSold" class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Sold:</span> {{ formatNumber(product.totalSold) }}</div>
                  </div>
                </div>
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Highlights</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <Badge v-for="tag in product.serviceTags || []" :key="tag" variant="success" class="text-[10px]">{{ tag }}</Badge>
                    <span v-if="!product.serviceTags || product.serviceTags.length === 0" class="text-[11px] text-slate-500">No extra tags provided.</span>
                  </div>
                </div>
              </div>

              <div v-else-if="activeTab === 'seller'" class="space-y-2">
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="border-b border-slate-200 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Seller info</div>
                  <div class="divide-y divide-slate-100">
                    <div v-for="row in sellerRows" :key="row.label" class="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-3 py-2 text-[11px]">
                      <div class="font-medium text-slate-500">{{ row.label }}</div>
                      <div class="font-semibold text-slate-900">{{ row.value }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-2">
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Description</div>
                  <div class="prose prose-sm mt-3 max-w-none text-[11px] leading-6 text-slate-700" v-html="organizedDescription" />
                </div>
                <div class="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overview</div>
                  <div class="mt-3 grid gap-2">
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Source:</span> Factory sourcing</div>
                    <div class="rounded-2xl bg-slate-50 px-3 py-2"><span class="font-semibold text-slate-800">Support:</span> B2B concierge in China</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="hidden rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Suggestions</p>
                <h2 class="mt-1 text-[15px] font-black tracking-tight text-slate-950">Similar products</h2>
              </div>
              <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600" @click="loadSimilarProducts">
                <RefreshCw class="inline-block h-3.5 w-3.5" />
              </button>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <button
                v-for="item in similarProducts.slice(0, 4)"
                :key="item.externalId"
                type="button"
                class="overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 text-left hover:border-teal-200 hover:bg-teal-50/60"
                @click="handleProductClick(item)"
              >
                <div class="aspect-square bg-white">
                  <img
                    v-if="collectImageCandidates(item.imageUrl).length > 0 || collectImageCandidates(item.images).length > 0 || collectImageCandidates(item.raw).length > 0"
                    :src="proxyImageUrl(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0] || collectImageCandidates(item.raw)[0])"
                    :alt="item.title"
                    class="h-full w-full object-cover"
                    @error="markBrokenImage(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0] || collectImageCandidates(item.raw)[0])"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                    <Package class="h-6 w-6" />
                  </div>
                </div>
                <div class="p-2">
                  <p class="line-clamp-2 text-[11px] font-semibold leading-5 text-slate-900">{{ item.title }}</p>
                  <div class="mt-1 text-[10px] font-bold text-teal-700">
                    <span v-if="item.priceMin">{{ formatPrice(item.priceMin) }}</span>
                    <span v-else>BDT on request</span>
                  </div>
                </div>
              </button>
            </div>
          </section>
          </div>

        <!-- Suggestions -->
        <aside class="space-y-3 xl:sticky xl:top-[72px]">
          <section class="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Purchase</p>
                <h2 class="mt-1 text-[15px] font-black tracking-tight text-red-500">Local Shipping</h2>
              </div>
              <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600" @click="$router.push('/contact')">
                Contact
              </button>
            </div>

            <div class="mt-3 space-y-3">
              <button
                v-for="tab in shippingSummaryTiles"
                :key="tab.label"
                type="button"
                class="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-2.5 text-left"
              >
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-600">
                  <component :is="tab.icon" class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] font-semibold text-slate-900">{{ tab.label }}</p>
                  <p class="mt-0.5 text-[10px] text-slate-500">{{ tab.value }}</p>
                </div>
                <div class="text-[11px] font-black text-teal-700">{{ tab.extra }}</div>
              </button>
            </div>
          </section>

          <section class="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <ShippingCard
              :shipping-data="product.bridgechinaShipping"
              :estimated-weight-kg="product.estimatedWeightKg"
              :quantity="totalQuantity"
              :has-battery="hasBattery"
              :is-sticky="false"
              :currency="selectedCurrency"
              :conversion-rates="conversionRates"
              @method-change="selectedShippingMethod = $event"
              @weight-change="manualWeight = $event"
            />
          </section>

          <section class="rounded-[22px] border border-rose-200 bg-rose-50 p-4 shadow-[0_16px_38px_rgba(15,23,42,0.03)]">
            <div class="flex items-center gap-2 text-rose-700">
              <AlertTriangle class="h-4 w-4" />
              <p class="text-[11px] font-black uppercase tracking-[0.18em]">Weight notice</p>
            </div>
            <p class="mt-2 text-[11px] leading-5 text-rose-700">
              Approximate weight only. Shipping time is 12-14 days. After the product arrives in Bangladesh, the final weight-based shipping charge will be confirmed and paid.
            </p>
            <div class="mt-3 space-y-2">
              <div
                v-for="tile in weightNoticeTiles"
                :key="tile.label"
                class="rounded-[16px] border border-white bg-white px-3 py-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-semibold text-slate-800">{{ tile.label }}</span>
                  <span class="text-[11px] font-black text-teal-700">{{ tile.price }}</span>
                </div>
                <p class="mt-1 text-[10px] text-slate-500">{{ tile.note }}</p>
              </div>
            </div>
          </section>

          <section class="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Suggestions</p>
                <h2 class="mt-1 text-[15px] font-black tracking-tight text-slate-950">Similar products</h2>
              </div>
              <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-600" @click="loadSimilarProducts">
                <RefreshCw class="inline-block h-3.5 w-3.5" />
              </button>
            </div>

            <div class="mt-3 space-y-2.5">
              <button
                v-for="item in similarProducts"
                :key="item.externalId"
                type="button"
                class="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-2.5 text-left hover:border-teal-200 hover:bg-teal-50/60"
                @click="handleProductClick(item)"
              >
                <div class="h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-white">
                  <img
                    v-if="collectImageCandidates(item.imageUrl).length > 0 || collectImageCandidates(item.images).length > 0 || collectImageCandidates(item.raw).length > 0"
                    :src="proxyImageUrl(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0] || collectImageCandidates(item.raw)[0])"
                    :alt="item.title"
                    class="h-full w-full object-cover"
                    @error="markBrokenImage(collectImageCandidates(item.imageUrl)[0] || collectImageCandidates(item.images)[0] || collectImageCandidates(item.raw)[0])"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                    <Package class="h-6 w-6" />
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-[11px] font-semibold leading-5 text-slate-900">{{ item.title }}</p>
                  <div class="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span v-if="item.totalSold">{{ formatNumber(item.totalSold) }} sold</span>
                    <span class="font-bold text-teal-700">
                      <span v-if="item.priceMin">{{ formatPrice(item.priceMin) }}</span>
                      <span v-else>BDT on request</span>
                    </span>
                  </div>
                </div>
              </button>

              <div v-if="similarProducts.length === 0" class="rounded-[18px] border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] text-slate-500">
                Similar products will appear here after the first search.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>


    <div v-else class="mx-auto max-w-[1600px] px-2 py-4 sm:px-3 lg:px-4">
      <EmptyState title="Product not found" description="The product you are looking for does not exist or has been removed." />
      <div class="mt-4 text-center">
        <Button variant="primary" @click="$router.push('/shopping')">Back to Shopping</Button>
      </div>
    </div>


    <div
      v-if="fullscreenImage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      @click="fullscreenImage = null"
    >
      <button class="absolute right-4 top-4 text-white transition-colors hover:text-slate-300" @click="fullscreenImage = null">
        <X class="h-8 w-8" />
      </button>
      <img :src="fullscreenImage" :alt="product?.title" class="max-h-full max-w-full object-contain" @click.stop />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { AlertTriangle, ArrowLeft, MessageCircle, Minus, Package, Play, Plus, RefreshCw, ShoppingCart, Star, Truck, X } from 'lucide-vue-next';
import { Badge, Button, EmptyState, Input } from '@bridgechina/ui';
import { useWhatsApp } from '@/composables/useWhatsApp';
import { useShoppingCart } from '@/composables/useShoppingCart';
import ShippingCard from '@/components/shopping/ShippingCard.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { openWhatsApp: openWhatsAppComposable } = useWhatsApp();
const { addToCart: addToCartComposable } = useShoppingCart();

const product = ref<any>(null);
const loading = ref(true);
const quantity = ref(1);
const selectedImage = ref<string | null>(null);
const brokenGalleryImages = ref<string[]>([]);
const videoRef = ref<HTMLVideoElement | null>(null);
const videoMode = ref<'none' | 'auto' | 'user'>('none');
const selectedSkus = ref<Record<string, number>>({});
const selectedLanguage = ref<'en' | 'zh'>('zh');
const selectedCurrency = ref<'BDT' | 'CNY' | 'USD'>('BDT');
const selectedShippingMethod = ref('');
const hasBattery = ref(false);
const manualWeight = ref<number | null>(null);
const fullscreenImage = ref<string | null>(null);
const similarProducts = ref<any[]>([]);
const activeTab = ref<'overview' | 'spec' | 'seller' | 'description'>('overview');
const conversionRates = ref<{ CNY_TO_BDT?: number; CNY_TO_USD?: number }>({
  CNY_TO_BDT: 15,
  CNY_TO_USD: 0.14,
});
const shoppingSettings = ref<{ shippingRates?: Array<{ method: string; currency: string; min_rate_per_kg: number; max_rate_per_kg: number }> }>({});

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'spec', label: 'Specification' },
  { key: 'seller', label: 'Seller info' },
  { key: 'description', label: 'Description' },
] as const;

const shippingSummaryTiles = computed(() => {
  const data = product.value?.bridgechinaShipping;
  const methods = data?.methods && Array.isArray(data.methods) ? data.methods : [];
  const air = methods[0];
  const sea = methods[1] || methods[0];

  const formatTile = (method: any, fallbackLabel: string, fallbackPrice: string) => ({
    label: fallbackLabel,
    value: method
      ? `${method.label || method.code || 'Confirm with agent'}${method.minKg ? ` · ${method.minKg}kg+` : ''}`
      : 'Confirm with agent',
    extra: method?.ratePerKg
      ? `${formatPrice(method.ratePerKg)} / kg`
      : method?.quoteRequired
        ? 'Quote'
        : fallbackPrice,
    icon: Truck,
  });

  return [
    formatTile(air, 'By air', 'Air'),
    formatTile(sea, 'By sea', 'Sea'),
  ];
});

const weightNoticeTiles = [
  { label: 'By air', price: 'BDT 780 / BDT 1,170 per kg', note: 'Product price 5% OFF' },
  { label: 'By sea', price: 'BDT 670 / BDT 1,400 per kg', note: 'Product price 7% OFF' },
];

const shippingRateSummary = computed(() => {
  const rates = shoppingSettings.value.shippingRates || [];
  if (!rates.length) return '';
  const air = rates.find((rate) => rate.method === 'air');
  const sea = rates.find((rate) => rate.method === 'sea');
  const parts: string[] = [];
  if (air) parts.push(`Air ${air.currency} ${air.min_rate_per_kg}-${air.max_rate_per_kg}/kg`);
  if (sea) parts.push(`Sea ${sea.currency} ${sea.min_rate_per_kg}-${sea.max_rate_per_kg}/kg`);
  return parts.join(' · ');
});

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

function canonicalizeImageKey(url: string | null | undefined): string {
  const text = String(url || '').trim();
  if (!text) return '';
  if (text.startsWith('data:image/')) return text;

  const proxyPrefix = '/api/public/image-proxy?url=';
  if (text.startsWith(proxyPrefix)) {
    try {
      const decoded = decodeURIComponent(text.slice(proxyPrefix.length));
      return canonicalizeImageKey(decoded);
    } catch {
      return text;
    }
  }

  try {
    const parsed = new URL(text, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return `${parsed.hostname.toLowerCase()}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return text.split('#')[0].split('?')[0].trim().toLowerCase();
  }
}

function collectImageCandidates(input: any): string[] {
  const values: string[] = [];
  const seen = new Set<any>();
  const imageKeyPatterns = ['image', 'picture', 'photo', 'thumb', 'preview', 'gallery', 'main', 'url', 'src'];

  const walk = (node: any, keyHint = '') => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      const text = node.trim();
      if (text && (isRenderableImageUrl(text) || text.startsWith('/api/public/image-proxy?url='))) {
        values.push(text);
      }
      return;
    }
    if (typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item, keyHint);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const keyLower = String(key || '').toLowerCase();
      const nextHint = keyLower || keyHint;
      if (typeof value === 'string') {
        const text = value.trim();
        const shouldCollect =
          imageKeyPatterns.some((needle) => keyLower.includes(needle)) ||
          isRenderableImageUrl(text) ||
          text.startsWith('/api/public/image-proxy?url=');
        if (shouldCollect) values.push(text);
        continue;
      }
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        walk(value, nextHint);
      }
    }
  };

  walk(input);
  return values.filter(Boolean);
}

function dedupeRenderableImages(urls: string[]): string[] {
  const deduped = new Map<string, string>();
  for (const original of urls) {
    const renderable = proxyImageUrl(original);
    if (!renderable || !isRenderableImageUrl(renderable) || brokenGalleryImages.value.includes(renderable)) continue;
    const key = canonicalizeImageKey(original) || canonicalizeImageKey(renderable);
    if (!key) continue;
    if (!deduped.has(key)) deduped.set(key, renderable);
  }
  return Array.from(deduped.values());
}

function isMeaningfulVariantLabelText(text: string): boolean {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/^variant\s*\d+$/i.test(value)) return false;
  if (/^sku-\d+$/i.test(value)) return false;
  if (/^(cny|rmb|usd|bdt|yuan|yen|money|￥|¥|\$|元)(\s*\/\s*(cny|rmb|usd|bdt|yuan|yen|money|￥|¥|\$|元))?$/i.test(value)) return false;
  if (/^[\s\/\-_.]*(cny|rmb|usd|bdt|yuan|yen|money|price|rating|stock|sold|currency|qty|quantity|order|offer|amount|score|salesinlast30days|encrypted_vendor_id|salenum|normalizedrating|userid|vendorid)[\s\/\-_.]*$/i.test(value)) return false;
  if (/\b(price|rating|stock|sold|currency|qty|quantity|order|offer|amount|score|salesinlast30days|encrypted_vendor_id|salenum|normalizedrating|userid|vendorid)\b/i.test(value)) return false;
  if (!/[a-zA-Z\u4e00-\u9fff]/.test(value)) return false;
  return true;
}

function getVariantLabel(sku: any, index: number): string {
  const directCandidates = [
    sku?.props_names,
    sku?.PropsNames,
    sku?.props,
    sku?.Props,
    sku?.name,
    sku?.Name,
    sku?.title,
    sku?.Title,
    sku?.label,
    sku?.Label,
    sku?.variantName,
    sku?.VariantName,
    sku?.optionName,
    sku?.OptionName,
    sku?.specName,
    sku?.SpecName,
    sku?.color,
    sku?.Color,
    sku?.size,
    sku?.Size,
    sku?.material,
    sku?.Material,
    sku?.style,
    sku?.Style,
    sku?.pattern,
    sku?.Pattern,
  ];
  for (const candidate of directCandidates) {
    const text = String(candidate || '').trim();
    if (isMeaningfulVariantLabelText(text)) {
      return text;
    }
  }

  const configSources = [
    sku?.ConfigurationDetails,
    sku?.configurationDetails,
    sku?.Configuration,
    sku?.configuration,
    sku?.Config,
    sku?.config,
    sku?.Properties,
    sku?.properties,
    sku?.Attrs,
    sku?.attrs,
    sku?.Variants,
    sku?.variants,
  ];

  const seen = new Set<string>();
  const labels: string[] = [];
  const collect = (node: any, keyHint = '') => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      const text = node.trim();
      if (isMeaningfulVariantLabelText(text) && !seen.has(text)) {
        seen.add(text);
        labels.push(text);
      }
      return;
    }
    if (typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const entry of node) collect(entry, keyHint);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const keyLower = String(key || '').toLowerCase();
      const looksLabelish = /name|label|title|value|text|option|variant|color|size|material|style|pattern|property|attr|config/i.test(keyLower || keyHint);
      if (typeof value === 'string' && looksLabelish) {
        collect(value, keyLower);
        continue;
      }
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        collect(value, keyLower);
      }
    }
  };

  for (const source of configSources) collect(source);
  if (labels.length > 0) return Array.from(new Set(labels)).join(' / ');
  return `Variant ${index + 1}`;
}

const galleryImages = computed(() => {
  const sources: string[] = [];
  sources.push(...collectImageCandidates(product.value?.imageUrl).map((img) => proxyImageUrl(img)));
  if (Array.isArray(product.value?.images)) {
    sources.push(...collectImageCandidates(product.value.images).map((img) => proxyImageUrl(img)).filter(Boolean));
  }
  if (product.value?.raw) {
    sources.push(...collectImageCandidates(product.value.raw).map((img) => proxyImageUrl(img)).filter(Boolean));
  }
  if (Array.isArray(product.value?.skus)) {
    for (const sku of product.value.skus) {
      sources.push(...collectImageCandidates(sku?.imageUrl).map((img) => proxyImageUrl(img)).filter(Boolean));
      if (Array.isArray(sku?.images)) {
        sources.push(...collectImageCandidates(sku.images).map((img) => proxyImageUrl(img)).filter(Boolean));
      }
    }
  }
  return dedupeRenderableImages(sources);
});

const variantRows = computed(() => {
  const skus = Array.isArray(product.value?.skus) ? product.value.skus : [];
  return skus
    .map((sku: any, idx: number) => ({ sku, idx, label: getVariantLabel(sku, idx) }))
    .filter((row) => isMeaningfulVariantLabelText(row.label));
});

const hasVariantRows = computed(() => variantRows.value.length > 0);
const showGalleryThumbs = computed(() => galleryImages.value.length > 1 || !!product.value?.videoUrl);
const galleryThumbMode = computed(() => {
  const count = galleryImages.value.length;
  if (count <= 1 && !product.value?.videoUrl) return 'none';
  return count <= 5 ? 'inline' : 'rail';
});
const desktopThumbButtonClass = computed(() => (galleryImages.value.length <= 7 ? 'h-20 w-20' : 'h-14 w-14'));
const desktopThumbTrackClass = computed(() => (galleryImages.value.length <= 7 ? 'justify-center gap-3 mx-auto w-fit' : 'justify-start gap-2 min-w-max'));

const activeMediaUrl = computed(() => {
  const selected = selectedImage.value && !brokenGalleryImages.value.includes(selectedImage.value) ? selectedImage.value : null;
  const primaryCandidate = collectImageCandidates(product.value?.imageUrl).map((img) => proxyImageUrl(img)).find((img) => !brokenGalleryImages.value.includes(img)) || '';
  const rawCandidate = product.value?.raw
    ? collectImageCandidates(product.value.raw).map((img) => proxyImageUrl(img)).find((img) => !brokenGalleryImages.value.includes(img)) || ''
    : '';
  const primary = primaryCandidate && !brokenGalleryImages.value.includes(primaryCandidate)
    ? primaryCandidate
    : rawCandidate || null;
  return selected || primary || galleryImages.value[0] || null;
});

const showVideo = computed(() => !!(product.value?.videoUrl && selectedImage.value === product.value.videoUrl && videoMode.value !== 'none'));

const hasWeightInfo = computed(() =>
  (
    product.value?.estimatedWeightKg !== null &&
    product.value?.estimatedWeightKg !== undefined
  ) ||
  (
    product.value?.weight_kg !== null &&
    product.value?.weight_kg !== undefined
  ) ||
  (
    product.value?.shipping?.weight_kg !== null &&
    product.value?.shipping?.weight_kg !== undefined
  )
);

const estimatedWeightLabel = computed(() => {
  if (!hasWeightInfo.value) return 'unknown';
  const weight = product.value?.estimatedWeightKg ?? product.value?.weight_kg ?? product.value?.shipping?.weight_kg;
  const numericWeight = Number(weight);
  return `${formatWeight(Number.isFinite(numericWeight) ? numericWeight : 0)} kg`;
});

const effectiveWeightKg = computed(() => {
  const manual = Number(manualWeight.value);
  if (Number.isFinite(manual) && manual > 0) return manual;
  const derived = Number(product.value?.estimatedWeightKg ?? product.value?.weight_kg ?? product.value?.shipping?.weight_kg ?? 0);
  return Number.isFinite(derived) && derived > 0 ? derived : 0;
});

const estimatedAirShippingRangeLabel = computed(() => {
  const weight = effectiveWeightKg.value;
  if (!weight || totalQuantity.value <= 0) return '';
  const lowPerKg = 780;
  const highPerKg = 1200;
  const multiplier = weight * totalQuantity.value;
  const low = multiplier * lowPerKg;
  const high = multiplier * highPerKg;
  return `Air estimate: BDT ${Math.round(low).toLocaleString()} - BDT ${Math.round(high).toLocaleString()}`;
});

const totalQuantity = computed(() => {
  if (hasVariantRows.value && Object.keys(selectedSkus.value).length > 0) {
    const total = Object.values(selectedSkus.value).reduce((sum, qty) => sum + qty, 0);
    return total > 0 ? total : quantity.value;
  }
  return quantity.value;
});

const specRows = computed(() => {
  const rows: Array<{ label: string; value: string }> = [];
  const propsList = Array.isArray(product.value?.productProps) ? product.value.productProps : [];
  const specsList = Array.isArray(product.value?.specifications) ? product.value.specifications : [];
  const sourceRows = propsList.length > 0 ? propsList : specsList;

  for (const prop of sourceRows) {
    if (!prop || typeof prop !== 'object') continue;
    const entries = Object.entries(prop as Record<string, any>).filter(([key]) => key !== 'imageUrl' && key !== 'images');
    if (entries.length === 0) continue;
    const [label, value] = entries[0];
    rows.push({ label, value: String(value ?? '-') });
  }
  if (product.value?.availableQuantity !== undefined) {
    rows.unshift({ label: 'Available quantity', value: formatNumber(product.value.availableQuantity) });
  }
  if (product.value?.priceMin) {
    rows.unshift({ label: 'Price', value: formatPrice(product.value.priceMin) });
  }
  return rows;
});

const sellerRows = computed(() => {
  const rows: Array<{ label: string; value: string }> = [];
  if (product.value?.sellerName) rows.push({ label: 'Seller', value: String(product.value.sellerName) });
  if (product.value?.sellerTitle) rows.push({ label: 'Title', value: String(product.value.sellerTitle) });
  if (product.value?.sourceUrl) rows.push({ label: 'Source URL', value: String(product.value.sourceUrl) });

  const sellerInfo = product.value?.sellerInfo;
  if (sellerInfo && typeof sellerInfo === 'object') {
    for (const [label, value] of Object.entries(sellerInfo)) {
      if (rows.length >= 8) break;
      rows.push({ label, value: String(value ?? '-') });
    }
  }

  return rows.length > 0 ? rows : [{ label: 'Seller', value: 'Information not provided by provider' }];
});

const organizedDescription = computed(() => {
  const desc = String(product.value?.description || '').trim();
  if (!desc) return '';

  if (/<\w[\s\S]*>/.test(desc)) return desc;

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const lines = desc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((line) => /^[-*â€¢]\s+/.test(line));
  const text = lines.filter((line) => !/^[-*â€¢]\s+/.test(line));

  const parts: string[] = [];
  if (text.length > 0) parts.push(text.map((line) => `<p>${escapeHtml(line)}</p>`).join(''));
  if (bullets.length > 0) {
    parts.push(
      `<ul>${bullets
        .map((line) => line.replace(/^[-*â€¢]\s+/, ''))
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join('')}</ul>`
    );
  }

  return parts.join('');
});

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function formatWeight(kg: number): string {
  return kg.toFixed(2).replace(/\.?0+$/, '');
}

function formatPrice(price: number): string {
  const curr = selectedCurrency.value;
  if (curr === 'CNY') return `CNY ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (curr === 'BDT') {
    const rate = conversionRates.value.CNY_TO_BDT || 15;
    return `BDT ${(price * rate).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  const rate = conversionRates.value.CNY_TO_USD || 0.14;
  return `$${(price * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getUnitPrice(): number {
  if (!product.value) return 0;
  if (product.value.tieredPricing && product.value.tieredPricing.length > 0) {
    const matchingTier = product.value.tieredPricing.slice().reverse().find((tier: any) => totalQuantity.value >= tier.minQty);
    if (matchingTier) return matchingTier.price;
    return product.value.tieredPricing[0].price;
  }
  return product.value.priceMin || product.value.priceMax || 0;
}

function formatTotalAmount(): string {
  return formatPrice(getUnitPrice() * totalQuantity.value);
}

function selectImage(img: string) {
  selectedImage.value = proxyImageUrl(img);
  videoMode.value = 'none';
}

function selectVideo() {
  if (!product.value?.videoUrl) return;
  selectedImage.value = product.value.videoUrl;
  videoMode.value = 'user';
}

async function tryAutoplayVideo() {
  if (!product.value?.videoUrl || videoMode.value !== 'auto' || !videoRef.value) return;
  try {
    videoRef.value.muted = true;
    await videoRef.value.play();
  } catch {
    videoMode.value = 'none';
    selectedImage.value = galleryImages.value[0] || product.value?.imageUrl || null;
  }
}

function openFullscreen(imageUrl: string | null) {
  if (imageUrl) fullscreenImage.value = imageUrl;
}

function markBrokenImage(img: string | null | undefined) {
  const normalized = proxyImageUrl(img);
  if (!normalized) return;
  if (!brokenGalleryImages.value.includes(normalized)) {
    brokenGalleryImages.value.push(normalized);
  }

  const current = selectedImage.value ? proxyImageUrl(selectedImage.value) : null;
  if (current && current === normalized) {
    const replacement = galleryImages.value.find((candidate) => !brokenGalleryImages.value.includes(candidate) && candidate !== normalized)
      || (product.value?.videoUrl ? proxyImageUrl(product.value.imageUrl) : null)
      || (product.value?.raw ? proxyImageUrl(collectImageCandidates(product.value.raw)[0]) : null)
      || proxyImageUrl(product.value?.imageUrl)
      || null;
    selectedImage.value = replacement;
  }
}

function handleProductClick(item: any) {
  router.push({ path: `/shopping/item/${item.externalId}`, query: { language: selectedLanguage.value } });
}

function updateSkuQuantity(sku: any, delta: number) {
  const key = sku.specid || sku.skuid || String(Math.random());
  const current = selectedSkus.value[key] || 0;
  selectedSkus.value[key] = Math.max(0, current + delta);
}

async function loadSimilarProducts() {
  try {
    const response = await axios.get('/api/public/shopping/hot', { params: { page: 1, pageSize: 5 } });
    const products = Array.isArray(response.data) ? response.data : [];
    similarProducts.value = products.filter((p: any) => p.externalId !== product.value?.externalId).slice(0, 8);
  } catch (error) {
    console.error('Failed to load similar products:', error);
    similarProducts.value = [];
  }
}

async function loadShopSettings() {
  try {
    const response = await axios.get('/api/public/shopping/settings');
    shoppingSettings.value = response.data || {};
  } catch (error) {
    console.error('Failed to load shopping settings', error);
    shoppingSettings.value = {};
  }
}

async function loadProduct() {
  loading.value = true;
  try {
    const externalId = route.params.externalId as string;
    const query = route.query as { language?: string };
    const language = query.language === 'en' ? 'en' : 'zh';
    selectedLanguage.value = language;
    quantity.value = 1;
    selectedSkus.value = {};
    videoMode.value = 'none';
    selectedImage.value = null;
    const response = await axios.get(`/api/public/shopping/item/${externalId}`, { params: { language } });
    product.value = response.data;
    brokenGalleryImages.value = [];
    await nextTick();

    if (product.value?.videoUrl) {
      videoMode.value = 'auto';
      selectedImage.value = product.value.videoUrl;
      await nextTick();
      await tryAutoplayVideo();
    } else {
      const initialImage = galleryImages.value.find((img) => !brokenGalleryImages.value.includes(img))
        || (product.value?.raw ? proxyImageUrl(collectImageCandidates(product.value.raw)[0]) : null)
        || proxyImageUrl(product.value?.imageUrl)
        || null;
      selectedImage.value = initialImage;
    }

    await loadSimilarProducts();
  } catch (error: any) {
    if (error.response?.status === 404) {
      product.value = null;
    } else {
      toast.error('Failed to load product');
    }
  } finally {
    loading.value = false;
  }
}

function buildSkuDetails() {
  if (!hasVariantRows.value || Object.keys(selectedSkus.value).length === 0) {
    return undefined;
  }

  const skuDetails: any[] = [];
  for (const [specId, qty] of Object.entries(selectedSkus.value)) {
    if (qty <= 0) continue;
    const sku = variantRows.value.find((row) => (row.sku.specid || row.sku.skuid) === specId)?.sku;
    if (sku) skuDetails.push({ specId, qty, sku });
  }
  return skuDetails.length > 0 ? skuDetails : undefined;
}

function buyNow() {
  try {
    if (!product.value || totalQuantity.value <= 0) {
      toast.error('Please select a quantity');
      return;
    }

    const skuDetails = buildSkuDetails();
    addToCartComposable(product.value, totalQuantity.value, skuDetails);
    toast.success('Added to cart');
    router.push('/shopping/cart');
  } catch (error) {
    toast.error('Failed to add item to cart');
  }
}

function addToCart() {
  if (!product.value || totalQuantity.value <= 0) {
    toast.error('Please select a quantity');
    return;
  }

  let skuDetails: any[] | undefined;
  if (hasVariantRows.value && Object.keys(selectedSkus.value).length > 0) {
    skuDetails = [];
    for (const [specId, qty] of Object.entries(selectedSkus.value)) {
      if (qty <= 0) continue;
      const sku = variantRows.value.find((row) => (row.sku.specid || row.sku.skuid) === specId)?.sku;
      if (sku) skuDetails.push({ specId, qty, sku });
    }
  }

  addToCartComposable(product.value, totalQuantity.value, skuDetails && skuDetails.length > 0 ? skuDetails : undefined);
  toast.success('Added to cart');
}

function openWhatsApp() {
  const message = `Hi, I'm interested in getting a quote for ${product.value?.title || 'this product'}`;
  openWhatsAppComposable(message);
}

watch(selectedImage, async () => {
  if (product.value?.videoUrl && selectedImage.value === product.value.videoUrl && videoMode.value === 'auto') {
    await nextTick();
    await tryAutoplayVideo();
  }
});

watch(
  () => route.params.externalId,
  async () => {
    await loadProduct();
  }
);

onMounted(() => {
  Promise.all([loadProduct(), loadShopSettings()]);
});
</script>
