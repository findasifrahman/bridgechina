/**
 * Normalize TMAPI responses to our ProductCard format
 */

export interface ProductCard {
  source: 'tmapi_1688';
  externalId: string;
  title: string;
  priceMin?: number;
  priceMax?: number;
  currency: 'CNY';
  imageUrl?: string;
  images?: string[];
  sellerName?: string;
  sourceUrl?: string;
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
}

/**
 * Normalize TMAPI search result item to ProductCard
 * Based on actual TMAPI response structure
 */
export function normalizeProductCard(item: any): ProductCard {
  const card: ProductCard = {
    source: 'tmapi_1688',
    externalId: String(item.item_id || item.id || ''),
    title: item.title || item.subject || item.name || 'Untitled Product',
    currency: 'CNY',
  };

  // Price handling - TMAPI response has 'price' as string and 'price_info' object
  if (item.price) {
    const priceNum = parseFloat(String(item.price));
    if (!isNaN(priceNum)) {
      card.priceMin = priceNum;
      card.priceMax = priceNum;
    }
  }
  
  // Check price_info for min/max prices
  if (item.price_info) {
    if (item.price_info.sale_price) {
      const salePrice = parseFloat(String(item.price_info.sale_price));
      if (!isNaN(salePrice)) {
        card.priceMin = salePrice;
        card.priceMax = salePrice;
      }
    }
    if (item.price_info.origin_price) {
      const originPrice = parseFloat(String(item.price_info.origin_price));
      if (!isNaN(originPrice) && (!card.priceMin || originPrice < card.priceMin)) {
        card.priceMin = originPrice;
      }
    }
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
  if (item.img) {
    card.imageUrl = item.img;
  }
  if (item.main_image || item.image_url) {
    card.imageUrl = item.main_image || item.image_url;
  }
  if (item.main_imgs && Array.isArray(item.main_imgs)) {
    card.images = item.main_imgs;
    if (!card.imageUrl && item.main_imgs[0]) {
      card.imageUrl = item.main_imgs[0];
    }
  }

  // Seller info - TMAPI uses shop_info
  if (item.shop_info) {
    card.sellerName = item.shop_info.shop_name || item.shop_info.company_name || item.shop_info.login_id;
  }
  if (!card.sellerName && (item.seller_name || item.seller?.name || item.company_name)) {
    card.sellerName = item.seller_name || item.seller?.name || item.company_name;
  }

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
  if (item.goods_score) {
    const score = parseFloat(String(item.goods_score));
    if (!isNaN(score)) {
      rating = score;
    }
  }

  // Extract sales info
  let totalSold: number | undefined;
  let ratingCount: number | undefined;
  if (item.sale_info) {
    if (item.sale_info.sale_quantity_90days) {
      totalSold = parseInt(String(item.sale_info.sale_quantity_90days)) || undefined;
    } else if (item.sale_info.sale_quantity) {
      const qty = String(item.sale_info.sale_quantity).replace(/[^0-9]/g, '');
      totalSold = parseInt(qty) || undefined;
    }
    if (item.sale_info.orders_count) {
      ratingCount = parseInt(String(item.sale_info.orders_count)) || undefined;
    }
  }
  if (item.sale_count) {
    const count = String(item.sale_count).replace(/[^0-9]/g, '');
    totalSold = parseInt(count) || totalSold;
  }

  // Extract stock/quantity
  let availableQuantity: number | undefined;
  if (item.stock) {
    availableQuantity = parseInt(String(item.stock)) || undefined;
  }
  if (item.quantity_begin) {
    availableQuantity = parseInt(String(item.quantity_begin)) || availableQuantity;
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
  if (item.free_shipping !== undefined) {
    shippingInfo.freeShipping = Boolean(item.free_shipping);
  }
  if (item.ship_in_48h !== undefined) {
    shippingInfo.shipIn48h = Boolean(item.ship_in_48h);
  }

  const detail: ProductDetail = {
    ...card,
    description,
    skus: item.skus || item.sku_list || null,
    raw: item, // Keep raw data for reference
    rating,
    ratingCount,
    totalSold,
    availableQuantity,
    tieredPricing: tieredPricing.length > 0 ? tieredPricing : undefined,
    shippingInfo: Object.keys(shippingInfo).length > 0 ? shippingInfo : undefined,
    productProps: item.product_props || item.props || null,
    serviceTags: item.service_tags || item.tags || null,
    stock: item.stock ? parseInt(String(item.stock)) : undefined,
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

