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
import { translateKeywordToChinese } from './googleTranslate.js';
const SOURCE = 'tmapi_1688';

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
  }
): Promise<SearchResult> {
  // If no keyword but category provided, use category name as keyword
  let searchKeyword = keyword?.trim() || opts?.category || 'products';
  const language = opts?.language || 'zh';
  
  // Translate English keyword to Chinese if language is 'zh' and keyword looks non-Chinese
  if (language === 'zh' && searchKeyword && searchKeyword !== 'products') {
    try {
      const translated = await translateKeywordToChinese(searchKeyword);
      if (translated !== searchKeyword) {
        console.log('[Shopping Service] Translated keyword:', { original: searchKeyword, translated });
        searchKeyword = translated;
      }
    } catch (error: any) {
      console.warn('[Shopping Service] Translation failed, using original keyword:', error.message);
      // Continue with original keyword
    }
  }
  
  console.log('[Shopping Service] searchByKeyword called:', { 
    originalKeyword: keyword, 
    searchKeyword,
    language,
    opts 
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
    const normalized = normalizeProductCards(items);
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
    await setCachedSearch(SOURCE, cacheKey, { keyword: searchKeyword, ...opts }, response);

    // Extract items - TMAPI response structure: { code: 200, msg: "success", data: { items: [...] } }
    // The client returns response.data (the full TMAPI response), so response is already { code, msg, data }
    // So we need response.data.items (not response.data.data.items)
    const items = response.data?.items || response.items || response.result || [];
    console.log('[Shopping Service] Extracted items count:', items.length);
    const normalized = normalizeProductCards(items);
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
      const paginated = normalized.slice(start, start + pageSize);
      const totalCount = normalized.length;
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
    const items = cached.results_json?.data?.items || cached.results_json?.items || [];
    const normalized = normalizeProductCards(items);
    const totalCount = cached.results_json?.data?.total_count || normalized.length;
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
  const response = language === 'en'
    ? await tmapiClient.searchByImageMultilingual(convertedUrl, language, { ...opts, sort })
    : await tmapiClient.searchByImage(convertedUrl, { ...opts, sort });

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
  await setCachedSearch(SOURCE, cacheKey, { imgUrl: convertedUrl, sort, page, pageSize, category: opts?.category }, response);

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

/**
 * Get item detail with caching - saves to ExternalCatalogItem
 */
export async function getItemDetail(externalId: string, language: string = 'zh'): Promise<ProductDetail | null> {
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

  if (cached && cached.raw_json && cached.expires_at > new Date()) {
    // Try to fetch additional data for cached items
    let description = null;
    let ratings = null;
    let shipping = null;
    
    try {
      const descResponse = await tmapiClient.getItemDescription(externalId);
      if (descResponse.data?.data) {
        description = descResponse.data.data;
      }
    } catch (error) {
      console.warn('[Shopping Service] Failed to fetch description for cached item:', error);
    }
    
    try {
      const ratingsResponse = await tmapiClient.getItemRatings(externalId, 1);
      if (ratingsResponse.data?.data) {
        ratings = ratingsResponse.data.data;
      }
    } catch (error) {
      console.warn('[Shopping Service] Failed to fetch ratings for cached item:', error);
    }
    
    try {
      // Always include province to avoid 422 error
      const shippingResponse = await tmapiClient.getItemShipping(externalId, {
        province: process.env.TMAPI_DEFAULT_PROVINCE || '广东',
      });
      if (shippingResponse.data?.data) {
        shipping = shippingResponse.data.data;
      }
    } catch (error: any) {
      // Log once but don't crash - shipping is optional
      console.warn('[Shopping Service] Failed to fetch shipping for cached item (non-critical):', {
        message: error.message,
        status: error.response?.status,
      });
    }
    
    const normalized = normalizeProductDetail(cached.raw_json as any, description);
    // Use English title if available
    if (cached.title_en) {
      normalized.title = cached.title_en;
    }
    
    // Enhance with ratings if available
    if (ratings && ratings.list && ratings.list.length > 0) {
      // Calculate average rating from reviews
      const ratingsList = ratings.list;
      const avgRating = ratingsList.reduce((sum: number, r: any) => sum + (r.rate_star || 0), 0) / ratingsList.length;
      if (!normalized.rating && !isNaN(avgRating)) {
        normalized.rating = avgRating;
      }
      if (!normalized.ratingCount && ratingsList.length) {
        normalized.ratingCount = ratingsList.length;
      }
    }

    // Add BridgeChina shipping information
    // Rates are in CNY (RMB)
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
    
    return normalized;
  }

  // Call TMAPI - use multilingual API if language is 'en', otherwise use regular API
  const response = language === 'en'
    ? await tmapiClient.getItemDetailMultilingual(externalId, language)
    : await tmapiClient.getItemDetail(externalId);
  // TMAPI response structure: { code: 200, msg: "success", data: { ...item data... } }
  // The client returns response.data (the full TMAPI response), so response is already { code, msg, data }
  // So we need response.data to get the actual item data object (the inner data field)
  const itemData = response.data?.data || response.data || response;
  
  // Fetch additional data: description, ratings, shipping
  let description = null;
  let ratings = null;
  let shipping = null;
  
  try {
    const descResponse = await tmapiClient.getItemDescription(externalId);
    if (descResponse.data?.data) {
      description = descResponse.data.data;
    }
  } catch (error) {
    console.warn('[Shopping Service] Failed to fetch item description:', error);
  }
  
  try {
    const ratingsResponse = await tmapiClient.getItemRatings(externalId, 1);
    if (ratingsResponse.data?.data) {
      ratings = ratingsResponse.data.data;
    }
  } catch (error) {
    console.warn('[Shopping Service] Failed to fetch item ratings:', error);
  }
  
  try {
    // Always include province to avoid 422 error
    const shippingResponse = await tmapiClient.getItemShipping(externalId, {
      province: process.env.TMAPI_DEFAULT_PROVINCE || '广东',
    });
    if (shippingResponse.data?.data) {
      shipping = shippingResponse.data.data;
    }
  } catch (error: any) {
    // Log once but don't crash - shipping is optional
    console.warn('[Shopping Service] Failed to fetch item shipping (non-critical):', {
      message: error.message,
      status: error.response?.status,
    });
    // Continue without shipping data
  }

  // Normalize to extract data (pass description if fetched)
  const normalized = normalizeProductDetail(itemData, description);
  
  // Enhance with ratings if available
  if (ratings && ratings.list && ratings.list.length > 0) {
    // Calculate average rating from reviews
    const ratingsList = ratings.list;
    const avgRating = ratingsList.reduce((sum: number, r: any) => sum + (r.rate_star || 0), 0) / ratingsList.length;
    if (!normalized.rating && !isNaN(avgRating)) {
      normalized.rating = avgRating;
    }
    if (!normalized.ratingCount && ratingsList.length) {
      normalized.ratingCount = ratingsList.length;
    }
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

  // Save to ExternalCatalogItem cache
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
        title: normalized.title, // Chinese title
        price_min: normalized.priceMin,
        price_max: normalized.priceMax,
        currency: normalized.currency,
        main_images: normalized.images ? JSON.parse(JSON.stringify(normalized.images)) : null,
        source_url: normalized.sourceUrl,
        raw_json: itemData as any,
        expires_at: expiresAt,
      },
      update: {
        title: normalized.title,
        price_min: normalized.priceMin,
        price_max: normalized.priceMax,
        main_images: normalized.images ? JSON.parse(JSON.stringify(normalized.images)) : null,
        source_url: normalized.sourceUrl,
        raw_json: itemData as any,
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
              title: normalized.title,
              price_min: normalized.priceMin,
              price_max: normalized.priceMax,
              main_images: normalized.images ? JSON.parse(JSON.stringify(normalized.images)) : null,
              source_url: normalized.sourceUrl,
              raw_json: itemData as any,
              expires_at: expiresAt,
              last_synced_at: new Date(),
            },
          });
        } else {
          await prisma.externalCatalogItem.create({
            data: {
              source: SOURCE,
              external_id: externalId,
              title: normalized.title,
              price_min: normalized.priceMin,
              price_max: normalized.priceMax,
              currency: normalized.currency,
              main_images: normalized.images ? JSON.parse(JSON.stringify(normalized.images)) : null,
              source_url: normalized.sourceUrl,
              raw_json: itemData as any,
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
                SET title = $1, price_min = $2, price_max = $3, 
                    main_images = $4, source_url = $5, raw_json = $6, expires_at = $7, 
                    last_synced_at = $8, updated_at = $9
                WHERE id = $10
              `, normalized.title, normalized.priceMin, normalized.priceMax,
                 normalized.images ? JSON.stringify(normalized.images) : null,
                 normalized.sourceUrl, itemData ? JSON.stringify(itemData) : null,
                 expiresAt, new Date(), now, existingItem.id);
            } else {
              await prisma.$executeRawUnsafe(`
                INSERT INTO external_catalog_items 
                (id, source, external_id, title, price_min, price_max, currency, 
                 main_images, source_url, raw_json, expires_at, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              `, SOURCE, externalId, normalized.title, normalized.priceMin, normalized.priceMax,
                 normalized.currency || 'CNY',
                 normalized.images ? JSON.stringify(normalized.images) : null,
                 normalized.sourceUrl, itemData ? JSON.stringify(itemData) : null,
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

  return normalized;
}

/**
 * Get hot items for a category - loads from search cache (ExternalSearchCache)
 * Priority: 1) Pinned items from ExternalHotItem, 2) Recent search results from ExternalSearchCache
 */
export async function getHotItems(categorySlug?: string, page: number = 1, pageSize: number = 20): Promise<ProductCard[]> {
  console.log('[Shopping Service] getHotItems called:', { categorySlug, page, pageSize });
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

    const cachedMap = new Map(cachedItems.map(c => [c.external_id, c]));

    for (const hotItem of hotItems) {
      const cached = cachedMap.get(hotItem.external_id);
      if (cached && cached.raw_json) {
        // Use cached data
        const normalized = normalizeProductDetail(cached.raw_json as any);
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

  // If we don't have enough items, load from recent search cache (ExternalSearchCache)
  // This shows products from recent searches, which is more relevant for homepage
  if (items.length < pageSize) {
    const needed = pageSize - items.length;
    
    // Get recent search cache entries (most recent searches first)
    // Try ordering by created_at, fallback to id if created_at doesn't exist
    let recentSearches: any[] = [];
    try {
      // First, try without expires_at filter to see all entries
      const allSearches = await prisma.externalSearchCache.findMany({
        where: {
          source: SOURCE,
        },
        take: 20, // Get more to check expiration
      });
      
      console.log(`[Shopping Service] Found ${allSearches.length} total search cache entries`);
      
      // Filter non-expired and sort by created_at
      const now = new Date();
      recentSearches = allSearches
        .filter(s => new Date(s.expires_at) > now)
        .sort((a, b) => {
          // Sort by created_at if available, otherwise by id
          try {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime; // Descending
          } catch {
            return 0;
          }
        })
        .slice(0, 10); // Take top 10
      
      console.log(`[Shopping Service] ${recentSearches.length} non-expired entries after filtering`);
      
      if (recentSearches.length === 0 && allSearches.length > 0) {
        console.warn('[Shopping Service] All cache entries are expired! Using expired entries anyway...');
        // Use expired entries if no non-expired ones found
        recentSearches = allSearches
          .sort((a, b) => {
            try {
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bTime - aTime;
            } catch {
              return 0;
            }
          })
          .slice(0, 10);
      }
    } catch (error: any) {
      console.error('[Shopping Service] Error fetching search cache:', error);
      recentSearches = [];
    }

    console.log(`[Shopping Service] Found ${recentSearches.length} recent search cache entries`);
    console.log(`[Shopping Service] Current items count: ${items.length}, needed: ${needed}`);

    // Extract items from search cache results_json
    for (const searchCache of recentSearches) {
      if (items.length >= pageSize) break;

      try {
        const resultsJson = searchCache.results_json as any;
        console.log(`[Shopping Service] Processing search cache ${searchCache.id}:`, {
          hasResultsJson: !!resultsJson,
          hasData: !!resultsJson?.data,
          hasItems: !!resultsJson?.data?.items,
          itemsCount: Array.isArray(resultsJson?.data?.items) ? resultsJson.data.items.length : 0,
        });
        
        // Extract items from TMAPI response structure: { code: 200, msg: "success", data: { items: [...] } }
        const searchItems = resultsJson?.data?.items || resultsJson?.items || [];
        
        if (Array.isArray(searchItems) && searchItems.length > 0) {
          console.log(`[Shopping Service] Found ${searchItems.length} items in search cache ${searchCache.id}`);
          // Normalize items from search cache
          const normalized = normalizeProductCards(searchItems);
          console.log(`[Shopping Service] Normalized ${normalized.length} items`);
          
          for (const item of normalized) {
            if (existingIds.has(item.externalId)) {
              continue; // Skip duplicates
            }
            
            items.push(item);
            existingIds.add(item.externalId);
            console.log(`[Shopping Service] Added item ${item.externalId}, total: ${items.length}`);
            
            if (items.length >= pageSize) break;
          }
        } else {
          console.log(`[Shopping Service] No items found in search cache ${searchCache.id}`);
        }
      } catch (error) {
        console.error(`[Shopping] Failed to extract items from search cache ${searchCache.id}:`, error);
      }
    }
    
    console.log(`[Shopping Service] After processing search cache, items count: ${items.length}`);
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
          normalized = normalizeProductDetail(cached.raw_json as any);
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
        
        items.push(normalized);
        existingIds.add(normalized.externalId);
        
        if (items.length >= pageSize) break;
      } catch (error) {
        console.error(`[Shopping] Failed to process cached item ${cached.external_id}:`, error);
      }
    }
  }

  // Apply pagination
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);
  console.log(`[Shopping Service] getHotItems returning ${paginated.length} items (total: ${items.length}, page: ${page}, pageSize: ${pageSize})`);
  return paginated;
}

