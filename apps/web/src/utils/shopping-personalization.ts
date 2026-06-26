const INTENT_KEY = 'bc_shopping_intents_v1';
const PRODUCT_KEY = 'bc_shopping_product_cards_v1';
const DETAIL_KEY_PREFIX = 'bc_shopping_detail_v2:';
const MAX_INTENTS = 50;
const MAX_PRODUCTS = 80;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type IntentType = 'search' | 'category' | 'menu' | 'product';

type ShoppingIntent = {
  id: string;
  type: IntentType;
  key: string;
  label: string;
  query?: string;
  category?: string;
  productId?: string;
  at: number;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or unavailable in private browsing.
  }
}

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function productId(product: any) {
  return String(product?.externalId || product?.external_id || product?.id || '').trim();
}

function hasProductImage(product: any) {
  const direct = String(product?.imageUrl || product?.image_url || '').trim();
  if (direct) return true;
  return Array.isArray(product?.images) && product.images.some((image: unknown) => String(image || '').trim());
}

function productKeywords(product: any) {
  return [
    product?.title,
    product?.category,
    product?.categorySlug,
    product?.sellerName,
    product?.shopName,
  ].map(normalizeText).filter(Boolean);
}

function pruneProducts(products: any[]) {
  const now = Date.now();
  const seen = new Set<string>();
  return products
    .filter((entry) => entry && now - Number(entry.cachedAt || 0) < TTL_MS)
    .filter((entry) => {
      const id = productId(entry);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_PRODUCTS);
}

export function cacheProductCards(products: any[]) {
  if (!Array.isArray(products) || products.length === 0) return;
  const existing = readJson<any[]>(PRODUCT_KEY, []);
  const next = [
    ...products
      .filter((product) => productId(product) && hasProductImage(product))
      .map((product) => ({
        externalId: productId(product),
        id: product?.id,
        title: product?.title,
        priceMin: product?.priceMin,
        priceMax: product?.priceMax,
        currency: product?.currency,
        imageUrl: product?.imageUrl,
        images: product?.images,
        sellerName: product?.sellerName,
        sourceUrl: product?.sourceUrl,
        minimumOrderQty: product?.minimumOrderQty,
        category: product?.category,
        categorySlug: product?.categorySlug,
        cachedAt: Date.now(),
      })),
    ...existing,
  ];
  writeJson(PRODUCT_KEY, pruneProducts(next));
}

export function recordShoppingIntent(type: IntentType, payload: Partial<ShoppingIntent> & { label?: string }) {
  const key = normalizeText(payload.key || payload.query || payload.category || payload.productId || payload.label);
  if (!key) return;
  const intent: ShoppingIntent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    key,
    label: payload.label || payload.query || payload.category || payload.productId || key,
    query: payload.query,
    category: payload.category,
    productId: payload.productId,
    at: Date.now(),
  };
  const existing = readJson<ShoppingIntent[]>(INTENT_KEY, []);
  const next = [intent, ...existing.filter((item) => !(item.type === type && item.key === key))].slice(0, MAX_INTENTS);
  writeJson(INTENT_KEY, next);
}

export function recordSearchIntent(query: string, products: any[] = []) {
  const value = query.trim();
  if (!value) return;
  recordShoppingIntent('search', { key: value, query: value, label: value });
  cacheProductCards(products);
}

export function recordCategoryIntent(category: string, label?: string, products: any[] = []) {
  const value = String(category || label || '').trim();
  if (!value) return;
  recordShoppingIntent('category', { key: value, category: value, label: label || value });
  cacheProductCards(products);
}

export function recordMenuIntent(keyword: string, label?: string) {
  const value = String(keyword || label || '').trim();
  if (!value) return;
  recordShoppingIntent('menu', { key: value, query: value, label: label || value });
}

export function recordProductIntent(product: any) {
  const id = productId(product);
  if (!id) return;
  cacheProductCards([product]);
  recordShoppingIntent('product', {
    key: id,
    productId: id,
    label: product?.title || id,
    query: product?.title,
  });
}

export function getYouMayLikeProducts(limit = 12) {
  const intents = readJson<ShoppingIntent[]>(INTENT_KEY, []).filter((item) => Date.now() - item.at < TTL_MS);
  if (intents.length === 0) return [];
  const recent = intents.slice(0, 4);
  const products = pruneProducts(readJson<any[]>(PRODUCT_KEY, []));
  if (products.length === 0) return [];

  const excludedProductIds = new Set(recent.filter((intent) => intent.type === 'product').map((intent) => intent.productId).filter(Boolean));
  const scored = products
    .filter((product) => !excludedProductIds.has(productId(product)) && hasProductImage(product))
    .map((product) => {
      const haystack = productKeywords(product).join(' ');
      let score = 0;
      for (const [index, intent] of recent.entries()) {
        const weight = 4 - index;
        const needle = normalizeText(intent.query || intent.category || intent.label || intent.key);
        if (!needle) continue;
        if (haystack.includes(needle) || needle.split(/\s+/).some((part) => part.length > 2 && haystack.includes(part))) {
          score += weight * 3;
        }
      }
      score += Math.max(0, 2 - ((Date.now() - Number(product.cachedAt || 0)) / TTL_MS));
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.product);
}

export function productDetailCacheKey(externalId: string, language = 'en') {
  return `${DETAIL_KEY_PREFIX}${language}:${externalId}`;
}

export function readCachedProductDetail(externalId: string, language = 'en') {
  const cached = readJson<any>(productDetailCacheKey(externalId, language), null);
  if (!cached || Date.now() - Number(cached.cachedAt || 0) > TTL_MS) return null;
  return cached.detail || null;
}

export function writeCachedProductDetail(externalId: string, language: string, detail: any) {
  if (!externalId || !detail) return;
  writeJson(productDetailCacheKey(externalId, language), { detail, cachedAt: Date.now() });
  cacheProductCards([detail]);
}
