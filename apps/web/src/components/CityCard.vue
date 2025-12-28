<template>
  <Card
    :hover="true"
    class="cursor-pointer relative overflow-hidden"
    @click="$emit('click')"
  >
    <div class="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-500/20 to-amber-400/20 rounded-full -mr-20 -mt-20"></div>
    <div class="relative">
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center space-x-2">
          <MapPin class="h-6 w-6 text-teal-600" />
          <h3 class="text-2xl font-bold text-slate-900">{{ name }}</h3>
        </div>
        <Badge :variant="status === 'Live' ? 'success' : 'default'">
          {{ status }}
        </Badge>
      </div>
      <p class="text-slate-600">{{ description }}</p>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { MapPin } from 'lucide-vue-next';
import { Card, Badge } from '@bridgechina/ui';

defineProps<{
  name: string;
  status: string;
  description: string;
}>();

defineEmits<{
  click: [];
}>();
</script>
