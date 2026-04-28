<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Homepage Featured Deals</h1>
        <p class="mt-1 text-sm text-slate-600">Manage the image-backed offers shown in the shopping sidebar</p>
      </div>
      <div class="flex gap-2">
        <Button variant="ghost" @click="router.push('/admin/homepage')">Banners</Button>
        <Button variant="primary" @click="openAddModal">
          <Plus class="mr-2 h-4 w-4" />
          Add Offer
        </Button>
      </div>
    </div>

    <Card v-if="loading">
      <CardBody>
        <div class="py-8 text-center">
          <SkeletonLoader class="mb-4 h-32" />
          <SkeletonLoader class="h-32" />
        </div>
      </CardBody>
    </Card>

    <div v-else-if="offers.length === 0" class="py-12 text-center">
      <EmptyState title="No offers yet" description="Create a featured deal to display in the shopping sidebar">
        <template #action>
          <Button variant="primary" @click="openAddModal">Add First Offer</Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="space-y-4">
      <Card v-for="offer in offers" :key="offer.id" class="transition-shadow hover:shadow-md">
        <CardBody class="p-6">
          <div class="flex items-start gap-6">
            <div class="relative h-32 w-64 shrink-0 overflow-hidden rounded-lg">
              <div
                v-if="offer.coverAsset?.public_url || offer.coverAsset?.thumbnail_url"
                class="absolute inset-0 bg-cover bg-center"
                :style="{ backgroundImage: `url(${offer.coverAsset?.thumbnail_url || offer.coverAsset?.public_url})` }"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-teal-900/70 to-amber-900/70" />
              </div>
              <div v-else class="absolute inset-0 bg-gradient-to-r from-teal-500 to-amber-400" />
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="px-4 text-center text-white">
                  <p class="line-clamp-1 text-sm font-semibold drop-shadow-lg">{{ offer.title }}</p>
                </div>
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-2 flex items-start justify-between">
                <div>
                  <h3 class="mb-1 text-lg font-semibold text-slate-900">{{ offer.title }}</h3>
                  <p v-if="offer.subtitle" class="mb-2 line-clamp-2 text-sm text-slate-600">{{ offer.subtitle }}</p>
                  <p v-if="offer.description" class="mb-2 line-clamp-2 text-sm text-slate-500">{{ offer.description }}</p>
                  <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{{ offer.offer_type }}</span>
                    <span v-if="offer.value !== null && offer.value !== undefined">
                      {{ offer.offer_type === 'percentage' ? `${offer.value}%` : `${offer.currency || 'BDT'} ${offer.value}` }}
                    </span>
                    <span v-if="offer.link">Link: {{ offer.link }}</span>
                    <span>Order: {{ offer.sort_order }}</span>
                    <Badge :variant="offer.is_active ? 'success' : 'default'">
                      {{ offer.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" @click="openEditModal(offer)">
                <Edit class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" @click="confirmDelete(offer)">
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <Modal v-model="showModal" :title="editingOffer ? 'Edit Featured Deal' : 'Add Featured Deal'" size="lg">
      <form class="space-y-4 max-h-[85vh] overflow-y-auto pr-1" @submit.prevent="saveOffer">
        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="form.title" label="Title *" placeholder="Featured deal title" required />
          <Select v-model="form.offer_type" label="Offer type" :options="offerTypeOptions" />
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="form.subtitle" label="Subtitle" placeholder="Short supporting line" />
          <Input v-model="form.link" label="Link URL" placeholder="/shopping or /shopping/item/123" />
        </div>

        <Textarea v-model="form.description" label="Description" :rows="3" placeholder="Deal description shown in the rail" />

        <div class="grid gap-4 xl:grid-cols-4">
          <Input v-model.number="form.value" type="number" label="Value" placeholder="10" />
          <Select v-model="form.currency" label="Currency" :options="currencyOptions" />
          <Input v-model.number="form.sort_order" type="number" label="Sort order" placeholder="0" />
          <div class="flex items-end">
            <Checkbox v-model="form.is_active" label="Active" />
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="form.valid_from" type="datetime-local" label="Valid from" />
          <Input v-model="form.valid_until" type="datetime-local" label="Valid until" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Offer image</label>
          <div class="space-y-2">
            <div v-if="form.cover_asset_id && selectedAsset" class="relative h-36 w-full overflow-hidden rounded-lg border border-slate-200">
              <img
                :src="selectedAsset.thumbnail_url || selectedAsset.public_url"
                :alt="selectedAsset.title || 'Offer image'"
                class="h-full w-full object-cover"
              />
              <Button variant="ghost" size="sm" class="absolute right-2 top-2 bg-white/90 hover:bg-white" @click="form.cover_asset_id = ''">
                <X class="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" type="button" @click="showImagePicker = true">
              <ImageIcon class="mr-2 h-4 w-4" />
              {{ form.cover_asset_id ? 'Change Image' : 'Select Image' }}
            </Button>
          </div>
          <MediaPickerModal
            v-model="showImagePicker"
            :assets="mediaAssets"
            :multiple="false"
            @select="handleImageSelected"
          />
          <p class="mt-1 text-xs text-slate-500">Use a wide banner-style image for the featured deal card.</p>
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="ghost" type="button" @click="closeModal">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save Offer</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  EmptyState,
  Input,
  MediaPickerModal,
  Modal,
  Select,
  SkeletonLoader,
  Textarea,
} from '@bridgechina/ui';
import { Edit, ImageIcon, Plus, Trash2, X } from 'lucide-vue-next';

const router = useRouter();
const toast = useToast();

const offers = ref<any[]>([]);
const mediaAssets = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const showImagePicker = ref(false);
const editingOffer = ref<any>(null);

const form = ref({
  title: '',
  subtitle: '',
  description: '',
  offer_type: 'promotion',
  value: '',
  currency: 'BDT',
  link: '',
  cover_asset_id: '',
  is_active: true,
  sort_order: 0,
  valid_from: '',
  valid_until: '',
});

const offerTypeOptions = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed', label: 'Fixed amount off' },
];

const currencyOptions = [
  { value: 'BDT', label: 'BDT' },
  { value: 'CNY', label: 'CNY' },
  { value: 'USD', label: 'USD' },
];

const selectedAsset = computed(() => {
  if (!form.value.cover_asset_id) return null;
  return mediaAssets.value.find((asset: any) => asset.id === form.value.cover_asset_id);
});

async function loadOffers() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/homepage/offers');
    offers.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load featured deals:', error);
    toast.error('Failed to load featured deals');
  } finally {
    loading.value = false;
  }
}

async function loadMediaAssets() {
  try {
    const response = await axios.get('/api/admin/media', { params: { limit: 500 } });
    mediaAssets.value = Array.isArray(response.data.media) ? response.data.media : [];
  } catch (error) {
    console.error('Failed to load media assets:', error);
    toast.error('Failed to load media assets');
  }
}

function resetForm() {
  form.value = {
    title: '',
    subtitle: '',
    description: '',
    offer_type: 'promotion',
    value: '',
    currency: 'BDT',
    link: '',
    cover_asset_id: '',
    is_active: true,
    sort_order: 0,
    valid_from: '',
    valid_until: '',
  };
}

function handleImageSelected(asset: { id: string; public_url: string; thumbnail_url?: string | null }) {
  form.value.cover_asset_id = asset.id;
  showImagePicker.value = false;
}

async function openAddModal() {
  editingOffer.value = null;
  resetForm();
  await loadMediaAssets();
  showModal.value = true;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function openEditModal(offer: any) {
  editingOffer.value = offer;
  form.value = {
    title: offer.title || '',
    subtitle: offer.subtitle || '',
    description: offer.description || '',
    offer_type: offer.offer_type || 'promotion',
    value: offer.value ?? '',
    currency: offer.currency || 'BDT',
    link: offer.link || '',
    cover_asset_id: offer.cover_asset_id || '',
    is_active: !!offer.is_active,
    sort_order: offer.sort_order || 0,
    valid_from: toDateTimeLocal(offer.valid_from),
    valid_until: toDateTimeLocal(offer.valid_until),
  };
  await loadMediaAssets();
  if (offer.coverAsset && !mediaAssets.value.find((a: any) => a.id === offer.coverAsset.id)) {
    mediaAssets.value.push(offer.coverAsset);
  }
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingOffer.value = null;
}

async function saveOffer() {
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      value: form.value.value === '' || form.value.value === null ? undefined : Number(form.value.value),
      sort_order: Number(form.value.sort_order || 0),
      valid_from: form.value.valid_from || undefined,
      valid_until: form.value.valid_until || undefined,
      subtitle: form.value.subtitle || undefined,
      description: form.value.description || undefined,
      link: form.value.link || undefined,
      cover_asset_id: form.value.cover_asset_id || undefined,
    };

    if (editingOffer.value) {
      await axios.put(`/api/admin/homepage/offers/${editingOffer.value.id}`, payload);
      toast.success('Featured deal updated');
    } else {
      await axios.post('/api/admin/homepage/offers', payload);
      toast.success('Featured deal created');
    }
    closeModal();
    await loadOffers();
  } catch (error: any) {
    console.error('Failed to save featured deal:', error);
    toast.error(error.response?.data?.error || 'Failed to save featured deal');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(offer: any) {
  if (!confirm(`Are you sure you want to delete "${offer.title}"?`)) return;
  try {
    await axios.delete(`/api/admin/homepage/offers/${offer.id}`);
    toast.success('Featured deal deleted');
    await loadOffers();
  } catch (error: any) {
    console.error('Failed to delete featured deal:', error);
    toast.error(error.response?.data?.error || 'Failed to delete featured deal');
  }
}

onMounted(() => {
  loadOffers();
});
</script>
