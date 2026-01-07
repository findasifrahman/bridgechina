<template>
  <div class="space-y-6">
    <PageHeader title="Featured Items Management" subtitle="Select featured items for each service type (limits: Hotels 8, Restaurants 4, Food 8, eSIM 4, Places 8, Tours 4, Shopping 8, Transport 4)">
      <template #actions>
        <Button variant="primary" @click="showAddModal = true">Add Featured Item</Button>
      </template>
    </PageHeader>

    <!-- Current Featured Items by Type -->
    <div class="space-y-6">
      <Card v-for="typeInfo in entityTypes" :key="typeInfo.value">
        <CardHeader>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">{{ typeInfo.label }} ({{ getFeaturedCountByType(typeInfo.value) }}/{{ typeInfo.limit }})</h3>
            <Badge :variant="getFeaturedCountByType(typeInfo.value) >= typeInfo.limit ? 'warning' : 'success'">
              {{ getFeaturedCountByType(typeInfo.value) }}/{{ typeInfo.limit }}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="getFeaturedItemsByType(typeInfo.value).length === 0" class="text-center py-8 text-slate-500">
            No featured {{ typeInfo.label.toLowerCase() }} yet. Click "Add Featured Item" to get started.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(item, index) in getFeaturedItemsByType(typeInfo.value)"
              :key="item.id"
              class="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <div class="flex items-center space-x-4 flex-1">
                <div class="text-sm font-medium text-slate-500 w-8">{{ index + 1 }}</div>
                <img
                  v-if="item.entity?.coverAsset?.public_url"
                  :src="item.entity.coverAsset.public_url"
                  :alt="item.entity.name || item.entity.title"
                  class="w-16 h-16 object-cover rounded"
                />
                <div v-else class="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                  <ImageIcon class="h-6 w-6 text-slate-400" />
                </div>
                <div class="flex-1">
                  <div class="font-semibold">
                    {{ item.title_override || item.entity?.name || item.entity?.title || 'N/A' }}
                  </div>
                  <div class="text-sm text-slate-600">
                    {{ item.subtitle_override || getEntitySubtitle(item) }}
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <Badge :variant="item.is_active ? 'success' : 'default'">
                      {{ item.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <Button variant="ghost" size="sm" @click="openEditModal(item)">Edit</Button>
                <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDelete(item)">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-model="showAddModal" :title="editingItem ? 'Edit Featured Item' : 'Add Featured Item'" size="lg">
      <form @submit.prevent="saveFeaturedItem" class="space-y-4">
        <Select
          v-model="form.entity_type"
          :options="entityTypeOptions"
          label="Item Type"
          required
          :disabled="!!editingItem"
        />
        <Select
          v-if="form.entity_type"
          v-model="form.entity_id"
          :options="entityOptions"
          label="Select Item"
          required
          :disabled="!!editingItem"
          :loading="loadingEntities"
        />
        <Input
          v-model="form.title_override"
          label="Custom Title (optional)"
          placeholder="Leave empty to use item's default title"
        />
        <Input
          v-model="form.subtitle_override"
          label="Custom Subtitle (optional)"
          placeholder="Leave empty to use item's default subtitle"
        />
        <Input
          v-model.number="form.sort_order"
          label="Sort Order"
          type="number"
          min="0"
        />
        <div class="flex items-center space-x-2">
          <Checkbox v-model="form.is_active" label="Active" />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="closeModal">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Delete Featured Item"
      :message="`Are you sure you want to remove this featured item?`"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Checkbox,
  ConfirmDialog,
} from '@bridgechina/ui';
import { ImageIcon } from 'lucide-vue-next';

const toast = useToast();

const featuredItems = ref<any[]>([]);
const showAddModal = ref(false);
const showDeleteConfirm = ref(false);
const editingItem = ref<any>(null);
const saving = ref(false);
const loadingEntities = ref(false);
const deleteItem = ref<any>(null);

const entityTypeOptions = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'food_item', label: 'Food Item' },
  { value: 'cityplace', label: 'City Place' },
  { value: 'tour', label: 'Tour' },
  { value: 'esim_plan', label: 'eSIM Plan' },
  { value: 'product', label: 'Product' },
  { value: 'transport', label: 'Transport' },
];

const entityTypes = [
  { value: 'hotel', label: 'Hotels', limit: 8 },
  { value: 'restaurant', label: 'Restaurants', limit: 4 },
  { value: 'food_item', label: 'Food Items', limit: 8 },
  { value: 'esim_plan', label: 'eSIM Plans', limit: 4 },
  { value: 'cityplace', label: 'City Places', limit: 8 },
  { value: 'tour', label: 'Tours', limit: 4 },
  { value: 'product', label: 'Products', limit: 8 },
  { value: 'transport', label: 'Transport', limit: 4 },
];

const entityOptions = ref<any[]>([]);

const form = ref({
  entity_type: '',
  entity_id: '',
  title_override: '',
  subtitle_override: '',
  sort_order: 0,
  is_active: true,
});

// Watch entity_type to load entities
watch(() => form.value.entity_type, async (newType) => {
  if (!newType) {
    entityOptions.value = [];
    return;
  }
  await loadEntities(newType);
});

async function loadEntities(type: string) {
  loadingEntities.value = true;
  try {
    let endpoint = '';
    switch (type) {
      case 'hotel':
        endpoint = '/api/admin/catalog/hotels';
        break;
      case 'restaurant':
        endpoint = '/api/admin/catalog/restaurants';
        break;
      case 'food_item':
        endpoint = '/api/admin/catalog/food-items';
        break;
      case 'cityplace':
        endpoint = '/api/admin/catalog/cityplaces';
        break;
      case 'tour':
        endpoint = '/api/admin/catalog/tours';
        break;
      case 'esim_plan':
        endpoint = '/api/admin/esim/plans';
        break;
      case 'product':
        endpoint = '/api/admin/catalog/products';
        break;
      case 'transport':
        endpoint = '/api/admin/catalog/transport';
        break;
    }
    if (endpoint) {
      const response = await axios.get(endpoint);
      const data = response.data?.data || response.data || [];
      entityOptions.value = data.map((item: any) => ({
        value: item.id,
        label: item.name || item.title || `${type} #${item.id.slice(0, 8)}`,
      }));
    }
  } catch (error) {
    console.error('Failed to load entities', error);
    toast.error('Failed to load items');
  } finally {
    loadingEntities.value = false;
  }
}

async function loadFeaturedItems() {
  try {
    const response = await axios.get('/api/admin/featured-items');
    featuredItems.value = response.data || [];
  } catch (error) {
    console.error('Failed to load featured items', error);
    toast.error('Failed to load featured items');
  }
}

function getEntitySubtitle(item: any): string {
  if (!item.entity) return '';
  switch (item.entity_type) {
    case 'hotel':
      return `${item.entity.city?.name || ''} • ¥${item.entity.price_from || 'N/A'}`;
    case 'restaurant':
      return `${item.entity.city?.name || ''} • ${item.entity.cuisine_type || ''}`;
    case 'food_item':
      return `${item.entity.restaurant?.name || ''} • ¥${item.entity.price || 'N/A'}`;
    case 'cityplace':
      return `${item.entity.city?.name || ''}`;
    case 'tour':
      return `${item.entity.city?.name || ''} • ¥${item.entity.price_from || 'N/A'}`;
    case 'esim_plan':
      return `${item.entity.data_text || ''} • ¥${item.entity.price || 'N/A'}`;
    case 'product':
      return `${item.entity.category?.name || ''} • ¥${item.entity.price || 'N/A'}`;
    case 'transport':
      return `${item.entity.city?.name || ''} • ¥${item.entity.base_price || 'N/A'}`;
    default:
      return '';
  }
}

function getEntityTypeBadge(type: string): 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' {
  const map: Record<string, any> = {
    hotel: 'primary',
    restaurant: 'success',
    food_item: 'accent',
    cityplace: 'info',
    tour: 'warning',
    esim_plan: 'secondary',
    product: 'primary',
    transport: 'info',
  };
  return map[type] || 'default';
}

function getFeaturedItemsByType(type: string) {
  return featuredItems.value.filter(item => item.entity_type === type);
}

function getFeaturedCountByType(type: string) {
  return getFeaturedItemsByType(type).length;
}

function openEditModal(item: any) {
  editingItem.value = item;
  form.value = {
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    title_override: item.title_override || '',
    subtitle_override: item.subtitle_override || '',
    sort_order: item.sort_order || 0,
    is_active: item.is_active,
  };
  showAddModal.value = true;
}

function closeModal() {
  showAddModal.value = false;
  editingItem.value = null;
  form.value = {
    entity_type: '',
    entity_id: '',
    title_override: '',
    subtitle_override: '',
    sort_order: 0,
    is_active: true,
  };
}

async function saveFeaturedItem() {
  saving.value = true;
  try {
    if (editingItem.value) {
      await axios.put(`/api/admin/featured-items/${editingItem.value.id}`, form.value);
      toast.success('Featured item updated');
    } else {
      await axios.post('/api/admin/featured-items', form.value);
      toast.success('Featured item added');
    }
    closeModal();
    await loadFeaturedItems();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save featured item');
  } finally {
    saving.value = false;
  }
}

function confirmDelete(item: any) {
  deleteItem.value = item;
  showDeleteConfirm.value = true;
}

async function executeDelete() {
  if (!deleteItem.value) return;
  try {
    await axios.delete(`/api/admin/featured-items/${deleteItem.value.id}`);
    toast.success('Featured item deleted');
    await loadFeaturedItems();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete featured item');
  } finally {
    deleteItem.value = null;
    showDeleteConfirm.value = false;
  }
}

onMounted(loadFeaturedItems);
</script>










