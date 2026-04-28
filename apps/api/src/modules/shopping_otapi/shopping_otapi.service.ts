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
const CURATED_CATEGORY_DEFS = [
  { slug: 'iphone', label: 'iPhone', keywords: ['iphone', 'phone', 'mobile', 'smartphone'] },
  { slug: 'bags', label: 'Bags', keywords: ['bag', 'bags', 'handbag', 'backpack', 'tote', 'wallet', 'suitcase'] },
  { slug: 'jewelry', label: 'Jewelry', keywords: ['jewelry', 'jewellery', 'jwellary', 'necklace', 'ring', 'bracelet', 'earring'] },
  { slug: 'kitchenware', label: 'Kitchenware', keywords: ['kitchenware', 'kitchen', 'cookware', 'tableware', 'utensil', 'pan', 'pot'] },
] as const;

const DEBUG_OTAPI = process.env.DEBUG_OTAPI === '1' || process.env.DEBUG_OTAPI === 'true';
let catalogCacheAvailable = true;
let markupCache: { percent: number; fetchedAt: number } = { percent: 0, fetchedAt: 0 };

function applyPercent(price: number | undefined, percent: number): number | undefined {
  if (price === undefined || price === null) return price;
  return Math.round(price * (1 + percent / 100));
}

function hasDisplayablePrice(card: Pick<ProductCardOTAPI, 'priceMin' | 'priceMax'>): boolean {
  const candidates = [card.priceMin, card.priceMax].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return candidates.some((value) => value > 0);
}

function filterPricedCards(cards: ProductCardOTAPI[]): ProductCardOTAPI[] {
  return cards.filter((card) => hasDisplayablePrice(card));
}

function buildFallbackCardFromCatalogItem(c: any): ProductCardOTAPI | null {
  if (!c?.external_id) return null;
  const mainImages = Array.isArray(c.main_images) ? c.main_images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0) : [];
  return {
    source: SOURCE,
    externalId: c.external_id,
    title: c.title || c.title_en || c.external_id,
    priceMin: c.price_min ?? undefined,
    priceMax: c.price_max ?? undefined,
    currency: (c.currency || 'CNY') as 'CNY',
    imageUrl: mainImages[0],
    images: mainImages.length > 0 ? mainImages : undefined,
    sourceUrl: c.source_url || undefined,
    raw: {
      title: c.title || c.title_en || c.external_id,
      externalId: c.external_id,
      priceMin: c.price_min,
      priceMax: c.price_max,
      imageUrl: mainImages[0],
      images: mainImages,
    },
  };
}

function resolveCuratedCategorySlug(keyword?: string, category?: string): string | undefined {
  const text = normalizeSearchText([keyword, category].filter(Boolean).join(' '));
  if (!text) return undefined;

  for (const def of CURATED_CATEGORY_DEFS) {
    if (text.includes(def.slug)) return def.slug;
    if (def.keywords.some((needle) => text.includes(needle))) return def.slug;
  }

  return undefined;
}

async function persistCuratedHotItems(categorySlug: string, cards: ProductCardOTAPI[]): Promise<void> {
  const normalized = cards.filter((card) => card?.externalId).slice(0, 2);
  if (normalized.length === 0) return;

  const ids = normalized.map((card) => card.externalId);
  await prisma.externalHotItem.deleteMany({
    where: {
      source: SOURCE,
      category_slug: categorySlug,
      external_id: { notIn: ids },
    },
  });

  for (const [idx, card] of normalized.entries()) {
    await prisma.externalHotItem.upsert({
      where: {
        source_external_id: {
          source: SOURCE,
          external_id: card.externalId,
        },
      },
      create: {
        source: SOURCE,
        external_id: card.externalId,
        category_slug: categorySlug,
        pinned_rank: idx + 1,
      },
      update: {
        category_slug: categorySlug,
        pinned_rank: idx + 1,
      },
    });
  }
}

function hasChineseCharacters(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

function normalizeSearchText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSearchTokens(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];

  const stopwords = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'by', 'e']);
  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => token.length > 1 || /\d/.test(token))
    .filter((token, index, array) => array.indexOf(token) === index)
    .filter((token) => !stopwords.has(token));
}

function buildSearchKeywordSpec(keyword: string): {
  keyword: string;
  languageOfQuery: 'en' | 'zh';
  normalizedKeyword: string;
  compactKeyword: string;
  tokens: string[];
  relevanceHint: string[];
  categoryOnly: boolean;
} {
  const raw = keyword.trim();
  if (!raw) {
    return {
      keyword: raw,
      languageOfQuery: 'en',
      normalizedKeyword: '',
      compactKeyword: '',
      tokens: [],
      relevanceHint: [],
      categoryOnly: false,
    };
  }

  if (hasChineseCharacters(raw)) {
    const normalizedKeyword = normalizeSearchText(raw) || raw;
    return {
      keyword: raw,
      languageOfQuery: 'zh',
      normalizedKeyword,
      compactKeyword: normalizedKeyword.replace(/\s+/g, ''),
      tokens: extractSearchTokens(raw),
      relevanceHint: [normalizedKeyword],
      categoryOnly: false,
    };
  }

  const normalizedKeyword = normalizeSearchText(raw) || raw.toLowerCase();
  let primaryKeyword = normalizedKeyword;

  if (/\be[-\s]?bike\b/i.test(normalizedKeyword) || /\bebike\b/i.test(normalizedKeyword)) {
    primaryKeyword = normalizedKeyword
      .replace(/\be[-\s]?bike\b/gi, 'electric bike')
      .replace(/\bebike\b/gi, 'electric bike');
  } else if (/\bbike\b/i.test(normalizedKeyword) && !/\belectric\b/i.test(normalizedKeyword)) {
    primaryKeyword = normalizedKeyword.replace(/\bbike\b/gi, 'electric bike');
  }

  const compactKeyword = primaryKeyword.replace(/\s+/g, '');
  const hints = Array.from(new Set([
    normalizedKeyword,
    primaryKeyword,
    compactKeyword,
    ...((/\bbike\b/i.test(normalizedKeyword) || /\bebike\b/i.test(normalizedKeyword)) ? ['electric bike', 'electric bicycle', 'ebike'] : []),
  ].map((item) => item.trim()).filter(Boolean)));

  return {
    keyword: primaryKeyword,
    languageOfQuery: 'en',
    normalizedKeyword,
    compactKeyword,
    tokens: extractSearchTokens(raw),
    relevanceHint: hints,
    categoryOnly: false,
  };
}

function scoreSearchCard(card: ProductCardOTAPI, spec: ReturnType<typeof buildSearchKeywordSpec>): number {
  if (spec.categoryOnly) {
    return 1;
  }
  const title = normalizeSearchText(card.title || '');
  if (!title) return 0;

  const titleCompact = title.replace(/\s+/g, '');
  const tokens = spec.tokens;
  const hints = spec.relevanceHint;
  let score = 0;

  for (const hint of hints) {
    if (!hint) continue;
    const normalizedHint = normalizeSearchText(hint);
    const compactHint = normalizedHint.replace(/\s+/g, '');
    if (normalizedHint && title.includes(normalizedHint)) score += 250;
    if (compactHint && titleCompact.includes(compactHint)) score += 180;
  }

  for (const token of tokens) {
    if (!token) continue;
    if (title.includes(token)) {
      score += token.length >= 5 ? 80 : 30;
    } else {
      score -= token.length >= 5 ? 20 : 8;
    }
  }

  if (tokens.length > 0 && score <= 0) {
    return -1000;
  }

  return score;
}

function sortRankedCards(
  cards: ProductCardOTAPI[],
  spec: ReturnType<typeof buildSearchKeywordSpec>,
  sort: string
): ProductCardOTAPI[] {
  const ranked = cards
    .map((card, index) => ({
      card,
      score: scoreSearchCard(card, spec),
      index,
    }))
    .filter((entry) => entry.score > -1000);

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (sort === 'price_up' || sort === 'price_asc') {
      const aPrice = a.card.priceMin ?? a.card.priceMax ?? Number.POSITIVE_INFINITY;
      const bPrice = b.card.priceMin ?? b.card.priceMax ?? Number.POSITIVE_INFINITY;
      if (aPrice !== bPrice) return aPrice - bPrice;
    } else if (sort === 'price_down' || sort === 'price_desc') {
      const aPrice = a.card.priceMax ?? a.card.priceMin ?? Number.NEGATIVE_INFINITY;
      const bPrice = b.card.priceMax ?? b.card.priceMin ?? Number.NEGATIVE_INFINITY;
      if (aPrice !== bPrice) return bPrice - aPrice;
    } else if (sort === 'popular' || sort === 'sales') {
      const aSold = a.card.totalSold ?? 0;
      const bSold = b.card.totalSold ?? 0;
      if (aSold !== bSold) return bSold - aSold;
    }

    return a.index - b.index;
  });

  return ranked.map((entry) => entry.card);
}

function buildCachedSearchResponse(cards: ProductCardOTAPI[]): any {
  return {
    Result: {
      Items: {
        Items: {
          Content: cards,
          TotalCount: cards.length,
        },
      },
    },
  };
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
  const marked = percent
    ? cards.map((card) => ({
        ...card,
        priceMin: applyPercent(card.priceMin, percent),
        priceMax: applyPercent(card.priceMax, percent),
      }))
    : cards;
  return filterPricedCards(marked);
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

function mergeProductDetail(primary: ProductDetailOTAPI, fallback: ProductDetailOTAPI): ProductDetailOTAPI {
  const mergedImages = Array.from(new Set([
    ...(Array.isArray(primary.images) ? primary.images : []),
    ...(Array.isArray(fallback.images) ? fallback.images : []),
    primary.imageUrl,
    fallback.imageUrl,
  ].filter((img): img is string => typeof img === 'string' && img.trim().length > 0)));

  const mergedSkus = Array.isArray(primary.skus) && primary.skus.length > 0
    ? primary.skus
    : fallback.skus;

  const mergedProps = Array.isArray(primary.productProps) && primary.productProps.length > 0
    ? primary.productProps
    : fallback.productProps;

  return {
    ...fallback,
    ...primary,
    title: primary.title && primary.title !== 'Untitled Product' ? primary.title : fallback.title,
    description: primary.description && primary.description.trim().length > 0 ? primary.description : fallback.description,
    imageUrl: primary.imageUrl || fallback.imageUrl || mergedImages[0],
    images: mergedImages.length > 0 ? mergedImages : undefined,
    skus: mergedSkus,
    productProps: mergedProps,
    priceMin: primary.priceMin ?? fallback.priceMin,
    priceMax: primary.priceMax ?? fallback.priceMax,
    totalSold: primary.totalSold ?? fallback.totalSold,
    rating: primary.rating ?? fallback.rating,
    ratingCount: primary.ratingCount ?? fallback.ratingCount,
    availableQuantity: primary.availableQuantity ?? fallback.availableQuantity,
    stock: primary.stock ?? fallback.stock,
    estimatedWeightKg: primary.estimatedWeightKg ?? fallback.estimatedWeightKg,
    weight_kg: primary.weight_kg ?? fallback.weight_kg,
    detailUrl: primary.detailUrl || fallback.detailUrl,
  };
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

      const card = await applyMarkupToCards([normalizeOTAPIProductCard(matched)]).then((cards) => cards[0]);
      if (card && card.externalId) {
        const fallbackDetail: ProductDetailOTAPI = {
          ...card,
          description: '',
          skus: null,
          productProps: undefined,
          raw: matched,
          detailUrl: card.detailUrl || card.sourceUrl,
          estimatedWeightKg: card.estimatedWeightKg,
          weight_kg: card.weight_kg,
        } as ProductDetailOTAPI;

        if (isUsableDetail(fallbackDetail)) {
          return fallbackDetail;
        }
      }
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
    minPrice?: number;
    maxPrice?: number;
    minVolume?: number;
  }
): Promise<SearchResult> {
  const baseKeyword = keyword?.trim() || opts?.category || 'products';
  const prepared = buildSearchKeywordSpec(baseKeyword);
  prepared.categoryOnly = !keyword?.trim() && !!opts?.category;
  const searchKeyword = prepared.keyword || baseKeyword;
  const languageOfQuery = prepared.languageOfQuery;
  const language = normalizeOtapiLanguage(opts?.language || 'en');
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const sort = opts?.sort || 'sales';

  const cacheKey = generateCacheKey('otapi_keyword', {
    keyword: searchKeyword,
    language,
    sort,
    category: opts?.category || '',
    minPrice: opts?.minPrice ?? '',
    maxPrice: opts?.maxPrice ?? '',
    minVolume: opts?.minVolume ?? '',
    categoryOnly: prepared.categoryOnly,
  });

  const cached = await getCachedSearch(SOURCE, cacheKey);
  if (cached) {
    const items = extractSearchItems(cached);
    const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(items));
    const ranked = sortRankedCards(normalized, prepared, sort);
    const framePosition = (page - 1) * pageSize;
    const paged = ranked.slice(framePosition, framePosition + pageSize);
    const totalCount = ranked.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const curatedCategorySlug = resolveCuratedCategorySlug(searchKeyword, opts?.category);
    if (curatedCategorySlug) {
      await persistCuratedHotItems(curatedCategorySlug, paged);
    }
    return { items: paged, totalCount, page, pageSize, totalPages, hasNextPage };
  }

  const framePosition = (page - 1) * pageSize;
  const fetchSize = Math.min(Math.max(pageSize * 8, 120), 200);
  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] searchByKeyword request:', {
      keyword: searchKeyword,
      languageOfQuery,
      language,
      page,
      pageSize,
      fetchSize,
      framePosition,
      orderBy: mapSortToOrderBy(sort),
    });
  }
  let response: any;
  try {
    response = await otapiClient.searchItemsFrame({
      language,
      languageOfQuery,
      framePosition: 0,
      frameSize: fetchSize,
      ItemTitle: searchKeyword,
      OrderBy: mapSortToOrderBy(sort),
      MinPrice: opts?.minPrice,
      MaxPrice: opts?.maxPrice,
      MinVolume: opts?.minVolume,
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

  const items = extractSearchItems(response);
  const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(items));
  const ranked = sortRankedCards(normalized, prepared, sort);
  const totalCount = ranked.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const paged = ranked.slice(framePosition, framePosition + pageSize);
  const curatedCategorySlug = resolveCuratedCategorySlug(searchKeyword, opts?.category);

  await setCachedSearch(SOURCE, cacheKey, { keyword: searchKeyword, ...opts }, buildCachedSearchResponse(ranked));

  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] searchByKeyword response summary:', {
      itemsRawCount: Array.isArray(items) ? items.length : 0,
      itemsNormalizedCount: normalized.length,
      itemsRankedCount: ranked.length,
      totalCount,
      totalPages,
      hasNextPage,
    });
  }

  // Best effort cache into ExternalCatalogItem for hot/pinned items + product details fallback
  for (const card of paged) {
    const ok = await cacheCatalogItem({
      externalId: card.externalId,
      title: card.title,
      priceMin: card.priceMin,
      priceMax: card.priceMax,
      images: card.images,
      sourceUrl: card.sourceUrl,
      rawJson: card.raw,
    });
    if (!ok) break;
  }

  if (curatedCategorySlug) {
    await persistCuratedHotItems(curatedCategorySlug, paged);
  }

  return { items: paged, totalCount, page, pageSize, totalPages, hasNextPage };
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

  let fallback: ProductDetailOTAPI | null = null;
  let desc: any = null;
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
  }

  try {
    desc = await otapiClient.getItemDescription({ itemId, language: lang });
  } catch {
    // ignore
  }

  if (!fullInfo) {
    fallback = await fallbackDetailFromSearchCache(externalId);
    if (desc) {
      const descDetail = await applyMarkupToDetail(normalizeOTAPIProductDetail(desc, desc));
      if (fallback) {
        const merged = mergeProductDetail(fallback, descDetail);
        if (isUsableDetail(merged)) return merged;
      } else if (isUsableDetail(descDetail)) {
        return descDetail;
      }
    }
    return fallback;
  }

  const itemData = unwrapOtapiPayload(fullInfo);
  const descriptionData = unwrapOtapiPayload(desc);
  const normalized = await applyMarkupToDetail(normalizeOTAPIProductDetail(itemData, descriptionData));
  fallback = await fallbackDetailFromSearchCache(externalId);
  const merged = fallback ? mergeProductDetail(normalized, fallback) : normalized;

  if (!isUsableDetail(merged)) {
    if (fallback) {
      return fallback;
    }
  }

  if (DEBUG_OTAPI) {
    console.log('[OTAPI Service] getItemDetail response summary:', {
      externalId,
      title: merged.title?.substring(0, 80),
      hasImages: !!(merged.images && merged.images.length > 0),
      priceMin: merged.priceMin,
      priceMax: merged.priceMax,
    });
  }

  if (isUsableDetail(merged)) {
    await cacheCatalogItem({
      externalId,
      title: merged.title,
      priceMin: merged.priceMin,
      priceMax: merged.priceMax,
      images: merged.images,
      sourceUrl: merged.sourceUrl,
      rawJson: itemData as any,
    });
  }

  return merged;
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

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 20);
  const targetCount = safePage * safePageSize;
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
        const fallbackCard = buildFallbackCardFromCatalogItem(c);
        if (fallbackCard) {
          const normalized = await applyMarkupToCards([fallbackCard]).then((cards) => cards[0]);
          if (normalized) {
            items.push(normalized);
            existingIds.add(normalized.externalId);
          }
        }
      }
      if (items.length >= targetCount) break;
    }
  }

  if (items.length < targetCount) {
    const needed = targetCount - items.length;
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
      } else {
        const fallbackCard = buildFallbackCardFromCatalogItem(c);
        if (fallbackCard) {
          const normalized = await applyMarkupToCards([fallbackCard]).then((cards) => cards[0]);
          if (normalized) {
            items.push(normalized);
            existingIds.add(normalized.externalId);
          }
        }
      }
      if (items.length >= targetCount) break;
    }
  }

  if (items.length < targetCount) {
    const cachedSearches = await prisma.externalSearchCache.findMany({
      where: {
        source: SOURCE,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    for (const entry of cachedSearches) {
      const cachedItems = extractSearchItems(entry.results_json);
      if (!Array.isArray(cachedItems) || cachedItems.length === 0) continue;
      const normalized = await applyMarkupToCards(normalizeOTAPIProductCards(cachedItems));
      for (const card of normalized) {
        if (existingIds.has(card.externalId)) continue;
        items.push(card);
        existingIds.add(card.externalId);
        if (items.length >= targetCount) break;
      }
      if (items.length >= targetCount) break;
    }
  }

  const start = (safePage - 1) * safePageSize;
  return filterPricedCards(items as ProductCardOTAPI[]).slice(start, start + safePageSize);
}

export async function getCuratedHomeSections(): Promise<Array<{ slug: string; label: string; items: ProductCardOTAPI[] }>> {
  const sections = await Promise.all(CURATED_CATEGORY_DEFS.map(async (def) => {
    const pinned = await prisma.externalHotItem.findMany({
      where: {
        source: SOURCE,
        category_slug: def.slug,
      },
      orderBy: [{ pinned_rank: 'asc' }, { created_at: 'desc' }],
      take: 2,
    });

    const ids = pinned.map((item) => item.external_id);
    const catalogItems = ids.length > 0
      ? await prisma.externalCatalogItem.findMany({
          where: {
            source: SOURCE,
            external_id: { in: ids },
            expires_at: { gt: new Date() },
          },
        })
      : [];
    const catalogById = new Map(catalogItems.map((item) => [item.external_id, item]));

    const cards: ProductCardOTAPI[] = [];
    for (const item of pinned) {
      const catalog = catalogById.get(item.external_id);
      if (catalog?.raw_json) {
        const normalized = await applyMarkupToDetail(normalizeOTAPIProductDetail(catalog.raw_json as any));
        cards.push(normalized);
      } else {
        const fallbackCard = buildFallbackCardFromCatalogItem(catalog);
        if (fallbackCard) {
          const normalized = await applyMarkupToCards([fallbackCard]).then((result) => result[0]);
          if (normalized) cards.push(normalized);
        }
      }
      if (cards.length >= 2) break;
    }

    if (cards.length < 2) {
      try {
        const searchResult = await searchByKeyword(def.label, {
          page: 1,
          pageSize: 2,
          sort: 'sales',
          language: 'en',
        });
        for (const card of searchResult.items || []) {
          if (cards.some((existing) => existing.externalId === card.externalId)) continue;
          cards.push(card);
          if (cards.length >= 2) break;
        }
      } catch {
        // ignore fallback search failures
      }
    }

    return {
      slug: def.slug,
      label: def.label,
      items: filterPricedCards(cards).slice(0, 2),
    };
  }));

  return sections;
}
