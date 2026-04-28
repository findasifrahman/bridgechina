<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader title="My Products" />
      <Button variant="primary" @click="openCreateModal">
        <Plus class="mr-2 h-4 w-4" />
        New product
      </Button>
    </div>

    <div class="grid gap-4 md:grid-cols-[1fr_280px]">
      <Input v-model="searchQuery" placeholder="Search products..." />
      <Button variant="ghost" @click="loadData" :loading="loading">
        <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody>
        <EmptyState
          v-if="filteredProducts.length === 0"
          title="No products yet"
          description="Create your first ecommerce product to start selling."
        >
          <template #actions>
            <Button variant="primary" @click="openCreateModal">Create product</Button>
          </template>
        </EmptyState>

        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <img
                  :src="getProductImage(product)"
                  alt="Product"
                  class="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                />
                <div>
                  <p class="font-semibold text-slate-900 line-clamp-2">{{ product.title }}</p>
                  <p class="text-sm text-slate-500">{{ product.category?.name || 'Uncategorized' }}</p>
                </div>
              </div>
              <StatusChip :status="product.status" />
            </div>
            <div class="mt-4 flex items-center justify-between text-sm">
              <span class="font-semibold text-slate-900">{{ formatCurrency(product.price, product.currency) }}</span>
              <span class="text-slate-500">Stock {{ product.stock_qty ?? 0 }}</span>
            </div>
            <div class="mt-4 flex gap-2">
              <Button class="flex-1" variant="ghost" size="sm" @click="editProduct(product)">Edit</Button>
              <Button class="flex-1" variant="ghost" size="sm" @click="removeProduct(product)">Delete</Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <Modal v-model="showModal" :title="editingProduct ? 'Edit product' : 'Create product'" size="lg">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid gap-4 sm:grid-cols-2">
          <Select v-model="productForm.category_id" label="Category" :options="categoryOptions" required />
          <Input v-model="productForm.title" label="Title" required />
        </div>

        <Textarea v-model="productForm.description" label="Description" rows="4" />

        <div class="grid gap-4 sm:grid-cols-2">
          <Input v-model.number="productForm.price" label="Price" type="number" min="0" step="0.01" required />
          <Input v-model="productForm.currency" label="Currency" placeholder="BDT" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <Input v-model.number="productForm.stock_qty" label="Stock quantity" type="number" min="0" />
          <Select v-model="productForm.status" label="Status" :options="statusOptions" required />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <Input v-model="productForm.sku" label="SKU" />
          <Input v-model="productForm.brand" label="Brand" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <Input v-model="productForm.source_url" label="Source URL" placeholder="API / supplier link" />
          <Input v-model="productForm.external_id" label="External ID" placeholder="Supplier item id" />
        </div>

        <Input v-model.number="productForm.weight_kg" label="Weight (kg)" type="number" min="0" step="0.01" />

        <div class="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" @click="showModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Button, Card, CardBody, EmptyState, Input, Modal, PageHeader, Select, StatusChip, Textarea } from '@bridgechina/ui';
import { Plus, RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const loading = ref(false);
const saving = ref(false);
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const flatCategories = computed(() => {
  const rows: any[] = [];
  const walk = (items: any[], depth = 0) => {
    for (const item of items || []) {
      rows.push({ ...item, depth });
      if (item.children?.length) walk(item.children, depth + 1);
    }
  };
  walk(categories.value);
  return rows;
});
const searchQuery = ref('');
const showModal = ref(false);
const editingProduct = ref<any>(null);

const productForm = ref({
  category_id: '',
  title: '',
  description: '',
  price: 0,
  currency: 'BDT',
  stock_qty: 0,
  status: 'draft',
  sku: '',
  brand: '',
  source_url: '',
  external_id: '',
  weight_kg: undefined as number | undefined,
});

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'paused', label: 'Paused' },
];

const categoryOptions = computed(() =>
  flatCategories.value.map((category) => ({
    value: category.id,
    label: `${'— '.repeat(category.depth || 0)}${category.name}`,
  }))
);

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return products.value;
  return products.value.filter((product) => {
    return [product.title, product.sku, product.brand, product.category?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
});

function formatCurrency(value: number | string | null | undefined, currency?: string) {
  const code = currency || 'BDT';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value || 0));
}

function getProductImage(product: any) {
  return product.coverAsset?.public_url || product.cover_asset?.public_url || '/placeholder-product.jpg';
}

function resetForm() {
  productForm.value = {
    category_id: flatCategories.value[0]?.id || '',
    title: '',
    description: '',
    price: 0,
    currency: 'BDT',
    stock_qty: 0,
    status: 'draft',
    sku: '',
    brand: '',
    source_url: '',
    external_id: '',
    weight_kg: undefined,
  };
}

function openCreateModal() {
  editingProduct.value = null;
  resetForm();
  showModal.value = true;
}

function editProduct(product: any) {
  editingProduct.value = product;
  productForm.value = {
    category_id: product.category_id || '',
    title: product.title || '',
    description: product.description || '',
    price: Number(product.price || 0),
    currency: product.currency || 'BDT',
    stock_qty: Number(product.stock_qty || 0),
    status: product.status || 'draft',
    sku: product.sku || '',
    brand: product.brand || '',
    source_url: product.source_url || '',
    external_id: product.external_id || '',
    weight_kg: product.weight_kg ?? undefined,
  };
  showModal.value = true;
}

async function loadData() {
  loading.value = true;
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      axios.get('/api/seller/products'),
      axios.get('/api/public/shopping/categories'),
    ]);
    products.value = productsRes.data || [];
    categories.value = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
    if (!productForm.value.category_id && flatCategories.value.length > 0) {
      productForm.value.category_id = flatCategories.value[0].id;
    }
  } catch (error) {
    console.error('Failed to load seller products', error);
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  saving.value = true;
  try {
    const payload = {
      category_id: productForm.value.category_id,
      title: productForm.value.title,
      description: productForm.value.description || undefined,
      price: Number(productForm.value.price),
      currency: productForm.value.currency || 'BDT',
      stock_qty: Number(productForm.value.stock_qty || 0),
      status: productForm.value.status,
      sku: productForm.value.sku || undefined,
      brand: productForm.value.brand || undefined,
      source_url: productForm.value.source_url || undefined,
      external_id: productForm.value.external_id || undefined,
      weight_kg: productForm.value.weight_kg ?? undefined,
    };

    if (editingProduct.value) {
      await axios.patch(`/api/seller/products/${editingProduct.value.id}`, payload);
      toast.success('Product updated');
    } else {
      await axios.post('/api/seller/products', payload);
      toast.success('Product created');
    }

    showModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save product');
  } finally {
    saving.value = false;
  }
}

async function removeProduct(product: any) {
  if (!confirm(`Delete ${product.title}?`)) return;
  try {
    await axios.delete(`/api/seller/products/${product.id}`);
    toast.success('Product deleted');
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete product');
  }
}

onMounted(loadData);
</script>
