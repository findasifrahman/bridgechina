<template>
  <Card class="relative">
    <div class="absolute top-0 left-0 w-12 h-12 text-amber-400 opacity-20">
      <Quote class="h-full w-full" />
    </div>
    <div class="relative pt-6">
      <div class="flex items-center mb-4">
        <Star
          v-for="i in rating"
          :key="i"
          class="h-5 w-5 text-amber-400 fill-amber-400"
        />
      </div>
      <p class="text-slate-700 mb-4 italic leading-relaxed">"{{ text }}"</p>
      <div class="flex items-center space-x-2">
        <User class="h-5 w-5 text-slate-400" />
        <p class="font-semibold text-slate-900">— {{ name }}</p>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { Quote, Star, User } from 'lucide-vue-next';
import { Card } from '@bridgechina/ui';

defineProps<{
  name: string;
  text: string;
  rating: number;
}>();
</script>
