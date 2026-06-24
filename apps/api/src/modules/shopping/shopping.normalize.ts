/**
 * Normalize TMAPI responses to our ProductCard format
 */

/**
 * Helper function to get proxied image URL (shared across normalization functions)
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) return '';
  // If it's already a proxy URL, return as is
  if (url.includes('/api/public/image-proxy')) return url;
  // If it's already an absolute URL to our API, return as is
  if (url.startsWith('http') && url.includes('/api/public/image-proxy')) return url;
  // If it's an external URL (Alibaba CDN), proxy it
  if (url.includes('alicdn.com') || url.includes('1688.com')) {
    // Use API_BASE_URL environment variable for absolute URLs (needed for Vercel frontend)
    // Railway provides RAILWAY_PUBLIC_DOMAIN (e.g., "bridgechina-production.up.railway.app")
    let apiBaseUrl = process.env.API_BASE_URL;
    if (!apiBaseUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
      // Railway domain might already include protocol, or just be the domain
      const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
      apiBaseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    }
    const proxyPath = `/api/public/image-proxy?url=${encodeURIComponent(url)}`;
    // If we have an API base URL, make it absolute; otherwise use relative (for local dev)
    return apiBaseUrl ? `${apiBaseUrl}${proxyPath}` : proxyPath;
  }
  return url;
}

export interface ProductCard {
  source: 'tmapi_1688';
  externalId: string;
  title: string;
  titleOrigin?: string;
  priceMin?: number;
  priceMax?: number;
  currency: 'CNY';
  imageUrl?: string;
  images?: string[];
  sellerName?: string;
  vendorId?: string;
  shopName?: string;
  shopUrl?: string;
  shop?: {
    vendorId?: string;
    name?: string;
    url?: string;
    score?: number;
    badges?: string[];
    isOfficial?: boolean;
    isVerified?: boolean;
    isBrand?: boolean;
    raw?: Record<string, any>;
  };
  sourceUrl?: string;
  totalSold?: number; // Sales count from sale_info
  minimumOrderQty?: number;
  vendorScore?: number;
  raw?: any;
}

export interface ProductDetail extends ProductCard {
  description?: string;
  skus?: any;
  raw?: any;
  // Additional detail fields
  rating?: number;
  ratingCount?: number;
  totalSold?: number;
  availableQuantity?: number;
  tieredPricing?: Array<{ minQty: number; maxQty?: number; price: number }>;
  shippingInfo?: {
    areaFrom?: string[];
    freeShipping?: boolean;
    shipIn48h?: boolean;
  };
  productProps?: any[];
  serviceTags?: string[];
  stock?: number;
  videoUrl?: string;
  detailUrl?: string;
  estimatedWeightKg?: number;
  weight_kg?: number;
  bridgechinaShipping?: {
    currency: string;
    moq_billable_kg: number;
    methods: Array<{
      code: string;
      label: string;
      minKg?: number;
      maxKg?: number;
      ratePerKg?: number;
      ratePerKgMax?: number;
      ratePerKgCNY?: number;
      ratePerKgMaxCNY?: number;
      batteryRatePerKg?: number;
      batteryRatePerKgCNY?: number;
      quoteRequired?: boolean;
    }>;
    marketing?: {
      highlightKg: number[];
      highlightText: string;
    };
    disclaimerLines: string[];
  };
}

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const normalized = String(value).replace(/,/g, '').trim();
  const number = typeof value === 'number' ? value : parseFloat(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function parseCompactNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : undefined;
  const text = String(value).replace(/,/g, '').trim();
  const match = text.match(/(\d+(?:\.\d+)?)\s*([kKmMwW万萬])?/);
  if (!match) return undefined;
  const base = parseFloat(match[1]);
  if (!Number.isFinite(base)) return undefined;
  const suffix = (match[2] || '').toLowerCase();
  const multiplier = suffix === 'k' ? 1000 : suffix === 'm' ? 1000000 : suffix === 'w' || suffix === '万' || suffix === '萬' ? 10000 : 1;
  return Math.trunc(base * multiplier);
}

function firstString(...values: any[]): string | undefined {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return undefined;
}

function collectShopBadges(shopInfo: any): string[] {
  const badges: string[] = [];
  const push = (enabled: boolean, label: string) => {
    if (enabled && !badges.includes(label)) badges.push(label);
  };

  push(Boolean(shopInfo?.is_powerful_seller), 'Power seller');
  push(Boolean(shopInfo?.is_super_factory), 'Super factory');
  push(Boolean(shopInfo?.is_gold_manufacturer), 'Gold manufacturer');
  push(Boolean(shopInfo?.is_verified || shopInfo?.factory_inspection), 'Verified');
  return badges;
}

function normalizeShopInfo(item: any): ProductCard['shop'] {
  const shopInfo = item?.shop_info || {};
  const vendorId = firstString(
    shopInfo.seller_member_id,
    shopInfo.member_id,
    shopInfo.seller_user_id,
    shopInfo.login_id,
    shopInfo.seller_login_id
  );
  const name = firstString(shopInfo.shop_name, shopInfo.company_name, shopInfo.login_id, shopInfo.seller_login_id);
  const url = firstString(shopInfo.shop_url, shopInfo.url);
  const score = toNumber(shopInfo.score_info?.composite_score);
  const badges = collectShopBadges(shopInfo);

  if (!vendorId && !name && !url && score === undefined && badges.length === 0) return undefined;

  return {
    vendorId,
    name,
    url,
    score,
    badges: badges.length > 0 ? badges : undefined,
    isOfficial: badges.includes('Gold manufacturer'),
    isVerified: badges.includes('Verified') || badges.includes('Power seller') || badges.includes('Super factory'),
    isBrand: badges.includes('Super factory'),
    raw: shopInfo && typeof shopInfo === 'object' ? shopInfo : undefined,
  };
}

function normalizeSkuRows(item: any): any[] | null {
  if (!Array.isArray(item?.skus)) return null;

  const propImageByPair = new Map<string, string>();
  if (Array.isArray(item?.sku_props)) {
    for (const prop of item.sku_props) {
      const pid = String(prop?.pid ?? '');
      for (const value of Array.isArray(prop?.values) ? prop.values : []) {
        const vid = String(value?.vid ?? '');
        if (pid && vid && value?.imageUrl) {
          propImageByPair.set(`${pid}:${vid}`, value.imageUrl);
        }
      }
    }
  }

  return item.skus.map((sku: any, index: number) => {
    const propsIds = String(sku?.props_ids || '');
    const imageFromProps = propsIds
      .split(';')
      .map((pair) => propImageByPair.get(pair.trim()))
      .find(Boolean);
    const price = toNumber(sku?.sale_price ?? sku?.price);
    const stock = parseCompactNumber(sku?.stock);
    const weight = toNumber(sku?.package_info?.weight);
    return {
      ...sku,
      specid: firstString(sku?.specid, sku?.skuid, `sku-${index}`),
      skuid: firstString(sku?.skuid, sku?.specid, `sku-${index}`),
      props_names: firstString(sku?.props_names, sku?.name, sku?.title, `Variant ${index + 1}`),
      sale_price: price,
      price,
      stock,
      imageUrl: imageFromProps ? getProxiedImageUrl(imageFromProps) : undefined,
      weight_kg: weight,
    };
  });
}

/**
 * Normalize TMAPI search result item to ProductCard
 * Based on actual TMAPI response structure
 */
export function normalizeProductCard(item: any): ProductCard {
  const shop = normalizeShopInfo(item);
  const card: ProductCard = {
    source: 'tmapi_1688',
    externalId: String(item.item_id || item.id || ''),
    title: item.title || item.subject || item.name || 'Untitled Product',
    currency: 'CNY',
    titleOrigin: item.title_origin || undefined,
    sellerName: shop?.name,
    vendorId: shop?.vendorId,
    shopName: shop?.name,
    shopUrl: shop?.url,
    shop,
    vendorScore: shop?.score,
    raw: item,
  };

  // Price handling - TMAPI response has 'price' as string and 'price_info' object
  const priceNum = toNumber(item.price);
  if (priceNum !== undefined) {
      card.priceMin = priceNum;
      card.priceMax = priceNum;
  }
  
  // Check price_info for min/max prices
  if (item.price_info) {
    const min = toNumber(item.price_info.price_min ?? item.price_info.sale_price ?? item.price_info.price);
    const max = toNumber(item.price_info.price_max ?? item.price_info.sale_price ?? item.price_info.price);
    if (min !== undefined) card.priceMin = min;
    if (max !== undefined) card.priceMax = max;
  }

  // Check tiered pricing (quantity_prices)
  if (item.quantity_prices && Array.isArray(item.quantity_prices) && item.quantity_prices.length > 0) {
    const prices = item.quantity_prices.map((qp: any) => parseFloat(String(qp.price))).filter((p: number) => !isNaN(p));
    if (prices.length > 0) {
      card.priceMin = Math.min(...prices);
      card.priceMax = Math.max(...prices);
    }
  }

  // Image handling - TMAPI uses 'img' field
  // Proxy external images through our API to avoid CORS issues

  if (item.img) {
    card.imageUrl = getProxiedImageUrl(item.img);
  }
  if (item.main_image || item.image_url) {
    card.imageUrl = getProxiedImageUrl(item.main_image || item.image_url);
  }
  if (item.main_imgs && Array.isArray(item.main_imgs)) {
    card.images = item.main_imgs.map(getProxiedImageUrl);
    if (!card.imageUrl && item.main_imgs[0]) {
      card.imageUrl = getProxiedImageUrl(item.main_imgs[0]);
    }
  }

  // Seller info - TMAPI uses shop_info
  if (item.shop_info) {
    card.sellerName = item.shop_info.shop_name || item.shop_info.company_name || item.shop_info.login_id || card.sellerName;
  }
  if (!card.sellerName && (item.seller_name || item.seller?.name || item.company_name)) {
    card.sellerName = item.seller_name || item.seller?.name || item.company_name;
  }

  // Sales info - TMAPI uses sale_info
  if (item.sale_info) {
    // Get sales count from sale_info
    if (item.sale_info.sale_quantity_90days) {
      card.totalSold = parseCompactNumber(item.sale_info.sale_quantity_90days);
    } else if (item.sale_info.sale_quantity_int) {
      card.totalSold = parseCompactNumber(item.sale_info.sale_quantity_int);
    } else if (item.sale_info.sale_quantity) {
      card.totalSold = parseCompactNumber(item.sale_info.sale_quantity);
    } else if (item.sale_info.item_sold) {
      card.totalSold = parseCompactNumber(item.sale_info.item_sold);
    }
  }

  card.minimumOrderQty = parseCompactNumber(item.moq ?? item.quantity_begin);

  // Source URL - TMAPI uses 'product_url' field
  if (item.product_url) {
    card.sourceUrl = item.product_url;
  }
  if (item.detail_url || item.url || item.link) {
    card.sourceUrl = item.detail_url || item.url || item.link;
  }

  return card;
}

/**
 * Normalize TMAPI item detail to ProductDetail
 */
export function normalizeProductDetail(item: any, descriptionData?: any): ProductDetail {
  const card = normalizeProductCard(item);

  // Try to extract description from various possible fields
  let description = '';
  if (descriptionData) {
    // If description data was fetched separately, use it
    if (typeof descriptionData === 'string') {
      description = descriptionData;
    } else if (descriptionData.detail_html) {
      description = descriptionData.detail_html;
    } else if (descriptionData.desc_html) {
      description = descriptionData.desc_html;
    } else if (descriptionData.desc_text) {
      description = descriptionData.desc_text;
    } else if (descriptionData.description) {
      description = descriptionData.description;
    }
  }
  
  // Fallback to item fields
  if (!description) {
    description = item.description || item.desc || item.detail || item.desc_html || item.desc_text || '';
  }

  // Extract rating
  let rating: number | undefined;
  const score = toNumber(item.goods_score ?? item.rating_star);
  if (score !== undefined) {
    rating = score;
  }

  // Extract sales info
  let totalSold: number | undefined;
  let ratingCount: number | undefined;
  if (item.sale_info) {
    if (item.sale_info.sale_quantity_90days) {
      totalSold = parseCompactNumber(item.sale_info.sale_quantity_90days);
    } else if (item.sale_info.sale_quantity_int) {
      totalSold = parseCompactNumber(item.sale_info.sale_quantity_int);
    } else if (item.sale_info.sale_quantity) {
      totalSold = parseCompactNumber(item.sale_info.sale_quantity);
    }
    if (item.sale_info.orders_count) {
      ratingCount = parseCompactNumber(item.sale_info.orders_count);
    }
  }
  if (item.sale_count) {
    totalSold = parseCompactNumber(item.sale_count) || totalSold;
  }

  // Extract stock/quantity
  let availableQuantity: number | undefined;
  if (item.stock) {
    availableQuantity = parseCompactNumber(item.stock);
  }
  if (item.quantity_begin) {
    availableQuantity = parseCompactNumber(item.quantity_begin) || availableQuantity;
  }

  // Extract tiered pricing
  const tieredPricing: Array<{ minQty: number; maxQty?: number; price: number }> = [];
  if (item.tiered_price_info?.prices) {
    for (const tier of item.tiered_price_info.prices) {
      const minQty = parseInt(String(tier.beginAmount || tier.begin_num || 1)) || 1;
      const price = parseFloat(String(tier.price));
      if (!isNaN(price)) {
        tieredPricing.push({ minQty, price });
      }
    }
  }
  if (item.quantity_prices && Array.isArray(item.quantity_prices)) {
    for (const qp of item.quantity_prices) {
      const minQty = parseInt(String(qp.begin_num || qp.beginAmount || 1)) || 1;
      const maxQty = qp.end_num ? parseInt(String(qp.end_num).replace(/[^0-9]/g, '')) : undefined;
      const price = parseFloat(String(qp.price));
      if (!isNaN(price)) {
        tieredPricing.push({ minQty, maxQty, price });
      }
    }
  }

  // Extract shipping info
  const shippingInfo: ProductDetail['shippingInfo'] = {};
  if (item.delivery_info) {
    if (item.delivery_info.area_from) {
      shippingInfo.areaFrom = Array.isArray(item.delivery_info.area_from) 
        ? item.delivery_info.area_from 
        : [item.delivery_info.area_from];
    }
    if (item.delivery_info.free_shipping !== undefined) {
      shippingInfo.freeShipping = Boolean(item.delivery_info.free_shipping);
    }
    if (item.delivery_info.ship_in_48h !== undefined) {
      shippingInfo.shipIn48h = Boolean(item.delivery_info.ship_in_48h);
    }
  }

  if (!shippingInfo.areaFrom && item.delivery_info?.location) {
    shippingInfo.areaFrom = [item.delivery_info.location];
  }
  if (item.free_shipping !== undefined) {
    shippingInfo.freeShipping = Boolean(item.free_shipping);
  }
  if (item.ship_in_48h !== undefined) {
    shippingInfo.shipIn48h = Boolean(item.ship_in_48h);
  }

  // Extract video URL and detail URL
  const videoUrl = item.video_url || item.video || null;
  const detailUrl = item.detail_url || item.url || item.link || card.sourceUrl || null;

  // Extract estimated weight from delivery_info
  let estimatedWeightKg: number | undefined;
  if (item.delivery_info) {
    if (item.delivery_info.weight) {
      const weight = parseFloat(String(item.delivery_info.weight));
      if (!isNaN(weight) && weight > 0) {
        estimatedWeightKg = weight;
      }
    }
    if (!estimatedWeightKg && item.delivery_info.unit_weight) {
      const unitWeight = parseFloat(String(item.delivery_info.unit_weight));
      if (!isNaN(unitWeight) && unitWeight > 0) {
        estimatedWeightKg = unitWeight;
      }
    }
  }

  if (!estimatedWeightKg && Array.isArray(item.skus)) {
    const skuWeight = item.skus.map((sku: any) => toNumber(sku?.package_info?.weight)).find((weight: number | undefined) => weight !== undefined && weight > 0);
    if (skuWeight !== undefined) estimatedWeightKg = skuWeight;
  }

  const skus = normalizeSkuRows(item);

  const detail: ProductDetail = {
    ...card,
    description,
    skus: skus || item.sku_list || null,
    raw: item, // Keep raw data for reference
    rating,
    ratingCount,
    totalSold,
    availableQuantity,
    tieredPricing: tieredPricing.length > 0 ? tieredPricing : undefined,
    shippingInfo: Object.keys(shippingInfo).length > 0 ? shippingInfo : undefined,
    productProps: item.product_props || item.props || item.sku_props || null,
    serviceTags: item.service_tags || item.tags || null,
    stock: parseCompactNumber(item.stock),
    videoUrl: videoUrl || undefined,
    detailUrl: detailUrl || undefined,
    estimatedWeightKg: estimatedWeightKg || undefined,
    weight_kg: estimatedWeightKg || undefined,
  };

  return detail;
}

/**
 * Normalize array of TMAPI items
 */
export function normalizeProductCards(items: any[]): ProductCard[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map(normalizeProductCard).filter((card) => card.externalId);
}

