<template>
  <Card class="overflow-hidden" :hover="true">
    <div v-if="image" class="h-32 bg-slate-200 relative">
      <img :src="image" :alt="title" class="w-full h-full object-cover" />
      <div v-if="badge" class="absolute top-2 right-2">
        <Badge :variant="badgeVariant">{{ badge }}</Badge>
      </div>
    </div>
    <CardBody class="p-4">
      <h3 class="font-semibold text-sm text-slate-900 mb-1">{{ title }}</h3>
      <p v-if="subtitle" class="text-xs text-slate-600 mb-2">{{ subtitle }}</p>
      <div v-if="price" class="text-lg font-bold text-teal-600 mb-2">
        {{ price }}
      </div>
      <Button v-if="actionText" variant="primary" size="sm" full-width @click="$emit('action')">
        {{ actionText }}
      </Button>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import Card from './Card.vue';
import CardBody from './CardBody.vue';
import Badge from './Badge.vue';
import Button from './Button.vue';

defineProps<{
  title: string;
  subtitle?: string;
  image?: string;
  price?: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'accent' | 'danger';
  actionText?: string;
}>();

defineEmits<{
  action: [];
}>();
</script>

