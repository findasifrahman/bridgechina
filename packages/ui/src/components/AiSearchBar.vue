<template>
  <div class="relative">
    <div class="relative">
      <Input
        v-model="query"
        :placeholder="placeholder"
        size="lg"
        class="pr-10"
        @input="handleInput"
        @focus="showSuggestions = true"
        @blur="handleBlur"
      >
        <template #prefix>
          <Search class="h-5 w-5 text-slate-400" />
        </template>
      </Input>
      <button
        v-if="query"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        @click="clear"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
    <div
      v-if="showSuggestions && suggestions.length > 0"
      class="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
    >
      <div
        v-for="(suggestion, idx) in suggestions"
        :key="idx"
        class="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center space-x-3"
        @click="selectSuggestion(suggestion)"
      >
        <component :is="suggestion.icon" class="h-4 w-4 text-slate-400" />
        <div class="flex-1">
          <div class="text-sm font-medium text-slate-900">{{ suggestion.title }}</div>
          <div v-if="suggestion.subtitle" class="text-xs text-slate-500">{{ suggestion.subtitle }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, X, Hotel, Car, UtensilsCrossed, HeartPulse, MapPin, Smartphone } from 'lucide-vue-next';
import Input from './Input.vue';

const props = defineProps<{
  placeholder?: string;
  debounceMs?: number;
}>();

const emit = defineEmits<{
  search: [query: string];
  select: [suggestion: any];
}>();

const query = ref('');
const showSuggestions = ref(false);
const suggestions = ref<any[]>([]);

let debounceTimer: number | null = null;

const handleInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    emit('search', query.value);
    if (query.value.length > 2) {
      // Generate suggestions based on query
      generateSuggestions();
    } else {
      suggestions.value = [];
    }
  }, props.debounceMs || 300);
};

const generateSuggestions = () => {
  const q = query.value.toLowerCase();
  const iconMap: Record<string, any> = {
    hotel: Hotel,
    transport: Car,
    food: UtensilsCrossed,
    medical: HeartPulse,
    tour: MapPin,
    esim: Smartphone,
  };
  
  suggestions.value = [
    { title: `Hotels in ${q}`, subtitle: 'Find verified hotels', icon: iconMap.hotel, type: 'hotel' },
    { title: `Airport pickup`, subtitle: 'Book transport', icon: iconMap.transport, type: 'transport' },
    { title: `Halal restaurants`, subtitle: 'Find halal food', icon: iconMap.food, type: 'halal-food' },
  ].filter((s) => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q));
};

const selectSuggestion = (suggestion: any) => {
  query.value = suggestion.title;
  showSuggestions.value = false;
  emit('select', suggestion);
};

const clear = () => {
  query.value = '';
  suggestions.value = [];
  emit('search', '');
};

const handleBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};
</script>

