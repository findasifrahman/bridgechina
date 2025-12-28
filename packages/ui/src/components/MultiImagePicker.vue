<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <label class="text-sm font-medium text-slate-700">Images</label>
      <Button variant="ghost" size="sm" @click="showPicker = true">
        <Plus class="h-4 w-4 mr-1" />
        Add Images
      </Button>
    </div>
    
    <!-- Selected Images Grid -->
    <div v-if="selectedImages.length > 0" class="grid grid-cols-4 gap-4">
      <div
        v-for="(img, index) in selectedImages"
        :key="img.id"
        class="relative group aspect-square border-2 rounded-lg overflow-hidden"
        :class="index === 0 ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200'"
      >
        <img 
          :src="img.thumbnail_url || img.public_url" 
          :alt="img.r2_key" 
          class="w-full h-full object-cover"
          @error="(e) => { (e.target as HTMLImageElement).src = img.public_url; }"
        />
        <!-- Remove button - always visible in top-right corner -->
        <button
          type="button"
          class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
          @click.stop="removeImage(index)"
          title="Remove image"
        >
          <X class="h-3 w-3" />
        </button>
        <!-- Hover overlay with move buttons -->
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            class="opacity-0 group-hover:opacity-100 text-white"
            @click.stop="moveImage(index, 'up')"
            :disabled="index === 0"
            title="Move up"
          >
            <ArrowUp class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="opacity-0 group-hover:opacity-100 text-white"
            @click.stop="moveImage(index, 'down')"
            :disabled="index === selectedImages.length - 1"
            title="Move down"
          >
            <ArrowDown class="h-4 w-4" />
          </Button>
        </div>
        <div v-if="index === 0" class="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded z-10">
          Primary
        </div>
      </div>
    </div>
    <div v-else class="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
      No images selected. Click "Add Images" to select from media library.
    </div>

    <!-- Media Picker Modal -->
    <MediaPickerModal
      v-model="showPicker"
      :assets="availableAssets"
      @select="handleImageSelect"
      :multiple="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, ArrowUp, ArrowDown, X } from 'lucide-vue-next';
import Button from './Button.vue';
import MediaPickerModal from './MediaPickerModal.vue';

interface ImageAsset {
  id: string;
  public_url: string;
  thumbnail_url?: string | null;
  r2_key: string;
  category?: string | null;
  tags?: string[] | any;
}

const props = defineProps<{
  modelValue: string[]; // Array of asset IDs
  availableAssets: ImageAsset[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const showPicker = ref(false);
const selectedImages = ref<ImageAsset[]>([]);

// Convert asset IDs to full image objects
watch(() => props.modelValue, (ids) => {
  if (ids && ids.length > 0) {
    selectedImages.value = ids
      .map(id => props.availableAssets.find(a => a.id === id))
      .filter(Boolean) as ImageAsset[];
  } else {
    selectedImages.value = [];
  }
}, { immediate: true });

function handleImageSelect(asset: ImageAsset) {
  if (!selectedImages.value.find(img => img.id === asset.id)) {
    selectedImages.value.push(asset);
    updateModelValue();
  }
}

function removeImage(index: number) {
  selectedImages.value.splice(index, 1);
  updateModelValue();
}

function moveImage(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex >= 0 && newIndex < selectedImages.value.length) {
    const temp = selectedImages.value[index];
    selectedImages.value[index] = selectedImages.value[newIndex];
    selectedImages.value[newIndex] = temp;
    updateModelValue();
  }
}

function updateModelValue() {
  emit('update:modelValue', selectedImages.value.map(img => img.id));
}
</script>

