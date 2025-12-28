/**
 * Shopping Service
 * Orchestrates TMAPI calls with caching
 */

import { PrismaClient, Prisma } from '@prisma/client';
import tmapiClient from './tmapi.client.js';
import {
  normalizeProductCards,
  normalizeProductDetail,
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

const prisma = new PrismaClient();
const SOURCE = 'tmapi_1688';

// Shopping categories (can be moved to DB later)
export const SHOPPING_CATEGORIES = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'clothing', name: 'Clothing & Apparel' },
  { slug: 'home', name: 'Home & Garden' },
  { slug: 'toys', name: 'Toys & Games' },
  { slug: 'beauty', name: 'Beauty & Personal Care' },
  { slug: 'sports', name: 'Sports & Outdoors' },
  { slug: 'automotive', name: 'Automotive' },
  { slug: 'industrial', name: 'Industrial & Business' },
];

/**
 * Get shopping categories
 */
export async function getCategories() {
  return SHOPPING_CATEGORIES;
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
    sort?: string;
  }
): Promise<ProductCard[]> {
  // If no keyword but category provided, use category name as keyword
  const searchKeyword = keyword?.trim() || opts?.category || 'products';
  
  console.log('[Shopping Service] searchByKeyword called:', { 
    originalKeyword: keyword, 
    searchKeyword,
    opts 
  });
  
  const cacheKey = generateCacheKey('keyword', { keyword: searchKeyword, ...opts });
  console.log('[Shopping Service] Cache key:', cacheKey);

  // Check search cache
  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    console.log('[Shopping Service] Using cached search results');
    // Cached response structure: { code: 200, msg: "success", data: { items: [...] } }
    // The cached response is the full TMAPI response, so we need cached.results_json.data.items
    const items = cached.results_json?.data?.items || cached.results_json?.items || [];
    return normalizeProductCards(items);
  }

  console.log('[Shopping Service] Calling TMAPI...');
  try {
    // Call TMAPI
    const response = await tmapiClient.searchByKeyword(searchKeyword, opts);
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

    // Cache each item to ExternalCatalogItem (async, don't wait)
    normalized.forEach((item) => {
      // Fire and forget - cache items in background
      cacheProductItem(item).catch(err => {
        console.error(`[Shopping] Failed to cache item ${item.externalId}:`, err);
      });
    });

    console.log('[Shopping Service] Normalized items count:', normalized.length);
    return normalized;
  } catch (error: any) {
    console.error('[Shopping Service] TMAPI error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Cache a product item to ExternalCatalogItem
 */
async function cacheProductItem(item: ProductCard): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 24 hour TTL

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
    sort?: string;
  }
): Promise<ProductCard[]> {
  // Step 1: Convert R2 URL to Alibaba URL
  const convertedUrl = await tmapiClient.convertImageUrl(r2PublicUrl);

  // Step 2: Check cache
  const cacheKey = generateCacheKey('image', { imgUrl: convertedUrl, ...opts });
  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    // Cached response structure: { code: 200, msg: "success", data: { items: [...] } }
    // The cached response is the full TMAPI response, so we need cached.results_json.data.items
    const items = cached.results_json?.data?.items || cached.results_json?.items || [];
    return normalizeProductCards(items);
  }

  // Step 3: Call TMAPI image search
  const response = await tmapiClient.searchByImage(convertedUrl, opts);

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
  await setCachedSearch(SOURCE, cacheKey, { imgUrl: convertedUrl, ...opts }, response);

  // Step 5: Normalize and return
  // TMAPI response structure: { code: 200, msg: "success", data: { items: [...] } }
  // The client returns response.data (the full TMAPI response), so response is already { code, msg, data }
  // So we need response.data.items (not response.data.data.items)
  const items = response.data?.items || response.items || response.result || [];
  console.log('[Shopping Service] Image search extracted items count:', items.length);
  
  if (items.length === 0 && response.data?.total_count === 0) {
    console.warn('[Shopping Service] Image search returned 0 results. This may be legitimate (no matching products found) or could indicate an API issue.');
  }
  
  return normalizeProductCards(items);
}

/**
 * Get item detail with caching - saves to ExternalCatalogItem
 */
export async function getItemDetail(externalId: string): Promise<ProductDetail | null> {
  // Check DB cache (ExternalCatalogItem)
  const cached = await prisma.externalCatalogItem.findUnique({
    where: {
      source_external_id: {
        source: SOURCE,
        external_id: externalId,
      },
    },
  });

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
      const shippingResponse = await tmapiClient.getItemShipping(externalId);
      if (shippingResponse.data?.data) {
        shipping = shippingResponse.data.data;
      }
    } catch (error) {
      console.warn('[Shopping Service] Failed to fetch shipping for cached item:', error);
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
    
    return normalized;
  }

  // Call TMAPI
  const response = await tmapiClient.getItemDetail(externalId);
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
    const shippingResponse = await tmapiClient.getItemShipping(externalId);
    if (shippingResponse.data?.data) {
      shipping = shippingResponse.data.data;
    }
  } catch (error) {
    console.warn('[Shopping Service] Failed to fetch item shipping:', error);
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

  // Save to ExternalCatalogItem cache
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 24 hour TTL

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

  return normalized;
}

/**
 * Get hot items for a category - loads from DB cache (ExternalCatalogItem)
 * Priority: 1) Pinned items from ExternalHotItem, 2) Recent items from ExternalCatalogItem
 */
export async function getHotItems(categorySlug?: string, page: number = 1, pageSize: number = 20): Promise<ProductCard[]> {
  const where: any = { source: SOURCE };
  if (categorySlug) {
    where.category_slug = categorySlug;
  }

  // First, try to get pinned hot items
  const hotItems = await prisma.externalHotItem.findMany({
    where,
    orderBy: { pinned_rank: 'asc' },
    take: 100, // Get more to filter by valid cache
  });

  const items: ProductCard[] = [];

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
      } else {
        // Cache miss - fetch from TMAPI and cache it
        try {
          const detail = await getItemDetail(hotItem.external_id);
          if (detail) {
            items.push(detail);
          }
        } catch (error) {
          console.error(`[Shopping] Failed to fetch hot item ${hotItem.external_id}:`, error);
        }
      }
      
      // Limit results
      if (items.length >= pageSize) break;
    }
  }

  // If we don't have enough items from pinned list, fallback to recent items from ExternalCatalogItem
  if (items.length < pageSize) {
    const needed = pageSize - items.length;
    const recentItems = await prisma.externalCatalogItem.findMany({
      where: {
        source: SOURCE,
        expires_at: { gt: new Date() }, // Only non-expired cache
      },
      orderBy: { last_synced_at: 'desc' }, // Most recently synced first
      take: needed + 20, // Get extra to account for potential duplicates
    });

    const existingIds = new Set(items.map(i => i.externalId));
    
    for (const cached of recentItems) {
      if (existingIds.has(cached.external_id)) {
        continue; // Skip if already in the list
      }
      
      if (cached.raw_json) {
        try {
          const normalized = normalizeProductDetail(cached.raw_json as any);
          if (cached.title_en) {
            normalized.title = cached.title_en;
          }
          items.push(normalized);
          existingIds.add(normalized.externalId);
          
          if (items.length >= pageSize) break;
        } catch (error) {
          console.error(`[Shopping] Failed to normalize cached item ${cached.external_id}:`, error);
        }
      }
    }
  }

  // Apply pagination
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

