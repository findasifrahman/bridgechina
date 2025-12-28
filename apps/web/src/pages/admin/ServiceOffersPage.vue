<template>
  <div>
    <PageHeader title="Service-Based Offers">
      <template #actions>
        <Button variant="primary" @click="openModal()">Add Service Offer</Button>
      </template>
    </PageHeader>

    <Card class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Service Offers</h3>
          <div class="text-sm text-slate-500">
            {{ offers.length }} offer{{ offers.length !== 1 ? 's' : '' }}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleSearch" />
        <div v-if="loading" class="text-center py-8">
          <SkeletonLoader class="h-32" />
        </div>
        <div v-else-if="filteredOffers.length === 0" class="text-center py-8 text-slate-500">
          No service offers found. Click "Add Service Offer" to create one.
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="offer in filteredOffers"
            :key="offer.id"
            class="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-start space-x-4 flex-1">
                <img
                  v-if="offer.coverAsset?.thumbnail_url || offer.coverAsset?.public_url"
                  :src="offer.coverAsset?.thumbnail_url || offer.coverAsset?.public_url"
                  :alt="offer.title"
                  class="w-20 h-20 object-cover rounded"
                />
                <div v-else class="w-20 h-20 bg-slate-200 rounded flex items-center justify-center">
                  <Tag class="h-8 w-8 text-slate-400" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-semibold text-slate-900">{{ offer.title }}</h4>
                    <Badge :variant="getServiceTypeBadge(offer.service_type)">
                      {{ getServiceTypeLabel(offer.service_type) }}
                    </Badge>
                    <Badge :variant="offer.is_active ? 'success' : 'default'">
                      {{ offer.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                  </div>
                  <div class="text-sm text-slate-600 mb-2">
                    <span class="font-semibold text-teal-600">
                      {{ offer.offer_type === 'percentage' ? `${offer.value}% OFF` : `¥${offer.value} OFF` }}
                    </span>
                    <span v-if="offer.currency && offer.offer_type === 'fixed_amount'" class="ml-1">
                      ({{ offer.currency }})
                    </span>
                  </div>
                  <p v-if="offer.description" class="text-sm text-slate-600 mb-2 line-clamp-2">
                    {{ offer.description }}
                  </p>
                  <div class="flex items-center gap-4 text-xs text-slate-500">
                    <span v-if="offer.valid_from || offer.valid_until">
                      Valid: {{ formatDateRange(offer.valid_from, offer.valid_until) }}
                    </span>
                    <span v-if="offer.usage_limit">
                      Usage: {{ offer.usage_count }}/{{ offer.usage_limit }}
                    </span>
                    <span v-if="offer.min_purchase_amount">
                      Min purchase: ¥{{ offer.min_purchase_amount }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <Button variant="ghost" size="sm" @click="openModal(offer)">Edit</Button>
                <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDelete(offer)">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Add/Edit Modal -->
    <Modal v-model="showModal" :title="editingOffer ? 'Edit Service Offer' : 'Add Service Offer'" size="lg">
      <form @submit.prevent="saveOffer" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Service Type *</label>
          <Select
            v-model="form.service_type"
            :options="serviceTypeOptions"
            :disabled="!!editingOffer"
            required
          />
          <p class="text-xs text-slate-500 mt-1">Only one offer per service type allowed</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Offer Type *</label>
            <Select
              v-model="form.offer_type"
              :options="offerTypeOptions"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              {{ form.offer_type === 'percentage' ? 'Discount Percentage *' : 'Discount Amount *' }}
            </label>
            <Input
              v-model.number="form.value"
              type="number"
              :step="form.offer_type === 'percentage' ? 1 : 0.01"
              :min="0"
              :max="form.offer_type === 'percentage' ? 100 : undefined"
              required
            />
          </div>
        </div>

        <div v-if="form.offer_type === 'fixed_amount'" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <Select
              v-model="form.currency"
              :options="currencyOptions"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Max Discount Amount</label>
            <Input
              v-model.number="form.max_discount_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional"
            />
          </div>
        </div>

        <div v-if="form.offer_type === 'percentage'">
          <label class="block text-sm font-medium text-slate-700 mb-1">Max Discount Amount</label>
          <Input
            v-model.number="form.max_discount_amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Optional - cap the maximum discount"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Title *</label>
          <Input v-model="form.title" required placeholder="e.g., 15% Off Hotel Bookings" />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <Textarea
            v-model="form.description"
            :rows="3"
            placeholder="Offer description..."
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
          <Textarea
            v-model="form.terms_and_conditions"
            :rows="3"
            placeholder="Terms and conditions..."
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
            <Input
              v-model="form.valid_from"
              type="datetime-local"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
            <Input
              v-model="form.valid_until"
              type="datetime-local"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Min Purchase Amount</label>
            <Input
              v-model.number="form.min_purchase_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Usage Limit</label>
            <Input
              v-model.number="form.usage_limit"
              type="number"
              min="0"
              placeholder="Optional - max uses"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Cover Image</label>
          <MultiImagePicker
            v-model="form.image_ids"
            :available-assets="mediaAssets"
          />
          <p class="text-xs text-slate-500 mt-1">First image will be used as cover</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Gallery Images</label>
          <MultiImagePicker
            v-model="form.gallery_image_ids"
            :available-assets="mediaAssets"
          />
        </div>

        <div class="flex items-center">
          <Checkbox v-model="form.is_active" />
          <label class="ml-2 text-sm text-slate-700">Active</label>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="ghost" @click="closeModal">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Delete Service Offer"
      message="Are you sure you want to delete this service offer? This action cannot be undone."
      @confirm="deleteOffer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Tag } from 'lucide-vue-next';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  Modal,
  Input,
  Textarea,
  Select,
  Checkbox,
  FilterBar,
  SkeletonLoader,
  MultiImagePicker,
  ConfirmDialog,
  useToast,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const offers = ref<any[]>([]);
const mediaAssets = ref<any[]>([]);
const searchQuery = ref('');
const showModal = ref(false);
const showDeleteDialog = ref(false);
const editingOffer = ref<any>(null);
const offerToDelete = ref<any>(null);

const serviceTypeOptions = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'food_item', label: 'Food Item' },
  { value: 'esim_plan', label: 'eSIM Plan' },
  { value: 'transport', label: 'Transport / Pickup' },
  { value: 'tour', label: 'Tour' },
  { value: 'product', label: 'Product' },
  { value: 'guide', label: 'Guide' },
  { value: 'medical', label: 'Medical' },
];

const offerTypeOptions = [
  { value: 'percentage', label: 'Percentage Discount' },
  { value: 'fixed_amount', label: 'Fixed Amount Discount' },
];

const currencyOptions = [
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
];

const form = ref({
  service_type: '',
  offer_type: 'percentage',
  value: 0,
  currency: 'CNY',
  title: '',
  description: '',
  terms_and_conditions: '',
  cover_asset_id: '',
  gallery_asset_ids: [],
  is_active: true,
  valid_from: '',
  valid_until: '',
  min_purchase_amount: '' as number | string,
  max_discount_amount: '' as number | string,
  usage_limit: '' as number | string,
  image_ids: [] as string[],
  gallery_image_ids: [] as string[],
});

const filteredOffers = computed(() => {
  if (!searchQuery.value) return offers.value;
  const query = searchQuery.value.toLowerCase();
  return offers.value.filter(
    (offer) =>
      offer.title.toLowerCase().includes(query) ||
      offer.service_type.toLowerCase().includes(query) ||
      offer.description?.toLowerCase().includes(query)
  );
});

function getServiceTypeLabel(type: string): string {
  const option = serviceTypeOptions.find((opt) => opt.value === type);
  return option?.label || type;
}

function getServiceTypeBadge(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<string, any> = {
    hotel: 'primary',
    restaurant: 'success',
    food_item: 'accent',
    esim_plan: 'secondary',
    transport: 'info',
    tour: 'warning',
    product: 'primary',
    guide: 'info',
    medical: 'danger',
  };
  return map[type] || 'default';
}

function formatDateRange(from: string | Date | null, until: string | Date | null): string {
  if (!from && !until) return 'No expiry';
  const formatDate = (date: string | Date | null) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  if (from && until) return `${formatDate(from)} - ${formatDate(until)}`;
  if (from) return `From ${formatDate(from)}`;
  if (until) return `Until ${formatDate(until)}`;
  return '';
}

async function loadOffers() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/service-offers');
    offers.value = response.data || [];
  } catch (error) {
    console.error('Failed to load service offers', error);
    toast.error('Failed to load service offers');
  } finally {
    loading.value = false;
  }
}

async function loadMediaAssets() {
  try {
    const response = await axios.get('/api/admin/media?limit=1000');
    mediaAssets.value = Array.isArray(response.data.media) ? response.data.media : [];
    
    // Add existing images from editing offer to available assets if not already present
    if (editingOffer.value) {
      const imagesToAdd: any[] = [];
      
      if (editingOffer.value.coverAsset) {
        const exists = mediaAssets.value.find((a: any) => a.id === editingOffer.value.coverAsset.id);
        if (!exists) {
          imagesToAdd.push({
            id: editingOffer.value.coverAsset.id,
            public_url: editingOffer.value.coverAsset.public_url,
            thumbnail_url: editingOffer.value.coverAsset.thumbnail_url,
            r2_key: editingOffer.value.coverAsset.r2_key,
            category: editingOffer.value.coverAsset.category,
            tags: editingOffer.value.coverAsset.tags || [],
          });
        }
      }
      
      if (editingOffer.value.galleryAssets && Array.isArray(editingOffer.value.galleryAssets)) {
        editingOffer.value.galleryAssets.forEach((asset: any) => {
          const exists = mediaAssets.value.find((a: any) => a.id === asset.id);
          if (!exists) {
            imagesToAdd.push({
              id: asset.id,
              public_url: asset.public_url,
              thumbnail_url: asset.thumbnail_url,
              r2_key: asset.r2_key,
              category: asset.category,
              tags: asset.tags || [],
            });
          }
        });
      }
      
      if (imagesToAdd.length > 0) {
        mediaAssets.value = [...mediaAssets.value, ...imagesToAdd];
      }
    }
  } catch (error) {
    console.error('Failed to load media assets', error);
    toast.error('Failed to load media assets');
  }
}

function handleSearch(query: string) {
  searchQuery.value = query;
}

async function openModal(offer?: any) {
  editingOffer.value = offer || null;
  await loadMediaAssets(); // Load media assets before opening modal
  if (offer) {
    form.value = {
      service_type: offer.service_type,
      offer_type: offer.offer_type,
      value: offer.value,
      currency: offer.currency || 'CNY',
      title: offer.title,
      description: offer.description || '',
      terms_and_conditions: offer.terms_and_conditions || '',
      cover_asset_id: offer.cover_asset_id || '',
      gallery_asset_ids: (offer.gallery_asset_ids as string[]) || [],
      is_active: offer.is_active,
      valid_from: offer.valid_from ? new Date(offer.valid_from).toISOString().slice(0, 16) : '',
      valid_until: offer.valid_until ? new Date(offer.valid_until).toISOString().slice(0, 16) : '',
      min_purchase_amount: offer.min_purchase_amount ?? '',
      max_discount_amount: offer.max_discount_amount ?? '',
      usage_limit: offer.usage_limit ?? '',
      image_ids: offer.cover_asset_id ? [offer.cover_asset_id] : [],
      gallery_image_ids: (offer.gallery_asset_ids as string[]) || [],
    };
  } else {
    form.value = {
      service_type: '',
      offer_type: 'percentage',
      value: 0,
      currency: 'CNY',
      title: '',
      description: '',
      terms_and_conditions: '',
      cover_asset_id: '',
      gallery_asset_ids: [],
      is_active: true,
      valid_from: '',
      valid_until: '',
      min_purchase_amount: '',
      max_discount_amount: '',
      usage_limit: '',
      image_ids: [],
      gallery_image_ids: [],
    };
  }
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingOffer.value = null;
  offerToDelete.value = null;
}

async function saveOffer() {
  saving.value = true;
  try {
    const payload: any = {
      service_type: form.value.service_type,
      offer_type: form.value.offer_type,
      value: form.value.value,
      currency: form.value.currency,
      title: form.value.title,
      description: form.value.description,
      terms_and_conditions: form.value.terms_and_conditions,
      is_active: form.value.is_active,
      valid_from: form.value.valid_from || null,
      valid_until: form.value.valid_until || null,
      min_purchase_amount: form.value.min_purchase_amount === '' || form.value.min_purchase_amount === null ? null : Number(form.value.min_purchase_amount),
      max_discount_amount: form.value.max_discount_amount === '' || form.value.max_discount_amount === null ? null : Number(form.value.max_discount_amount),
      usage_limit: form.value.usage_limit === '' || form.value.usage_limit === null ? null : Number(form.value.usage_limit),
      image_ids: form.value.image_ids.length > 0 
        ? [...form.value.image_ids, ...form.value.gallery_image_ids]
        : form.value.gallery_image_ids.length > 0 
          ? form.value.gallery_image_ids 
          : [],
    };

    if (editingOffer.value) {
      await axios.put(`/api/admin/service-offers/${editingOffer.value.id}`, payload);
      toast.success('Service offer updated successfully');
    } else {
      await axios.post('/api/admin/service-offers', payload);
      toast.success('Service offer created successfully');
    }

    closeModal();
    await loadOffers();
  } catch (error: any) {
    console.error('Failed to save service offer', error);
    const errorMsg = error.response?.data?.error || 'Failed to save service offer';
    toast.error(errorMsg);
  } finally {
    saving.value = false;
  }
}

function confirmDelete(offer: any) {
  offerToDelete.value = offer;
  showDeleteDialog.value = true;
}

async function deleteOffer() {
  if (!offerToDelete.value) return;
  try {
    await axios.delete(`/api/admin/service-offers/${offerToDelete.value.id}`);
    toast.success('Service offer deleted successfully');
    await loadOffers();
  } catch (error) {
    console.error('Failed to delete service offer', error);
    toast.error('Failed to delete service offer');
  } finally {
    showDeleteDialog.value = false;
    offerToDelete.value = null;
  }
}

onMounted(() => {
  loadOffers();
  loadMediaAssets();
});
</script>

