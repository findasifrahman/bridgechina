<template>
  <div class="bg-white p-4 rounded-lg border border-slate-200 mb-4">
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <Input
          v-model="searchQuery"
          placeholder="Search..."
          class="w-full"
          @input="$emit('search', searchQuery)"
        >
          <template #prefix>
            <Search class="h-4 w-4 text-slate-400" />
          </template>
        </Input>
      </div>
      <div v-if="filters" class="flex gap-2 flex-wrap">
        <Select
          v-for="filter in filters"
          :key="filter.key"
          v-model="filterValues[filter.key]"
          :options="filter.options"
          :placeholder="filter.placeholder"
          class="min-w-[150px]"
          @update:model-value="$emit('filter', filterValues)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import Input from './Input.vue';
import Select from './Select.vue';

const props = defineProps<{
  filters?: Array<{
    key: string;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
  }>;
}>();

const emit = defineEmits<{
  search: [query: string];
  filter: [values: Record<string, any>];
}>();

const searchQuery = ref('');
const filterValues = ref<Record<string, any>>({});

watch(() => props.filters, (newFilters) => {
  if (newFilters) {
    filterValues.value = {};
    newFilters.forEach((f) => {
      filterValues.value[f.key] = '';
    });
  }
}, { immediate: true });
</script>

