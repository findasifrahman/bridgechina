<template>
  <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <PageHeader
      title="Our Services"
      subtitle="Everything you need for your stay in China"
    />
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ServiceCard
        v-for="service in services"
        :key="service.slug"
        :title="service.title"
        :description="service.description"
        :icon="service.icon"
        @click="$router.push(`/services/${service.slug}`)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PageHeader } from '@bridgechina/ui';
import ServiceCard from '@/components/ServiceCard.vue';

const services = [
  { slug: 'hotel', title: 'Hotel Booking', description: 'Verified hotels', icon: '🏨' },
  { slug: 'transport', title: 'Transport', description: 'Airport pickup & more', icon: '🚗' },
  { slug: 'halal-food', title: 'Halal Food', description: 'Verified restaurants', icon: '🍽️' },
  { slug: 'medical', title: 'Medical', description: 'English-speaking help', icon: '🏥' },
  { slug: 'translation-help', title: 'Translation', description: 'On-demand help', icon: '🗣️' },
  { slug: 'shopping', title: 'Shopping', description: 'Marketplace', icon: '🛍️' },
  { slug: 'tours', title: 'Tours', description: 'Curated experiences', icon: '🗺️' },
];
</script>

