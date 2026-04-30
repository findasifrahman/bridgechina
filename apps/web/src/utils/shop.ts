export type ShopIdentity = {
  key: string;
  vendorId?: string;
  name: string;
  url?: string;
  score?: number;
  badges: string[];
  isOfficial: boolean;
  isVerified: boolean;
  isBrand: boolean;
};

export type ShopSummary = ShopIdentity & {
  itemCount: number;
  totalSold: number;
  products: any[];
  matchedTerms: string[];
  matchScore: number;
};

export type BrandInsight = {
  terms: string[];
  source: 'query' | 'inventory' | 'mixed' | 'none';
  label: string;
};

function normalizeText(value: any): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

const GENERIC_QUERY_WORDS = new Set([
  'product',
  'products',
  'item',
  'items',
  'goods',
  'shop',
  'store',
  'brand',
  'official',
  'officialstore',
  'official store',
  'supplier',
  'suppliers',
  'vendor',
  'vendors',
  'seller',
  'sellers',
  'factory',
  'factory direct',
  'wholesale',
  'bulk',
  'sale',
  'best',
  'top',
]);

const COMMON_PRODUCT_WORDS = new Set([
  'phone',
  'phones',
  'mobile',
  'mobilephone',
  'laptop',
  'laptops',
  'computer',
  'computers',
  'tablet',
  'tablets',
  'watch',
  'watches',
  'sunglass',
  'sunglasses',
  'glass',
  'glasses',
  'shoe',
  'shoes',
  'bag',
  'bags',
  'wallet',
  'wallets',
  'case',
  'cases',
  'jacket',
  'jackets',
  'shirt',
  'shirts',
  'dress',
  'dresses',
  'speaker',
  'speakers',
  'headphone',
  'headphones',
  'earphone',
  'earphones',
  'camera',
  'cameras',
  'charger',
  'chargers',
  'tablet',
  'pad',
  'ring',
  'rings',
  'necklace',
  'bracelet',
  'earring',
  'earrings',
]);

function isTruthyFlag(value: any): boolean {
  if (value === true) return true;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'official', 'verified', 'authenticated', 'brand', 'flagship'].includes(normalized);
  }
  return false;
}

function extractBrandLikeTokens(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return uniqueStrings(
    normalized
      .split(' ')
      .map((token) => token.replace(/[^a-z0-9\u4e00-\u9fff-]/gi, '').trim())
      .filter((token) => token.length >= 3)
      .filter((token) => !GENERIC_QUERY_WORDS.has(token))
      .filter((token) => !COMMON_PRODUCT_WORDS.has(token))
      .filter((token) => !/^\d+$/.test(token))
  );
}

function collectObjectCandidates(...sources: any[]): Record<string, any> {
  const merged: Record<string, any> = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    Object.assign(merged, source);
  }
  return merged;
}

export function extractShopIdentity(product: any): ShopIdentity | null {
  const raw = collectObjectCandidates(product?.raw, product?.shop?.raw, product?.vendorInfo, product?.sellerInfo);
  const vendorSource = collectObjectCandidates(
    product?.shop,
    product?.vendorInfo,
    product?.sellerInfo,
    raw?.Vendor,
    raw?.VendorInfo,
    raw?.Seller,
    raw?.Shop,
    raw?.Store
  );

  const vendorId = uniqueStrings([
    product?.vendorId,
    product?.shop?.vendorId,
    vendorSource?.VendorId,
    vendorSource?.VendorID,
    vendorSource?.SellerId,
    vendorSource?.SellerID,
    raw?.VendorId,
    raw?.VendorID,
    raw?.SellerId,
    raw?.SellerID,
  ])[0];

  const name = uniqueStrings([
    product?.shopName,
    product?.sellerName,
    vendorSource?.ShopName,
    vendorSource?.shopName,
    vendorSource?.Name,
    vendorSource?.name,
    vendorSource?.Title,
    vendorSource?.title,
    vendorSource?.DisplayName,
    vendorSource?.displayName,
    vendorSource?.CompanyName,
    vendorSource?.companyName,
    raw?.VendorName,
    raw?.SellerName,
  ])[0];

  if (!vendorId && !name) return null;

  const score = Number(
    product?.vendorScore ??
      product?.shop?.score ??
      vendorSource?.Score ??
      vendorSource?.VendorScore ??
      raw?.VendorScore ??
      0
  );

  const url = uniqueStrings([
    product?.shopUrl,
    vendorSource?.ShopUrl,
    vendorSource?.shopUrl,
    vendorSource?.Url,
    vendorSource?.url,
    raw?.ShopUrl,
    raw?.shopUrl,
    raw?.VendorUrl,
    raw?.vendorUrl,
  ])[0];

  const badges = uniqueStrings([
    ...(Array.isArray(product?.shop?.badges) ? product.shop.badges : []),
    isTruthyFlag(product?.shop?.isOfficial) ? 'Official' : '',
    isTruthyFlag(product?.shop?.isVerified) ? 'Verified' : '',
    isTruthyFlag(product?.shop?.isBrand) ? 'Brand' : '',
    isTruthyFlag(vendorSource?.IsOfficial) || isTruthyFlag(vendorSource?.Official) || isTruthyFlag(raw?.IsOfficial) || isTruthyFlag(raw?.Official) ? 'Official' : '',
    isTruthyFlag(vendorSource?.IsVerified) || isTruthyFlag(vendorSource?.Verified) || isTruthyFlag(raw?.IsVerified) || isTruthyFlag(raw?.Verified) ? 'Verified' : '',
    isTruthyFlag(vendorSource?.IsBrand) || isTruthyFlag(vendorSource?.Brand) || isTruthyFlag(raw?.IsBrand) || isTruthyFlag(raw?.Brand) ? 'Brand' : '',
    isTruthyFlag(vendorSource?.IsFlagship) || isTruthyFlag(vendorSource?.Flagship) || isTruthyFlag(raw?.IsFlagship) || isTruthyFlag(raw?.Flagship) ? 'Flagship' : '',
  ]);

  const isOfficial = badges.includes('Official');
  const isVerified = badges.includes('Verified');
  const isBrand = badges.includes('Brand') || badges.includes('Flagship');

  return {
    key: vendorId || `shop:${normalizeText(name)}`,
    vendorId,
    name: name || vendorId || 'Shop',
    url,
    score: Number.isFinite(score) ? score : undefined,
    badges,
    isOfficial,
    isVerified,
    isBrand,
  };
}

export function aggregateTopShops(products: any[], query: string, limit = 6): ShopSummary[] {
  const queryText = normalizeText(query);
  const queryTokens = extractBrandLikeTokens(queryText);
  const map = new Map<string, ShopSummary>();

  for (const product of Array.isArray(products) ? products : []) {
    const identity = extractShopIdentity(product);
    if (!identity) continue;

    const key = identity.key;
    const existing = map.get(key);
    const titleText = normalizeText(product?.title);
    const shopText = normalizeText(identity.name);
    const productSold = Number(product?.totalSold || 0);
    const queryHit =
      queryText &&
      (
        shopText.includes(queryText) ||
        titleText.includes(queryText) ||
        queryTokens.some((token) => shopText.includes(token) || titleText.includes(token))
      );

    const next: ShopSummary = existing || {
      ...identity,
      itemCount: 0,
      totalSold: 0,
      products: [],
      matchedTerms: [],
      matchScore: 0,
    };

    next.itemCount += 1;
    next.totalSold += Number.isFinite(productSold) ? productSold : 0;
    next.products.push(product);
    next.matchedTerms = uniqueStrings([
      ...next.matchedTerms,
      ...(queryHit ? [queryText] : []),
      ...(queryTokens.filter((token) => shopText.includes(token) || titleText.includes(token))),
    ]);

    const scoreBoost =
      next.itemCount * 120 +
      Math.min(next.totalSold, 250000) / 250 +
      (identity.score ? identity.score * 40 : 0) +
      (identity.isOfficial ? 360 : 0) +
      (identity.isVerified ? 220 : 0) +
      (identity.isBrand ? 180 : 0) +
      (queryHit ? 500 : 0) +
      (queryTokens.length > 0 && queryTokens.every((token) => shopText.includes(token)) ? 160 : 0);

    next.matchScore = scoreBoost;
    map.set(key, next);
  }

  return Array.from(map.values())
    .sort((a, b) => b.matchScore - a.matchScore || b.itemCount - a.itemCount || b.totalSold - a.totalSold)
    .slice(0, limit);
}

export function formatShopSubtitle(shop: Pick<ShopSummary, 'itemCount' | 'totalSold'>): string {
  const parts: string[] = [];
  if (shop.itemCount > 0) parts.push(`${shop.itemCount} items`);
  if (shop.totalSold > 0) parts.push(`${shop.totalSold.toLocaleString('en-US')} sold`);
  return parts.join(' · ');
}

export function deriveBrandInsight(query: string, products: any[] = [], shopName = ''): BrandInsight {
  const queryTerms = extractBrandLikeTokens(query);
  const inventoryTerms = new Map<string, number>();

  for (const product of Array.isArray(products) ? products : []) {
    const texts = uniqueStrings([
      product?.title,
      product?.sellerName,
      product?.shopName,
      product?.shop?.name,
    ]);
    for (const text of texts) {
      for (const token of extractBrandLikeTokens(text)) {
        inventoryTerms.set(token, (inventoryTerms.get(token) || 0) + 1);
      }
    }
  }

  const inventoryCandidates = Array.from(inventoryTerms.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  const shopTokens = extractBrandLikeTokens(shopName);
  const brands = uniqueStrings([
    ...queryTerms.slice(0, 3),
    ...inventoryCandidates.slice(0, 3),
    ...shopTokens.slice(0, 2),
  ]);

  const label = brands.length > 0
    ? brands.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(' / ')
    : 'Marketplace';

  let source: BrandInsight['source'] = 'none';
  if (queryTerms.length > 0 && inventoryCandidates.some((term) => queryTerms.includes(term))) {
    source = 'mixed';
  } else if (queryTerms.length > 0) {
    source = 'query';
  } else if (inventoryCandidates.length > 0 || shopTokens.length > 0) {
    source = 'inventory';
  }

  return {
    terms: brands,
    source,
    label,
  };
}

export type SearchResultSplit = {
  primary: any[];
  secondary: any[];
  primaryLabel: string;
  secondaryLabel: string;
  note: string;
  hasSecondary: boolean;
};

function extractSearchFocusTokens(query: string): string[] {
  return uniqueStrings(
    normalizeText(query)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
      .filter((token) => !GENERIC_QUERY_WORDS.has(token))
  );
}

function scoreSearchResultFocus(product: any, query: string): number {
  const queryText = normalizeText(query);
  if (!queryText) return 0;

  const identity = extractShopIdentity(product);
  const textChunks = uniqueStrings([
    product?.title,
    product?.brand,
    product?.sellerName,
    product?.shopName,
    identity?.name,
    identity?.vendorId,
    identity?.url,
  ]).map((value) => normalizeText(value));

  let score = 0;

  if (textChunks.some((chunk) => chunk.includes(queryText))) {
    score += 1000;
  }

  const tokens = extractSearchFocusTokens(queryText);
  const matchedTokens = tokens.filter((token) => textChunks.some((chunk) => chunk.includes(token) || token.includes(chunk)));
  score += matchedTokens.length * 180;

  if (tokens.length > 1 && matchedTokens.length === tokens.length) {
    score += 220;
  }

  if (identity?.isOfficial) score += 140;
  if (identity?.isVerified) score += 90;
  if (identity?.isBrand) score += 70;

  score += Math.min(Number(product?.totalSold || 0), 5000) / 25;
  score += Math.min(Number(product?.vendorScore || 0), 20) * 10;

  return score;
}

export function splitSearchResultsByFocus(products: any[], query: string, primaryLimit = 4): SearchResultSplit {
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  if (list.length === 0) {
    return {
      primary: [],
      secondary: [],
      primaryLabel: 'Best matches',
      secondaryLabel: 'More results',
      note: '',
      hasSecondary: false,
    };
  }

  const queryText = normalizeText(query);
  const scored = list
    .map((product, index) => ({
      product,
      score: scoreSearchResultFocus(product, query),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (!queryText) {
    const pivot = Math.min(primaryLimit, scored.length);
    const primary = scored.slice(0, pivot).map((entry) => entry.product);
    const secondary = scored.slice(pivot).map((entry) => entry.product);
    return {
      primary,
      secondary,
      primaryLabel: 'Top results',
      secondaryLabel: 'More results',
      note: '',
      hasSecondary: secondary.length > 0,
    };
  }

  const pivot = Math.max(1, Math.min(primaryLimit, Math.ceil(scored.length / 2)));
  const primary = scored.slice(0, pivot).map((entry) => entry.product);
  const secondary = scored.slice(pivot).map((entry) => entry.product);

  return {
    primary,
    secondary,
    primaryLabel: 'Best matches',
    secondaryLabel: 'More results',
    note: secondary.length > 0
      ? 'We highlight the strongest matches first and keep broader results below.'
      : 'All matching results are shown in the top row.',
    hasSecondary: secondary.length > 0,
  };
}
