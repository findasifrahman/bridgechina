<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader
        title="Shopping Management"
        subtitle="Manage ecommerce categories, manual products, media links, and SKU rows"
      />
      <div class="flex gap-2">
        <Button variant="ghost" @click="activeTab = 'products'">Products</Button>
        <Button variant="ghost" @click="activeTab = 'categories'">Categories</Button>
      </div>
    </div>

    <Card v-if="activeTab === 'products'">
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold">Products</h3>
            <p class="text-sm text-slate-500">{{ productTotal }} total products</p>
          </div>
          <Button variant="primary" size="sm" @click="openProductModal()">Add Product</Button>
        </div>
      </CardHeader>
      <CardBody class="space-y-4">
        <div class="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
          <Input v-model="productSearch" placeholder="Search title, brand, SKU, or source" label="Search" />
          <Select v-model="productCategoryFilter" label="Category" :options="productCategoryOptions" />
          <Select v-model="productStatusFilter" label="Status" :options="statusOptions" />
          <div class="flex items-end">
            <Button variant="ghost" class="w-full" @click="resetProductFilters">Clear</Button>
          </div>
        </div>

        <div v-if="loadingProducts" class="py-10 text-center text-sm text-slate-500">Loading products...</div>
        <div v-else-if="productRows.length === 0" class="py-10 text-center text-slate-500">No products found</div>
        <div v-else class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Title</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Category</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Seller label</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Price</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">SKUs</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Media</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Status</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in productRows" :key="product.id" class="align-top hover:bg-slate-50/80">
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="flex items-start gap-3">
                    <img
                      :src="product.coverAsset?.thumbnail_url || product.coverAsset?.public_url || placeholderImage"
                      alt="cover"
                      class="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                    />
                    <div class="min-w-0">
                      <div class="truncate font-semibold text-slate-900">{{ product.title }}</div>
                      <div class="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span v-if="product.external_id" class="rounded-full bg-slate-100 px-2 py-0.5">Ext {{ product.external_id }}</span>
                        <span v-if="product.source_kind" class="rounded-full bg-slate-100 px-2 py-0.5">{{ product.source_kind }}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="font-medium text-slate-900">{{ product.category?.name || 'Uncategorized' }}</div>
                    <div class="text-slate-500">{{ product.category?.parent?.name || 'Root category' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="font-medium text-slate-900">{{ product.brand || 'Admin added' }}</div>
                    <div class="text-slate-500">{{ product.seller?.email || 'Manual product' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="font-semibold text-rose-600">{{ money(product.price, product.currency) }}</div>
                    <div class="text-slate-500">MOQ {{ product.minimum_order_qty || 1 }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <Badge variant="default" class="text-[11px]">
                      {{ skuCount(product) }} SKU{{ skuCount(product) === 1 ? '' : 's' }}
                    </Badge>
                    <div v-if="product.sku" class="text-slate-500">Master: {{ product.sku }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <div class="space-y-1">
                    <div class="text-slate-900">{{ galleryCount(product) }} images</div>
                    <div class="text-slate-500">{{ product.cover_asset_id ? 'Cover set' : 'No cover' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-3">
                  <Badge :variant="product.status === 'published' ? 'success' : 'default'" class="text-[11px]">
                    {{ product.status }}
                  </Badge>
                </td>
                <td class="border-b border-slate-100 px-3 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" class="h-7 px-2 text-[11px]" @click="openProductModal(product)">Edit</Button>
                    <Button variant="ghost" size="sm" class="h-7 px-2 text-[11px] text-red-600 hover:text-red-700" @click="deleteProduct(product.id)">Delete</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200 pt-3">
          <Pagination
            :current-page="productPage"
            :total-pages="productTotalPages"
            :total="productTotal"
            :page-size="productLimit"
            @update:currentPage="handleProductPageChange"
          />
        </div>
      </CardBody>
    </Card>

    <Card v-else>
      <CardHeader>
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold">Categories</h3>
          <Button variant="primary" size="sm" @click="openCategoryModal()">Add Category</Button>
        </div>
      </CardHeader>
      <CardBody class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <Input v-model="categorySearch" placeholder="Search categories..." label="Search" />
        </div>

        <div v-if="filteredCategories.length === 0" class="py-10 text-center text-slate-500">No categories found</div>
        <div v-else class="space-y-3">
          <div
            v-for="category in filteredCategories"
            :key="category.id"
            class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"
            :style="{ marginLeft: `${(category.depth || 0) * 20}px` }"
          >
            <div>
              <div class="font-semibold text-slate-900">{{ category.name }}</div>
              <div class="text-sm text-slate-500">
                {{ category.slug }}
                <span v-if="category.parent?.name"> - Parent: {{ category.parent.name }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge :variant="category.is_active ? 'success' : 'default'">{{ category.is_active ? 'Active' : 'Inactive' }}</Badge>
              <Button variant="ghost" size="sm" @click="openCategoryModal(category)">Edit</Button>
              <Button variant="ghost" size="sm" class="text-red-600 hover:text-red-700" @click="deleteCategory(category.id)">Delete</Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>

    <Modal v-model="showProductModal" :title="editingProduct ? 'Edit Product' : 'Add Product'" size="2xl">
      <form class="space-y-6 max-h-[85vh] overflow-y-auto pr-1" @submit.prevent="saveProduct">
        <div class="grid gap-4 xl:grid-cols-2">
          <Input v-model="productForm.seller_name" label="Seller name / brand" placeholder="Factory, supplier, or manual seller label" />
          <Select v-model="productForm.status" label="Status" :options="statusOptions" />
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
          <Select v-model="productForm.category_parent_id" label="Category" :options="parentCategoryOptions" />
          <Select v-model="productForm.category_id" label="Subcategory" :options="subcategoryOptions" :disabled="subcategoryOptions.length === 0" />
        </div>

        <Input v-model="productForm.title" label="Title" required />
        <Textarea v-model="productForm.description" label="Description" :rows="4" />

        <div class="grid gap-4 xl:grid-cols-4">
          <Input v-model.number="productForm.price" type="number" label="Price" required />
          <Select v-model="productForm.currency" label="Currency" :options="currencyOptions" />
          <Input v-model.number="productForm.stock_qty" type="number" label="Stock" min="0" />
          <Input v-model.number="productForm.minimum_order_qty" type="number" min="1" label="Minimum order qty" />
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <Input v-model="productForm.sku" label="Master SKU" placeholder="Optional top-level SKU" />
          <Input v-model="productForm.source_url" label="Source URL" placeholder="OTAPI or supplier link" />
          <Input v-model="productForm.external_id" label="External ID" placeholder="Supplier product ID" />
        </div>

        <div class="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <Input v-model.number="productForm.weight_kg" type="number" step="0.01" label="Weight (kg)" />
          <div class="rounded-2xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">Selected media</label>
                <div class="text-xs text-slate-500">Pick a cover image and gallery shots from the Media library.</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold text-slate-900">{{ productForm.gallery_asset_ids.length }} gallery image(s)</div>
                <div class="text-xs text-slate-500">{{ productForm.cover_asset_id ? 'Cover selected' : 'No cover selected' }}</div>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" @click="router.push('/admin/media')">Open Media Library</Button>
              <Button type="button" size="sm" variant="ghost" @click="loadMediaAssets" :loading="mediaLoading">Refresh media</Button>
            </div>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 class="text-base font-semibold text-slate-900">Cover image and gallery</h4>
              <p class="text-xs text-slate-500">Pick from recently uploaded media assets.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" type="button" @click="router.push('/admin/media')">Media page</Button>
              <Button variant="ghost" size="sm" type="button" @click="loadMediaAssets" :loading="mediaLoading">Refresh media</Button>
            </div>
          </div>
          <div class="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="primary" @click="productMediaInput?.click()">Choose images</Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                :disabled="productMediaFiles.length === 0"
                :loading="productMediaUploading"
                @click="uploadProductMedia"
              >
                Upload selected
              </Button>
              <span class="text-xs text-slate-500">{{ productMediaFiles.length }} file(s) selected</span>
            </div>
            <input ref="productMediaInput" type="file" accept="image/*" multiple class="hidden" @change="onProductMediaPick" />
            <div v-if="productMediaFiles.length > 0" class="mt-2 flex flex-wrap gap-2">
              <span v-for="file in productMediaFiles" :key="file.name + file.size" class="rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">
                {{ file.name }}
              </span>
            </div>
          </div>
          <div v-if="mediaAssets.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No media assets loaded. Upload images in Media first.
          </div>
          <div v-else class="max-h-72 overflow-auto pr-1">
            <div class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <button
                v-for="asset in mediaAssets"
                :key="asset.id"
                type="button"
                class="group overflow-hidden rounded-xl border bg-white text-left transition"
                :class="productForm.cover_asset_id === asset.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200 hover:border-teal-300'"
                @click="setCoverAsset(asset.id)"
              >
                <img :src="asset.thumbnail_url || asset.public_url" class="h-20 w-full object-cover" :alt="asset.r2_key" />
                <div class="space-y-1 px-2 py-2">
                  <div class="truncate text-[11px] font-medium text-slate-900">{{ getMediaLabel(asset) }}</div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] text-slate-500">Cover</span>
                    <span v-if="productForm.cover_asset_id === asset.id" class="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Selected</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div class="mt-3">
            <div class="mb-2 text-sm font-medium text-slate-700">Gallery images</div>
            <div v-if="mediaAssets.length === 0" class="text-xs text-slate-500">Upload media to attach multiple gallery images.</div>
            <div v-else class="max-h-72 overflow-auto pr-1">
              <div class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                <button
                  v-for="asset in mediaAssets"
                  :key="`gallery-${asset.id}`"
                  type="button"
                  class="group overflow-hidden rounded-xl border bg-white text-left transition"
                  :class="productForm.gallery_asset_ids.includes(asset.id) ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200 hover:border-rose-300'"
                  @click="toggleGalleryAsset(asset.id)"
                >
                  <img :src="asset.thumbnail_url || asset.public_url" class="h-20 w-full object-cover" :alt="asset.r2_key" />
                  <div class="px-2 py-2">
                    <div class="truncate text-[11px] font-medium text-slate-900">{{ getMediaLabel(asset) }}</div>
                    <div class="mt-1 text-[10px] text-slate-500">
                      {{ productForm.gallery_asset_ids.includes(asset.id) ? 'Included' : 'Click to add' }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h4 class="text-base font-semibold text-slate-900">SKU variations</h4>
              <p class="text-xs text-slate-500">Add multiple SKU rows for size, color, or pricing options.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" @click="addSkuRow">Add row</Button>
          </div>
          <div v-for="(row, index) in skuRows" :key="index" class="grid gap-2 xl:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto]">
            <Input v-model="row.label" label="Option" placeholder="Color / Size" />
            <Input v-model="row.sku" label="SKU" placeholder="SKU code" />
            <Input v-model="row.price" label="Price" placeholder="Optional" />
            <Input v-model="row.stock_qty" label="Stock" placeholder="Optional" />
            <div class="flex items-end">
              <Button type="button" variant="ghost" class="w-full" @click="removeSkuRow(index)">Remove</Button>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <Button variant="ghost" type="button" @click="showProductModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>

    <Modal v-model="showCategoryModal" :title="editingCategory ? 'Edit Category' : 'Add Category'">
      <form class="space-y-4" @submit.prevent="saveCategory">
        <Input v-model="categoryForm.name" label="Name" required />
        <Input v-model="categoryForm.slug" label="Slug" required />
        <Select v-model="categoryForm.parent_id" label="Parent category" :options="parentCategoryOptions" />
        <Select v-if="!categoryForm.parent_id" v-model="categoryForm.icon" label="Icon" :options="categoryIconOptions" />
        <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Subcategories do not need a separate icon. They inherit the category style in the storefront.
        </div>
        <Input v-model.number="categoryForm.sort_order" type="number" label="Sort order" />
        <div class="flex justify-end gap-3">
          <Button variant="ghost" type="button" @click="showCategoryModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="saving">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardHeader, CardBody, Button, Modal, Input, Select, Textarea, Badge, Pagination } from '@bridgechina/ui';

type SkuRow = {
  label: string;
  sku: string;
  price: string;
  stock_qty: string;
};

const toast = useToast();
const router = useRouter();
const activeTab = ref<'products' | 'categories'>('products');
const loadingProducts = ref(false);
const saving = ref(false);
const showProductModal = ref(false);
const showCategoryModal = ref(false);
const editingProduct = ref<any>(null);
const editingCategory = ref<any>(null);
const productSearch = ref('');
const productCategoryFilter = ref('');
const productStatusFilter = ref('');
const categorySearch = ref('');
const productPage = ref(1);
const productLimit = ref(20);
const productTotal = ref(0);
const productTotalPages = ref(1);
const categories = ref<any[]>([]);
const mediaAssets = ref<any[]>([]);
const mediaLoading = ref(false);
const productMediaInput = ref<HTMLInputElement | null>(null);
const productMediaFiles = ref<File[]>([]);
const productMediaUploading = ref(false);

const placeholderImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%25" height="100%25" fill="%23f1f5f9"/><path d="M70 125l25-28 20 22 18-20 27 26H70z" fill="%2394a3b8"/><circle cx="84" cy="84" r="12" fill="%2394a3b8"/></svg>';

const productRows = ref<any[]>([]);
const productForm = reactive({
  seller_name: '',
  category_parent_id: '',
  category_id: '',
  title: '',
  description: '',
  price: 0,
  currency: 'BDT',
  stock_qty: 0,
  sku: '',
  source_url: '',
  external_id: '',
  weight_kg: '' as string | number,
  minimum_order_qty: 1,
  status: 'published',
  cover_asset_id: '',
  gallery_asset_ids: [] as string[],
});
const skuRows = ref<SkuRow[]>([{ label: '', sku: '', price: '', stock_qty: '' }]);
const categoryForm = reactive({
  name: '',
  slug: '',
  parent_id: '',
  icon: '',
  sort_order: 0,
});

const categoryIconOptions = [
  { value: 'shopping-bag', label: 'Shopping bag' },
  { value: 'gem', label: 'Jewelry / gem' },
  { value: 'glasses', label: 'Sunglass / eyewear' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'monitor', label: 'Computer' },
  { value: 'smartphone', label: 'Mobile' },
  { value: 'watch', label: 'Watch' },
  { value: 'shirt', label: 'Clothing' },
  { value: 'home', label: 'Home' },
  { value: 'truck', label: 'Shipping / logistics' },
  { value: 'camera', label: 'Camera' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'gamepad-2', label: 'Games / toys' },
  { value: 'book-open', label: 'Books' },
  { value: 'sprout', label: 'Beauty / wellness' },
  { value: 'badge-percent', label: 'Sale / discount' },
  { value: 'package', label: 'Package' },
  { value: 'shield', label: 'Safety / protection' },
  { value: 'star', label: 'Featured' },
  { value: 'sparkles', label: 'Premium' },
];

const currencyOptions = [
  { value: 'BDT', label: 'BDT' },
  { value: 'CNY', label: 'CNY' },
  { value: 'USD', label: 'USD' },
];

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'paused', label: 'Paused' },
];

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

const productCategoryOptions = computed(() => [
  { value: '', label: 'All categories' },
  ...flatCategories.value.map((cat) => ({ value: cat.id, label: `${'— '.repeat(cat.depth || 0)}${cat.name}` })),
]);

const parentCategoryOptions = computed(() => [
  { value: '', label: 'No parent' },
  ...categories.value.map((cat) => ({ value: cat.id, label: cat.name })),
]);

const subcategoryOptions = computed(() => {
  const parent = categories.value.find((category) => category.id === productForm.category_parent_id);
  return parent?.children?.map((child: any) => ({ value: child.id, label: child.name })) || [];
});

const filteredCategories = computed(() => {
  const search = categorySearch.value.trim().toLowerCase();
  return flatCategories.value.filter((category) => !search || `${category.name} ${category.slug}`.toLowerCase().includes(search));
});

function money(amount: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

function resetProductForm() {
  productForm.seller_name = '';
  productForm.category_parent_id = categories.value[0]?.id || '';
  productForm.category_id = '';
  productForm.title = '';
  productForm.description = '';
  productForm.price = 0;
  productForm.currency = 'BDT';
  productForm.stock_qty = 0;
  productForm.sku = '';
  productForm.source_url = '';
  productForm.external_id = '';
  productForm.weight_kg = '';
  productForm.minimum_order_qty = 1;
  productForm.status = 'published';
  productForm.cover_asset_id = '';
  productForm.gallery_asset_ids = [];
  skuRows.value = [{ label: '', sku: '', price: '', stock_qty: '' }];
}

function resetCategoryForm() {
  categoryForm.name = '';
  categoryForm.slug = '';
  categoryForm.parent_id = '';
  categoryForm.icon = '';
  categoryForm.sort_order = 0;
}

function normalizeSkuRows(value: unknown, fallbackSku = ''): SkuRow[] {
  let rows: any[] = [];
  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }
  }

  const normalized = rows
    .map((row) => ({
      label: String(row?.label || row?.name || '').trim(),
      sku: String(row?.sku || '').trim(),
      price: row?.price !== undefined && row?.price !== null && row?.price !== '' ? String(row.price) : '',
      stock_qty: row?.stock_qty !== undefined && row?.stock_qty !== null && row?.stock_qty !== '' ? String(row.stock_qty) : '',
    }))
    .filter((row) => row.label || row.sku || row.price || row.stock_qty);

  if (normalized.length > 0) return normalized;
  return fallbackSku ? [{ label: 'Default', sku: fallbackSku, price: '', stock_qty: '' }] : [{ label: '', sku: '', price: '', stock_qty: '' }];
}

function skuCount(product: any) {
  const specs = Array.isArray(product.specifications) ? product.specifications : [];
  return specs.length || (product.sku ? 1 : 0) || 0;
}

function galleryCount(product: any) {
  return Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids.length : 0;
}

function getMediaLabel(item: any): string {
  const titleTag = Array.isArray(item.tags)
    ? item.tags.find((tag: string) => typeof tag === 'string' && tag.startsWith('title:'))
    : null;
  return titleTag ? titleTag.replace('title:', '') : item.category || item.r2_key.split('/').pop() || 'Media';
}

function openProductModal(product?: any) {
  if (product) {
    editingProduct.value = product;
    const parentId = product.category?.parent_id || product.category_id || '';
    const childId = product.category?.parent_id ? product.category_id : '';
    Object.assign(productForm, {
      seller_name: product.brand || '',
      category_parent_id: parentId,
      category_id: childId,
      title: product.title,
      description: product.description || '',
      price: product.price,
      currency: product.currency || 'BDT',
      stock_qty: product.stock_qty ?? 0,
      sku: product.sku || '',
      source_url: product.source_url || '',
      external_id: product.external_id || '',
      weight_kg: product.weight_kg ?? '',
      minimum_order_qty: product.minimum_order_qty ?? 1,
      status: product.status || 'published',
      cover_asset_id: product.cover_asset_id || '',
      gallery_asset_ids: Array.isArray(product.gallery_asset_ids) ? product.gallery_asset_ids.filter(Boolean) : [],
    });
    skuRows.value = normalizeSkuRows(product.specifications, product.sku || '');
  } else {
    editingProduct.value = null;
    resetProductForm();
  }
  if (mediaAssets.value.length === 0 && !mediaLoading.value) {
    void loadMediaAssets();
  }
  showProductModal.value = true;
}

function onProductMediaPick(event: Event) {
  const target = event.target as HTMLInputElement;
  productMediaFiles.value = Array.from(target.files || []).filter((file) => file.type.startsWith('image/'));
}

function openCategoryModal(category?: any) {
  if (category) {
    editingCategory.value = category;
    Object.assign(categoryForm, {
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id || '',
      icon: category.icon || '',
      sort_order: category.sort_order || 0,
    });
  } else {
    editingCategory.value = null;
    resetCategoryForm();
  }
  showCategoryModal.value = true;
}

async function loadCategories() {
  const response = await axios.get('/api/admin/categories/tree');
  categories.value = Array.isArray(response.data) ? response.data : [];
  if (!productForm.category_parent_id && categories.value[0]) {
    productForm.category_parent_id = categories.value[0].id;
  }
}

async function loadMediaAssets() {
  mediaLoading.value = true;
  try {
    const response = await axios.get('/api/admin/media', {
      params: {
        page: 1,
        limit: 500,
      },
    });
    mediaAssets.value = response.data?.media || [];
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load media assets');
  } finally {
    mediaLoading.value = false;
  }
}

async function uploadProductMedia() {
  if (productMediaFiles.value.length === 0) return;
  productMediaUploading.value = true;
  try {
    for (const file of productMediaFiles.value) {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post('/api/admin/media/upload', formData);
    }
    toast.success(`Uploaded ${productMediaFiles.value.length} image(s)`);
    productMediaFiles.value = [];
    if (productMediaInput.value) {
      productMediaInput.value.value = '';
    }
    await loadMediaAssets();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to upload media');
  } finally {
    productMediaUploading.value = false;
  }
}

async function loadProducts() {
  loadingProducts.value = true;
  try {
    const response = await axios.get('/api/admin/products', {
      params: {
        page: productPage.value,
        limit: productLimit.value,
        search: productSearch.value || undefined,
        category_id: productCategoryFilter.value || undefined,
        status: productStatusFilter.value || undefined,
      },
    });
    productRows.value = response.data?.products || [];
    productTotal.value = response.data?.total || 0;
    productTotalPages.value = response.data?.totalPages || 1;
    productPage.value = response.data?.page || productPage.value;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load shopping products');
  } finally {
    loadingProducts.value = false;
  }
}

async function loadAll() {
  loadingProducts.value = true;
  try {
    await Promise.all([loadCategories(), loadMediaAssets()]);
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load shopping management data');
  } finally {
    loadingProducts.value = false;
  }
}

function setCoverAsset(assetId: string) {
  productForm.cover_asset_id = assetId;
}

function toggleGalleryAsset(assetId: string) {
  const index = productForm.gallery_asset_ids.indexOf(assetId);
  if (index > -1) {
    productForm.gallery_asset_ids.splice(index, 1);
  } else {
    productForm.gallery_asset_ids.push(assetId);
  }
}

function addSkuRow() {
  skuRows.value.push({ label: '', sku: '', price: '', stock_qty: '' });
}

function removeSkuRow(index: number) {
  if (skuRows.value.length === 1) {
    skuRows.value[0] = { label: '', sku: '', price: '', stock_qty: '' };
    return;
  }
  skuRows.value.splice(index, 1);
}

function buildSpecifications() {
  return skuRows.value
    .map((row) => ({
      label: row.label.trim(),
      sku: row.sku.trim(),
      price: row.price === '' ? null : Number(row.price),
      stock_qty: row.stock_qty === '' ? null : Number(row.stock_qty),
    }))
    .filter((row) => row.label || row.sku || row.price !== null || row.stock_qty !== null);
}

async function saveProduct() {
  if (!productForm.category_parent_id && !productForm.category_id) {
    toast.error('Please select a category');
    return;
  }

  const categoryId = productForm.category_id || productForm.category_parent_id;
  if (!categoryId) {
    toast.error('Please select a category');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      seller_name: productForm.seller_name || undefined,
      category_id: categoryId,
      title: productForm.title,
      description: productForm.description || undefined,
      price: Number(productForm.price),
      currency: productForm.currency,
      stock_qty: Number(productForm.stock_qty || 0),
      sku: productForm.sku || undefined,
      source_url: productForm.source_url || undefined,
      external_id: productForm.external_id || undefined,
      weight_kg: productForm.weight_kg !== undefined && productForm.weight_kg !== null && productForm.weight_kg !== '' ? Number(productForm.weight_kg) : undefined,
      minimum_order_qty: Number(productForm.minimum_order_qty || 1),
      status: productForm.status,
      cover_asset_id: productForm.cover_asset_id || undefined,
      gallery_asset_ids: productForm.gallery_asset_ids,
      specifications: buildSpecifications(),
    };

    if (editingProduct.value) {
      await axios.patch(`/api/admin/products/${editingProduct.value.id}`, payload);
      toast.success('Product updated');
    } else {
      await axios.post('/api/admin/products', payload);
      toast.success('Product created');
    }

    showProductModal.value = false;
    editingProduct.value = null;
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save product');
  } finally {
    saving.value = false;
  }
}

async function deleteProduct(id: string) {
  if (!confirm('Delete this product?')) return;
  try {
    await axios.delete(`/api/admin/products/${id}`);
    toast.success('Product deleted');
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete product');
  }
}

async function saveCategory() {
  saving.value = true;
  try {
    if (editingCategory.value) {
      await axios.patch(`/api/admin/categories/${editingCategory.value.id}`, categoryForm);
      toast.success('Category updated');
    } else {
      await axios.post('/api/admin/categories', categoryForm);
      toast.success('Category created');
    }
    showCategoryModal.value = false;
    editingCategory.value = null;
    await loadCategories();
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save category');
  } finally {
    saving.value = false;
  }
}

async function deleteCategory(id: string) {
  if (!confirm('Delete this category?')) return;
  try {
    await axios.delete(`/api/admin/categories/${id}`);
    toast.success('Category deleted');
    await loadCategories();
    await loadProducts();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete category');
  }
}

function handleProductPageChange(nextPage: number) {
  productPage.value = nextPage;
  loadProducts();
}

function resetProductFilters() {
  productSearch.value = '';
  productCategoryFilter.value = '';
  productStatusFilter.value = '';
  productPage.value = 1;
  loadProducts();
}

let filterTimer: number | null = null;
watch([productSearch, productCategoryFilter, productStatusFilter], () => {
  productPage.value = 1;
  if (filterTimer) window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    loadProducts();
  }, 200);
});

onMounted(loadAll);
</script>
