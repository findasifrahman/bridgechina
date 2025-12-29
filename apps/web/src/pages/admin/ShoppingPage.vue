<template>
  <div>
    <PageHeader title="Shopping Management">
      <template #actions>
        <Button variant="primary" @click="activeTab = 'categories'">Categories</Button>
        <Button variant="primary" @click="activeTab = 'products'">Products</Button>
        <Button variant="primary" @click="activeTab = 'orders'">Orders</Button>
      </template>
    </PageHeader>

    <Tabs v-model="activeTab" :tabs="tabs" />
    
    <!-- Categories -->
    <Card v-if="activeTab === 'categories'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Product Categories</h3>
          <Button variant="primary" size="sm" @click="openCategoryModal()">Add Category</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleCategorySearch" />
        <CompactTable
          :columns="categoryColumns"
          :data="filteredCategories"
          :actions="true"
          @edit="openCategoryModal"
        >
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openCategoryModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteCategory(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Products -->
    <Card v-if="activeTab === 'products'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Products</h3>
          <Button variant="primary" size="sm" @click="openProductModal()">Add Product</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleProductSearch" />
        <CompactTable
          :columns="productColumns"
          :data="filteredProducts"
          :actions="true"
          @edit="openProductModal"
        >
          <template #cell-category="{ row }">
            {{ row.category?.name || 'N/A' }}
          </template>
          <template #cell-seller="{ row }">
            {{ row.seller?.email || 'N/A' }}
          </template>
          <template #cell-price="{ row }">
            ¥{{ row.price }} {{ row.currency }}
          </template>
          <template #cell-stock="{ row }">
            <Badge :variant="row.stock_qty > 0 ? 'success' : 'default'">
              {{ row.stock_qty }}
            </Badge>
          </template>
          <template #cell-status="{ row }">
            <Badge :variant="row.status === 'active' ? 'success' : row.status === 'paused' ? 'warning' : 'default'">
              {{ row.status }}
            </Badge>
          </template>
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openProductModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteProduct(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Orders -->
    <Card v-if="activeTab === 'orders'" class="mt-6">
      <CardHeader>
        <h3 class="text-lg font-semibold">Orders</h3>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleOrderSearch" />
        <CompactTable
          :columns="orderColumns"
          :data="filteredOrders"
          :actions="true"
        >
          <template #cell-user="{ row }">
            {{ row.user?.email || 'Guest' }}
          </template>
          <template #cell-total="{ row }">
            ¥{{ row.total_amount }} {{ row.currency }}
          </template>
          <template #cell-status="{ row }">
            <StatusChip :status="row.status" />
          </template>
          <template #actions="{ row }">
            <Button variant="ghost" size="sm" @click="viewOrder(row)">View</Button>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Hot Items (TMAPI) -->
    <Card v-if="activeTab === 'hot-items'" class="mt-6">
      <CardHeader>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-semibold">Hot Items (TMAPI)</h3>
          <Button variant="primary" size="sm" @click="openHotItemModal()">Add Hot Item</Button>
        </div>
      </CardHeader>
      <CardBody>
        <FilterBar @search="handleHotItemSearch" />
        <CompactTable
          :columns="hotItemColumns"
          :data="filteredHotItems"
          :actions="true"
          @edit="openHotItemModal"
        >
          <template #actions="{ row }">
            <div class="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" @click="openHotItemModal(row)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="confirmDeleteHotItem(row)">
                Delete
              </Button>
            </div>
          </template>
        </CompactTable>
      </CardBody>
    </Card>

    <!-- Category Modal -->
    <Modal v-model="showCategoryModal" :title="editingCategory ? 'Edit Category' : 'Add Category'">
      <form @submit.prevent="saveCategory" class="space-y-4">
        <Input v-model="categoryForm.name" label="Name" required />
        <Input v-model="categoryForm.slug" label="Slug" required />
        <Select
          v-model="categoryForm.parent_id"
          label="Parent Category (optional)"
          :options="parentCategoryOptions"
        />
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showCategoryModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Product Modal -->
    <Modal v-model="showProductModal" :title="editingProduct ? 'Edit Product' : 'Add Product'" size="xl">
      <form @submit.prevent="saveProduct" class="space-y-4">
        <Select
          v-model="productForm.category_id"
          label="Category"
          :options="categoryOptions"
          required
        />
        <Input v-model="productForm.title" label="Title" required />
        <Textarea v-model="productForm.description" label="Description" />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="productForm.price" label="Price" type="number" step="0.01" required />
          <Select
            v-model="productForm.currency"
            label="Currency"
            :options="[{ value: 'CNY', label: 'CNY' }, { value: 'USD', label: 'USD' }]"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <Input v-model.number="productForm.stock_qty" label="Stock Quantity" type="number" required />
          <Select
            v-model="productForm.status"
            label="Status"
            :options="[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' }
            ]"
          />
        </div>
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showProductModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Hot Item Modal -->
    <Modal v-model="showHotItemModal" :title="editingHotItem ? 'Edit Hot Item' : 'Add Hot Item'">
      <form @submit.prevent="saveHotItem" class="space-y-4">
        <Select
          v-model="hotItemForm.category_slug"
          label="Category"
          :options="shoppingCategoryOptions"
          required
        />
        <Input v-model="hotItemForm.external_id" label="External ID (TMAPI Item ID)" required />
        <Input v-model.number="hotItemForm.pinned_rank" label="Rank (lower = higher priority)" type="number" />
        <div class="flex justify-end space-x-3">
          <Button variant="ghost" @click="showHotItemModal = false">Cancel</Button>
          <Button type="submit" variant="primary" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      :title="deleteConfirmTitle"
      :message="deleteConfirmMessage"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Tabs,
  CompactTable,
  Badge,
  StatusChip,
  Modal,
  Input,
  Select,
  Textarea,
  FilterBar,
  ConfirmDialog,
} from '@bridgechina/ui';

const toast = useToast();

const activeTab = ref('categories');
const categories = ref<any[]>([]);
const products = ref<any[]>([]);
const orders = ref<any[]>([]);
const hotItems = ref<any[]>([]);

const categorySearch = ref('');
const productSearch = ref('');
const orderSearch = ref('');
const hotItemSearch = ref('');

const filteredCategories = computed(() => {
  if (!categorySearch.value) return categories.value;
  const q = categorySearch.value.toLowerCase();
  return categories.value.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.slug.toLowerCase().includes(q)
  );
});

const filteredProducts = computed(() => {
  if (!productSearch.value) return products.value;
  const q = productSearch.value.toLowerCase();
  return products.value.filter(p => 
    p.title.toLowerCase().includes(q) || 
    p.category?.name.toLowerCase().includes(q) ||
    p.seller?.email.toLowerCase().includes(q)
  );
});

const filteredOrders = computed(() => {
  if (!orderSearch.value) return orders.value;
  const q = orderSearch.value.toLowerCase();
  return orders.value.filter(o => 
    o.user?.email?.toLowerCase().includes(q) ||
    o.id.toLowerCase().includes(q)
  );
});

const filteredHotItems = computed(() => {
  if (!hotItemSearch.value) return hotItems.value;
  const q = hotItemSearch.value.toLowerCase();
  return hotItems.value.filter(h => 
    h.category_slug.toLowerCase().includes(q) ||
    h.external_id.toLowerCase().includes(q)
  );
});

const categoryOptions = computed(() => 
  categories.value.map(c => ({ value: c.id, label: c.name }))
);

const parentCategoryOptions = computed(() => [
  { value: '', label: 'None' },
  ...categories.value.map(c => ({ value: c.id, label: c.name }))
]);

const shoppingCategoryOptions = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing & Apparel' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'beauty', label: 'Beauty & Personal Care' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'industrial', label: 'Industrial & Business' },
];

const tabs = [
  { value: 'categories', label: 'Categories' },
  { value: 'products', label: 'Products' },
  { value: 'orders', label: 'Orders' },
  { value: 'hot-items', label: 'Hot Items (TMAPI)' },
];

const categoryColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
];

const productColumns = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'seller', label: 'Seller' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
  { key: 'status', label: 'Status' },
];

const orderColumns = [
  { key: 'id', label: 'Order ID', sortable: true },
  { key: 'user', label: 'Customer' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date' },
];

const hotItemColumns = [
  { key: 'category_slug', label: 'Category', sortable: true },
  { key: 'external_id', label: 'External ID', sortable: true },
  { key: 'pinned_rank', label: 'Rank', sortable: true },
  { key: 'created_at', label: 'Created', sortable: true },
];

// Modals
const showCategoryModal = ref(false);
const showProductModal = ref(false);
const showHotItemModal = ref(false);

const editingCategory = ref<any>(null);
const editingProduct = ref<any>(null);
const editingHotItem = ref<any>(null);

const saving = ref(false);

// Forms
const categoryForm = ref({
  name: '',
  slug: '',
  parent_id: '',
});

const productForm = ref({
  category_id: '',
  title: '',
  description: '',
  price: 0,
  currency: 'CNY',
  stock_qty: 0,
  status: 'draft',
});

const hotItemForm = ref({
  category_slug: '',
  external_id: '',
  pinned_rank: 0,
});

// Delete confirmation
const showDeleteConfirm = ref(false);
const deleteConfirmTitle = ref('');
const deleteConfirmMessage = ref('');
const deleteAction = ref<(() => Promise<void>) | null>(null);

function resetCategoryForm() {
  categoryForm.value = {
    name: '',
    slug: '',
    parent_id: '',
  };
}

function resetProductForm() {
  productForm.value = {
    category_id: '',
    title: '',
    description: '',
    price: 0,
    currency: 'CNY',
    stock_qty: 0,
    status: 'draft',
  };
}

function openCategoryModal(item?: any) {
  editingCategory.value = item || null;
  if (item) {
    categoryForm.value = {
      name: item.name,
      slug: item.slug,
      parent_id: item.parent_id || '',
    };
  } else {
    resetCategoryForm();
  }
  showCategoryModal.value = true;
}

function openProductModal(item?: any) {
  editingProduct.value = item || null;
  if (item) {
    productForm.value = {
      category_id: item.category_id,
      title: item.title,
      description: item.description || '',
      price: item.price,
      currency: item.currency || 'CNY',
      stock_qty: item.stock_qty,
      status: item.status,
    };
  } else {
    resetProductForm();
  }
  showProductModal.value = true;
}

async function saveCategory() {
  saving.value = true;
  try {
    const data = {
      ...categoryForm.value,
      parent_id: categoryForm.value.parent_id || null,
    };
    if (editingCategory.value) {
      await axios.put(`/api/admin/shopping/categories/${editingCategory.value.id}`, data);
      toast.success('Category updated');
    } else {
      await axios.post('/api/admin/shopping/categories', data);
      toast.success('Category created');
    }
    showCategoryModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save category');
  } finally {
    saving.value = false;
  }
}

async function saveProduct() {
  saving.value = true;
  try {
    if (editingProduct.value) {
      await axios.put(`/api/admin/shopping/products/${editingProduct.value.id}`, productForm.value);
      toast.success('Product updated');
    } else {
      // For new products, we need seller_id - for now use a placeholder or get from auth
      const productData = {
        ...productForm.value,
        seller_id: editingProduct.value?.seller_id || 'placeholder', // Should get from auth in real app
      };
      await axios.post('/api/admin/shopping/products', productData);
      toast.success('Product created');
    }
    showProductModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save product');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteCategory(item: any) {
  deleteConfirmTitle.value = 'Delete Category';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.name}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/shopping/categories/${item.id}`);
    toast.success('Category deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function confirmDeleteProduct(item: any) {
  deleteConfirmTitle.value = 'Delete Product';
  deleteConfirmMessage.value = `Are you sure you want to delete "${item.title}"? This action cannot be undone.`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/shopping/products/${item.id}`);
    toast.success('Product deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

function viewOrder(order: any) {
  // Navigate to order detail page
  window.location.href = `/admin/orders/${order.id}`;
}

async function executeDelete() {
  if (deleteAction.value) {
    await deleteAction.value();
    showDeleteConfirm.value = false;
    deleteAction.value = null;
  }
}

function handleCategorySearch(query: string) {
  categorySearch.value = query;
}

function handleProductSearch(query: string) {
  productSearch.value = query;
}

function handleOrderSearch(query: string) {
  orderSearch.value = query;
}

function handleHotItemSearch(query: string) {
  hotItemSearch.value = query;
}

function openHotItemModal(item?: any) {
  editingHotItem.value = item || null;
  if (item) {
    hotItemForm.value = {
      category_slug: item.category_slug,
      external_id: item.external_id,
      pinned_rank: item.pinned_rank || 0,
    };
  } else {
    hotItemForm.value = {
      category_slug: '',
      external_id: '',
      pinned_rank: 0,
    };
  }
  showHotItemModal.value = true;
}

async function saveHotItem() {
  saving.value = true;
  try {
    if (editingHotItem.value) {
      await axios.put(`/api/admin/shopping/hot-items/${editingHotItem.value.id}`, hotItemForm.value);
      toast.success('Hot item updated');
    } else {
      await axios.post('/api/admin/shopping/hot-items', {
        ...hotItemForm.value,
        source: 'tmapi_1688',
      });
      toast.success('Hot item created');
    }
    showHotItemModal.value = false;
    await loadData();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save hot item');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteHotItem(item: any) {
  deleteConfirmTitle.value = 'Delete Hot Item';
  deleteConfirmMessage.value = `Are you sure you want to delete hot item "${item.external_id}"?`;
  deleteAction.value = async () => {
    await axios.delete(`/api/admin/shopping/hot-items/${item.id}`);
    toast.success('Hot item deleted');
    await loadData();
  };
  showDeleteConfirm.value = true;
}

async function loadData() {
  try {
    const [categoriesRes, productsRes, ordersRes, hotItemsRes] = await Promise.all([
      axios.get('/api/admin/shopping/categories'),
      axios.get('/api/admin/shopping/products'),
      axios.get('/api/admin/shopping/orders'),
      axios.get('/api/admin/shopping/hot-items'),
    ]);
    categories.value = categoriesRes.data;
    products.value = productsRes.data;
    orders.value = ordersRes.data;
    hotItems.value = hotItemsRes.data;
  } catch (error) {
    console.error('Failed to load shopping data', error);
    toast.error('Failed to load shopping data');
  }
}

onMounted(loadData);
</script>
