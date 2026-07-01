<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Homepage Visual Menu</h1>
        <p class="mt-1 text-sm text-slate-600">Manage the clickable category tiles shown below premium factory products.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="ghost" @click="router.push('/admin/homepage')">Banners</Button>
        <Button variant="ghost" @click="router.push('/admin/homepage-offers')">Featured Deals</Button>
        <Button variant="primary" @click="openAddModal">
          <Plus class="mr-2 h-4 w-4" />
          Add Tile
        </Button>
      </div>
    </div>

    <Card v-if="loading">
      <CardBody>
        <div class="space-y-4 py-6">
          <SkeletonLoader class="h-10 w-56" />
          <SkeletonLoader class="h-40" />
          <SkeletonLoader class="h-40" />
        </div>
      </CardBody>
    </Card>

    <div v-else-if="sections.length === 0" class="py-12 text-center">
      <EmptyState title="No tiles yet" description="Create the homepage visual menu tiles that link to category searches.">
        <template #action>
          <Button variant="primary" @click="openAddModal">Add First Tile</Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="space-y-6">
      <Card v-for="section in sections" :key="section.sectionKey" class="overflow-hidden">
        <CardBody class="p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-rose-400">Section</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-900">{{ section.sectionLabel }}</h2>
              <p class="text-sm text-slate-500">Key: {{ section.sectionKey }} | Tiles: {{ section.items.length }}</p>
            </div>
            <Button variant="ghost" size="sm" @click="openAddModal(section)">
              <Plus class="mr-2 h-4 w-4" />
              Add to section
            </Button>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article
              v-for="item in section.items"
              :key="item.id"
              class="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
            >
              <div class="aspect-[4/3] bg-slate-100">
                <img
                  v-if="item.imageUrl"
                  :src="proxyImageUrl(item.imageUrl)"
                  :alt="item.imageAlt || item.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                  <ImageIcon class="h-8 w-8" />
                </div>
              </div>
              <div class="space-y-2 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-900">{{ item.title }}</p>
                    <p class="truncate text-[11px] text-slate-500">{{ item.searchKeyword }}</p>
                  </div>
                  <Badge :variant="item.isActive ? 'success' : 'default'">
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </Badge>
                </div>
                <div class="flex flex-wrap gap-2 text-[10px] text-slate-500">
                  <span>Order {{ item.sortOrder }}</span>
                  <span>Section order {{ item.sectionSortOrder }}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" class="px-2" @click="previewTile(item)">
                    <Search class="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <div class="flex items-center gap-1">
                    <Button variant="ghost" size="sm" class="px-2" @click="openEditModal(item)">
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" class="px-2" @click="confirmDelete(item)">
                      <Trash2 class="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </CardBody>
      </Card>
    </div>

    <Modal v-model="showModal" :title="editingItem ? 'Edit Visual Menu Tile' : 'Add Visual Menu Tile'" size="lg">
      <form class="space-y-4 max-h-[85vh] overflow-y-auto pr-1" @submit.prevent="saveItem">
        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="form.section_key" label="Section key *" placeholder="mobile-accessories" required />
          <Input v-model="form.section_label" label="Section label *" placeholder="Mobile accessories" required />
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
          <Input v-model.number="form.section_sort_order" type="number" label="Section order" placeholder="1" />
          <Input v-model.number="form.sort_order" type="number" label="Tile order" placeholder="1" />
          <div class="flex items-end">
            <Checkbox v-model="form.is_active" label="Active" />
          </div>
          <div class="flex items-end">
            <Button variant="ghost" type="button" @click="fillCurrentSectionFromSelection">Use current section</Button>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="form.title" label="Tile title *" placeholder="Phone Cover" required />
          <Input v-model="form.search_keyword" label="Search keyword *" placeholder="phone case" required />
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="form.image_url" label="Image URL *" placeholder="https://..." required />
          <Input v-model="form.image_alt" label="Image alt text" placeholder="Phone cover image" />
        </div>

        <div v-if="form.image_url" class="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
          <img :src="proxyImageUrl(form.image_url)" :alt="form.image_alt || form.title" class="h-48 w-full object-cover" />
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="ghost" type="button" @click="closeModal">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save Tile</Button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-model="deleteConfirmOpen"
      title="Delete tile"
      :message="deleteConfirmMessage"
      confirm-text="Delete"
      confirm-variant="danger"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { buildImageProxyUrl } from '@/utils/api-url';
import { useToast } from '@bridgechina/ui';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  SkeletonLoader,
} from '@bridgechina/ui';
import { Edit, ImageIcon, Plus, Search, Trash2 } from 'lucide-vue-next';

const router = useRouter();
const toast = useToast();
const deleteConfirmOpen = ref(false);
const deleteTarget = ref<any>(null);

const items = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const editingItem = ref<any>(null);
const selectedSection = ref<any>(null);

const form = ref({
  section_key: '',
  section_label: '',
  section_sort_order: 0,
  title: '',
  search_keyword: '',
  image_url: '',
  image_alt: '',
  sort_order: 0,
  is_active: true,
});

const sections = computed(() => {
  const map = new Map<string, { sectionKey: string; sectionLabel: string; sectionSortOrder: number; items: any[] }>();
  for (const item of items.value) {
    const sectionKey = String(item.section_key || '').trim();
    if (!sectionKey) continue;
    if (!map.has(sectionKey)) {
      map.set(sectionKey, {
        sectionKey,
        sectionLabel: item.section_label || sectionKey,
        sectionSortOrder: Number(item.section_sort_order || 0),
        items: [],
      });
    }
    map.get(sectionKey)!.items.push({
      id: item.id,
      sectionKey,
      sectionLabel: item.section_label || sectionKey,
      sectionSortOrder: Number(item.section_sort_order || 0),
      title: item.title,
      searchKeyword: item.search_keyword,
      imageUrl: item.image_url,
      imageAlt: item.image_alt || item.title,
      sortOrder: Number(item.sort_order || 0),
      isActive: !!item.is_active,
    });
  }

  return Array.from(map.values())
    .sort((a, b) => a.sectionSortOrder - b.sectionSortOrder || a.sectionLabel.localeCompare(b.sectionLabel))
    .map((section) => ({
      ...section,
      items: section.items.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    }));
});

function proxyImageUrl(url: string | null | undefined): string {
  const value = String(url || '').trim();
  if (!value) return '';
  return buildImageProxyUrl(value);
}

async function loadItems() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/homepage/visual-menu');
    items.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Failed to load homepage visual menu items:', error);
    toast.error('Failed to load visual menu items');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = {
    section_key: '',
    section_label: '',
    section_sort_order: 0,
    title: '',
    search_keyword: '',
    image_url: '',
    image_alt: '',
    sort_order: 0,
    is_active: true,
  };
}

function openAddModal(section?: any) {
  editingItem.value = null;
  resetForm();
  selectedSection.value = section || null;
  if (section) {
    form.value.section_key = section.sectionKey;
    form.value.section_label = section.sectionLabel;
    form.value.section_sort_order = section.sectionSortOrder;
  }
  showModal.value = true;
}

function openEditModal(item: any) {
  editingItem.value = item;
  selectedSection.value = null;
  form.value = {
    section_key: item.sectionKey || '',
    section_label: item.sectionLabel || '',
    section_sort_order: item.sectionSortOrder || 0,
    title: item.title || '',
    search_keyword: item.searchKeyword || '',
    image_url: item.imageUrl || '',
    image_alt: item.imageAlt || '',
    sort_order: item.sortOrder || 0,
    is_active: !!item.isActive,
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function fillCurrentSectionFromSelection() {
  if (!selectedSection.value) return;
  form.value.section_key = selectedSection.value.sectionKey;
  form.value.section_label = selectedSection.value.sectionLabel;
  form.value.section_sort_order = selectedSection.value.sectionSortOrder;
}

async function saveItem() {
  saving.value = true;
  try {
    const payload = {
      section_key: form.value.section_key.trim(),
      section_label: form.value.section_label.trim(),
      section_sort_order: Number(form.value.section_sort_order || 0),
      title: form.value.title.trim(),
      search_keyword: form.value.search_keyword.trim(),
      image_url: form.value.image_url.trim(),
      image_alt: form.value.image_alt.trim() || undefined,
      sort_order: Number(form.value.sort_order || 0),
      is_active: !!form.value.is_active,
    };

    if (editingItem.value) {
      await axios.put(`/api/admin/homepage/visual-menu/${editingItem.value.id}`, payload);
      toast.success('Tile updated');
    } else {
      await axios.post('/api/admin/homepage/visual-menu', payload);
      toast.success('Tile created');
    }
    showModal.value = false;
    await loadItems();
  } catch (error: any) {
    console.error('Failed to save visual menu tile:', error);
    toast.error(error.response?.data?.error || 'Failed to save tile');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(item: any) {
  deleteTarget.value = item;
  deleteConfirmOpen.value = true;
}

const deleteConfirmMessage = computed(() => `Delete "${deleteTarget.value?.title || 'this tile'}" from ${deleteTarget.value?.sectionLabel || 'this section'}?`);

async function handleConfirmDelete() {
  if (!deleteTarget.value?.id) return;
  try {
    await axios.delete(`/api/admin/homepage/visual-menu/${deleteTarget.value.id}`);
    toast.success('Tile deleted');
    deleteConfirmOpen.value = false;
    deleteTarget.value = null;
    await loadItems();
  } catch (error: any) {
    console.error('Failed to delete visual menu tile:', error);
    toast.error(error.response?.data?.error || 'Failed to delete tile');
  }
}

function previewTile(item: any) {
  const keyword = String(item.searchKeyword || item.title || '').trim();
  if (!keyword) return;
  router.push({ path: '/shopping/browse', query: { q: keyword, language: 'en' } });
}

onMounted(loadItems);
</script>
