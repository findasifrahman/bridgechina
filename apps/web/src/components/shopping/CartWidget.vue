<template>
  <div
    v-if="!isEmpty"
    class="fixed bottom-6 left-6 z-50"
    @click="goToCart"
  >
    <button
      class="relative bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
      :class="{ 'animate-bounce': hasNewItems }"
    >
      <ShoppingCart class="h-6 w-6" />
      <span
        v-if="totalItems > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
      >
        {{ totalItems > 99 ? '99+' : totalItems }}
      </span>
      <!-- Tooltip -->
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div class="bg-slate-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          {{ totalItems }} item{{ totalItems !== 1 ? 's' : '' }} in cart
        </div>
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div class="border-4 border-transparent border-t-slate-900"></div>
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ShoppingCart } from 'lucide-vue-next';
import { useShoppingCart } from '@/composables/useShoppingCart';

const router = useRouter();
const { totalItems, isEmpty } = useShoppingCart();
const hasNewItems = ref(false);

// Watch for cart changes to show animation
watch(totalItems, (newVal, oldVal) => {
  if (newVal > (oldVal || 0)) {
    hasNewItems.value = true;
    setTimeout(() => {
      hasNewItems.value = false;
    }, 1000);
  }
});

function goToCart() {
  router.push('/shopping/cart');
}
</script>

