<template>
  <div>
    <PageHeader title="Service Providers">
      <template #actions>
        <Button variant="primary" @click="showCreateModal = true">New Service Provider</Button>
      </template>
    </PageHeader>
    <Card>
      <CardBody>
        <Table :columns="columns">
          <tr v-for="provider in providers" :key="provider.id">
            <td class="px-6 py-4 whitespace-nowrap">
              {{ provider.user?.email || provider.user?.phone || 'N/A' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex gap-1 flex-wrap">
                <Badge
                  v-for="cat in (provider.categories as string[]) || []"
                  :key="cat"
                  variant="default"
                >
                  {{ cat }}
                </Badge>
                <span v-if="!provider.categories || (provider.categories as string[]).length === 0" class="text-slate-400 text-sm">No categories</span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              {{ provider.city?.name || 'All Cities' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <Badge :variant="provider.is_active ? 'success' : 'default'">
                {{ provider.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex gap-2">
                <Button variant="ghost" size="sm" @click="editProvider(provider)">Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="text-red-600 hover:text-red-700"
                  @click="confirmDelete(provider)"
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        </Table>
        <EmptyState
          v-if="providers.length === 0 && !loading"
          title="No service providers"
          description="Service providers will appear here"
        />
      </CardBody>
    </Card>

    <!-- Create/Edit Modal -->
    <Modal v-model="showCreateModal" :title="editingProvider ? 'Edit Service Provider' : 'Create Service Provider'">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <Select
          v-model="form.userId"
          label="User"
          :options="userOptions"
          :disabled="editingProvider !== null"
          required
        />
        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-700">Categories</label>
          <div class="space-y-2">
            <Checkbox
              v-for="cat in categoryOptions"
              :key="cat.value"
              :id="`cat-${cat.value}`"
              :model-value="form.categories.includes(cat.value)"
              :label="cat.label"
              @update:model-value="toggleCategory(cat.value)"
            />
          </div>
        </div>
        <Select
          v-model="form.cityId"
          label="City (Optional)"
          :options="cityOptions"
        />
        <div class="flex items-center gap-2">
          <Checkbox
            id="is-active"
            v-model="form.isActive"
            label="Active"
          />
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showCreateModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardBody,
  Table,
  Button,
  Badge,
  Modal,
  Select,
  Checkbox,
  EmptyState,
} from '@bridgechina/ui';

const providers = ref<any[]>([]);
const users = ref<any[]>([]);
const cities = ref<any[]>([]);
const showCreateModal = ref(false);
const editingProvider = ref<any>(null);
const saving = ref(false);
const loading = ref(false);
const toast = useToast();

const form = ref({
  userId: '',
  categories: [] as string[],
  cityId: '',
  isActive: true,
});

const categoryOptions = [
  { value: 'transport', label: 'Transport' },
  { value: 'tours', label: 'Tours' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'shopping', label: 'Shopping' },
];

const columns = [
  { key: 'user', label: 'User' },
  { key: 'categories', label: 'Categories' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
];

async function loadProviders() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/service-providers');
    providers.value = response.data;
  } catch (error) {
    console.error('Failed to load service providers:', error);
    toast.error('Failed to load service providers');
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  try {
    const response = await axios.get('/api/admin/users');
    users.value = response.data;
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data.filter((c: any) => c.is_active);
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
}

const userOptions = computed(() => {
  return users.value
    .filter((u: any) => u.roles?.some((ur: any) => ur.role?.name === 'SERVICE_PROVIDER'))
    .map((u: any) => ({
      value: u.id,
      label: u.email || u.phone || 'Unknown',
    }));
});

const cityOptions = computed(() => {
  return [
    { value: '', label: 'All Cities' },
    ...cities.value.map((c: any) => ({
      value: c.id,
      label: c.name,
    })),
  ];
});

function toggleCategory(category: string) {
  const index = form.value.categories.indexOf(category);
  if (index > -1) {
    form.value.categories.splice(index, 1);
  } else {
    form.value.categories.push(category);
  }
}

function editProvider(provider: any) {
  editingProvider.value = provider;
  form.value = {
    userId: provider.user_id,
    categories: (provider.categories as string[]) || [],
    cityId: provider.city_id || '',
    isActive: provider.is_active,
  };
  showCreateModal.value = true;
}

function confirmDelete(provider: any) {
  if (confirm(`Delete service provider for ${provider.user?.email || provider.user?.phone}?`)) {
    handleDelete(provider.id);
  }
}

async function handleDelete(id: string) {
  try {
    await axios.delete(`/api/admin/service-providers/${id}`);
    toast.success('Service provider deleted');
    await loadProviders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete service provider');
  }
}

async function handleSubmit() {
  saving.value = true;
  try {
    const payload: any = {
      user_id: form.value.userId,
      categories: form.value.categories,
      is_active: form.value.isActive,
    };
    if (form.value.cityId) {
      payload.city_id = form.value.cityId;
    }

    if (editingProvider.value) {
      await axios.put(`/api/admin/service-providers/${editingProvider.value.id}`, payload);
      toast.success('Service provider updated');
    } else {
      await axios.post('/api/admin/service-providers', payload);
      toast.success('Service provider created');
    }

    showCreateModal.value = false;
    editingProvider.value = null;
    form.value = {
      userId: '',
      categories: [],
      cityId: '',
      isActive: true,
    };
    await loadProviders();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save service provider');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadProviders(), loadUsers(), loadCities()]);
});
</script>


