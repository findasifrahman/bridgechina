<template>
  <nav class="w-64 bg-white border-r border-slate-200 p-4 space-y-2">
    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
      Services
    </div>
    <router-link
      v-for="service in services"
      :key="service.key"
      :to="service.path"
      class="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
      active-class="bg-teal-50 text-teal-700 font-medium border-l-4 border-teal-600"
    >
      <component :is="service.icon" class="h-5 w-5 flex-shrink-0 text-slate-500" :class="{ 'text-teal-600': $route.path === service.path }" />
      <span>{{ service.name }}</span>
      <Badge v-if="service.badge" :variant="service.badgeVariant" size="sm" class="ml-auto">
        {{ service.badge }}
      </Badge>
    </router-link>
    
    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6 px-2">
      Support
    </div>
    <router-link
      v-for="link in otherLinks"
      :key="link.key"
      :to="link.path"
      class="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
      active-class="bg-teal-50 text-teal-700 font-medium border-l-4 border-teal-600"
    >
      <component :is="link.icon" class="h-5 w-5 flex-shrink-0 text-slate-500" :class="{ 'text-teal-600': $route.path === link.path }" />
      <span>{{ link.name }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import {
  Hotel,
  Car,
  UtensilsCrossed,
  HeartPulse,
  Languages,
  ShoppingBag,
  MapPin,
  Smartphone,
  Landmark,
  HelpCircle,
  Mail,
} from 'lucide-vue-next';
import Badge from './Badge.vue';

const services = [
  { key: 'hotel', name: 'Hotels', path: '/services/hotel', icon: Hotel },
  { key: 'transport', name: 'Transport Service', path: '/services/transport', icon: Car },
  { key: 'restaurants', name: 'Restaurants', path: '/services/restaurants', icon: UtensilsCrossed },
  { key: 'halal-food', name: 'Halal Food', path: '/services/halal-food', icon: UtensilsCrossed },
  { key: 'medical', name: 'Medical Help', path: '/services/medical', icon: HeartPulse },
  { key: 'guide', name: 'Guide', path: '/services/guide', icon: Languages },
  { key: 'shopping', name: 'Shopping', path: '/shopping', icon: ShoppingBag },
  { key: 'tours', name: 'Tours', path: '/services/tours', icon: MapPin },
  { key: 'places', name: 'Places', path: '/places', icon: Landmark },
  { key: 'esim', name: 'eSIM Plans', path: '/services/esim', icon: Smartphone },
];

const otherLinks = [
  { key: 'help', name: 'Help', path: '/help', icon: HelpCircle },
  { key: 'contact', name: 'Contact', path: '/contact', icon: Mail },
];
</script>

