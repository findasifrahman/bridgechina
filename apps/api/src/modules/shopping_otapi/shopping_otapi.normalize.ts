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
  skus?: any;
  raw?: any;
  rating?: number;
  ratingCount?: number;
  availableQuantity?: number;
  tieredPricing?: Array<{ minQty: number; maxQty?: number; price: number }>;
  stock?: number;
  detailUrl?: string;
}

function toNumber(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : undefined;
}

function pickFirstImage(item: any): string | undefined {
  const candidates = [
    item?.MainPictureUrl,
    item?.MainImageUrl,
    item?.ImageUrl,
    item?.Pictures?.[0]?.Url,
    item?.Pictures?.[0],
    item?.MainPictures?.[0],
    item?.MainPictures?.[0]?.Url,
    item?.Images?.[0],
    item?.Images?.[0]?.Url,
  ].filter(Boolean);

  const url = candidates[0] ? String(candidates[0]) : undefined;
  return url ? getProxiedImageUrl(url) : undefined;
}

function collectImages(item: any): string[] | undefined {
  const arr: any[] = [];

  const fromPictures = item?.Pictures;
  if (Array.isArray(fromPictures)) {
    for (const p of fromPictures) {
      if (!p) continue;
      const url = typeof p === 'string' ? p : p.Url;
      if (url) arr.push(String(url));
    }
  }

  const fromMainPictures = item?.MainPictures;
  if (Array.isArray(fromMainPictures)) {
    for (const p of fromMainPictures) {
      if (!p) continue;
      const url = typeof p === 'string' ? p : p.Url;
      if (url) arr.push(String(url));
    }
  }

  const fromImages = item?.Images;
  if (Array.isArray(fromImages)) {
    for (const p of fromImages) {
      if (!p) continue;
      const url = typeof p === 'string' ? p : p.Url;
      if (url) arr.push(String(url));
    }
  }

  const uniq = Array.from(new Set(arr)).filter(Boolean);
  if (uniq.length === 0) return undefined;
  return uniq.map(getProxiedImageUrl);
}

function extractTitle(item: any): string {
  return (
    item?.Title ||
    item?.ItemTitle ||
    item?.Name ||
    item?.Subject ||
    'Untitled Product'
  );
}

function extractItemId(item: any): string {
  const id = item?.Id || item?.ItemId || item?.ItemID || item?.item_id;
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
    toNumber(item?.Price?.ConvertedPriceWithoutSign) ??
    toNumber(item?.Price?.PriceWithoutSign) ??
    toNumber(item?.Price?.ConvertedPrice) ??
    toNumber(item?.Price?.Price) ??
    toNumber(item?.PriceMin) ??
    toNumber(item?.MinPrice) ??
    toNumber(item?.Price);

  const max =
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

export function normalizeOTAPIProductCard(item: any): ProductCardOTAPI {
  const externalId = extractItemId(item);
  const title = extractTitle(item);
  const { min, max } = extractPriceRange(item);

  const card: ProductCardOTAPI = {
    source: 'shopping_otapi',
    externalId,
    title,
    currency: 'CNY',
    priceMin: min,
    priceMax: max,
    imageUrl: pickFirstImage(item),
    images: collectImages(item),
    sellerName: extractVendorName(item),
    sourceUrl: buildSourceUrl(externalId),
  };

  const sold =
    toNumber(item?.Volume) ??
    toNumber(item?.SalesCount) ??
    toNumber(item?.SoldCount) ??
    toNumber(item?.TradeCount);
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
  const base = normalizeOTAPIProductCard(itemFullInfo);

  let description = '';
  if (descriptionData) {
    if (typeof descriptionData === 'string') {
      description = descriptionData;
    } else if (descriptionData?.Description) {
      description = String(descriptionData.Description);
    } else if (descriptionData?.Content) {
      description = String(descriptionData.Content);
    } else if (descriptionData?.Text) {
      description = String(descriptionData.Text);
    } else if (descriptionData?.desc_html) {
      description = String(descriptionData.desc_html);
    } else if (descriptionData?.desc_text) {
      description = String(descriptionData.desc_text);
    }
  }

  if (!description) {
    description =
      itemFullInfo?.Description ||
      itemFullInfo?.Desc ||
      itemFullInfo?.Detail ||
      '';
  }

  const detail: ProductDetailOTAPI = {
    ...base,
    description,
    skus: itemFullInfo?.Skus || itemFullInfo?.SkuList || itemFullInfo?.Configurations || null,
    raw: itemFullInfo,
    rating: toNumber(itemFullInfo?.Rating) ?? toNumber(itemFullInfo?.VendorRating),
    ratingCount: toNumber(itemFullInfo?.RatingCount) ? Math.trunc(toNumber(itemFullInfo?.RatingCount) as number) : undefined,
    availableQuantity:
      toNumber(itemFullInfo?.Quantity) ??
      toNumber(itemFullInfo?.AvailableQuantity) ??
      toNumber(itemFullInfo?.Stock),
    stock: toNumber(itemFullInfo?.Stock) ? Math.trunc(toNumber(itemFullInfo?.Stock) as number) : undefined,
    detailUrl: base.sourceUrl,
  };

  const vendorId = extractVendorId(itemFullInfo);
  if (!detail.sellerName && vendorId) {
    detail.sellerName = vendorId;
  }

  return detail;
}
