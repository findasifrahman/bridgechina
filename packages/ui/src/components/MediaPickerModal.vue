<template>
  <Modal v-model="isOpen" title="Select Image" size="xl">
    <div class="space-y-4">
      <Input
        v-model="searchQuery"
        placeholder="Search images..."
        @input="handleSearch"
      >
        <template #prefix>
          <Search class="h-4 w-4 text-slate-400" />
        </template>
      </Input>
      <div class="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all"
          :class="selectedId === asset.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'"
          @click="selectAsset(asset)"
        >
          <img :src="asset.public_url" :alt="asset.r2_key" class="w-full h-full object-cover" />
          <div v-if="selectedId === asset.id" class="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
            <Check class="h-8 w-8 text-teal-600" />
          </div>
        </div>
      </div>
      <div v-if="filteredAssets.length === 0" class="text-center py-8 text-slate-500">
        No images found
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end space-x-3">
        <Button variant="ghost" @click="isOpen = false">Cancel</Button>
        <Button variant="primary" :disabled="!selectedId" @click="confirmSelection">
          Select
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Check } from 'lucide-vue-next';
import Modal from './Modal.vue';
import Input from './Input.vue';
import Button from './Button.vue';

const props = defineProps<{
  modelValue: boolean;
  assets: Array<{ id: string; public_url: string; r2_key: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [asset: { id: string; public_url: string; r2_key: string }];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const searchQuery = ref('');
const selectedId = ref<string | null>(null);

const filteredAssets = computed(() => {
  if (!searchQuery.value) return props.assets;
  const query = searchQuery.value.toLowerCase();
  return props.assets.filter((asset) =>
    asset.r2_key.toLowerCase().includes(query)
  );
});

const handleSearch = () => {
  // Search is handled by computed
};

const selectAsset = (asset: { id: string; public_url: string; r2_key: string }) => {
  selectedId.value = asset.id;
};

const confirmSelection = () => {
  const asset = props.assets.find((a) => a.id === selectedId.value);
  if (asset) {
    emit('select', asset);
    isOpen.value = false;
    selectedId.value = null;
  }
};

watch(isOpen, (val) => {
  if (!val) {
    searchQuery.value = '';
    selectedId.value = null;
  }
});
</script>

