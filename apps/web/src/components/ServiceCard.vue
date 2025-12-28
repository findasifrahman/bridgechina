<template>
  <Card
    :hover="true"
    class="cursor-pointer text-center transition-all duration-200 hover:scale-105"
    @click="$emit('click')"
  >
    <div class="flex justify-center mb-3">
      <component :is="iconComponent" class="h-12 w-12 text-teal-600" />
    </div>
    <div class="font-semibold text-slate-900">{{ label || title }}</div>
    <div v-if="description" class="text-sm text-slate-600 mt-2">{{ description }}</div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card } from '@bridgechina/ui';
import {
  Hotel,
  Car,
  UtensilsCrossed,
  HeartPulse,
  Languages,
  ShoppingBag,
  MapPin,
  MessageCircle,
} from 'lucide-vue-next';

const props = defineProps<{
  icon?: string;
  label?: string;
  title?: string;
  description?: string;
}>();

defineEmits<{
  click: [];
}>();

const iconComponent = computed(() => {
  const iconMap: Record<string, any> = {
    hotel: Hotel,
    transport: Car,
    'airport-pickup': Car,
    'halal-food': UtensilsCrossed,
    medical: HeartPulse,
    'translation-help': Languages,
    shopping: ShoppingBag,
    tours: MapPin,
    whatsapp: MessageCircle,
  };
  
  const key = props.icon?.toLowerCase() || props.label?.toLowerCase() || props.title?.toLowerCase() || '';
  return iconMap[key] || Hotel;
});
</script>
