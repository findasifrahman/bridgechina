<template>
  <div>
    <PageHeader title="My Products">
      <template #actions>
        <Button variant="primary" @click="showCreateModal = true">New Product</Button>
      </template>
    </PageHeader>
    <Card>
      <CardBody>
        <div v-if="products.length === 0" class="text-center py-12">
          <EmptyState
            title="No products yet"
            description="Create your first product to get started"
          >
            <template #actions>
              <Button variant="primary" @click="showCreateModal = true">Create Product</Button>
            </template>
          </EmptyState>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="product in products"
            :key="product.id"
            class="border-b pb-4 cursor-pointer hover:bg-slate-50 p-4 rounded-lg"
            @click="editProduct(product)"
          >
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-4">
                <img
                  v-if="product.cover_asset_id"
                  :src="getProductImage(product)"
                  alt="Product"
                  class="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <p class="font-semibold">{{ product.title }}</p>
                  <p class="text-sm text-slate-600">¥{{ product.price }} • Stock: {{ product.stock_qty }}</p>
                </div>
              </div>
              <StatusChip :status="product.status" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- Create/Edit Product Modal -->
    <Modal v-model="showCreateModal" :title="editingProduct ? 'Edit Product' : 'Create Product'" size="lg">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <Select
          v-model="productForm.category_id"
          label="Category"
          :options="categoryOptions"
          required
        />
        <Input
          v-model="productForm.title"
          label="Product Title"
          required
        />
        <Textarea
          v-model="productForm.description"
          label="Description"
          rows="4"
        />
        <div class="grid grid-cols-2 gap-4">
          <Input
            v-model.number="productForm.price"
            label="Price (CNY)"
            type="number"
            min="0"
            step="0.01"
            required
          />
          <Input
            v-model.number="productForm.stock_qty"
            label="Stock Quantity"
            type="number"
            min="0"
            required
          />
        </div>
        <Select
          v-model="productForm.status"
          label="Status"
          :options="statusOptions"
          required
        />
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Product Images</label>
          <div class="flex gap-2 flex-wrap">
            <div
              v-for="(img, idx) in productForm.images"
              :key="idx"
              class="relative w-24 h-24"
            >
              <img :src="img" alt="Product" class="w-full h-full object-cover rounded-lg border" />
              <button
                type="button"
                class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                @click="productForm.images.splice(idx, 1)"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              class="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:border-teal-500"
              @click="uploadImage"
            >
              + Add
            </button>
          </div>
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
import { ref, computed, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  StatusChip,
  EmptyState,
  Modal,
  Input,
  Select,
  Textarea,
} from '@bridgechina/ui';

const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const showCreateModal = ref(false);
const editingProduct = ref<any>(null);
const saving = ref(false);
const toast = useToast();

const productForm = ref({
  category_id: '',
  title: '',
  description: '',
  price: 0,
  stock_qty: 0,
  status: 'draft',
  images: [] as string[],
});

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

const categoryOptions = computed(() =>
  categories.value.map((cat) => ({ value: cat.id, label: cat.name }))
);

function getProductImage(product: any) {
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  return '/placeholder-product.jpg';
}

async function uploadImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const presignedRes = await axios.post('/api/seller/media/presigned-url', {
        filename: file.name,
        mimeType: file.type,
      });

      if (!presignedRes.data.uploadUrl || presignedRes.data.uploadUrl.includes('example.com')) {
        toast.warning('R2 not configured. Image upload disabled.');
        return;
      }

      await fetch(presignedRes.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      productForm.value.images.push(presignedRes.data.publicUrl);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };
  input.click();
}

async function loadProducts() {
  try {
    const response = await axios.get('/api/seller/products');
    products.value = response.data;
  } catch (error) {
    console.error('Failed to load products');
  }
}

async function loadCategories() {
  try {
    const response = await axios.get('/api/admin/shopping/categories');
    categories.value = response.data;
  } catch (error) {
    console.error('Failed to load categories');
  }
}

function editProduct(product: any) {
  editingProduct.value = product;
  productForm.value = {
    category_id: product.category_id,
    title: product.title,
    description: product.description || '',
    price: product.price,
    stock_qty: product.stock_qty,
    status: product.status,
    images: (product.images as string[]) || [],
  };
  showCreateModal.value = true;
}

async function handleSubmit() {
  saving.value = true;
  try {
    if (editingProduct.value) {
      await axios.patch(`/api/seller/products/${editingProduct.value.id}`, productForm.value);
      toast.success('Product updated');
    } else {
      await axios.post('/api/seller/products', productForm.value);
      toast.success('Product created');
    }
    showCreateModal.value = false;
    editingProduct.value = null;
    productForm.value = {
      category_id: '',
      title: '',
      description: '',
      price: 0,
      stock_qty: 0,
      status: 'draft',
      images: [],
    };
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save product');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadCategories()]);
});
</script>
