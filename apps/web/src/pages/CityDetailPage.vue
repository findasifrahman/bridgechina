<template>
  <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <PageHeader :title="cityName" />
    <Card>
      <CardBody>
        <p v-if="isComingSoon" class="text-amber-600 font-semibold mb-4">Coming Soon</p>
        <p class="text-slate-600 mb-6">{{ description }}</p>
        <Button v-if="!isComingSoon" variant="primary" @click="$router.push('/request')">
          Request Service in {{ cityName }}
        </Button>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { PageHeader, Card, CardBody, Button } from '@bridgechina/ui';

const route = useRoute();
const slug = route.params.slug as string;

const cityName = computed(() => {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
});

const isComingSoon = computed(() => slug === 'hainan');

const description = computed(() => {
  if (slug === 'guangzhou') {
    return 'Guangzhou is our first launch city. We provide full service coverage including hotels, transport, halal food, medical assistance, and more.';
  }
  return 'We are expanding to Hainan soon. Stay tuned for updates!';
});
</script>

