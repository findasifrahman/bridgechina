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
  const priceMin = typeof item?.priceMin === 'number' ? item.priceMin : undefined;
  const priceMax = typeof item?.priceMax === 'number' ? item.priceMax : undefined;
  const displayPriceMin = typeof item?.displayPriceMin === 'number' ? item.displayPriceMin : priceMin;
  const displayPriceMax = typeof item?.displayPriceMax === 'number' ? item.displayPriceMax : priceMax;

  return {
    externalId: String(item?.externalId || ''),
    title: String(item?.title || 'Product'),
    priceMin,
    priceMax,
    sourcePriceMin: typeof item?.sourcePriceMin === 'number' ? item.sourcePriceMin : priceMin,
    sourcePriceMax: typeof item?.sourcePriceMax === 'number' ? item.sourcePriceMax : priceMax,
    displayPriceMin,
    displayPriceMax,
    displayCurrency: item?.displayCurrency,
    sourceCurrency: item?.sourceCurrency,
    imageUrl: item?.imageUrl,
    sourceUrl: item?.sourceUrl,
    quantity: Number(item?.quantity || 1),
    minimumOrderQty: item?.minimumOrderQty,
    skuDetails: Array.isArray(item?.skuDetails) ? item.skuDetails : undefined,
    selectedShippingMethod: item?.selectedShippingMethod,
    estimatedWeight: item?.estimatedWeight,
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

  const clearCart = () => {
    cartItems.value = [];
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
    clearCart,
    getCartItem,
  };
}

