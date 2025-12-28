<template>
  <Card>
    <button
      class="w-full text-left flex justify-between items-center"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center space-x-3">
        <HelpCircle class="h-5 w-5 text-teal-600 flex-shrink-0" />
        <h3 class="font-semibold text-slate-900">{{ question }}</h3>
      </div>
      <ChevronDown
        class="h-5 w-5 text-slate-400 transform transition-transform flex-shrink-0"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>
    <div v-if="isOpen" class="mt-4 text-slate-600 pl-8 leading-relaxed">
      {{ answer }}
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { HelpCircle, ChevronDown } from 'lucide-vue-next';
import { Card } from '@bridgechina/ui';

defineProps<{
  question: string;
  answer: string;
}>();

const isOpen = ref(false);
</script>
