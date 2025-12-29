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
export function normalizeProductDetail(item: any): ProductDetail {
  const card = normalizeProductCard(item);

  const detail: ProductDetail = {
    ...card,
    description: item.description || item.desc || item.detail || '',
    skus: item.skus || item.sku_list || null,
    raw: item, // Keep raw data for reference
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

