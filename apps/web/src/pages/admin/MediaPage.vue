<template>
  <div>
    <PageHeader title="Media Library">
      <template #actions>
        <Button variant="primary" @click="showUploadModal = true">Upload Image</Button>
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

    <FilterBar @search="handleSearch" />
    <Card>
      <CardBody>
        <div v-if="filteredMedia.length === 0" class="text-center py-12">
          <p class="text-slate-600 mb-4">No media found</p>
          <Button variant="primary" @click="showUploadModal = true">Upload Image</Button>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div
            v-for="item in filteredMedia"
            :key="item.id"
            class="relative group cursor-pointer"
            @click="selectMedia(item)"
          >
            <img
              :src="item.public_url"
              :alt="item.r2_key"
              class="w-full h-32 object-cover rounded-lg border border-slate-200"
            />
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-opacity flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="copyUrl(item.public_url)"
              >
                Copy URL
              </Button>
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
    <Modal v-model="showUploadModal" title="Upload Image">
      <div class="space-y-4">
        <Input
          ref="fileInput"
          type="file"
          accept="image/*"
          label="Select Image"
          @change="handleFileSelect"
        />
        <div v-if="selectedFile" class="space-y-2">
          <p class="text-sm text-slate-600">File: {{ selectedFile.name }}</p>
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="Preview"
            class="w-full h-48 object-contain border border-slate-200 rounded-lg"
          />
        </div>
        <div class="flex justify-end gap-3">
          <Button variant="ghost" @click="showUploadModal = false">Cancel</Button>
          <Button
            variant="primary"
            :loading="uploading"
            :disabled="!selectedFile"
            @click="handleUpload"
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardBody, Button, Modal, Input, MediaPickerModal, FilterBar, Pagination } from '@bridgechina/ui';

const media = ref<any[]>([]);
const searchQuery = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const showUploadModal = ref(false);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string>('');
const uploading = ref(false);
const r2NotConfigured = ref(false);
const toast = useToast();

const filteredMedia = computed(() => {
  if (!searchQuery.value) return media.value;
  const query = searchQuery.value.toLowerCase();
  return media.value.filter((item) =>
    item.r2_key.toLowerCase().includes(query)
  );
});

async function loadMedia() {
  try {
    const params: any = { page: currentPage.value, limit: 24 };
    if (searchQuery.value) params.search = searchQuery.value;
    const response = await axios.get('/api/admin/media', { params });
    if (Array.isArray(response.data)) {
      media.value = response.data;
      totalPages.value = Math.ceil(response.data.length / 24);
    } else {
      media.value = response.data.media || response.data;
      totalPages.value = response.data.totalPages || Math.ceil((response.data.total || 0) / 24);
    }
  } catch (error: any) {
    if (error.response?.status === 500 && error.response?.data?.error?.includes('R2')) {
      r2NotConfigured.value = true;
    }
    console.error('Failed to load media');
  }

}

function handleSearch(query: string) {
  searchQuery.value = query;
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
  if (file) {
    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
}

async function handleUpload() {
  if (!selectedFile.value) return;
  
  uploading.value = true;
  try {
    // Get presigned URL
    const presignedRes = await axios.post('/api/admin/media/presigned-url', {
      filename: selectedFile.value.name,
      mimeType: selectedFile.value.type,
    });

    if (!presignedRes.data.uploadUrl || presignedRes.data.uploadUrl.includes('example.com')) {
      r2NotConfigured.value = true;
      toast.warning('R2 not configured. Please set R2 credentials in .env');
      uploading.value = false;
      return;
    }

    // Upload to R2
    await fetch(presignedRes.data.uploadUrl, {
      method: 'PUT',
      body: selectedFile.value,
      headers: {
        'Content-Type': selectedFile.value.type,
      },
    });

    // Record in database
    await axios.post('/api/admin/media/record', {
      r2_key: presignedRes.data.key,
      public_url: presignedRes.data.publicUrl,
      mime_type: selectedFile.value.type,
      size: selectedFile.value.size,
    });

    toast.success('Image uploaded successfully');
    showUploadModal.value = false;
    selectedFile.value = null;
    previewUrl.value = '';
    await loadMedia();
  } catch (error: any) {
    toast.error('Failed to upload image');
    console.error('Upload error', error);
  } finally {
    uploading.value = false;
  }
}

function selectMedia(item: any) {
  copyUrl(item.public_url);
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url);
  toast.success('URL copied to clipboard');
}

onMounted(loadMedia);
</script>

