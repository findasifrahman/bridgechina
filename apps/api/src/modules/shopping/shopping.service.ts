/**
 * Shopping Service
 * Orchestrates TMAPI calls with caching
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import tmapiClient from './tmapi.client.js';
import {
  normalizeProductCards,
  normalizeProductDetail,
  getProxiedImageUrl,
  ProductCard,
  ProductDetail,
} from './shopping.normalize.js';
import {
  generateCacheKey,
  getCachedSearch,
  setCachedSearch,
  getCachedItem,
  setCachedItem,
} from './cache.js';
import { translateChineseTextToEnglish, translateKeywordToChinese } from './googleTranslate.js';
import {
  buildChineseShoppingQuery,
  buildShoppingSearchContext,
  hasChineseCharacters,
  type ShoppingSearchContext,
} from './search.synonyms.js';
const SOURCE = 'tmapi_1688';
const MENU_CACHE_TTL_MINUTES = 60 * 24 * 7;
let markupCache: { percent: number; fetchedAt: number } = { percent: 0, fetchedAt: 0 };

// Singleflight: collapse concurrent identical TMAPI requests into one
const _inFlight = new Map<string, Promise<any>>();
function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = _inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => _inFlight.delete(key));
  _inFlight.set(key, promise);
  return promise;
}

function normalizeKeywordForChineseSearch(keyword: string): string {
  return keyword
    .replace(/\bface\s*id\b/gi, 'face recognition')
    .replace(/\bfaceid\b/gi, 'face recognition')
    .replace(/\battendance\s+machine\b/gi, 'time attendance machine')
    .replace(/\battendance\s+device\b/gi, 'time attendance machine')
    .replace(/\bbiometric\s+attendance\b/gi, 'biometric time attendance')
    .replace(/\s+/g, ' ')
    .trim();
}

async function translateProductDisplayText(text: any): Promise<string | undefined> {
  const source = String(text || '').trim();
  if (!source) return undefined;
  const translated = await translateChineseTextToEnglish(source);
  return translated || source;
}

async function applyEnglishDisplayTranslations(detail: ProductDetail): Promise<ProductDetail> {
  const originalTitle = detail.title;
  const translatedTitle = await translateProductDisplayText(originalTitle);
  if (translatedTitle && translatedTitle !== originalTitle) {
    detail.titleOrigin = originalTitle;
    detail.title = translatedTitle;
  }

  if (Array.isArray(detail.skus) && detail.skus.length > 0) {
    const labelBySource = new Map<string, string>();
    const sourceLabels = Array.from(new Set(
      detail.skus
        .map((sku: any) => String(sku?.props_names || sku?.name || sku?.title || sku?.label || '').trim())
        .filter(Boolean),
    ));

    await Promise.all(sourceLabels.map(async (sourceLabel) => {
      const translated = await translateProductDisplayText(sourceLabel);
      if (translated) labelBySource.set(sourceLabel, translated);
    }));

    detail.skus = detail.skus.map((sku: any) => {
      const sourceLabel = String(sku?.props_names || sku?.name || sku?.title || sku?.label || '').trim();
      const translatedLabel = sourceLabel ? labelBySource.get(sourceLabel) : undefined;
      if (!translatedLabel || translatedLabel === sourceLabel) return sku;
      return {
        ...sku,
        props_names_origin: sku?.props_names || sourceLabel,
        props_names: translatedLabel,
        label_origin: sku?.label || undefined,
        label: translatedLabel,
      };
    });
  }

  return detail;
}

async function translateProductCardTitle(card: ProductCard): Promise<ProductCard> {
  const originalTitle = card.title;
  const translatedTitle = await translateProductDisplayText(originalTitle);
  if (!translatedTitle || translatedTitle === originalTitle) return card;

  const translatedCard = {
    ...card,
    titleOrigin: card.titleOrigin || originalTitle,
    title: translatedTitle,
  };

  if (translatedCard.externalId) {
    prisma.externalCatalogItem.updateMany({
      where: {
        source: SOURCE,
        external_id: translatedCard.externalId,
      },
      data: {
        title_en: translatedTitle,
        title: translatedTitle,
      },
    }).catch((error: any) => {
      console.warn('[Shopping Service] Failed to persist translated card title:', {
        externalId: translatedCard.externalId,
        error: error.message,
      });
    });
  }

  return translatedCard;
}

export async function translateProductCardTitles(cards: ProductCard[]): Promise<ProductCard[]> {
  return Promise.all(cards.map(translateProductCardTitle));
}

function applyPercent(value: number | undefined, percent: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return value;
  return Number((value * (1 + percent / 100)).toFixed(2));
}

async function getTmapiMarkupPercent(): Promise<number> {
  const ttl = 5 * 60 * 1000;
  const now = Date.now();
  if (now - markupCache.fetchedAt < ttl) {
    return markupCache.percent;
  }

  try {
    const setting = await prisma.sourceMarkupSetting.findUnique({
      where: { source_kind: SOURCE },
    });
    const percent = setting?.percent_rate ?? 0;
    markupCache = { percent, fetchedAt: now };
    return percent;
  } catch {
    return markupCache.percent;
  }
}

async function applyMarkupToCards(cards: ProductCard[]): Promise<ProductCard[]> {
  const percent = await getTmapiMarkupPercent();
  const marked = percent
    ? cards.map((card) => ({
        ...card,
        priceMin: applyPercent(card.priceMin, percent),
        priceMax: applyPercent(card.priceMax, percent),
      }))
    : cards;
  return filterPricedCards(marked);
}

async function applyMarkupToDetail(detail: ProductDetail): Promise<ProductDetail> {
  const percent = await getTmapiMarkupPercent();
  if (!percent) return detail;

  const markedSkus = Array.isArray(detail.skus)
    ? detail.skus.map((sku: any) => ({
        ...sku,
        sale_price: applyPercent(typeof sku?.sale_price === 'number' ? sku.sale_price : Number(sku?.sale_price || 0), percent) ?? sku?.sale_price,
        price: applyPercent(typeof sku?.price === 'number' ? sku.price : Number(sku?.price || 0), percent) ?? sku?.price,
      }))
    : detail.skus;

  return {
    ...detail,
    priceMin: applyPercent(detail.priceMin, percent),
    priceMax: applyPercent(detail.priceMax, percent),
    skus: markedSkus,
    tieredPricing: detail.tieredPricing?.map((tier) => ({
      ...tier,
      price: applyPercent(tier.price, percent) ?? tier.price,
    })),
  };
}

const CURATED_CATEGORY_DEFS = [
  { slug: 'phone-accessories', label: 'Mobile accessories', keywords: ['mobile accessories', 'phone accessories', 'phone cover', 'phone charger', 'phone glass', 'power bank'] },
  { slug: 'bags', label: 'Bags', keywords: ['bag', 'bags', 'handbag', 'backpack', 'tote', 'wallet', 'suitcase'] },
  { slug: 'jewelry', label: 'Jewellery', keywords: ['jewelry', 'jewellery', 'jwellary', 'necklace', 'ring', 'bracelet', 'earring'] },
  { slug: 'furniture', label: 'Furniture', keywords: ['furniture', 'sofa', 'chair', 'table', 'wardrobe', 'bookshelf', 'cabinet'] },
  { slug: 'kitchenware', label: 'Kitchen items', keywords: ['kitchen items', 'kitchenware', 'kitchen', 'cookware', 'tableware', 'utensil', 'pot', 'pan', 'kitchen utensil', 'dish brush', 'sponge', 'loofah', 'sink rack', 'cleaning cloth'] },
  { slug: 'watches', label: 'Kids and mens watch', keywords: ['watch', 'watches', 'kids watch', 'kid watch', 'mens watch', 'men watch', 'smart watch', 'wrist watch', 'boys watch', 'digital watch', 'sport watch', 'analog watch'] },
] as const;

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '');
  return (
    error?.name === 'PrismaClientInitializationError' ||
    message.includes("Can't reach database server") ||
    message.includes('P1001') ||
    message.includes('P1017')
  );
}

function normalizeSearchCacheSignature(entry: any): string {
  const queryJson = entry?.query_json;
  let queryValue: any = queryJson;
  if (typeof queryJson === 'string') {
    try {
      queryValue = JSON.parse(queryJson);
    } catch {
      queryValue = {};
    }
  }

  const keyword = String(queryValue?.keyword || queryValue?.keywords || queryValue?.q || '').trim().toLowerCase();
  const category = String(queryValue?.category || '').trim().toLowerCase();
  return `${category || 'no-category'}::${keyword || 'no-keyword'}`;
}

function extractSearchCacheItems(entry: any): any[] {
  const resultsJson = entry?.results_json as any;
  return resultsJson?.data?.items || resultsJson?.items || [];
}

function buildSearchCacheBuckets(entries: any[]): Array<{ entry: any; items: any[] }> {
  const seen = new Set<string>();
  const buckets: Array<{ entry: any; items: any[] }> = [];

  for (const entry of entries) {
    const signature = normalizeSearchCacheSignature(entry);
    if (seen.has(signature)) continue;
    const items = extractSearchCacheItems(entry);
    if (!Array.isArray(items) || items.length === 0) continue;
    seen.add(signature);
    buckets.push({ entry, items });
  }

  return buckets;
}

function hasDisplayablePrice(card: Pick<ProductCard, 'priceMin' | 'priceMax'>): boolean {
  const candidates = [card.priceMin, card.priceMax].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return candidates.some((value) => value > 0);
}

function filterPricedCards(cards: ProductCard[]): ProductCard[] {
  return cards.filter((card) => hasDisplayablePrice(card));
}

function buildFallbackCardFromCatalogItem(c: any): ProductCard | null {
  if (!c?.external_id) return null;
  const mainImages = Array.isArray(c.main_images) ? c.main_images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0) : [];
  return {
    source: SOURCE,
    externalId: c.external_id,
    title: c.title_en || c.title || c.external_id,
    priceMin: c.price_min ?? undefined,
    priceMax: c.price_max ?? undefined,
    currency: (c.currency || 'CNY') as 'CNY',
    imageUrl: mainImages[0] ? getProxiedImageUrl(mainImages[0]) : undefined,
    images: mainImages.length > 0 ? mainImages.map(getProxiedImageUrl) : undefined,
    sourceUrl: c.source_url || undefined,
    raw: {
      title: c.title_en || c.title || c.external_id,
      externalId: c.external_id,
      priceMin: c.price_min,
      priceMax: c.price_max,
      imageUrl: mainImages[0],
      images: mainImages,
    },
  };
}

// Shopping categories with subcategories
export const SHOPPING_CATEGORIES = [
  { 
    slug: 'electronics', 
    name: 'Electronics',
    icon: '📱',
    subcategories: ['iPhone', 'Xiaomi', 'Laptop', 'Tablet', 'Headphones', 'Camera', 'Smartwatch', 'Charger']
  },
  { 
    slug: 'clothing', 
    name: 'Clothing & Apparel',
    icon: '👕',
    subcategories: ['T-Shirt', 'Jeans', 'Dress', 'Jacket', 'Shoes', 'Accessories', 'Underwear', 'Socks']
  },
  { 
    slug: 'home', 
    name: 'Home & Garden',
    icon: '🏠',
    subcategories: ['Furniture', 'Kitchen', 'Bedding', 'Decoration', 'Garden', 'Lighting', 'Storage', 'Tools']
  },
  { 
    slug: 'toys', 
    name: 'Toys & Games',
    icon: '🧸',
    subcategories: ['Action Figures', 'Board Games', 'Puzzles', 'Educational', 'Outdoor', 'RC Toys', 'Dolls', 'Building Blocks']
  },
  { 
    slug: 'beauty', 
    name: 'Beauty & Personal Care',
    icon: '💄',
    subcategories: ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Tools', 'Men\'s Care', 'Bath & Body', 'Nail Care']
  },
  { 
    slug: 'sports', 
    name: 'Sports & Outdoors',
    icon: '⚽',
    subcategories: ['Fitness', 'Running', 'Cycling', 'Camping', 'Swimming', 'Yoga', 'Outdoor Gear', 'Sports Apparel']
  },
  { 
    slug: 'automotive', 
    name: 'Automotive',
    icon: '🚗',
    subcategories: ['Car Parts', 'Accessories', 'Tools', 'Maintenance', 'Electronics', 'Interior', 'Exterior', 'Motorcycle']
  },
  { 
    slug: 'industrial', 
    name: 'Industrial & Business',
    icon: '🏭',
    subcategories: ['Machinery', 'Tools', 'Equipment', 'Supplies', 'Safety', 'Packaging', 'Office', 'Materials']
  },
  { 
    slug: 'jewelry', 
    name: 'Jewelry',
    icon: '💍',
    subcategories: ['Necklace', 'Ring', 'Earring', 'Bracelet', 'Pendant', 'Brooch', 'Hair Accessories', 'Anklet']
  },
  { 
    slug: 'eyewear', 
    name: 'Eyewear',
    icon: '👓',
    subcategories: ['Sunglasses', 'Reading Glasses', 'Frames', 'Lenses', 'Cases', 'Accessories', 'Prescription', 'Fashion']
  },
  { 
    slug: 'chocolate', 
    name: 'Chocolate',
    icon: '🍫',
    subcategories: ['Dark Chocolate', 'Milk Chocolate', 'White Chocolate', 'Truffles', 'Bars', 'Gift Box', 'Bulk', 'Sugar Free']
  },
];

/**
 * Get shopping categories
 */
export async function getCategories() {
  return SHOPPING_CATEGORIES;
}

/**
 * Search result with pagination metadata
 */
export interface SearchResult {
  items: ProductCard[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  hasNextPage?: boolean;
}

/**
 * Search by keyword with caching - also caches individual items to ExternalCatalogItem
 */
export async function searchByKeyword(
  keyword: string | undefined,
  opts?: {
    category?: string;
    page?: number;
    pageSize?: number;
    sort?: string; // 'sales', 'price_asc', 'price_desc', 'popular', 'default'
    language?: string; // 'en' for English, 'zh' for Chinese (default)
    synonymHints?: string[];
    vendorId?: string;
    minPrice?: number;
    maxPrice?: number;
  }
): Promise<SearchResult> {
  if (opts?.vendorId) {
    return searchByVendorId(opts.vendorId, {
      page: opts.page,
      pageSize: opts.pageSize,
      sort: opts.sort,
      language: opts.language,
      keyword,
    });
  }

  // If no keyword but category provided, use category name as keyword
  const baseKeyword = keyword?.trim() || opts?.category || 'products';
  const hasUserKeyword = !!keyword?.trim();
  const searchContext = buildShoppingSearchContext(baseKeyword, opts?.category);
  const language = opts?.language || 'zh';
  let searchKeyword = language === 'en'
    ? baseKeyword
    : hasUserKeyword
      ? normalizeKeywordForChineseSearch(baseKeyword)
      : searchContext.primaryKeyword || baseKeyword;
  const strongShoppingSignal =
    searchContext.matchedGroupSlugs.length > 0 ||
    searchContext.matchedSubgroupSlugs.length > 0 ||
    searchContext.buyerIntentTerms.length > 0;

  // Prefer Chinese search terms only for TMAPI's native Chinese endpoint.
  // The English/global endpoint works best with English accessory terms such as
  // "phone case"; translating those before calling it can broaden the result set.
  if (language !== 'en' && searchKeyword && searchKeyword !== 'products' && !hasChineseCharacters(searchKeyword)) {
    try {
      const translated = await translateKeywordToChinese(searchKeyword);
      const fallbackChinese = buildChineseShoppingQuery(searchKeyword, opts?.category);
      const chosen = translated && translated !== searchKeyword
        ? translated
        : !hasUserKeyword && strongShoppingSignal
          ? fallbackChinese
          : '';
      if (chosen && chosen !== searchKeyword) {
        console.log('[Shopping Service] Chinese keyword selected:', {
          originalKeyword: keyword,
          normalizedKeyword: searchKeyword,
          chosen,
          fallbackChinese,
          usedGoogleTranslation: translated && translated !== searchKeyword,
        });
        searchKeyword = chosen;
      }
    } catch (error: any) {
      const fallbackChinese = buildChineseShoppingQuery(searchKeyword, opts?.category);
      if (!hasUserKeyword && strongShoppingSignal && fallbackChinese && fallbackChinese !== searchKeyword) {
        console.log('[Shopping Service] Translation failed, using fallback Chinese query:', { original: searchKeyword, fallbackChinese });
        searchKeyword = fallbackChinese;
      } else {
        console.warn('[Shopping Service] Translation failed, using original keyword:', error.message);
      }
    }
  }
  
  console.log('[Shopping Service] searchByKeyword called:', { 
    originalKeyword: keyword, 
    searchKeyword,
    language,
    opts,
    synonymHints: opts?.synonymHints?.slice(0, 12),
  });
  
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const category = opts?.category || undefined;
  const sort = opts?.sort || 'sales'; // Default to sales sort
  
  // Include all params explicitly in cache key to avoid collisions
  const cacheKey = generateCacheKey('keyword', { 
    keyword: searchKeyword, 
    language, 
    category,
    sort,
    page,
    pageSize,
  });
  console.log('[Shopping Service] Cache key:', cacheKey);

  // Check search cache
  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    console.log('[Shopping Service] Using cached search results');
    // getCachedSearch returns cached.results_json, which is the full TMAPI response
    // Structure: { code: 200, msg: "success", data: { items: [...], total_count: ... } }
    const items = cached?.data?.items || cached?.items || [];
    const normalized = await applyMarkupToCards(normalizeProductCards(items));
    const totalCount = cached?.data?.total_count || normalized.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    console.log('[Shopping Service] Cached results:', {
      itemsCount: normalized.length,
      totalCount,
      totalPages,
      hasNextPage,
    });
    return {
      items: normalized,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage,
    };
  }

  console.log('[Shopping Service] Calling TMAPI...');
  try {
    // Call TMAPI - use multilingual API if language is 'en', otherwise use regular API
    const response = language === 'en'
      ? await tmapiClient.searchByKeywordMultilingual(searchKeyword, language, opts)
      : await tmapiClient.searchByKeyword(searchKeyword, opts);
    console.log('[Shopping Service] TMAPI response received:', {
      responseCode: response.code,
      responseMsg: response.msg,
      hasData: !!response.data,
      hasDataItems: !!response.data?.items,
      responseKeys: Object.keys(response),
      dataKeys: response.data ? Object.keys(response.data) : [],
      itemsCount: response.data?.items?.length || 0,
      totalCount: response.data?.total_count,
      responseSample: JSON.stringify(response).substring(0, 1000),
    });

    // Cache search results
    await setCachedSearch(
      SOURCE,
      cacheKey,
      { keyword: searchKeyword, ...opts },
      response,
      opts?.category ? MENU_CACHE_TTL_MINUTES : undefined,
    );

    // Extract items - TMAPI response structure: { code: 200, msg: "success", data: { items: [...] } }
    // The client returns response.data (the full TMAPI response), so response is already { code, msg, data }
    // So we need response.data.items (not response.data.data.items)
    const items = response.data?.items || response.items || response.result || [];
    console.log('[Shopping Service] Extracted items count:', items.length);
    const normalized = await applyMarkupToCards(normalizeProductCards(items));
    const totalCount = response.data?.total_count || normalized.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Cache each item to ExternalCatalogItem (async, don't wait)
    normalized.forEach((item) => {
      // Fire and forget - cache items in background
      cacheProductItem(item).catch(err => {
        console.error(`[Shopping] Failed to cache item ${item.externalId}:`, err);
      });
    });

    console.log('[Shopping Service] Normalized items count:', normalized.length);
    const hasNextPage = page < totalPages;
    return {
      items: normalized,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage,
    };
  } catch (error: any) {
    console.error('[Shopping Service] TMAPI error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // Fallback to cached items from ExternalCatalogItem when TMAPI fails
    console.log('[Shopping Service] Falling back to cached items from database...');
    try {
      // Search cached items by keyword in title (case-insensitive)
      const where: any = {
        source: SOURCE,
        expires_at: { gt: new Date() },
      };
      
      // If keyword provided, search in title
      if (searchKeyword && searchKeyword !== 'products') {
        where.title = { contains: searchKeyword, mode: 'insensitive' };
      }
      
      const cachedItems = await prisma.externalCatalogItem.findMany({
        where,
        orderBy: { last_synced_at: 'desc' },
        take: pageSize * 2, // Get more to account for filtering
      });
      
      const normalized: ProductCard[] = [];
      for (const cached of cachedItems) {
        if (cached.raw_json) {
          try {
            const item = normalizeProductDetail(cached.raw_json as any);
            if (cached.title_en) {
              item.title = cached.title_en;
            }
            normalized.push(item);
            if (normalized.length >= pageSize) break;
          } catch (err) {
            console.error(`[Shopping] Failed to normalize cached item ${cached.external_id}:`, err);
          }
        }
      }
      
      // Apply pagination
      const start = (page - 1) * pageSize;
      const marked = await applyMarkupToCards(normalized);
      const paginated = marked.slice(start, start + pageSize);
      const totalCount = marked.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      if (paginated.length > 0) {
        console.log(`[Shopping Service] Returning ${paginated.length} cached items as fallback`);
        const hasNextPage = page < totalPages;
        return {
          items: paginated,
          totalCount,
          page,
          pageSize,
          totalPages,
          hasNextPage,
        };
      }
    } catch (fallbackError) {
      console.error('[Shopping Service] Fallback to cached items also failed:', fallbackError);
    }
    
    // If all else fails, return empty result instead of throwing
    console.warn('[Shopping Service] No cached items available, returning empty result');
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      hasNextPage: false,
    };
  }
}

/**
 * Cache a product item to ExternalCatalogItem
 */
async function cacheProductItem(item: ProductCard): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 24 hour TTL

  try {
    // Try upsert first (if unique constraint exists)
    await prisma.externalCatalogItem.upsert({
      where: {
        source_external_id: {
          source: SOURCE,
          external_id: item.externalId,
        },
      },
      create: {
        source: SOURCE,
        external_id: item.externalId,
        title: item.title, // Chinese title
        price_min: item.priceMin,
        price_max: item.priceMax,
        currency: item.currency,
        main_images: item.images ? JSON.parse(JSON.stringify(item.images)) : null,
        source_url: item.sourceUrl,
        expires_at: expiresAt,
      },
      update: {
        title: item.title,
        price_min: item.priceMin,
        price_max: item.priceMax,
        main_images: item.images ? JSON.parse(JSON.stringify(item.images)) : null,
        source_url: item.sourceUrl,
        expires_at: expiresAt,
        last_synced_at: new Date(),
      },
    });
  } catch (error: any) {
    // Check if upsert failed due to missing unique constraint
    // Error can be in message, or in the string representation
    const errorStr = String(error.message || error || '');
    const isConstraintError = 
      errorStr.includes('ON CONFLICT') || 
      errorStr.includes('42P10') ||
      errorStr.includes('unique or exclusion constraint') ||
      error.code === 'P2025';
    
    if (isConstraintError) {
      // Use findFirst + create/update fallback
      try {
        const existing = await prisma.externalCatalogItem.findFirst({
          where: {
            source: SOURCE,
            external_id: item.externalId,
          },
        });

        if (existing) {
          await prisma.externalCatalogItem.update({
            where: { id: existing.id },
            data: {
              title: item.title,
              price_min: item.priceMin,
              price_max: item.priceMax,
              main_images: item.images ? JSON.parse(JSON.stringify(item.images)) : null,
              source_url: item.sourceUrl,
              expires_at: expiresAt,
              last_synced_at: new Date(),
            },
          });
        } else {
          await prisma.externalCatalogItem.create({
            data: {
              source: SOURCE,
              external_id: item.externalId,
              title: item.title,
              price_min: item.priceMin,
              price_max: item.priceMax,
              currency: item.currency,
              main_images: item.images ? JSON.parse(JSON.stringify(item.images)) : null,
              source_url: item.sourceUrl,
              expires_at: expiresAt,
            },
          });
        }
        // Successfully cached using fallback
        return;
      } catch (fallbackError: any) {
        // Check if it's an updated_at constraint error - database has it but schema doesn't
        const errorStr = String(fallbackError.message || fallbackError || '');
        if (errorStr.includes('updated_at') || fallbackError.code === 'P2011') {
          // Try one more time with explicit updated_at using raw SQL (if database has it)
          try {
            const existingItem = await prisma.externalCatalogItem.findFirst({
              where: {
                source: SOURCE,
                external_id: item.externalId,
              },
            });
            
            const now = new Date();
            if (existingItem) {
              await prisma.$executeRawUnsafe(`
                UPDATE external_catalog_items 
                SET title = $1, price_min = $2, price_max = $3, 
                    main_images = $4, source_url = $5, expires_at = $6, 
                    last_synced_at = $7, updated_at = $8
                WHERE id = $9
              `, item.title, item.priceMin, item.priceMax, 
                 item.images ? JSON.stringify(item.images) : null,
                 item.sourceUrl, expiresAt, new Date(), now, existingItem.id);
            } else {
              await prisma.$executeRawUnsafe(`
                INSERT INTO external_catalog_items 
                (id, source, external_id, title, price_min, price_max, currency, 
                 main_images, source_url, expires_at, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `, SOURCE, item.externalId, item.title, item.priceMin, item.priceMax,
                 item.currency || 'CNY',
                 item.images ? JSON.stringify(item.images) : null,
                 item.sourceUrl, expiresAt, now, now);
            }
            return; // Success
          } catch (rawError: any) {
            console.error(`[Shopping] Failed to cache item ${item.externalId} (raw SQL also failed):`, {
              error: rawError.message,
              code: rawError.code,
            });
          }
        } else {
          // Log other errors
          console.error(`[Shopping] Failed to cache item ${item.externalId} (fallback also failed):`, {
            error: fallbackError.message,
            code: fallbackError.code,
          });
        }
      }
    } else {
      // Log error but don't fail the entire search - caching is best effort
      console.error(`[Shopping] Failed to cache item ${item.externalId}:`, {
        error: error.message,
        code: error.code,
        meta: error.meta,
      });
    }
    // Don't re-throw - allow search to continue even if caching fails
  }
}

function buildCachedDetailFallback(cached: any): ProductDetail {
  const cachedRaw = cached?.raw_json && typeof cached.raw_json === 'object' ? cached.raw_json : {};
  const syntheticItem = {
    ...cachedRaw,
    item_id: cached.external_id,
    id: cached.external_id,
    title: cached.title_en || cached.title || cachedRaw.title || cachedRaw.subject || cachedRaw.name || 'Untitled Product',
    subject: cached.title_en || cached.title || cachedRaw.title || cachedRaw.subject || cachedRaw.name || 'Untitled Product',
    name: cached.title_en || cached.title || cachedRaw.title || cachedRaw.subject || cachedRaw.name || 'Untitled Product',
    price: cached.price_min ?? cached.price_max ?? cachedRaw.price ?? cachedRaw.price_info?.sale_price,
    price_min: cached.price_min ?? cachedRaw.price_min,
    price_max: cached.price_max ?? cachedRaw.price_max,
    price_info: cachedRaw.price_info || (
      cached.price_min || cached.price_max
        ? {
            sale_price: cached.price_min ?? cached.price_max,
            origin_price: cached.price_max ?? cached.price_min,
          }
        : undefined
    ),
    main_imgs: Array.isArray(cached.main_images) ? cached.main_images : cachedRaw.main_imgs || cachedRaw.main_images || [],
    main_image: Array.isArray(cached.main_images) ? cached.main_images[0] : cachedRaw.main_image || cachedRaw.image_url,
    image_url: Array.isArray(cached.main_images) ? cached.main_images[0] : cachedRaw.main_image || cachedRaw.image_url,
    product_url: cached.source_url || cachedRaw.product_url || cachedRaw.detail_url,
    detail_url: cached.source_url || cachedRaw.detail_url || cachedRaw.product_url,
    url: cached.source_url || cachedRaw.url || cachedRaw.product_url,
    link: cached.source_url || cachedRaw.link || cachedRaw.product_url,
    skus: cached.skus_json || cachedRaw.skus || cachedRaw.sku_list || null,
    sku_list: cached.skus_json || cachedRaw.sku_list || null,
    sale_info: cachedRaw.sale_info,
    shop_info: cachedRaw.shop_info,
    delivery_info: cachedRaw.delivery_info,
    description: cachedRaw.description || cachedRaw.desc || cachedRaw.detail || '',
  };

  const fallback = normalizeProductDetail(syntheticItem, syntheticItem.description);

  if (cached.title_en) {
    fallback.title = cached.title_en;
  }

  if (!fallback.images?.length && Array.isArray(cached.main_images)) {
    const fallbackImages = cached.main_images.filter((img: unknown): img is string => typeof img === 'string' && img.length > 0);
    fallback.images = fallbackImages;
    fallback.imageUrl = fallbackImages[0] || fallback.imageUrl;
  }

  if (!fallback.sourceUrl && cached.source_url) {
    fallback.sourceUrl = cached.source_url;
  }

  return fallback;
}

/**
 * Search by image with caching
 */
export async function searchByImage(
  r2PublicUrl: string,
  opts?: {
    category?: string;
    page?: number;
    pageSize?: number;
    sort?: string; // 'sales', 'price_asc', 'price_desc', 'popular', 'default'
    language?: string; // 'en' for English, 'zh' for Chinese (default)
  }
): Promise<SearchResult> {
  const language = opts?.language || 'zh';
  const sort = opts?.sort || 'sales'; // Default to sales sort
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  console.log('[Shopping Service] searchByImage called:', {
    originalUrl: r2PublicUrl.substring(0, 100) + (r2PublicUrl.length > 100 ? '...' : ''),
    language,
    sort,
    page,
    pageSize,
    opts,
  });

  // Step 1: Convert image URL to Alibaba-affiliated URL (REQUIRED for non-Ali images)
  // According to TMAPI docs: Non-Ali images MUST be converted first
  // https://tmapi.top/docs/ali/tool-apis/image-url-convert
  let convertedUrl: string;
  try {
    console.log('[Shopping Service] Step 1: Converting image URL...');
    convertedUrl = await tmapiClient.convertImageUrl(r2PublicUrl);
    console.log('[Shopping Service] Image URL converted successfully:', {
      originalUrl: r2PublicUrl.substring(0, 100) + '...',
      convertedUrl: convertedUrl.substring(0, 100) + (convertedUrl.length > 100 ? '...' : ''),
    });
  } catch (error: any) {
    console.error('[Shopping Service] Image URL conversion failed:', {
      error: error.message,
      stack: error.stack,
      originalUrl: r2PublicUrl.substring(0, 100) + '...',
    });
    throw new Error(`Failed to convert image URL for search: ${error.message}`);
  }

  // Step 2: Check cache
  const cacheKey = generateCacheKey('image', {
    imgUrl: convertedUrl,
    language,
    sort,
    page,
    pageSize,
    category: opts?.category,
  });
  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    console.log('[Shopping Service] Using cached image search results');
    // Cached response structure: { code: 200, msg: "success", data: { items: [...] } }
    // The cached response is the full TMAPI response, so we need cached.results_json.data.items
    const items = cached?.data?.items || cached?.items || [];
    const normalized = normalizeProductCards(items);
    const totalCount = cached?.data?.total_count || normalized.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    return {
      items: normalized,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage,
    };
  }

  // Step 3: Call TMAPI image search with converted URL
  // Note: According to TMAPI docs, the converted URL from the conversion API should be used directly
  // The conversion API returns a path like "/search/imgextra4/xxx.jpeg" which is already on Alibaba CDN
  // We use it as-is (path format) as that's what TMAPI returns and expects
  console.log('[Shopping Service] Step 3: Calling TMAPI image search with converted URL...');
  const response = await tmapiClient.searchByImageMultilingual(convertedUrl, language, { ...opts, sort });

  console.log('[Shopping Service] Image search response:', {
    hasData: !!response.data,
    responseCode: response.code,
    responseMsg: response.msg,
    itemsCount: response.data?.items?.length || 0,
    totalCount: response.data?.total_count,
    responseKeys: Object.keys(response),
    dataKeys: response.data ? Object.keys(response.data) : [],
    // Debug: show actual items array
    itemsArray: response.data?.items ? `Array(${response.data.items.length})` : 'null/undefined',
    firstItem: response.data?.items?.[0] ? JSON.stringify(response.data.items[0]).substring(0, 200) : 'none',
  });

  // Step 4: Cache results
  await setCachedSearch(
    SOURCE,
    cacheKey,
    { imgUrl: convertedUrl, sort, page, pageSize, category: opts?.category },
    response,
    opts?.category ? MENU_CACHE_TTL_MINUTES : undefined,
  );

  // Step 5: Normalize and return
  // TMAPI response structure: { code: 200, msg: "success", data: { items: [...] } }
  // The client returns response.data (the full TMAPI response), so response is already { code, msg, data }
  // So we need response.data.items (not response.data.data.items)
  const items = response.data?.items || response.items || response.result || [];
  console.log('[Shopping Service] Image search extracted items count:', items.length);
  
  if (items.length === 0 && response.data?.total_count === 0) {
    console.warn('[Shopping Service] Image search returned 0 results. This may be legitimate (no matching products found) or could indicate an API issue.');
  }
  
  const normalized = normalizeProductCards(items);
  const totalCount = response.data?.total_count || normalized.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  
  return {
    items: normalized,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage,
  };
}

function normalizeTmapiShopInfo(raw: any, vendorId: string) {
  const data = raw?.data || raw || {};
  const ratings = Array.isArray(data.shop_ratings) ? data.shop_ratings : [];
  const compositeRating = ratings.find((rating: any) => rating?.type === 'comprehensive') || ratings[0];
  const badges = [
    data.is_industry_brand ? 'Brand' : '',
    data.is_super_factory ? 'Super factory' : '',
    data.is_factory ? 'Factory' : '',
    data.is_flagship_shop ? 'Flagship' : '',
  ].filter(Boolean);

  return {
    ...data,
    VendorId: data.member_id || vendorId,
    VendorID: data.member_id || vendorId,
    SellerId: data.member_id || vendorId,
    ShopName: data.shop_name || data.company_name || vendorId,
    CompanyName: data.company_name || data.shop_name,
    Name: data.shop_name || data.company_name || vendorId,
    ShopUrl: data.shop_url,
    Url: data.shop_url,
    Score: compositeRating?.score,
    IsOfficial: Boolean(data.is_flagship_shop),
    IsBrand: Boolean(data.is_industry_brand || data.is_flagship_shop),
    IsVerified: Boolean(data.is_factory || data.is_super_factory || data.is_tp),
    badges,
  };
}

const VENDOR_CACHE_TTL_MINUTES = 60 * 24; // 24 hours for vendor info

export async function searchByVendorId(
  vendorId: string,
  opts?: {
    page?: number;
    pageSize?: number;
    sort?: string;
    language?: string;
    keyword?: string;
  }
): Promise<SearchResult> {
  const safeVendorId = String(vendorId || '').trim();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const sort = opts?.sort || 'sales';
  const keyword = String(opts?.keyword || '').trim().toLowerCase();

  if (!safeVendorId) {
    return { items: [], totalCount: 0, page, pageSize, totalPages: 0, hasNextPage: false };
  }

  // Check search cache for vendor product listings
  const vendorCacheKey = generateCacheKey('vendor_products', { vendorId: safeVendorId, page, pageSize, sort, keyword });
  const cachedVendorSearch = await getCachedSearch(SOURCE, vendorCacheKey);
  if (cachedVendorSearch) {
    return cachedVendorSearch as SearchResult;
  }

  return singleflight(`vendor:${safeVendorId}:${page}:${sort}`, async () => {
    try {
      const response = await tmapiClient.getShopItemsByMemberId(safeVendorId, { page, pageSize, sort });
      const rawItems = response.data?.items || response.items || [];
      let normalized = normalizeProductCards(rawItems);

      if (keyword) {
        normalized = normalized.filter((item) => {
          const haystack = [item.title, item.titleOrigin, item.sellerName, item.shopName].join(' ').toLowerCase();
          return haystack.includes(keyword);
        });
      }

      const totalCount = keyword ? normalized.length : Number(response.data?.total_count || normalized.length);
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const result: SearchResult = {
        items: normalized,
        totalCount,
        page,
        pageSize,
        totalPages,
        hasNextPage: Boolean(response.data?.has_next_page ?? page < totalPages),
      };
      // Cache vendor product listings for 24h
      setCachedSearch(SOURCE, vendorCacheKey, { vendorId: safeVendorId, page, pageSize, sort, keyword }, result, VENDOR_CACHE_TTL_MINUTES).catch(() => {});
      return result;
    } catch (error: any) {
      console.warn('[Shopping Service] TMAPI vendor search failed, returning empty results:', {
        vendorId: safeVendorId, page, pageSize, sort, message: error.message,
      });
      return { items: [], totalCount: 0, page, pageSize, totalPages: 0, hasNextPage: false };
    }
  });
}

export async function getVendorInfo(vendorId: string, language: string = 'zh'): Promise<any> {
  const safeVendorId = String(vendorId || '').trim();
  if (!safeVendorId) return null;

  // Check cache for vendor info
  const vendorInfoCacheKey = generateCacheKey('vendor_info', { vendorId: safeVendorId });
  const cachedInfo = await getCachedSearch(SOURCE, vendorInfoCacheKey);
  if (cachedInfo) return cachedInfo;

  return singleflight(`vendor_info:${safeVendorId}`, async () => {
    try {
      const response = await tmapiClient.getShopInfo(safeVendorId);
      const info = normalizeTmapiShopInfo(response, safeVendorId);
      setCachedSearch(SOURCE, vendorInfoCacheKey, { vendorId: safeVendorId }, info, VENDOR_CACHE_TTL_MINUTES).catch(() => {});
      return info;
    } catch (error: any) {
      console.warn('[Shopping Service] TMAPI shop info failed, returning minimal vendor info:', {
        vendorId: safeVendorId, language, message: error.message,
      });
      return normalizeTmapiShopInfo({ data: { member_id: safeVendorId, shop_name: safeVendorId } }, safeVendorId);
    }
  });
}

/**
 * Get item detail with caching - saves to ExternalCatalogItem
 */
export function getItemDetail(externalId: string, language: string = 'zh'): Promise<ProductDetail | null> {
  return singleflight(`item:${externalId}:${language}`, () => _getItemDetail(externalId, language));
}

async function _getItemDetail(externalId: string, language: string = 'zh'): Promise<ProductDetail | null> {
  // Check DB cache (ExternalCatalogItem)
  let cached;
  try {
    cached = await prisma.externalCatalogItem.findUnique({
      where: {
        source_external_id: {
          source: SOURCE,
          external_id: externalId,
        },
      },
    });
  } catch (error: any) {
    // If findUnique fails due to missing unique constraint, use findFirst
    const errorStr = String(error.message || error || '');
    if (errorStr.includes('unique') || errorStr.includes('constraint')) {
      cached = await prisma.externalCatalogItem.findFirst({
        where: {
          source: SOURCE,
          external_id: externalId,
        },
      });
    } else {
      throw error;
    }
  }

  const cachedFallback = cached ? buildCachedDetailFallback(cached) : null;

  if (cached && cached.raw_json && cached.expires_at > new Date()) {
    // Serve description and ratings from what was stored at cache-fill time — zero TMAPI calls
    const rawJson = cached.raw_json as any;
    // Strip internal cache-only fields so they don't leak into the frontend's raw payload
    // (collectImageCandidates recursively scans `raw`, and _bc_description.detail_imgs would pollute the gallery)
    const { _bc_description, _bc_ratings, ...rawForFrontend } = rawJson;
    const description = _bc_description ?? null;
    const ratings = _bc_ratings ?? null;

    const normalized = normalizeProductDetail(rawJson, description);
    normalized.raw = rawForFrontend;
    if (cached.title_en) {
      normalized.title = cached.title_en;
    }
    await applyEnglishDisplayTranslations(normalized);
    const markedCachedDetail = await applyMarkupToDetail(normalized);

    if (ratings && ratings.list && ratings.list.length > 0) {
      const ratingsList = ratings.list;
      const avgRating = ratingsList.reduce((sum: number, r: any) => sum + (r.rate_star || 0), 0) / ratingsList.length;
      if (!normalized.rating && !isNaN(avgRating)) normalized.rating = avgRating;
      if (!normalized.ratingCount && ratingsList.length) normalized.ratingCount = ratingsList.length;
    }

    normalized.bridgechinaShipping = {
      currency: 'CNY',
      moq_billable_kg: 3,
      methods: [
        {
          code: 'FAST_AIR',
          label: 'Fast Air (<10kg)',
          minKg: 0,
          maxKg: 9.999,
          // 315 CNY/kg
          ratePerKg: 122,
          ratePerKgCNY: 122,
          batteryRatePerKg: undefined,
          batteryRatePerKgCNY: undefined,
        },
        {
          code: 'AIR',
          label: 'Air Cargo (10kg+)',
          minKg: 10,
          // 100-150 CNY/kg
          ratePerKg: 39,
          ratePerKgMax: 67,
          ratePerKgCNY: 39,
          ratePerKgMaxCNY: 67,
          batteryRatePerKg: undefined,
          batteryRatePerKgCNY: undefined,
        },
        {
          code: 'SEA',
          label: 'Sea Cargo (100kg+)',
          minKg: 100,
          // 25-57 CNY/kg
          ratePerKg: 10,
          ratePerKgMax: 22,
          ratePerKgCNY: 20,
          ratePerKgMaxCNY: 22,
          batteryRatePerKg: undefined,
          batteryRatePerKgCNY: undefined,
        },
      ],
      marketing: {
        highlightKg: [20, 40],
        highlightText: 'Best value tiers: 20kg & 40kg bundles — cheaper per kg and faster processing.',
      },
      disclaimerLines: [
        'No payment now. Agent confirms final quote → You approve → We purchase & ship.',
        'Final weight & restrictions confirmed after packing.',
        'Battery/liquid/magnet/brand items may be restricted or higher rate.',
      ],
    };
    
    return markedCachedDetail;
  }

  let itemData: any;
  try {
    // Call TMAPI - use multilingual API if language is 'en', otherwise use regular API
    const response = language === 'en'
      ? await tmapiClient.getItemDetailMultilingual(externalId, language)
      : await tmapiClient.getItemDetail(externalId);
    // TMAPI response structure: { code: 200, msg: "success", data: { ...item data... } }
    // The client returns response.data (the full TMAPI response), so response is already { code, msg, data }
    // So we need response.data to get the actual item data object (the inner data field)
    itemData = response.data?.data || response.data || response;
  } catch (error: any) {
    console.warn('[Shopping Service] Live TMAPI item detail request failed, using cached fallback if available:', {
      externalId,
      language,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (cachedFallback) {
      return applyMarkupToDetail(await applyEnglishDisplayTranslations(cachedFallback));
    }

    throw error;
  }
  
  // Fetch description and ratings in parallel (3 calls → 2 parallel calls; shipping skipped — BridgeChina uses its own rates)
  const [descResult, ratingsResult] = await Promise.allSettled([
    tmapiClient.getItemDescription(externalId),
    tmapiClient.getItemRatings(externalId, 1),
  ]);

  const description = descResult.status === 'fulfilled'
    ? (descResult.value.data?.data || descResult.value.data || null)
    : null;
  const ratings = ratingsResult.status === 'fulfilled'
    ? (ratingsResult.value.data?.data || ratingsResult.value.data || null)
    : null;

  // Normalize to extract data (pass description if fetched)
  const normalized = normalizeProductDetail(itemData, description);
  await applyEnglishDisplayTranslations(normalized);
  const markedDetail = await applyMarkupToDetail(normalized);

  // Enhance with ratings if available
  if (ratings && ratings.list && ratings.list.length > 0) {
    const ratingsList = ratings.list;
    const avgRating = ratingsList.reduce((sum: number, r: any) => sum + (r.rate_star || 0), 0) / ratingsList.length;
    if (!normalized.rating && !isNaN(avgRating)) normalized.rating = avgRating;
    if (!normalized.ratingCount && ratingsList.length) normalized.ratingCount = ratingsList.length;
  }

  // Add BridgeChina shipping information (CNY / RMB)
  normalized.bridgechinaShipping = {
    currency: 'CNY',
    moq_billable_kg: 3,
    methods: [
      {
        code: 'FAST_AIR',
        label: 'Fast Air (<10kg)',
        minKg: 0,
        maxKg: 9.999,
        ratePerKg: 122,
        ratePerKgCNY: 122,
        batteryRatePerKg: undefined,
        batteryRatePerKgCNY: undefined,
      },
      {
        code: 'AIR',
        label: 'Air Cargo (10kg+)',
        minKg: 10,
        ratePerKg: 35,
        ratePerKgMax: 77,
        ratePerKgCNY: 35,
        ratePerKgMaxCNY: 77,
        batteryRatePerKg: undefined,
        batteryRatePerKgCNY: undefined,
      },
      {
        code: 'SEA',
        label: 'Sea Cargo (100kg+)',
        minKg: 100,
        ratePerKg: 10,
        ratePerKgMax: 22,
        ratePerKgCNY: 10,
        ratePerKgMaxCNY: 22,
        batteryRatePerKg: undefined,
        batteryRatePerKgCNY: undefined,
      },
    ],
    marketing: {
      highlightKg: [20, 40],
      highlightText: 'Best value tiers: 20kg & 40kg bundles — cheaper per kg and faster processing.',
    },
    disclaimerLines: [
      'No payment now. Agent confirms final quote → You approve → We purchase & ship.',
      'Final weight & restrictions confirmed after packing.',
      'Battery/liquid/magnet/brand items may be restricted or higher rate.',
    ],
  };

  // Save to ExternalCatalogItem cache — embed description & ratings so cache-hits need zero TMAPI calls
  const rawJsonToCache = { ...itemData, _bc_description: description ?? null, _bc_ratings: ratings ?? null };
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 24 hour TTL

  try {
    await prisma.externalCatalogItem.upsert({
      where: {
        source_external_id: {
          source: SOURCE,
          external_id: externalId,
        },
      },
      create: {
        source: SOURCE,
        external_id: externalId,
        title: markedDetail.title,
        title_en: markedDetail.title,
        price_min: markedDetail.priceMin,
        price_max: markedDetail.priceMax,
        currency: markedDetail.currency,
        main_images: markedDetail.images ? JSON.parse(JSON.stringify(markedDetail.images)) : null,
        skus_json: markedDetail.skus ? JSON.parse(JSON.stringify(markedDetail.skus)) : null,
        source_url: markedDetail.sourceUrl,
        raw_json: rawJsonToCache as any,
        expires_at: expiresAt,
      },
      update: {
        title: markedDetail.title,
        title_en: markedDetail.title,
        price_min: markedDetail.priceMin,
        price_max: markedDetail.priceMax,
        main_images: markedDetail.images ? JSON.parse(JSON.stringify(markedDetail.images)) : null,
        skus_json: markedDetail.skus ? JSON.parse(JSON.stringify(markedDetail.skus)) : null,
        source_url: markedDetail.sourceUrl,
        raw_json: rawJsonToCache as any,
        expires_at: expiresAt,
        last_synced_at: new Date(),
      },
    });
  } catch (error: any) {
    // Check if upsert failed due to missing unique constraint
    const errorStr = String(error.message || error || '');
    const isConstraintError = 
      errorStr.includes('ON CONFLICT') || 
      errorStr.includes('42P10') ||
      errorStr.includes('unique or exclusion constraint') ||
      error.code === 'P2025';
    
    if (isConstraintError) {
      // Use findFirst + create/update fallback
      try {
        const existing = await prisma.externalCatalogItem.findFirst({
          where: {
            source: SOURCE,
            external_id: externalId,
          },
        });

        if (existing) {
          await prisma.externalCatalogItem.update({
            where: { id: existing.id },
            data: {
              title: markedDetail.title,
              title_en: markedDetail.title,
              price_min: markedDetail.priceMin,
              price_max: markedDetail.priceMax,
              main_images: markedDetail.images ? JSON.parse(JSON.stringify(markedDetail.images)) : null,
              skus_json: markedDetail.skus ? JSON.parse(JSON.stringify(markedDetail.skus)) : null,
              source_url: markedDetail.sourceUrl,
              raw_json: rawJsonToCache as any,
              expires_at: expiresAt,
              last_synced_at: new Date(),
            },
          });
        } else {
          await prisma.externalCatalogItem.create({
            data: {
              source: SOURCE,
              external_id: externalId,
              title: markedDetail.title,
              title_en: markedDetail.title,
              price_min: markedDetail.priceMin,
              price_max: markedDetail.priceMax,
              currency: markedDetail.currency,
              main_images: markedDetail.images ? JSON.parse(JSON.stringify(markedDetail.images)) : null,
              skus_json: markedDetail.skus ? JSON.parse(JSON.stringify(markedDetail.skus)) : null,
              source_url: markedDetail.sourceUrl,
              raw_json: rawJsonToCache as any,
              expires_at: expiresAt,
            },
          });
        }
      } catch (fallbackError: any) {
        // Check if it's an updated_at constraint error
        const errorStr = String(fallbackError.message || fallbackError || '');
        if (errorStr.includes('updated_at') || fallbackError.code === 'P2011') {
          // Try raw SQL with explicit updated_at
          try {
            const existingItem = await prisma.externalCatalogItem.findFirst({
              where: {
                source: SOURCE,
                external_id: externalId,
              },
            });
            
            const now = new Date();
            if (existingItem) {
              await prisma.$executeRawUnsafe(`
                UPDATE external_catalog_items 
                SET title = $1, title_en = $2, price_min = $3, price_max = $4, 
                    main_images = $5, skus_json = $6, source_url = $7, raw_json = $8, expires_at = $9, 
                    last_synced_at = $10, updated_at = $11
                WHERE id = $12
              `, markedDetail.title, markedDetail.title, markedDetail.priceMin, markedDetail.priceMax,
                 markedDetail.images ? JSON.stringify(markedDetail.images) : null,
                 markedDetail.skus ? JSON.stringify(markedDetail.skus) : null,
                 markedDetail.sourceUrl, JSON.stringify(rawJsonToCache),
                 expiresAt, new Date(), now, existingItem.id);
            } else {
              await prisma.$executeRawUnsafe(`
                INSERT INTO external_catalog_items
                (id, source, external_id, title, title_en, price_min, price_max, currency,
                 main_images, skus_json, source_url, raw_json, expires_at, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              `, SOURCE, externalId, markedDetail.title, markedDetail.title, markedDetail.priceMin, markedDetail.priceMax,
                 markedDetail.currency || 'CNY',
                 markedDetail.images ? JSON.stringify(markedDetail.images) : null,
                 markedDetail.skus ? JSON.stringify(markedDetail.skus) : null,
                 markedDetail.sourceUrl, JSON.stringify(rawJsonToCache),
                 expiresAt, now, now);
            }
          } catch (rawError: any) {
            console.error(`[Shopping] Failed to cache item detail ${externalId} (raw SQL also failed):`, {
              error: rawError.message,
              code: rawError.code,
            });
          }
        } else {
          console.error(`[Shopping] Failed to cache item detail ${externalId} (fallback also failed):`, {
            error: fallbackError.message,
            code: fallbackError.code,
          });
        }
      }
    } else {
      console.error(`[Shopping] Failed to cache item detail ${externalId}:`, {
        error: error.message,
        code: error.code,
      });
    }
  }

  return markedDetail;
}

/**
 * Get hot items for a category - loads from search cache (ExternalSearchCache)
 * Priority: 1) Pinned items from ExternalHotItem, 2) Recent search results from ExternalSearchCache
 */
export async function getHotItems(categorySlug?: string, page: number = 1, pageSize: number = 20): Promise<ProductCard[]> {
  console.log('[Shopping Service] getHotItems called:', { categorySlug, page, pageSize });
  try {
    const where: any = { source: SOURCE };
    if (categorySlug) {
      where.category_slug = categorySlug;
    }

    const items: ProductCard[] = [];
    const existingIds = new Set<string>();

    // First, try to get pinned hot items (pinned_rank > 0 means pinned)
    const hotItems = await prisma.externalHotItem.findMany({
      where: {
        ...where,
        pinned_rank: { gt: 0 }, // Only get pinned items (pinned_rank > 0)
      },
      orderBy: { pinned_rank: 'asc' }, // Lower rank = higher priority
      take: 100, // Get more to filter by valid cache
    });

  if (hotItems.length > 0) {
    // Load from ExternalCatalogItem cache (DB snapshot) for pinned items
    const externalIds = hotItems.map(h => h.external_id);
    const cachedItems = await prisma.externalCatalogItem.findMany({
      where: {
        source: SOURCE,
        external_id: { in: externalIds },
        expires_at: { gt: new Date() }, // Only non-expired cache
      },
    });

    const cachedMap = new Map<string, any>(cachedItems.map((c) => [c.external_id, c]));

    for (const hotItem of hotItems) {
      const cached: any = cachedMap.get(hotItem.external_id);
      if (cached && cached.raw_json) {
        // Use cached data
        const normalized = await applyMarkupToDetail(normalizeProductDetail(cached.raw_json as any));
        // Override title with English if available
        if (cached.title_en) {
          normalized.title = cached.title_en;
        }
        items.push(normalized);
        existingIds.add(normalized.externalId);
      } else {
        // Cache miss - fetch from TMAPI and cache it
        try {
          const detail = await getItemDetail(hotItem.external_id);
          if (detail) {
            items.push(detail);
            existingIds.add(detail.externalId);
          }
        } catch (error) {
          console.error(`[Shopping] Failed to fetch hot item ${hotItem.external_id}:`, error);
        }
      }
      
      // Limit results
      if (items.length >= pageSize) break;
    }
  }

    // If we don't have enough items, sample across the last few distinct searches
    if (items.length < pageSize) {
      let recentSearches: any[] = [];
      try {
        const allSearches = await prisma.externalSearchCache.findMany({
          where: { source: SOURCE },
          orderBy: { created_at: 'desc' },
          take: 18,
        });
        const now = new Date();
        recentSearches = allSearches.filter((s) => !s.expires_at || new Date(s.expires_at) > now).slice(0, 6);
        if (recentSearches.length === 0 && allSearches.length > 0) {
          recentSearches = allSearches.slice(0, 6);
        }
      } catch (error: any) {
        console.error('[Shopping Service] Error fetching search cache:', error);
      }

      const buckets = await Promise.all(buildSearchCacheBuckets(recentSearches).map(async (bucket) => ({
        entry: bucket.entry,
        items: await applyMarkupToCards(normalizeProductCards(bucket.items)),
      })));

      let round = 0;
      while (items.length < pageSize) {
        let added = false;
        for (const bucket of buckets) {
          const card = bucket.items[round];
          if (!card || existingIds.has(card.externalId)) continue;
          items.push(card);
          existingIds.add(card.externalId);
          added = true;
          if (items.length >= pageSize) break;
        }
        if (!added) break;
        round += 1;
      }
    }

    // Final fallback: If still not enough, try ExternalCatalogItem
    if (items.length < pageSize) {
      const needed = pageSize - items.length;
      const recentItems = await prisma.externalCatalogItem.findMany({
        where: {
          source: SOURCE,
          expires_at: { gt: new Date() }, // Only non-expired cache
        },
        orderBy: { last_synced_at: 'desc' }, // Most recently synced first
        take: needed + 20,
      });

      for (const cached of recentItems) {
        if (existingIds.has(cached.external_id)) {
          continue; // Skip duplicates
        }
        
        try {
          let normalized: ProductCard;
          
          if (cached.raw_json) {
            normalized = await applyMarkupToDetail(normalizeProductDetail(cached.raw_json as any));
            if (cached.title_en) {
              normalized.title = cached.title_en;
            }
          } else {
            // Fallback: Create basic ProductCard from available fields
            normalized = {
              source: 'tmapi_1688',
              externalId: cached.external_id,
              title: cached.title_en || cached.title || 'Product',
              priceMin: cached.price_min || undefined,
              priceMax: cached.price_max || undefined,
              currency: (cached.currency as 'CNY') || 'CNY',
              sourceUrl: cached.source_url || undefined,
            };
            
            if (cached.main_images) {
              try {
                const mainImages = typeof cached.main_images === 'string' 
                  ? JSON.parse(cached.main_images) 
                  : cached.main_images;
                if (Array.isArray(mainImages) && mainImages.length > 0) {
                  normalized.imageUrl = getProxiedImageUrl(mainImages[0]);
                  normalized.images = mainImages.map(getProxiedImageUrl);
                } else if (typeof mainImages === 'string') {
                  normalized.imageUrl = getProxiedImageUrl(mainImages);
                }
              } catch (e) {
                // Ignore image parsing errors
              }
            }
          }
          
          const markedCard = 'skus' in normalized
            ? normalized
            : (await applyMarkupToCards([normalized]))[0];
          if (!markedCard || !hasDisplayablePrice(markedCard)) {
            continue;
          }
          items.push(markedCard);
          existingIds.add(markedCard.externalId);
          
          if (items.length >= pageSize) break;
        } catch (error) {
          console.error(`[Shopping] Failed to process cached item ${cached.external_id}:`, error);
        }
      }
    }
  
    // Apply pagination
    const start = (page - 1) * pageSize;
    const paginated = items.slice(start, start + pageSize);
    const translated = await translateProductCardTitles(paginated);
    console.log(`[Shopping Service] getHotItems returning ${translated.length} items (total: ${items.length}, page: ${page}, pageSize: ${pageSize})`);
    return translated;
  } catch (error: any) {
    if (isDatabaseUnavailable(error)) {
      console.warn('[Shopping Service] Database unavailable while loading hot items - returning empty list');
      return [];
    }
    throw error;
  }
}

export async function getCuratedHomeSections(): Promise<Array<{ slug: string; label: string; items: ProductCard[] }>> {
  const loadSectionCards = async (def: (typeof CURATED_CATEGORY_DEFS)[number]): Promise<ProductCard[]> => {
    const cards: ProductCard[] = [];
    const searchQueries = Array.from(new Set([def.label, ...def.keywords].map((value) => String(value || '').trim()).filter(Boolean)));

    const pinned = await prisma.externalHotItem.findMany({
      where: {
        source: SOURCE,
        category_slug: def.slug,
      },
      orderBy: [{ pinned_rank: 'asc' }, { created_at: 'desc' }],
      take: 6,
    });

    const ids = pinned.map((item) => item.external_id);
    const catalogItems: any[] = ids.length > 0
      ? await prisma.externalCatalogItem.findMany({
          where: {
            source: SOURCE,
            external_id: { in: ids },
            expires_at: { gt: new Date() },
          },
        })
      : [];
    const catalogById = new Map(catalogItems.map((item) => [item.external_id, item]));

    for (const item of pinned) {
      const catalog = catalogById.get(item.external_id);
      if (catalog?.raw_json) {
        const normalized = normalizeProductDetail(catalog.raw_json as any);
        if (!cards.some((existing) => existing.externalId === normalized.externalId)) {
          cards.push(normalized);
        }
      } else {
        const fallbackCard = buildFallbackCardFromCatalogItem(catalog);
        if (fallbackCard && !cards.some((existing) => existing.externalId === fallbackCard.externalId)) {
          cards.push(fallbackCard);
        }
      }
      if (cards.length >= 6) break;
    }

    if (cards.length < 6) {
      try {
        for (const query of searchQueries) {
          const searchResult = await searchByKeyword(query, {
            page: 1,
            pageSize: 12,
            sort: 'sales',
            language: 'en',
          });
          for (const card of searchResult.items || []) {
            if (cards.some((existing) => existing.externalId === card.externalId)) continue;
            cards.push(card);
            if (cards.length >= 6) break;
          }
          if (cards.length >= 6) break;
        }
      } catch {
        // Ignore fallback search failures.
      }
    }

    return filterPricedCards(cards).slice(0, 6);
  };

  const sections = await Promise.all(
    CURATED_CATEGORY_DEFS.map(async (def) => ({
      slug: def.slug,
      label: def.label,
      items: await loadSectionCards(def),
    }))
  );

  return sections;
}
