<template>
  <div class="space-y-2">
    <label class="text-sm font-medium text-slate-700">Gallery Images</label>
    <div class="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border border-slate-200 rounded-lg">
      <div
        v-for="asset in availableAssets"
        :key="asset.id"
        class="relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all"
        :class="isSelected(asset.id) ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'"
        @click="toggleSelection(asset.id)"
      >
        <img :src="asset.public_url" :alt="asset.r2_key || asset.id" class="w-full h-full object-cover" />
        <div v-if="isSelected(asset.id)" class="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
          <Check class="h-6 w-6 text-teal-600" />
        </div>
      </div>
    </div>
    <p v-if="modelValue && modelValue.length > 0" class="text-xs text-slate-500">
      {{ modelValue.length }} image(s) selected
    </p>
    <p v-else class="text-xs text-slate-500">No images selected</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Check } from 'lucide-vue-next';

const props = defineProps<{
  modelValue?: string[];
  availableAssets?: Array<{ id: string; public_url: string; r2_key?: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const selectedIds = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
});

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id);
}

function toggleSelection(id: string) {
  const current = [...selectedIds.value];
  const index = current.indexOf(id);
  if (index > -1) {
    current.splice(index, 1);
  } else {
    current.push(id);
  }
  selectedIds.value = current;
}
</script>

