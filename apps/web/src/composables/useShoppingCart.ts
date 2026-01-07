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
  imageUrl?: string;
  sourceUrl?: string;
  quantity: number;
  skuDetails?: Array<{
    specId: string;
    qty: number;
    sku: any;
  }>;
  selectedShippingMethod?: string;
  estimatedWeight?: number;
}

const CART_STORAGE_KEY = 'bridgechina_shopping_cart';
const cartItems = ref<CartItem[]>([]);

// Load cart from localStorage on init
function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      cartItems.value = JSON.parse(stored);
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
      if (skuDetails) {
        cartItems.value[existingIndex].skuDetails = skuDetails;
      }
    } else {
      // Add new item
      cartItems.value.push({
        externalId: product.externalId,
        title: product.title,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        imageUrl: product.imageUrl,
        sourceUrl: product.sourceUrl,
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
      const itemPrice = item.priceMin || 0;
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

