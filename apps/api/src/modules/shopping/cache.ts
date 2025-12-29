/**
 * Cache helpers for TMAPI responses
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

const SEARCH_CACHE_TTL_MINUTES = 15;
const ITEM_CACHE_TTL_HOURS = 24;

/**
 * Generate deterministic cache key from search parameters
 */
export function generateCacheKey(type: string, params: Record<string, any>): string {
  const normalized = JSON.stringify({ type, params: sortObject(params) });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function sortObject(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

/**
 * Get cached search results
 */
export async function getCachedSearch(
  source: string,
  cacheKey: string
): Promise<any | null> {
  const cached = await prisma.externalSearchCache.findUnique({
    where: { cache_key: cacheKey },
  });

  if (!cached) {
    return null;
  }

  // Check if expired
  if (new Date() > cached.expires_at) {
    // Delete expired cache
    await prisma.externalSearchCache.delete({
      where: { id: cached.id },
    });
    return null;
  }

  return cached.results_json;
}

/**
 * Store search results in cache
 */
export async function setCachedSearch(
  source: string,
  cacheKey: string,
  queryJson: any,
  resultsJson: any
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + SEARCH_CACHE_TTL_MINUTES);

  await prisma.externalSearchCache.upsert({
    where: { cache_key: cacheKey },
    create: {
      source,
      cache_key: cacheKey,
      query_json: queryJson,
      results_json: resultsJson,
      expires_at: expiresAt,
    },
    update: {
      query_json: queryJson,
      results_json: resultsJson,
      expires_at: expiresAt,
    },
  });
}

/**
 * Get cached item detail
 */
export async function getCachedItem(
  source: string,
  externalId: string
): Promise<any | null> {
  const cached = await prisma.externalCatalogItem.findUnique({
    where: { external_id: externalId },
  });

  if (!cached) {
    return null;
  }

  // Check if expired
  if (new Date() > cached.expires_at) {
    // Don't delete, just mark as stale (will be refreshed on next fetch)
    return null;
  }

  return cached;
}

/**
 * Store item detail in cache
 */
export async function setCachedItem(
  source: string,
  externalId: string,
  itemData: any
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ITEM_CACHE_TTL_HOURS);

  // Extract fields from itemData
  const title = itemData.title || itemData.subject || itemData.name || null;
  const priceMin = itemData.price_min || (itemData.price?.min ? parseFloat(itemData.price.min) : null);
  const priceMax = itemData.price_max || (itemData.price?.max ? parseFloat(itemData.price.max) : null);
  const mainImages = itemData.main_images || itemData.images || null;
  const skusJson = itemData.skus || itemData.sku_list || null;
  const sellerJson = itemData.seller || itemData.seller_info || null;
  const sourceUrl = itemData.detail_url || itemData.url || itemData.link || null;

  await prisma.externalCatalogItem.upsert({
    where: { external_id: externalId },
    create: {
      source,
      external_id: externalId,
      title,
      price_min: priceMin,
      price_max: priceMax,
      currency: 'CNY',
      main_images: mainImages,
      skus_json: skusJson,
      seller_json: sellerJson,
      source_url: sourceUrl,
      raw_json: itemData,
      expires_at: expiresAt,
    },
    update: {
      title,
      price_min: priceMin,
      price_max: priceMax,
      main_images: mainImages,
      skus_json: skusJson,
      seller_json: sellerJson,
      source_url: sourceUrl,
      raw_json: itemData,
      last_synced_at: new Date(),
      expires_at: expiresAt,
    },
  });
}

/**
 * Clean up expired cache entries (can be run as a cron job)
 */
export async function cleanupExpiredCache(): Promise<void> {
  const now = new Date();

  await prisma.externalSearchCache.deleteMany({
    where: {
      expires_at: {
        lt: now,
      },
    },
  });

  // Note: We keep expired ExternalCatalogItem for reference, but they won't be returned
  // You can optionally delete them too:
  // await prisma.externalCatalogItem.deleteMany({
  //   where: { expires_at: { lt: now } },
  // });
}

