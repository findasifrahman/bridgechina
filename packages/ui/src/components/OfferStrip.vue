<template>
  <div v-if="offer" class="bg-gradient-to-r from-teal-50 to-amber-50 border-b border-teal-200/50 py-2.5 px-4 text-sm font-medium text-center">
    <div class="w-full mx-auto flex items-center justify-center space-x-2">
      <Sparkles class="h-4 w-4 text-teal-600" />
      <span class="text-slate-800">{{ offer.title }}</span>
      <router-link 
        v-if="offerLink" 
        :to="offerLink" 
        class="text-teal-600 hover:text-teal-700 underline hover:no-underline ml-2 font-semibold"
      >
        Learn more →
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';

const props = defineProps<{
  offer?: any;
}>();

const router = useRouter();

const offerLink = computed(() => {
  if (!props.offer) return null;
  return {
    path: '/request',
    query: {
      offer_id: props.offer.id,
      service_type: props.offer.service_type,
    },
  };
});
</script>

