import otapiClient from './otapi.client.js';
import {
  normalizeOTAPIProductCard,
  normalizeOTAPIProductCards,
  normalizeOTAPIProductDetail,
  ProductCardOTAPI,
  ProductDetailOTAPI,
  unwrapOtapiPayload,
} from './shopping_otapi.normalize.js';
import {
  generateCacheKey,
  getCachedSearch,
  setCachedSearch,
} from '../shopping/cache.js';
import { prisma } from '../../lib/prisma.js';

const SOURCE = 'shopping_otapi';

const DEBUG_OTAPI = process.env.DEBUG_OTAPI === '1' || process.env.DEBUG_OTAPI === 'true';
let catalogCacheAvailable = true;
let markupCache: { percent: number; fetchedAt: number } = { percent: 0, fetchedAt: 0 };

function applyPercent(price: number | undefined, percent: number): number | undefined {
  if (price === undefined || price === null) return price;
  return Math.round(price * (1 + percent / 100));
}

async function getOtapiMarkupPercent(): Promise<number> {
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

async function applyMarkupToCards(cards: ProductCardOTAPI[]): Promise<ProductCardOTAPI[]> {
  const percent = await getOtapiMarkupPercent();
  if (!percent) return cards;
  return cards.map((card) => ({
    ...card,
    priceMin: applyPercent(card.priceMin, percent),
    priceMax: applyPercent(card.priceMax, percent),
  }));
}

async function applyMarkupToDetail(detail: ProductDetailOTAPI): Promise<ProductDetailOTAPI> {
  const percent = await getOtapiMarkupPercent();
  if (!percent) return detail;
  return {
    ...detail,
    priceMin: applyPercent(detail.priceMin, percent),
    priceMax: applyPercent(detail.priceMax, percent),
    tieredPricing: detail.tieredPricing?.map((tier) => ({
      ...tier,
      price: applyPercent(tier.price, percent) ?? tier.price,
    })),
  };
}

function isDatabaseUnavailable(error: any): boolean {
  const message = String(error?.message || '');
  return (
    error?.name === 'PrismaClientInitializationError' ||
    message.includes("Can't reach database server") ||
    message.includes('P1001') ||
    message.includes('P1017')
  );
}

async function cacheCatalogItem(payload: {
  externalId: string;
  title: string;
  priceMin?: number | null;
  priceMax?: number | null;
  images?: any;
  sourceUrl?: string | null;
  rawJson?: any;
}): Promise<boolean> {
  if (!catalogCacheAvailable) return false;

  try {
    await prisma.externalCatalogItem.upsert({
      where: {
        source_external_id: {
          source: SOURCE,
          external_id: payload.externalId,
        },
      },
      create: {
        source: SOURCE,
        external_id: payload.externalId,
        title: payload.title,
        price_min: payload.priceMin ?? null,
        price_max: payload.priceMax ?? null,
        currency: 'CNY',
        main_images: payload.images ? JSON.parse(JSON.stringify(payload.images)) : null,
        source_url: payload.sourceUrl || null,
        raw_json: payload.rawJson ?? null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {
        title: payload.title,
        price_min: payload.priceMin ?? null,
        price_max: payload.priceMax ?? null,
        main_images: payload.images ? JSON.parse(JSON.stringify(payload.images)) : null,
        source_url: payload.sourceUrl || null,
        raw_json: payload.rawJson ?? null,
        last_synced_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return true;
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      catalogCacheAvailable = false;
      if (DEBUG_OTAPI) {
        console.warn('[OTAPI Service] Database unavailable, disabling catalog cache');
      }
    }
    return false;
  }
}

export const SHOPPING_CATEGORIES = [
  {
    slug: 'electronics',
    name: 'Electronics',
    icon: '📱',
    subcategories: ['iPhone', 'Xiaomi', 'Laptop', 'Tablet', 'Headphones', 'Camera', 'Smartwatch', 'Charger'],
  },
  {
    slug: 'clothing',
    name: 'Clothing & Apparel',
    icon: '👕',
    subcategories: ['T-Shirt', 'Jeans', 'Dress', 'Jacket', 'Shoes', 'Accessories', 'Underwear', 'Socks'],
  },
  {
    slug: 'home',
    name: 'Home & Garden',
    icon: '🏠',
    subcategories: ['Furniture', 'Kitchen', 'Bedding', 'Decoration', 'Garden', 'Lighting', 'Storage', 'Tools'],
  },
  {
    slug: 'toys',
    name: 'Toys & Games',
    icon: '🧸',
    subcategories: ['Action Figures', 'Board Games', 'Puzzles', 'Educational', 'Outdoor', 'RC Toys', 'Dolls', 'Building Blocks'],
  },
  {
    slug: 'beauty',
    name: 'Beauty & Personal Care',
    icon: '💄',
    subcategories: ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Tools', "Men's Care", 'Bath & Body', 'Nail Care'],
  },
  {
    slug: 'sports',
    name: 'Sports & Outdoors',
    icon: '⚽',
    subcategories: ['Fitness', 'Running', 'Cycling', 'Camping', 'Swimming', 'Yoga', 'Outdoor Gear', 'Sports Apparel'],
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    icon: '🚗',
    subcategories: ['Car Parts', 'Accessories', 'Tools', 'Maintenance', 'Electronics', 'Interior', 'Exterior', 'Motorcycle'],
  },
  {
    slug: 'industrial',
    name: 'Industrial & Business',
    icon: '🏭',
    subcategories: ['Machinery', 'Tools', 'Equipment', 'Supplies', 'Safety', 'Packaging', 'Office', 'Materials'],
  },
  {
    slug: 'jewelry',
    name: 'Jewelry',
    icon: '💍',
    subcategories: ['Necklace', 'Ring', 'Earring', 'Bracelet', 'Pendant', 'Brooch', 'Hair Accessories', 'Anklet'],
  },
  {
    slug: 'eyewear',
    name: 'Eyewear',
    icon: '👓',
    subcategories: ['Sunglasses', 'Reading Glasses', 'Frames', 'Lenses', 'Cases', 'Accessories', 'Prescription', 'Fashion'],
  },
  {
    slug: 'chocolate',
    name: 'Chocolate',
    icon: '🍫',
    subcategories: ['Dark Chocolate', 'Milk Chocolate', 'White Chocolate', 'Truffles', 'Bars', 'Gift Box', 'Bulk', 'Sugar Free'],
  },
];

export async function getCategories() {
  return SHOPPING_CATEGORIES;
}

export interface SearchResult {
  items: ProductCardOTAPI[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  hasNextPage?: boolean;
}

function normalizeOtapiLanguage(language?: string): string {
  if (!language) return 'en';
  const l = String(language).toLowerCase();
  if (l === 'zh' || l === 'zh-cn' || l === 'cn') return 'en';
  return language;
}

function mapSortToOrderBy(sort?: string): string {
  const s = String(sort || 'sales');
  if (s === 'price_up' || s === 'price_asc') return 'Price:Asc';
  if (s === 'price_down' || s === 'price_desc') return 'Price:Desc';
  if (s === 'sales') return 'Volume:Desc';
  if (s === 'popular') return 'Popularity:Desc';
  if (s === 'default') return 'Default';
  return 'Volume:Desc';
}

function ensureAbbPrefix(id: string): string {
  if (!id) return id;
  if (id.startsWith('abb-')) return id;
  return `abb-${id}`;
}

function extractSearchItems(response: any): any[] {
  const items =
    response?.Result?.Items?.Items?.Content ||
    response?.Result?.Items?.Items ||
    response?.Result?.Items?.Item ||
    response?.Result?.Items ||
    response?.Items ||
    response?.items ||
    response?.data?.items ||
    [];

  if (Array.isArray(items)) return items;
  if (Array.isArray(items?.Content)) return items.Content;
  return [];
}

function extractTotalCount(response: any): number | undefined {
  const total =
    response?.Result?.Items?.Items?.TotalCount ||
    response?.Result?.Items?.Items?.totalCount ||
    response?.Result?.TotalCount ||
    response?.Result?.ItemsCount ||
    response?.TotalCount ||
    response?.totalCount ||
    response?.data?.total_count;

  const n = typeof total === 'number' ? total : parseInt(String(total || ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function isUsableDetail(detail: ProductDetailOTAPI | null | undefined): detail is ProductDetailOTAPI {
  return !!detail && !!detail.externalId && detail.externalId.trim().length > 0 && detail.title !== 'Untitled Product';
}

async function fallbackDetailFromSearchCache(externalId: string): Promise<ProductDetailOTAPI | null> {
  const cachedSearches = await prisma.externalSearchCache.findMany({
    where: {
      source: SOURCE,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  });

  for (const entry of cachedSearches) {
    const items = extractSearchItems(entry.results_json);
    if (!Array.isArray(items) || items.length === 0) continue;
    const matched = items.find((item) => {
      const card = normalizeOTAPIProductCard(item);
      return card.externalId === externalId || ensureAbbPrefix(card.externalId) === ensureAbbPrefix(externalId);
    });
    if (matched) {
      const detail = await applyMarkupToDetail(normalizeOTAPIProductDetail(matched));
      if (isUsableDetail(detail)) return detail;
    }
  }

  return null;
}

/**
 * Keyword search
 */
export async function searchByKeyword(
  keyword: string | undefined,
  opts?: {
    category?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    language?: string;
  }
): Promise<SearchResult> {
  const searchKeyword = keyword?.trim() || opts?.category || 'products';
  const language = normalizeOtapiLanguage(opts?.language || 'en');
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const sort = opts?.sort || 'sales';

  const cacheKey = generateCacheKey('otapi_keyword', {
    keyword: searchKeyword,
    language,
    page,
    pageSize,
    sort,
  });

  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    const items = extractSearchItems(cached);
    const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(items));
    const totalCount = extractTotalCount(cached) ?? normalized.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    return { items: normalized, totalCount, page, pageSize, totalPages, hasNextPage };
  }

  const framePosition = (page - 1) * pageSize;
  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] searchByKeyword request:', {
      keyword: searchKeyword,
      language,
      page,
      pageSize,
      framePosition,
      orderBy: mapSortToOrderBy(sort),
    });
  }
  let response: any;
  try {
    response = await otapiClient.searchItemsFrame({
      language,
      framePosition,
      frameSize: pageSize,
      ItemTitle: searchKeyword,
      OrderBy: mapSortToOrderBy(sort),
    });
  } catch (error) {
    console.warn('[OTAPI Service] searchByKeyword failed, returning empty results:', {
      keyword: searchKeyword,
      language,
      page,
      pageSize,
      sort,
      message: String((error as any)?.message || error),
    });
    return { items: [], totalCount: 0, page, pageSize, totalPages: 0, hasNextPage: false };
  }

  await setCachedSearch(SOURCE, cacheKey, { keyword: searchKeyword, ...opts }, response);

  const items = extractSearchItems(response);
  const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(items));
  const totalCount = extractTotalCount(response) ?? normalized.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;

  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] searchByKeyword response summary:', {
      itemsRawCount: Array.isArray(items) ? items.length : 0,
      itemsNormalizedCount: normalized.length,
      totalCount,
      totalPages,
      hasNextPage,
    });
  }

  // Best effort cache into ExternalCatalogItem for hot/pinned items + product details fallback
  for (const card of normalized) {
    const ok = await cacheCatalogItem({
      externalId: card.externalId,
      title: card.title,
      priceMin: card.priceMin,
      priceMax: card.priceMax,
      images: card.images,
      sourceUrl: card.sourceUrl,
    });
    if (!ok) break;
  }

  return { items: normalized, totalCount, page, pageSize, totalPages, hasNextPage };
}

/**
 * Image search
 */
export async function searchByImage(
  r2PublicUrl: string,
  opts?: {
    category?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    language?: string;
  }
): Promise<SearchResult> {
  const language = normalizeOtapiLanguage(opts?.language || 'en');
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const sort = opts?.sort || 'sales';

  let imageUrlForOtapi = r2PublicUrl;
  const isAlibabaCdnUrl =
    typeof r2PublicUrl === 'string' && (r2PublicUrl.includes('alicdn.com') || r2PublicUrl.includes('1688.com'));
  if (!isAlibabaCdnUrl && process.env.API_BASE_URL) {
    imageUrlForOtapi = `${process.env.API_BASE_URL}/api/public/image-proxy?url=${encodeURIComponent(r2PublicUrl)}`;
  }

  const cacheKey = generateCacheKey('otapi_image', {
    imgUrl: r2PublicUrl,
    language,
    page,
    pageSize,
    sort,
  });

  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    const items = extractSearchItems(cached);
    const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(items));
    const totalCount = extractTotalCount(cached) ?? normalized.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    return { items: normalized, totalCount, page, pageSize, totalPages, hasNextPage };
  }

  const framePosition = (page - 1) * pageSize;
  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] searchByImage request:', {
      language,
      page,
      pageSize,
      framePosition,
      orderBy: mapSortToOrderBy(sort),
      imageUrlPrefix: String(r2PublicUrl || '').substring(0, 120),
      imageUrlForOtapiPrefix: String(imageUrlForOtapi || '').substring(0, 160),
      usedImageProxy: imageUrlForOtapi !== r2PublicUrl,
    });
  }
  let response: any;
  try {
    response = await otapiClient.searchItemsFrame({
      language,
      framePosition,
      frameSize: pageSize,
      ImageUrl: imageUrlForOtapi,
      OrderBy: mapSortToOrderBy(sort),
    });
  } catch (error) {
    console.warn('[OTAPI Service] searchByImage failed, returning empty results:', {
      language,
      page,
      pageSize,
      sort,
      message: String((error as any)?.message || error),
    });
    return { items: [], totalCount: 0, page, pageSize, totalPages: 0, hasNextPage: false };
  }

  await setCachedSearch(SOURCE, cacheKey, { imgUrl: r2PublicUrl, ...opts }, response);

  const items = extractSearchItems(response);
  const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(items));
  const totalCount = extractTotalCount(response) ?? normalized.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;

  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] searchByImage response summary:', {
      itemsRawCount: Array.isArray(items) ? items.length : 0,
      itemsNormalizedCount: normalized.length,
      totalCount,
      totalPages,
      hasNextPage,
    });
  }

  return { items: normalized, totalCount, page, pageSize, totalPages, hasNextPage };
}

/**
 * Get item detail
 */
export async function getItemDetail(externalId: string, language: string = 'en'): Promise<ProductDetailOTAPI | null> {
  const itemId = ensureAbbPrefix(externalId);
  const lang = normalizeOtapiLanguage(language);

  // Use shared ExternalCatalogItem cache first
  const cached = await prisma.externalCatalogItem
    .findFirst({
      where: {
        source: SOURCE,
        external_id: externalId,
        expires_at: { gt: new Date() },
      },
      orderBy: { last_synced_at: 'desc' },
    })
    .catch(() => null);

  if (cached?.raw_json) {
    const normalized = await applyMarkupToDetail(normalizeOTAPIProductDetail(cached.raw_json as any));
    if (isUsableDetail(normalized)) {
      return normalized;
    }
  }

  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] getItemDetail request:', { externalId, itemId, language: lang });
  }

  let fullInfo: any;
  try {
    fullInfo = await otapiClient.getItemFullInfo({
      itemId,
      language: lang,
      blockList: ['Description', 'OriginalDescription', 'Vendor', 'DeliveryCosts'],
    });
  } catch (error) {
    console.warn('[OTAPI Service] getItemDetail failed, returning cached/null fallback:', {
      externalId,
      itemId,
      language: lang,
      message: String((error as any)?.message || error),
    });
    const fallback = await fallbackDetailFromSearchCache(externalId);
    return fallback;
  }

  let desc: any = null;
  try {
    desc = await otapiClient.getItemDescription({ itemId, language: lang });
  } catch {
    // ignore
  }

  const itemData = unwrapOtapiPayload(fullInfo);
  const descriptionData = unwrapOtapiPayload(desc);
  const normalized = await applyMarkupToDetail(normalizeOTAPIProductDetail(itemData, descriptionData));

  if (!isUsableDetail(normalized)) {
    const fallback = await fallbackDetailFromSearchCache(externalId);
    if (fallback) {
      return fallback;
    }
  }

  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] getItemDetail response summary:', {
      externalId,
      title: normalized.title?.substring(0, 80),
      hasImages: !!(normalized.images && normalized.images.length > 0),
      priceMin: normalized.priceMin,
      priceMax: normalized.priceMax,
    });
  }

  if (isUsableDetail(normalized)) {
    await cacheCatalogItem({
      externalId,
      title: normalized.title,
      priceMin: normalized.priceMin,
      priceMax: normalized.priceMax,
      images: normalized.images,
      sourceUrl: normalized.sourceUrl,
      rawJson: itemData as any,
    });
  }

  return normalized;
}

export async function getVendorInfo(vendorId: string, language: string = 'en'): Promise<any> {
  return otapiClient.getVendorInfo({ vendorId: ensureAbbPrefix(vendorId), language });
}

export async function getItemDescription(externalId: string, language: string = 'en'): Promise<any> {
  return otapiClient.getItemDescription({ itemId: ensureAbbPrefix(externalId), language });
}

export async function getItemReviews(
  externalId: string,
  opts?: { language?: string; framePosition?: number; frameSize?: number }
): Promise<any> {
  return otapiClient.searchItemReviews({
    itemId: ensureAbbPrefix(externalId),
    language: opts?.language || 'en',
    framePosition: opts?.framePosition ?? 0,
    frameSize: opts?.frameSize ?? 50,
  });
}

export async function getBriefCatalog(): Promise<any> {
  return otapiClient.getBriefCatalog();
}

export async function getHotItems(categorySlug?: string, page: number = 1, pageSize: number = 20): Promise<ProductCardOTAPI[]> {
  const where: any = { source: SOURCE };
  if (categorySlug) {
    where.category_slug = categorySlug;
  }

  const items: ProductCardOTAPI[] = [];
  const existingIds = new Set<string>();

  // Use pinned items, if any
  const pinned = await prisma.externalHotItem.findMany({
    where: {
      ...where,
      pinned_rank: { gt: 0 },
    },
    orderBy: { pinned_rank: 'asc' },
    take: 100,
  });

  if (pinned.length > 0) {
    const externalIds = pinned.map((h) => h.external_id);
    const cachedItems = await prisma.externalCatalogItem.findMany({
      where: {
        source: SOURCE,
        external_id: { in: externalIds },
        expires_at: { gt: new Date() },
      },
    });
    const cachedMap = new Map(cachedItems.map((c) => [c.external_id, c]));

    for (const p of pinned) {
      const c = cachedMap.get(p.external_id);
      if (c?.raw_json) {
        const normalized = await applyMarkupToDetail(normalizeOTAPIProductDetail(c.raw_json as any));
        items.push(normalized);
        existingIds.add(normalized.externalId);
      } else {
        try {
          const detail = await getItemDetail(p.external_id);
          if (detail) {
            items.push(detail);
            existingIds.add(detail.externalId);
          }
        } catch {
          // ignore
        }
      }
      if (items.length >= pageSize) break;
    }
  }

  if (items.length < pageSize) {
    const needed = pageSize - items.length;
    const recentItems = await prisma.externalCatalogItem.findMany({
      where: {
        source: SOURCE,
        expires_at: { gt: new Date() },
      },
      orderBy: { last_synced_at: 'desc' },
      take: needed + 20,
    });

    for (const c of recentItems) {
      if (existingIds.has(c.external_id)) continue;
      if (c.raw_json) {
        const normalized = await applyMarkupToDetail(normalizeOTAPIProductDetail(c.raw_json as any));
        items.push(normalized);
        existingIds.add(normalized.externalId);
      }
      if (items.length >= pageSize) break;
    }
  }

  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
