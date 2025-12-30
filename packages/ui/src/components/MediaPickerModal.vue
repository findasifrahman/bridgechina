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
          class="relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all group"
          :class="(props.multiple ? selectedIds.has(asset.id) : selectedId === asset.id) ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'"
          @click="selectAsset(asset)"
        >
          <img 
            :src="asset.thumbnail_url || asset.public_url" 
            :alt="getAssetName(asset)" 
            class="w-full h-full object-cover"
            @error="(e) => { (e.target as HTMLImageElement).src = asset.public_url; }"
          />
          <div v-if="(props.multiple ? selectedIds.has(asset.id) : selectedId === asset.id)" class="absolute inset-0 bg-teal-500/20 flex items-center justify-center z-10">
            <Check class="h-8 w-8 text-teal-600" />
          </div>
          <!-- Info overlay - always visible with meaningful name -->
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 text-white text-xs">
            <div class="font-medium truncate">{{ getAssetName(asset) }}</div>
            <div v-if="asset.category" class="mt-1">
              <span class="inline-block bg-teal-500/90 px-1.5 py-0.5 rounded text-xs font-medium">{{ asset.category }}</span>
            </div>
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
        <Button variant="primary" :disabled="props.multiple ? selectedIds.size === 0 : !selectedId" @click="confirmSelection">
          {{ props.multiple ? `Select ${selectedIds.size}` : 'Select' }}
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
  assets: Array<{ 
    id: string; 
    public_url: string; 
    thumbnail_url?: string | null; 
    r2_key: string;
    category?: string | null;
    tags?: string[] | any;
    title?: string | null;
  }>;
  multiple?: boolean;
}>();

function getAssetName(asset: any): string {
  // 1. Try title (extracted from tags by API)
  if (asset.title) {
    return asset.title;
  }
  
  // 2. Try first tag (if available and not a title tag)
  if (asset.tags && Array.isArray(asset.tags) && asset.tags.length > 0) {
    const firstTag = asset.tags[0];
    if (firstTag && !firstTag.startsWith('title:')) {
      return firstTag;
    }
  }
  
  // 3. Show category if available
  if (asset.category) {
    return `${asset.category} image`;
  }
  
  // 4. Fallback to a cleaned filename (remove timestamp prefix if present)
  const filename = asset.r2_key.split('/').pop() || 'Untitled';
  // Remove timestamp prefix like "1766866776362-" if present
  const cleaned = filename.replace(/^\d+-/, '');
  return cleaned || 'Untitled';
}

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [asset: { id: string; public_url: string; thumbnail_url?: string | null; r2_key: string }];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const searchQuery = ref('');
const selectedId = ref<string | null>(null);
const selectedIds = ref<Set<string>>(new Set());

const filteredAssets = computed(() => {
  if (!searchQuery.value) return props.assets;
  const query = searchQuery.value.toLowerCase();
  return props.assets.filter((asset) => {
    const name = getAssetName(asset).toLowerCase();
    const category = (asset.category || '').toLowerCase();
    const r2Key = asset.r2_key.toLowerCase();
    return name.includes(query) || category.includes(query) || r2Key.includes(query);
  });
});

const handleSearch = () => {
  // Search is handled by computed
};

const selectAsset = (asset: { id: string; public_url: string; r2_key: string }) => {
  if (props.multiple) {
    if (selectedIds.value.has(asset.id)) {
      selectedIds.value.delete(asset.id);
    } else {
      selectedIds.value.add(asset.id);
    }
  } else {
    selectedId.value = asset.id;
  }
};

const confirmSelection = () => {
  if (props.multiple) {
    // Emit each selected asset
    selectedIds.value.forEach(id => {
      const asset = props.assets.find((a) => a.id === id);
      if (asset) {
        emit('select', asset);
      }
    });
    isOpen.value = false;
    selectedIds.value.clear();
  } else {
    const asset = props.assets.find((a) => a.id === selectedId.value);
    if (asset) {
      emit('select', asset);
      isOpen.value = false;
      selectedId.value = null;
    }
  }
};

watch(isOpen, (val) => {
  if (!val) {
    searchQuery.value = '';
    selectedId.value = null;
    selectedIds.value.clear();
  }
});
</script>

