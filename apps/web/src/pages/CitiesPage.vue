<template>
  <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <PageHeader title="Cities We Serve" />
    <div class="grid md:grid-cols-2 gap-6">
      <CityCard
        v-for="city in cities"
        :key="city.slug"
        :name="city.name"
        :status="city.status"
        :description="city.description"
        @click="$router.push(`/cities/${city.slug}`)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PageHeader } from '@bridgechina/ui';
import CityCard from '@/components/CityCard.vue';

const cities = [
  { slug: 'guangzhou', name: 'Guangzhou', status: 'Live', description: 'Full service available' },
  { slug: 'hainan', name: 'Hainan', status: 'Coming Soon', description: 'Launching soon' },
];
</script>

