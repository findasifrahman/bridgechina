<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Homepage Banners</h1>
        <p class="text-sm text-slate-600 mt-1">Manage carousel banners displayed on the homepage</p>
      </div>
      <Button variant="primary" @click="openAddModal">
        <Plus class="h-4 w-4 mr-2" />
        Add Banner
      </Button>
    </div>

    <!-- Banners List -->
    <Card v-if="loading">
      <CardBody>
        <div class="text-center py-8">
          <SkeletonLoader class="h-32 mb-4" />
          <SkeletonLoader class="h-32" />
        </div>
      </CardBody>
    </Card>

    <div v-else-if="banners.length === 0" class="text-center py-12">
      <EmptyState
        title="No banners yet"
        description="Create your first homepage banner to display in the carousel"
      >
        <template #action>
          <Button variant="primary" @click="openAddModal">Add First Banner</Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="space-y-4">
      <Card
        v-for="banner in banners"
        :key="banner.id"
        class="hover:shadow-md transition-shadow"
      >
        <CardBody class="p-6">
          <div class="flex items-start gap-6">
            <!-- Banner Preview -->
            <div class="relative w-64 h-32 rounded-lg overflow-hidden flex-shrink-0">
              <div
                v-if="banner.coverAsset?.public_url || banner.coverAsset?.thumbnail_url"
                class="absolute inset-0 bg-cover bg-center"
                :style="{
                  backgroundImage: `url(${banner.coverAsset?.thumbnail_url || banner.coverAsset?.public_url})`,
                }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-teal-900/70 to-amber-900/70"></div>
              </div>
              <div
                v-else
                class="absolute inset-0 bg-gradient-to-r from-teal-500 to-amber-400"
              ></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-white px-4">
                  <p class="text-sm font-semibold drop-shadow-lg line-clamp-1">{{ banner.title }}</p>
                </div>
              </div>
            </div>

            <!-- Banner Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <h3 class="text-lg font-semibold text-slate-900 mb-1">{{ banner.title }}</h3>
                  <p v-if="banner.subtitle" class="text-sm text-slate-600 mb-2 line-clamp-2">{{ banner.subtitle }}</p>
                  <div class="flex items-center gap-4 text-xs text-slate-500">
                    <span v-if="banner.link">Link: {{ banner.link }}</span>
                    <span>Order: {{ banner.sort_order }}</span>
                    <Badge :variant="banner.is_active ? 'success' : 'default'">
                      {{ banner.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" @click="openEditModal(banner)">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" @click="confirmDelete(banner)">
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingBanner ? 'Edit Banner' : 'Add Banner'" size="lg">
      <form @submit.prevent="saveBanner" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <Input
            v-model="form.title"
            placeholder="Banner title"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Subtitle</label>
          <Textarea
            v-model="form.subtitle"
            placeholder="Banner subtitle or description"
            :rows="2"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Link URL</label>
          <Input
            v-model="form.link"
            placeholder="/services or /services/hotel"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">CTA Button Text</label>
          <Input
            v-model="form.cta_text"
            placeholder="Learn More"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Banner Image</label>
          <div class="space-y-2">
            <div v-if="form.cover_asset_id && selectedAsset" class="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200">
              <img
                :src="selectedAsset.thumbnail_url || selectedAsset.public_url"
                :alt="selectedAsset.title || 'Banner image'"
                class="w-full h-full object-cover"
              />
              <Button
                variant="ghost"
                size="sm"
                class="absolute top-2 right-2 bg-white/90 hover:bg-white"
                @click="form.cover_asset_id = ''"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              @click="showImagePicker = true"
            >
              <ImageIcon class="h-4 w-4 mr-2" />
              {{ form.cover_asset_id ? 'Change Image' : 'Select Image' }}
            </Button>
          </div>
          <MediaPickerModal
            v-model="showImagePicker"
            :assets="mediaAssets"
            :multiple="false"
            @select="handleImageSelected"
          />
          <p class="text-xs text-slate-500 mt-1">Recommended: 1920x600px or similar wide aspect ratio</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
            <Input
              v-model.number="form.sort_order"
              type="number"
              placeholder="0"
            />
          </div>

          <div class="flex items-center pt-6">
            <Checkbox
              v-model="form.is_active"
              label="Active"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="ghost" @click="closeModal">Cancel</Button>
          <Button variant="primary" type="submit">Save Banner</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Plus, Edit, Trash2 } from 'lucide-vue-next';
import {
  Card,
  CardBody,
  Button,
  Badge,
  Input,
  Textarea,
  Checkbox,
  Modal,
  SkeletonLoader,
  EmptyState,
  MediaPickerModal,
} from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';

const toast = useToast();

const banners = ref<any[]>([]);
const loading = ref(true);
const showModal = ref(false);
const showImagePicker = ref(false);
const editingBanner = ref<any>(null);
const mediaAssets = ref<any[]>([]);

const form = ref({
  title: '',
  subtitle: '',
  link: '',
  cta_text: 'Learn More',
  cover_asset_id: '',
  is_active: true,
  sort_order: 0,
});

async function loadBanners() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/homepage-banners');
    banners.value = response.data;
  } catch (error) {
    console.error('Failed to load banners:', error);
    toast.error('Failed to load banners');
  } finally {
    loading.value = false;
  }
}

async function loadMediaAssets() {
  try {
    const response = await axios.get('/api/admin/media?limit=1000');
    mediaAssets.value = Array.isArray(response.data.media) ? response.data.media : [];
  } catch (error) {
    console.error('Failed to load media assets:', error);
    toast.error('Failed to load media assets');
  }
}

const selectedAsset = computed(() => {
  if (!form.value.cover_asset_id) return null;
  return mediaAssets.value.find((asset: any) => asset.id === form.value.cover_asset_id);
});

function handleImageSelected(asset: { id: string; public_url: string; thumbnail_url?: string | null; r2_key: string }) {
  form.value.cover_asset_id = asset.id;
  showImagePicker.value = false;
}

async function openAddModal() {
  editingBanner.value = null;
  form.value = {
    title: '',
    subtitle: '',
    link: '',
    cta_text: 'Learn More',
    cover_asset_id: '',
    is_active: true,
    sort_order: 0,
  };
  await loadMediaAssets();
  showModal.value = true;
}

async function openEditModal(banner: any) {
  editingBanner.value = banner;
  form.value = {
    title: banner.title,
    subtitle: banner.subtitle || '',
    link: banner.link || '',
    cta_text: banner.cta_text || 'Learn More',
    cover_asset_id: banner.cover_asset_id || '',
    is_active: banner.is_active,
    sort_order: banner.sort_order || 0,
  };
  await loadMediaAssets();
  // Add the current banner's cover asset to mediaAssets if not already present
  if (banner.coverAsset && !mediaAssets.value.find((a: any) => a.id === banner.coverAsset.id)) {
    mediaAssets.value.push(banner.coverAsset);
  }
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingBanner.value = null;
}

async function saveBanner() {
  try {
    if (editingBanner.value) {
      await axios.put(`/api/admin/homepage-banners/${editingBanner.value.id}`, form.value);
      toast.success('Banner updated successfully');
    } else {
      await axios.post('/api/admin/homepage-banners', form.value);
      toast.success('Banner created successfully');
    }
    closeModal();
    loadBanners();
  } catch (error: any) {
    console.error('Failed to save banner:', error);
    toast.error(error.response?.data?.error || 'Failed to save banner');
  }
}

async function confirmDelete(banner: any) {
  if (!confirm(`Are you sure you want to delete "${banner.title}"?`)) {
    return;
  }

  try {
    await axios.delete(`/api/admin/homepage-banners/${banner.id}`);
    toast.success('Banner deleted successfully');
    loadBanners();
  } catch (error: any) {
    console.error('Failed to delete banner:', error);
    toast.error(error.response?.data?.error || 'Failed to delete banner');
  }
}

onMounted(() => {
  loadBanners();
});
</script>






