<template>
  <div>
    <PageHeader title="Media Library">
      <template #actions>
        <Button variant="primary" @click="showUploadModal = true">
          <Upload class="w-4 h-4 mr-2" />
          Upload Image
        </Button>
        <Button 
          v-if="selectedMedia.length > 0"
          variant="danger" 
          @click="showBulkDeleteConfirm = true"
        >
          <Trash2 class="w-4 h-4 mr-2" />
          Delete Selected ({{ selectedMedia.length }})
        </Button>
      </template>
    </PageHeader>
    
    <Card v-if="r2NotConfigured" class="mb-6">
      <CardBody>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p class="text-amber-800">
            <strong>R2 not configured:</strong> Media upload requires Cloudflare R2 credentials.
            Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in your .env file.
          </p>
        </div>
      </CardBody>
    </Card>

    <!-- Filters -->
    <Card class="mb-6">
      <CardBody>
        <div class="flex flex-wrap gap-4 items-end">
          <div class="flex-1 min-w-[200px]">
            <Input
              v-model="searchQuery"
              placeholder="Search by filename..."
              @input="handleSearch"
            >
              <template #prefix>
                <Search class="w-4 h-4 text-slate-400" />
              </template>
            </Input>
          </div>
          <div class="w-48">
            <select
              v-model="selectedCategory"
              @change="handleCategoryChange"
              :disabled="loadingCategories"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
            >
              <option value="">All Categories</option>
              <option v-for="cat in serviceCategories" :key="cat.id" :value="cat.key">
                {{ cat.name }}
              </option>
              <option value="city">Cities</option>
              <option value="product">Products</option>
              <option value="cityplace">City Places</option>
              <option value="general">General</option>
            </select>
          </div>
          <Button variant="ghost" @click="clearFilters">
            <X class="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardBody>
    </Card>

    <!-- Media Grid -->
    <Card>
      <CardBody>
        <div v-if="media.length === 0 && !loading" class="text-center py-12">
          <p class="text-slate-600 mb-4">No media found</p>
          <Button variant="primary" @click="showUploadModal = true">Upload Image</Button>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="item in media"
            :key="item.id"
            class="relative group cursor-pointer border-2 rounded-lg overflow-hidden"
            :class="selectedMedia.includes(item.id) ? 'border-teal-500' : 'border-slate-200'"
            @click="toggleSelect(item.id)"
          >
            <!-- Thumbnail or full image -->
            <img
              :src="item.thumbnail_url || item.public_url"
              :alt="item.r2_key"
              class="w-full h-32 object-cover"
              loading="lazy"
            />
            <!-- Selection checkbox -->
            <div class="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                :checked="selectedMedia.includes(item.id)"
                @click.stop="toggleSelect(item.id)"
                class="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </div>
            <!-- Always visible action buttons -->
            <div class="absolute top-2 right-2 z-10 flex gap-1">
              <button
                type="button"
                class="bg-teal-500 hover:bg-teal-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                @click.stop="viewMedia(item)"
                title="View/Edit"
              >
                <Eye class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="bg-slate-700 hover:bg-slate-800 text-white rounded-full p-1.5 shadow-lg transition-colors"
                @click.stop="copyUrl(item.public_url)"
                title="Copy URL"
              >
                <Copy class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                @click.stop="deleteMedia(item.id)"
                title="Delete"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
            <!-- Info badge - always visible with meaningful name -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2 text-white text-xs">
              <div class="font-medium truncate">{{ getMediaDisplayName(item) }}</div>
              <div class="text-xs opacity-75 mt-0.5">{{ formatSize(item.size) }}</div>
              <div v-if="item.category" class="mt-1">
                <Badge size="sm" variant="secondary">{{ item.category }}</Badge>
              </div>
            </div>
          </div>
        </div>
        <Pagination
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          @update:current-page="handlePageChange"
        />
      </CardBody>
    </Card>

    <!-- Upload Modal -->
    <Modal v-model="showUploadModal" title="Upload Image" size="lg">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Select Image (Max 1MB)
          </label>
          <Input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
          />
          <p v-if="fileError" class="text-red-600 text-sm mt-1">{{ fileError }}</p>
          <p v-if="selectedFile" class="text-sm text-slate-600 mt-1">
            File: {{ selectedFile.name }} ({{ formatSize(selectedFile.size) }})
          </p>
        </div>
        
        <div v-if="previewUrl" class="border border-slate-200 rounded-lg p-2">
          <img
            :src="previewUrl"
            alt="Preview"
            class="w-full h-48 object-contain rounded"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Category (Optional)
          </label>
          <select
            v-model="uploadCategory"
            :disabled="loadingCategories"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
          >
            <option value="">None</option>
            <option v-for="cat in serviceCategories" :key="cat.id" :value="cat.key">
              {{ cat.name }}
            </option>
            <option value="city">Cities</option>
            <option value="product">Products</option>
            <option value="cityplace">City Places</option>
            <option value="general">General</option>
          </select>
          <p v-if="loadingCategories" class="text-xs text-slate-500 mt-1">Loading categories...</p>
          <p v-else-if="serviceCategories.length === 0" class="text-xs text-amber-600 mt-1">
            No categories found. Make sure database is seeded.
          </p>
          <p v-else class="text-xs text-slate-500 mt-1">
            {{ serviceCategories.length }} categories loaded
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Tags (Optional, comma-separated)
          </label>
          <Input
            v-model="uploadTags"
            placeholder="e.g., guangzhou, hotel, exterior"
          />
          <p class="text-xs text-slate-500 mt-1">Separate tags with commas</p>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" @click="resetUploadForm">Cancel</Button>
          <Button
            variant="primary"
            :loading="uploading"
            :disabled="!selectedFile || !!fileError"
            @click="handleUpload"
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>

    <!-- View/Edit Media Modal -->
    <Modal v-model="showEditModal" :title="editingMedia ? 'Edit Media Metadata' : 'View Media'" size="lg">
      <div v-if="editingMedia" class="space-y-4">
        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <img
            :src="editingMedia.thumbnail_url || editingMedia.public_url"
            :alt="editingMedia.r2_key"
            class="w-full h-64 object-contain rounded"
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label class="text-slate-600 font-medium">File Name</label>
            <p class="text-slate-900 mt-1 break-all">{{ editingMedia.r2_key.split('/').pop() }}</p>
          </div>
          <div>
            <label class="text-slate-600 font-medium">Size</label>
            <p class="text-slate-900 mt-1">{{ formatSize(editingMedia.size) }}</p>
          </div>
          <div>
            <label class="text-slate-600 font-medium">Uploaded</label>
            <p class="text-slate-900 mt-1">{{ new Date(editingMedia.created_at).toLocaleString() }}</p>
          </div>
          <div>
            <label class="text-slate-600 font-medium">Uploaded By</label>
            <p class="text-slate-900 mt-1">{{ editingMedia.uploader?.email || 'Unknown' }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Category
          </label>
          <select
            v-model="editForm.category"
            :disabled="loadingCategories"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors bg-white"
          >
            <option value="">None</option>
            <option v-for="cat in serviceCategories" :key="cat.id" :value="cat.key">
              {{ cat.name }}
            </option>
            <option value="city">Cities</option>
            <option value="product">Products</option>
            <option value="cityplace">City Places</option>
            <option value="general">General</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Title (Optional)
          </label>
          <Input
            v-model="editForm.title"
            placeholder="e.g., Canton Tower Exterior"
          />
          <p class="text-xs text-slate-500 mt-1">A descriptive name for this image</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Tags (comma-separated)
          </label>
          <Input
            v-model="editForm.tagsText"
            placeholder="e.g., guangzhou, hotel, exterior"
          />
          <p class="text-xs text-slate-500 mt-1">Separate tags with commas</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Public URL
          </label>
          <div class="flex gap-2">
            <Input
              :value="editingMedia.public_url"
              readonly
              class="flex-1"
            />
            <Button variant="ghost" size="sm" @click="copyUrl(editingMedia.public_url)">
              <Copy class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" @click="showEditModal = false">Cancel</Button>
          <Button variant="primary" :loading="savingMetadata" @click="saveMetadata">
            <Edit class="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>

    <!-- Bulk Delete Confirm -->
    <ConfirmDialog
      v-model="showBulkDeleteConfirm"
      title="Delete Selected Media"
      :message="`Are you sure you want to delete ${selectedMedia.length} media item(s)? This action cannot be undone.`"
      confirm-text="Delete"
      variant="danger"
      @confirm="handleBulkDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { 
  PageHeader, 
  Card, 
  CardBody, 
  Button, 
  Modal, 
  Input, 
  Select,
  FilterBar, 
  Pagination,
  Badge,
  ConfirmDialog
} from '@bridgechina/ui';
import { Upload, Trash2, Search, X, Copy, Eye, Edit } from 'lucide-vue-next';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const media = ref<any[]>([]);
const searchQuery = ref('');
const selectedCategory = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);
const showUploadModal = ref(false);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string>('');
const uploading = ref(false);
const loading = ref(false);
const loadingCategories = ref(false);
const r2NotConfigured = ref(false);
const fileError = ref('');
const uploadCategory = ref('');
const uploadTags = ref('');
const selectedMedia = ref<string[]>([]);
const showBulkDeleteConfirm = ref(false);
const serviceCategories = ref<any[]>([]);
const showEditModal = ref(false);
const editingMedia = ref<any>(null);
const savingMetadata = ref(false);
const editForm = ref({
  category: '',
  tagsText: '',
  title: '',
});
const toast = useToast();

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMediaDisplayName(item: any): string {
  // 1. Try title (extracted from tags by API)
  if (item.title) {
    return item.title;
  }
  
  // 2. Try first tag (if available and not a title tag)
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    const firstTag = item.tags[0];
    if (firstTag && !firstTag.startsWith('title:')) {
      return firstTag;
    }
  }
  
  // 3. Show category if available
  if (item.category) {
    return `${item.category} image`;
  }
  
  // 4. Fallback to a cleaned filename (remove timestamp prefix if present)
  const filename = item.r2_key.split('/').pop() || 'Untitled';
  // Remove timestamp prefix like "1766866776362-" if present
  const cleaned = filename.replace(/^\d+-/, '');
  return cleaned || 'Untitled';
}

async function loadMedia() {
  loading.value = true;
  try {
    const params: any = { page: currentPage.value, limit: 24 };
    if (searchQuery.value) params.search = searchQuery.value;
    if (selectedCategory.value) params.category = selectedCategory.value;
    
    const response = await axios.get('/api/admin/media', { params });
    
    if (Array.isArray(response.data)) {
      media.value = response.data;
      totalPages.value = Math.ceil(response.data.length / 24);
      total.value = response.data.length;
    } else {
      media.value = response.data.media || [];
      totalPages.value = response.data.totalPages || 1;
      total.value = response.data.total || 0;
    }
  } catch (error: any) {
    if (error.response?.status === 500 && error.response?.data?.error?.includes('R2')) {
      r2NotConfigured.value = true;
    }
    console.error('Failed to load media', error);
    toast.error('Failed to load media');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadMedia();
}

function handleCategoryChange() {
  currentPage.value = 1;
  loadMedia();
}

function clearFilters() {
  searchQuery.value = '';
  selectedCategory.value = '';
  currentPage.value = 1;
  loadMedia();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  loadMedia();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  fileError.value = '';
  
  if (file) {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      fileError.value = `File size (${formatSize(file.size)}) exceeds maximum of ${formatSize(MAX_FILE_SIZE)}`;
      selectedFile.value = null;
      previewUrl.value = '';
      return;
    }
    
    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      fileError.value = 'File must be an image';
      selectedFile.value = null;
      previewUrl.value = '';
      return;
    }
    
    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
}

async function handleUpload() {
  if (!selectedFile.value || fileError.value) return;
  
  uploading.value = true;
  try {
    console.log('[MediaPage] Starting upload for file:', selectedFile.value.name);
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    if (uploadCategory.value) {
      formData.append('category', uploadCategory.value);
    }
    if (uploadTags.value) {
      formData.append('tags', uploadTags.value);
    }

    console.log('[MediaPage] Sending upload request...');
    const response = await axios.post('/api/admin/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('[MediaPage] Upload progress:', percentCompleted + '%');
        }
      },
    });

    console.log('[MediaPage] Upload successful:', response.data);
    toast.success('Image uploaded successfully! Thumbnail generated automatically.');
    resetUploadForm();
    await loadMedia();
  } catch (error: any) {
    console.error('[MediaPage] Upload error:', error);
    console.error('[MediaPage] Error response:', error.response?.data);
    const errorMsg = error.response?.data?.error || error.message || 'Failed to upload image';
    toast.error(errorMsg);
    
    // Show more details in development
    if (error.response?.data?.details) {
      console.error('[MediaPage] Error details:', error.response.data.details);
    }
  } finally {
    uploading.value = false;
  }
}

function resetUploadForm() {
  showUploadModal.value = false;
  selectedFile.value = null;
  previewUrl.value = '';
  fileError.value = '';
  uploadCategory.value = '';
  uploadTags.value = '';
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
}

function toggleSelect(id: string) {
  const index = selectedMedia.value.indexOf(id);
  if (index > -1) {
    selectedMedia.value.splice(index, 1);
  } else {
    selectedMedia.value.push(id);
  }
}

async function deleteMedia(id: string) {
  if (!confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
    return;
  }
  
  try {
    await axios.delete(`/api/admin/media/${id}`);
    toast.success('Media deleted successfully');
    await loadMedia();
    // Remove from selection if selected
    const index = selectedMedia.value.indexOf(id);
    if (index > -1) {
      selectedMedia.value.splice(index, 1);
    }
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete media');
  }
}

async function handleBulkDelete() {
  if (selectedMedia.value.length === 0) return;
  
  try {
    await axios.delete('/api/admin/media/bulk', {
      data: { ids: selectedMedia.value },
    });
    toast.success(`Deleted ${selectedMedia.value.length} media item(s)`);
    selectedMedia.value = [];
    showBulkDeleteConfirm.value = false;
    await loadMedia();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete media');
  }
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url);
  toast.success('URL copied to clipboard');
}

async function viewMedia(item: any) {
  try {
    // Fetch full media details
    const response = await axios.get(`/api/admin/media/${item.id}`);
    editingMedia.value = response.data;
    
    // Extract title from tags (if stored as "title:value")
    const tags = (editingMedia.value.tags as string[]) || [];
    const titleTag = tags.find(t => t.startsWith('title:'));
    const title = titleTag ? titleTag.replace('title:', '') : '';
    const otherTags = tags.filter(t => !t.startsWith('title:'));
    
    editForm.value = {
      category: editingMedia.value.category || '',
      tagsText: otherTags.join(', '),
    };
    
    showEditModal.value = true;
  } catch (error: any) {
    toast.error('Failed to load media details');
    console.error(error);
  }
}

async function saveMetadata() {
  if (!editingMedia.value) return;
  
  savingMetadata.value = true;
  try {
    const tags = editForm.value.tagsText
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    await axios.put(`/api/admin/media/${editingMedia.value.id}`, {
      category: editForm.value.category || null,
      tags: tags,
      title: editForm.value.title || null,
    });
    
    toast.success('Media metadata updated');
    showEditModal.value = false;
    await loadMedia();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update metadata');
  } finally {
    savingMetadata.value = false;
  }
}

async function loadServiceCategories() {
  loadingCategories.value = true;
  try {
    console.log('[MediaPage] Loading service categories...');
    const response = await axios.get('/api/admin/service-categories');
    console.log('[MediaPage] Service categories response:', response.data);
    serviceCategories.value = response.data || [];
    if (serviceCategories.value.length === 0) {
      console.warn('[MediaPage] No service categories found in database');
    }
  } catch (error: any) {
    console.error('[MediaPage] Failed to load service categories', error);
    console.error('[MediaPage] Error details:', error.response?.data || error.message);
    toast.error('Failed to load service categories: ' + (error.response?.data?.error || error.message));
    // Fallback to empty array
    serviceCategories.value = [];
  } finally {
    loadingCategories.value = false;
  }
}

onMounted(() => {
  loadMedia();
  loadServiceCategories();
});
</script>

