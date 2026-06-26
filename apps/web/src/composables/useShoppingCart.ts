/**
 * Shopping Cart Composable
 * Uses browser localStorage for persistence
 */

import { ref, computed, watch } from 'vue';

export interface CartItem {
  externalId: string;
  title: string;
  priceMin?: number;
  priceMax?: number;
  sourcePriceMin?: number;
  sourcePriceMax?: number;
  displayPriceMin?: number;
  displayPriceMax?: number;
  displayCurrency?: 'CNY' | 'BDT' | 'USD';
  sourceCurrency?: string;
  imageUrl?: string;
  sourceUrl?: string;
  productUrl?: string;
  sellerName?: string;
  vendorId?: string;
  shopUrl?: string;
  quantity: number;
  minimumOrderQty?: number;
  skuDetails?: Array<{
    specId: string;
    qty: number;
    sku: any;
    label?: string;
    sourceUnitPrice?: number;
    displayUnitPrice?: number;
  }>;
  selectedShippingMethod?: string;
  estimatedWeight?: number;
}

const CART_STORAGE_KEY = 'bridgechina_shopping_cart';
const cartItems = ref<CartItem[]>([]);

function mergeSkuDetails(
  current: CartItem['skuDetails'],
  incoming: CartItem['skuDetails'],
): CartItem['skuDetails'] {
  const rows = [...(current || []), ...(incoming || [])];
  if (!rows.length) return undefined;

  const merged = new Map<string, any>();
  for (const row of rows) {
    const key = String(row?.specId || row?.sku?.specid || row?.sku?.skuid || '');
    if (!key) continue;
    const existing = merged.get(key);
    if (existing) {
      existing.qty = Number(existing.qty || 0) + Number(row?.qty || 0);
      existing.sku = row?.sku || existing.sku;
      existing.label = row?.label || existing.label;
      existing.sourceUnitPrice = row?.sourceUnitPrice ?? existing.sourceUnitPrice;
      existing.displayUnitPrice = row?.displayUnitPrice ?? existing.displayUnitPrice;
    } else {
      merged.set(key, { ...row, specId: key, qty: Number(row?.qty || 0) });
    }
  }

  return Array.from(merged.values());
}

function normalizeCartItem(item: any): CartItem {
  const product = item?.product || {};
  const priceMin = typeof item?.priceMin === 'number' ? item.priceMin : (typeof item?.price_snapshot === 'number' ? item.price_snapshot : product.price);
  const priceMax = typeof item?.priceMax === 'number' ? item.priceMax : priceMin;
  const displayPriceMin = typeof item?.displayPriceMin === 'number' ? item.displayPriceMin : priceMin;
  const displayPriceMax = typeof item?.displayPriceMax === 'number' ? item.displayPriceMax : priceMax;
  const skuDetails = Array.isArray(item?.skuDetails)
    ? item.skuDetails
    : (Array.isArray(item?.sku_details_snapshot) ? item.sku_details_snapshot : undefined);

  return {
    externalId: String(item?.externalId || item?.external_id || item?.product_id || product.external_id || product.id || ''),
    title: String(item?.title || item?.title_snapshot || product.title || 'Product'),
    priceMin,
    priceMax,
    sourcePriceMin: typeof item?.sourcePriceMin === 'number' ? item.sourcePriceMin : priceMin,
    sourcePriceMax: typeof item?.sourcePriceMax === 'number' ? item.sourcePriceMax : priceMax,
    displayPriceMin,
    displayPriceMax,
    displayCurrency: item?.displayCurrency || item?.currency_snapshot || product.currency,
    sourceCurrency: item?.sourceCurrency || product.currency,
    imageUrl: item?.imageUrl || item?.image_url_snapshot || product.coverAsset?.public_url,
    sourceUrl: item?.sourceUrl || item?.source_url_snapshot || product.source_url,
    productUrl: item?.productUrl || item?.product_url_snapshot || product.product_url || item?.sourceUrl || item?.source_url_snapshot || product.source_url,
    sellerName: item?.sellerName || item?.seller_name_snapshot || product.vendor_name || item?.shopName || item?.shop?.name,
    vendorId: item?.vendorId || item?.vendor_id_snapshot || product.vendor_id || item?.shop?.vendorId,
    shopUrl: item?.shopUrl || item?.shop_url_snapshot || product.shop_url || item?.shop?.url,
    quantity: Number(item?.quantity || item?.qty || 1),
    minimumOrderQty: item?.minimumOrderQty || product.minimum_order_qty,
    skuDetails,
    selectedShippingMethod: item?.selectedShippingMethod || item?.selected_shipping_method,
    estimatedWeight: item?.estimatedWeight ?? item?.estimated_weight_kg ?? product.weight_kg,
  };
}

// Load cart from localStorage on init
function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      cartItems.value = JSON.parse(stored).map(normalizeCartItem);
    }
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
    cartItems.value = [];
  }
}

// Save cart to localStorage
function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems.value));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

// Watch for changes and save
watch(cartItems, saveCart, { deep: true });

// Initialize
loadCart();

export function useShoppingCart() {
  const addToCart = (product: any, quantity: number = 1, skuDetails?: CartItem['skuDetails']) => {
    const existingIndex = cartItems.value.findIndex(
      item => item.externalId === product.externalId
    );

    if (existingIndex >= 0) {
      // Update existing item
      cartItems.value[existingIndex].quantity += quantity;
      cartItems.value[existingIndex].priceMin = typeof product.priceMin === 'number' ? product.priceMin : cartItems.value[existingIndex].priceMin;
      cartItems.value[existingIndex].priceMax = typeof product.priceMax === 'number' ? product.priceMax : cartItems.value[existingIndex].priceMax;
      cartItems.value[existingIndex].displayPriceMin = typeof product.displayPriceMin === 'number' ? product.displayPriceMin : cartItems.value[existingIndex].displayPriceMin;
      cartItems.value[existingIndex].displayPriceMax = typeof product.displayPriceMax === 'number' ? product.displayPriceMax : cartItems.value[existingIndex].displayPriceMax;
      cartItems.value[existingIndex].sourcePriceMin = typeof product.sourcePriceMin === 'number' ? product.sourcePriceMin : cartItems.value[existingIndex].sourcePriceMin;
      cartItems.value[existingIndex].sourcePriceMax = typeof product.sourcePriceMax === 'number' ? product.sourcePriceMax : cartItems.value[existingIndex].sourcePriceMax;
      cartItems.value[existingIndex].displayCurrency = product.displayCurrency || cartItems.value[existingIndex].displayCurrency;
      cartItems.value[existingIndex].sourceCurrency = product.sourceCurrency || cartItems.value[existingIndex].sourceCurrency;
      if (product.imageUrl) cartItems.value[existingIndex].imageUrl = product.imageUrl;
      if (product.sourceUrl) cartItems.value[existingIndex].sourceUrl = product.sourceUrl;
      if (product.productUrl || product.sourceUrl) cartItems.value[existingIndex].productUrl = product.productUrl || product.sourceUrl;
      if (product.sellerName || product.shopName) cartItems.value[existingIndex].sellerName = product.sellerName || product.shopName;
      if (product.vendorId) cartItems.value[existingIndex].vendorId = product.vendorId;
      if (product.shopUrl) cartItems.value[existingIndex].shopUrl = product.shopUrl;
      if (skuDetails) {
        cartItems.value[existingIndex].skuDetails = mergeSkuDetails(cartItems.value[existingIndex].skuDetails, skuDetails);
        cartItems.value[existingIndex].quantity = cartItems.value[existingIndex].skuDetails?.reduce((sum, row) => sum + Number(row.qty || 0), 0) || cartItems.value[existingIndex].quantity;
      }
    } else {
      const normalizedProduct = normalizeCartItem({
        ...product,
        quantity,
        skuDetails,
      });

      // Add new item
      cartItems.value.push({
        ...normalizedProduct,
        quantity,
        skuDetails,
      });
    }
  };

  const removeFromCart = (externalId: string) => {
    const index = cartItems.value.findIndex(item => item.externalId === externalId);
    if (index >= 0) {
      cartItems.value.splice(index, 1);
    }
  };

  const updateQuantity = (externalId: string, quantity: number) => {
    const item = cartItems.value.find(item => item.externalId === externalId);
    if (item) {
      if (quantity <= 0) {
        removeFromCart(externalId);
      } else {
        item.quantity = quantity;
      }
    }
  };

  const updateSkuDetails = (externalId: string, skuDetails: CartItem['skuDetails']) => {
    const item = cartItems.value.find((entry) => entry.externalId === externalId);
    if (!item) return;

    const normalizedRows = (skuDetails || [])
      .map((row) => ({
        ...row,
        qty: Number(row?.qty || 0),
      }))
      .filter((row) => row.qty > 0);

    if (!normalizedRows.length) {
      removeFromCart(externalId);
      return;
    }

    item.skuDetails = normalizedRows;
    item.quantity = normalizedRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  };

  const clearCart = () => {
    cartItems.value = [];
  };

  const setCartItems = (items: any[]) => {
    cartItems.value = Array.isArray(items) ? items.map(normalizeCartItem).filter((item) => item.externalId) : [];
  };

  const getCartItem = (externalId: string) => {
    return cartItems.value.find(item => item.externalId === externalId);
  };

  const totalItems = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const isEmpty = computed(() => {
    return cartItems.value.length === 0;
  });

  const totalPrice = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      const itemPrice = item.displayPriceMin ?? item.priceMin ?? 0;
      return sum + (itemPrice * item.quantity);
    }, 0);
  });

  return {
    cartItems: computed(() => cartItems.value),
    totalItems,
    totalPrice,
    isEmpty,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSkuDetails,
    clearCart,
    setCartItems,
    getCartItem,
  };
}

