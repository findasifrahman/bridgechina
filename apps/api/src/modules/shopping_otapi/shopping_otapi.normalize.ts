import { getProxiedImageUrl } from '../shopping/shopping.normalize.js';

export interface ProductCardOTAPI {
  source: 'shopping_otapi';
  externalId: string;
  title: string;
  priceMin?: number;
  priceMax?: number;
  currency: 'CNY';
  imageUrl?: string;
  images?: string[];
  sellerName?: string;
  sourceUrl?: string;
  totalSold?: number;
}

export interface ProductDetailOTAPI extends ProductCardOTAPI {
  description?: string;
  skus?: any[];
  productProps?: Array<Record<string, any>>;
  raw?: any;
  rating?: number;
  ratingCount?: number;
  availableQuantity?: number;
  tieredPricing?: Array<{ minQty: number; maxQty?: number; price: number }>;
  stock?: number;
  detailUrl?: string;
  estimatedWeightKg?: number;
  weight_kg?: number;
  videoUrl?: string;
}

function toNumber(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeString(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

export function unwrapOtapiPayload(input: any): any {
  if (!input || typeof input !== 'object') return input;

  const candidates = [
    input?.Result?.OtapiItemDescription,
    input?.Result?.Item,
    input?.Result?.ItemInfo,
    input?.Result?.ItemFullInfo,
    input?.Result?.Items?.Item?.[0],
    input?.Result?.Items?.Items?.Content?.[0],
    input?.Result?.Items?.Content?.[0],
    input?.Result?.Content?.[0],
    input?.Result?.Data?.Item,
    input?.Result?.Data?.Content?.[0],
    input?.Item,
    input?.ItemInfo,
    input?.ItemFullInfo,
    input?.Data?.Item,
    input?.Data?.Content?.[0],
    input?.Content?.[0],
    input?.Items?.Item?.[0],
    input?.Items?.Content?.[0],
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') return candidate;
  }

  return input;
}

function looksLikeImageUrl(value: string): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  if (!/^https?:\/\//i.test(text)) return false;
  let parsed: URL | null = null;
  try {
    parsed = new URL(text);
  } catch {
    parsed = null;
  }

  const host = parsed?.hostname.toLowerCase() || '';
  const pathname = parsed?.pathname.toLowerCase() || '';
  if (host.includes('detail.1688.com') && pathname.includes('/offer/')) return false;
  if (pathname.endsWith('.html')) return false;
  return (
    /\.(png|jpe?g|webp|gif|bmp|avif)(\?|#|$)/i.test(text) ||
    (
      [
        'alicdn.com',
        'cdn.otcommerce.com',
        'r2.dev',
      ].some((domain) => host === domain || host.endsWith(`.${domain}`) || host.includes(domain))
      && (
        /\/img(?:\/|$)/i.test(pathname) ||
        /\/image(?:\/|$)/i.test(pathname) ||
        /\/images(?:\/|$)/i.test(pathname) ||
        /\/ibank\//i.test(pathname)
      )
    )
  );
}

function collectDeepStrings(input: any, matcher: (key: string, value: any) => boolean): string[] {
  const results: string[] = [];
  const seen = new Set<any>();

  const walk = (node: any, keyHint = '') => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      if (matcher(keyHint, node)) {
        results.push(node);
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
      if (matcher(key, value)) {
        if (typeof value === 'string') {
          results.push(value);
        } else if (Array.isArray(value)) {
          for (const item of value) walk(item, key);
        } else if (value && typeof value === 'object') {
          walk(value, key);
        }
      } else {
        walk(value, key);
      }
    }
  };

  walk(input);
  return Array.from(new Set(results.filter(Boolean)));
}

function extractAllImageUrls(item: any): string[] {
  const urls = collectDeepStrings(item, (key, value) => {
    const keyLower = String(key || '').toLowerCase();
    const val = typeof value === 'string' ? value.trim() : '';
    return (
      keyLower.includes('image') ||
      keyLower.includes('picture') ||
      keyLower.includes('pic') ||
      keyLower.includes('photo') ||
      keyLower.includes('thumb') ||
      looksLikeImageUrl(val)
    );
  }).filter(looksLikeImageUrl);

  return urls.map(getProxiedImageUrl);
}

function pickFirstImage(item: any): string | undefined {
  const all = extractAllImageUrls(item);
  return all[0];
}

function collectImages(item: any): string[] | undefined {
  const uniq = Array.from(new Set(extractAllImageUrls(item))).filter(Boolean);
  if (uniq.length === 0) return undefined;
  return uniq;
}

function findWeightFromObject(input: any): number | undefined {
  const seen = new Set<any>();
  const directKeys = ['weight', 'grossweight', 'netweight', 'unitweight', 'shippingweight', 'packageweight', 'gross_weight', 'net_weight', 'unit_weight', 'shipping_weight'];

  const walk = (node: any): number | undefined => {
    if (node === null || node === undefined) return undefined;
    if (typeof node !== 'object') return undefined;
    if (seen.has(node)) return undefined;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found !== undefined) return found;
      }
      return undefined;
    }

    for (const [key, value] of Object.entries(node)) {
      const keyLower = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (directKeys.some((needle) => keyLower.includes(needle))) {
        const num = toNumber(value);
        if (num !== undefined && num > 0) return num > 20 ? num / 1000 : num;
        if (typeof value === 'string') {
          const parsed = extractWeightKgFromText(value);
          if (parsed !== undefined) return parsed;
        }
      }
      const nested = walk(value);
      if (nested !== undefined) return nested;
    }

    return undefined;
  };

  return walk(input);
}

function pickDescription(descriptionData: any, itemFullInfo: any): string {
  const descriptionRoot = unwrapOtapiPayload(descriptionData);
  const itemRoot = unwrapOtapiPayload(itemFullInfo);
  const sources = [
    descriptionData?.OtapiItemDescription?.ItemDescription,
    descriptionData?.Result?.OtapiItemDescription?.ItemDescription,
    descriptionData?.Result?.ItemDescription,
    descriptionData?.Result?.Description,
    descriptionData?.Result?.Content,
    descriptionData?.Result?.Text,
    descriptionData?.Result?.desc_html,
    descriptionData?.Result?.desc_text,
    descriptionData?.ItemDescription,
    descriptionData?.Description,
    descriptionData?.Content,
    descriptionData?.Text,
    descriptionData?.desc_html,
    descriptionData?.desc_text,
    descriptionRoot?.OtapiItemDescription?.ItemDescription,
    descriptionRoot?.ItemDescription,
    descriptionRoot?.Description,
    descriptionRoot?.Content,
    descriptionRoot?.Text,
    descriptionRoot?.desc_html,
    descriptionRoot?.desc_text,
    itemRoot?.Description,
    itemRoot?.Desc,
    itemRoot?.Detail,
    itemRoot?.DescriptionHtml,
    itemRoot?.DetailHtml,
  ];

  for (const source of sources) {
    const text = normalizeString(source);
    if (text) return text;
  }
  return '';
}

function normalizeSkuImage(sku: any): string | undefined {
  const image = pickFirstImage(sku) || normalizeString(sku?.ImageUrl) || normalizeString(sku?.MainPictureUrl);
  return image;
}

function extractVideoUrl(item: any): string | undefined {
  const seen = new Set<any>();
  const urlPattern = /(https?:\/\/[^\s"'<>]+?\.(?:mp4|webm|mov|m4v|m3u8)(?:\?[^\s"'<>]*)?)/i;

  const walk = (node: any, keyHint = ''): string | undefined => {
    if (node === null || node === undefined) return undefined;
    if (typeof node === 'string') {
      const text = node.trim();
      if (!text) return undefined;
      if (/^https?:\/\//i.test(text) && (keyHint.toLowerCase().includes('video') || urlPattern.test(text))) {
        return text;
      }
      const match = text.match(urlPattern);
      return match?.[1];
    }
    if (typeof node !== 'object') return undefined;
    if (seen.has(node)) return undefined;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const entry of node) {
        const found = walk(entry, keyHint);
        if (found) return found;
      }
      return undefined;
    }

    for (const [key, value] of Object.entries(node)) {
      const keyLower = String(key || '').toLowerCase();
      if (keyLower.includes('video')) {
        const found = walk(value, keyLower);
        if (found) return found;
      } else {
        const found = walk(value, keyLower);
        if (found && keyLower.includes('url')) {
          return found;
        }
      }
    }

    return undefined;
  };

  return walk(item);
}

function normalizeSkus(itemFullInfo: any): any[] | undefined {
  const candidates: any[] = [];
  const seen = new Set<any>();

  const isSkuLike = (obj: any) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj).map((key) => key.toLowerCase());
    return keys.some((key) => ['specid', 'skuid', 'sku', 'saleprice', 'price', 'stock', 'quantity', 'props', 'name', 'image'].some((needle) => key.includes(needle)));
  };

  const walk = (node: any, keyHint = '') => {
    if (node === null || node === undefined) return;
    if (typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      if (node.length > 0 && node.every((item) => isSkuLike(item))) {
        candidates.push(...node);
      } else {
        for (const item of node) walk(item, keyHint);
      }
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const keyLower = String(key || '').toLowerCase();
      if (Array.isArray(value) && (keyLower.includes('sku') || keyLower.includes('config') || keyLower.includes('spec') || keyLower.includes('variant'))) {
        if (value.every((item) => isSkuLike(item))) {
          candidates.push(...value);
          continue;
        }
      }
      walk(value, key);
    }
  };

  walk(itemFullInfo);

  const normalized = candidates.map((sku: any, index: number) => {
    const price =
      toNumber(sku?.SalePrice) ??
      toNumber(sku?.Sale_Price) ??
      toNumber(sku?.sale_price) ??
      toNumber(sku?.Price) ??
      toNumber(sku?.price);
    const stock =
      toNumber(sku?.Stock) ??
      toNumber(sku?.stock) ??
      toNumber(sku?.Quantity) ??
      toNumber(sku?.quantity);
    const specid = normalizeString(sku?.specid || sku?.SpecId || sku?.SkuId || sku?.skuId || sku?.id || sku?.Id || `sku-${index}`);
    const props_names =
      normalizeString(sku?.props_names || sku?.PropsNames || sku?.props || sku?.Props || sku?.name || sku?.Name || sku?.title || sku?.Title) ||
      specid;

    return {
      ...sku,
      specid,
      skuid: normalizeString(sku?.skuid || sku?.SkuId || sku?.skuId || sku?.Id || specid),
      props_names,
      sale_price: price,
      price,
      stock,
      imageUrl: normalizeSkuImage(sku),
      images: collectImages(sku),
    };
  }).filter((sku, index, arr) => {
    const key = sku.specid || sku.skuid || sku.props_names || String(index);
    return arr.findIndex((candidate) => (candidate.specid || candidate.skuid || candidate.props_names || '') === key) === index;
  });

  return normalized.length > 0 ? normalized : undefined;
}

function extractTitle(item: any): string {
  return (
    item?.title ||
    item?.Title ||
    item?.ItemTitle ||
    item?.Name ||
    item?.Subject ||
    item?.Item?.Title ||
    item?.Item?.ItemTitle ||
    item?.Item?.Name ||
    item?.ItemInfo?.Title ||
    item?.ItemInfo?.ItemTitle ||
    item?.ItemInfo?.Name ||
    item?.Result?.Title ||
    item?.Result?.ItemTitle ||
    item?.Result?.Name ||
    item?.Subject ||
    'Untitled Product'
  );
}

function extractItemId(item: any): string {
  const id =
    item?.externalId ||
    item?.Id ||
    item?.ItemId ||
    item?.ItemID ||
    item?.item_id ||
    item?.Item?.Id ||
    item?.Item?.ItemId ||
    item?.Item?.ItemID ||
    item?.ItemInfo?.Id ||
    item?.ItemInfo?.ItemId ||
    item?.ItemInfo?.ItemID ||
    item?.Result?.Id ||
    item?.Result?.ItemId ||
    item?.Result?.ItemID;
  return String(id || '');
}

function extractVendorName(item: any): string | undefined {
  return (
    item?.VendorName ||
    item?.Vendor?.Name ||
    item?.Vendor?.Title ||
    item?.Vendor?.CompanyName ||
    item?.Vendor?.ShopName ||
    item?.VendorInfo?.Title ||
    item?.VendorInfo?.Name ||
    item?.VendorInfo?.CompanyName ||
    item?.VendorInfo?.ShopName ||
    item?.VendorInfo?.DisplayName ||
    item?.Seller?.Name ||
    item?.Seller?.Title ||
    item?.Seller?.CompanyName ||
    item?.Seller?.ShopName ||
    item?.SellerName ||
    undefined
  );
}

function extractVendorId(item: any): string | undefined {
  const id =
    item?.VendorId ||
    item?.VendorID ||
    item?.vendor_id ||
    item?.Vendor?.Id ||
    item?.Vendor?.VendorId ||
    item?.VendorInfo?.Id ||
    item?.VendorInfo?.VendorId ||
    item?.SellerId ||
    item?.Seller?.Id;
  return id ? String(id) : undefined;
}

function extractPriceRange(item: any): { min?: number; max?: number } {
  const min =
    toNumber(item?.priceMin) ??
    toNumber(item?.price_min) ??
    toNumber(item?.Price?.ConvertedPriceWithoutSign) ??
    toNumber(item?.Price?.PriceWithoutSign) ??
    toNumber(item?.Price?.ConvertedPrice) ??
    toNumber(item?.Price?.Price) ??
    toNumber(item?.PriceMin) ??
    toNumber(item?.MinPrice) ??
    toNumber(item?.Price);

  const max =
    toNumber(item?.priceMax) ??
    toNumber(item?.price_max) ??
    toNumber(item?.MaxPrice) ??
    toNumber(item?.PriceMax) ??
    min;

  return { min, max };
}

function buildSourceUrl(externalId: string): string | undefined {
  if (!externalId) return undefined;
  if (externalId.startsWith('abb-')) {
    const raw = externalId.substring(4);
    if (raw) return `https://detail.1688.com/offer/${raw}.html`;
  }
  if (/^\d+$/.test(externalId)) {
    return `https://detail.1688.com/offer/${externalId}.html`;
  }
  return undefined;
}

function extractWeightKgFromText(text: string): number | undefined {
  const normalized = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return undefined;

  const patterns = [
    /(?:weight|gross weight|net weight|unit weight|product weight|item weight)[^0-9]{0,20}(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gram|grams)/i,
    /(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gram|grams)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const unit = String(match[2] || 'kg').toLowerCase();
    if (unit.startsWith('g') && !unit.startsWith('kg')) {
      return value / 1000;
    }
    return value;
  }

  return undefined;
}

export function normalizeOTAPIProductCard(item: any): ProductCardOTAPI {
  const payload = unwrapOtapiPayload(item);
  const externalId = extractItemId(payload);
  const title = extractTitle(payload);
  const { min, max } = extractPriceRange(payload);

  const card: ProductCardOTAPI = {
    source: 'shopping_otapi',
    externalId,
    title,
    currency: 'CNY',
    priceMin: min,
    priceMax: max,
    imageUrl: pickFirstImage(payload),
    images: collectImages(payload),
    sellerName: extractVendorName(payload),
    sourceUrl: buildSourceUrl(externalId),
  };

  const sold =
    toNumber(payload?.Volume) ??
    toNumber(payload?.SalesCount) ??
    toNumber(payload?.SoldCount) ??
    toNumber(payload?.TradeCount);
  if (sold !== undefined) {
    card.totalSold = Math.trunc(sold);
  }

  return card;
}

export function normalizeOTAPIProductCards(items: any[]): ProductCardOTAPI[] {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeOTAPIProductCard).filter((c) => c.externalId);
}

export function normalizeOTAPIProductDetail(itemFullInfo: any, descriptionData?: any): ProductDetailOTAPI {
  const itemRoot = unwrapOtapiPayload(itemFullInfo);
  const descriptionRoot = unwrapOtapiPayload(descriptionData);
  const base = normalizeOTAPIProductCard(itemRoot);

  const description = pickDescription(descriptionRoot, itemRoot);
  const descriptionImages = collectImages(descriptionRoot) || [];
  const primaryDescriptionImage =
    normalizeString(descriptionRoot?.CurrentImageUrl) ||
    normalizeString(descriptionRoot?.CurrentImageURL) ||
    normalizeString(descriptionRoot?.ImageUrl) ||
    normalizeString(descriptionRoot?.MainImageUrl);
  const mergedImages = Array.from(new Set([
    ...(Array.isArray(base.images) ? base.images : []),
    ...descriptionImages,
    primaryDescriptionImage ? getProxiedImageUrl(primaryDescriptionImage) : '',
  ].filter((img): img is string => typeof img === 'string' && img.trim().length > 0)));

  const weightFromFields =
    findWeightFromObject(itemRoot) ??
    findWeightFromObject(descriptionRoot);
  const weightFromDescription = extractWeightKgFromText(description);
  const skus = normalizeSkus(itemRoot);

  const detail: ProductDetailOTAPI = {
    ...base,
    imageUrl: base.imageUrl || mergedImages[0],
    images: mergedImages.length > 0 ? mergedImages : base.images,
    description,
    skus: skus || null,
    productProps: skus
      ? skus.map((sku) => ({
          option: sku.props_names || sku.specid || 'SKU',
          price: sku.sale_price ?? sku.price ?? undefined,
          stock: sku.stock ?? undefined,
          imageUrl: sku.imageUrl ?? undefined,
        }))
      : undefined,
    raw: itemRoot,
    rating: toNumber(itemRoot?.Rating) ?? toNumber(itemRoot?.VendorRating),
    ratingCount: toNumber(itemRoot?.RatingCount) ? Math.trunc(toNumber(itemRoot?.RatingCount) as number) : undefined,
    availableQuantity:
      toNumber(itemRoot?.Quantity) ??
      toNumber(itemRoot?.AvailableQuantity) ??
      toNumber(itemRoot?.Stock),
    stock: toNumber(itemRoot?.Stock) ? Math.trunc(toNumber(itemRoot?.Stock) as number) : undefined,
    detailUrl: base.sourceUrl,
    estimatedWeightKg: weightFromFields ?? weightFromDescription,
    weight_kg: weightFromFields ?? weightFromDescription,
    videoUrl: extractVideoUrl(itemRoot) || extractVideoUrl(descriptionRoot),
  };

  const vendorId = extractVendorId(itemFullInfo);
  if (!detail.sellerName && vendorId) {
    detail.sellerName = vendorId;
  }

  return detail;
}
