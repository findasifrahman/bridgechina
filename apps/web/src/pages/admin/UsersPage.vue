<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <PageHeader title="User Management" subtitle="Search, review, role manage, and delete customers in a compact table" />
      <Button variant="ghost" size="sm" @click="loadUsers" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody class="space-y-3">
        <div class="grid gap-3 lg:grid-cols-4">
          <Input v-model="filters.search" label="Search" placeholder="Email, phone, name" @input="onFilterChange" />
          <Select v-model="filters.role" label="Role" :options="roleOptions" @update:modelValue="onFilterChange" />
          <Select v-model="filters.status" label="Status" :options="statusOptions" @update:modelValue="onFilterChange" />
          <div class="self-end text-xs text-slate-500">{{ total }} users</div>
        </div>
      </CardBody>
    </Card>

    <Card>
      <CardBody class="p-0">
        <div v-if="loading" class="px-4 py-10 text-center text-sm text-slate-500">Loading users...</div>
        <div v-else-if="users.length === 0" class="px-4 py-10 text-center text-sm text-slate-500">No users found</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full border-separate border-spacing-0 text-[12px]">
            <thead class="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left">User</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Roles</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Profile</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left">Customer review</th>
                <th class="border-b border-slate-200 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="align-top hover:bg-slate-50/80">
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="space-y-1">
                    <div class="font-semibold text-slate-900">{{ user.customerProfile?.full_name || user.sellerProfile?.shop_name || user.email || 'User' }}</div>
                    <div class="text-slate-500">{{ user.email || 'No email' }}</div>
                    <div class="text-slate-500">{{ user.phone || 'No phone' }}</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="role in user.roles"
                      :key="role.role.id"
                      :variant="getRoleVariant(role.role.name)"
                      class="text-[11px]"
                    >
                      {{ role.role.name }}
                    </Badge>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="space-y-1 text-slate-600">
                    <div>Status: <span class="font-medium text-slate-900">{{ user.status }}</span></div>
                    <div>Joined: {{ formatDate(user.created_at) }}</div>
                    <div v-if="user.customerProfile?.preferred_currency">Currency: {{ user.customerProfile.preferred_currency }}</div>
                    <div v-if="user.sellerProfile?.verified" class="text-emerald-700">Seller verified</div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2">
                  <div class="space-y-1">
                    <div class="text-slate-900">{{ user.customerProfile?.internal_rating ?? '—' }}/10</div>
                    <div class="max-w-[18rem] text-slate-500">{{ user.customerProfile?.internal_note || 'No internal note' }}</div>
                    <div v-if="user.customerProfile?.internal_note_updated_at" class="text-slate-400">
                      Updated {{ formatDate(user.customerProfile.internal_note_updated_at) }}
                    </div>
                  </div>
                </td>
                <td class="border-b border-slate-100 px-3 py-2 text-right">
                  <div class="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" class="h-7 px-2 text-[11px]" @click="openDetail(user)">View</Button>
                    <Button size="sm" variant="ghost" class="h-7 px-2 text-[11px]" @click="editUserRoles(user)">Roles</Button>
                    <Button size="sm" variant="ghost" class="h-7 px-2 text-[11px] text-rose-600" @click="openReviewModal(user)">Review</Button>
                    <Button size="sm" variant="ghost" class="h-7 px-2 text-[11px] text-rose-600" @click="deleteCustomer(user)">Delete</Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200">
          <Pagination :current-page="page" :total-pages="totalPages" :total="total" :page-size="limit" @update:currentPage="handlePageChange" />
        </div>
      </CardBody>
    </Card>

    <Modal v-model="showDetailModal" title="Customer profile" size="xl">
      <div v-if="selectedUser" class="space-y-4">
        <div class="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Identity</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ selectedUser.customerProfile?.full_name || selectedUser.email || 'Customer' }}</div>
            <div class="mt-2 space-y-1 text-sm text-slate-600">
              <div>Email: {{ selectedUser.email || 'N/A' }}</div>
              <div>Phone: {{ selectedUser.phone || 'N/A' }}</div>
              <div>Role(s): {{ selectedUserRoleNames }}</div>
            </div>
          </div>

          <div class="space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input v-model.number="reviewForm.rating" type="number" min="1" max="10" label="Internal rating" />
            <Textarea v-model="reviewForm.note" label="Internal note" rows="4" placeholder="Premium client, return risk, special handling..." />
            <div class="flex justify-end gap-2">
              <Button variant="ghost" class="text-rose-600" :loading="deleting" @click="deleteCustomer(selectedUser)">Delete</Button>
              <Button variant="primary" :loading="reviewing" @click="saveReview">Save review</Button>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <Card class="shadow-none">
            <CardBody>
              <div class="mb-2 text-sm font-semibold text-slate-900">Addresses</div>
              <div v-if="customerDetail?.addresses?.length" class="space-y-2">
                <div v-for="address in customerDetail.addresses" :key="address.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="font-medium text-slate-900">{{ address.name }}</div>
                  <div class="text-slate-600">{{ address.phone }} • {{ address.city }}</div>
                  <div class="text-slate-500">{{ address.address_line }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500">No addresses saved.</div>
            </CardBody>
          </Card>

          <Card class="shadow-none">
            <CardBody>
              <div class="mb-2 text-sm font-semibold text-slate-900">Recent orders</div>
              <div v-if="customerDetail?.orders?.length" class="space-y-2">
                <div v-for="order in customerDetail.orders" :key="order.id" class="rounded-xl border border-slate-200 p-3 text-sm">
                  <div class="font-medium text-slate-900">#{{ order.order_number }}</div>
                  <div class="text-slate-600">{{ formatDate(order.created_at) }} • {{ formatMoney(order.total, order.currency) }}</div>
                </div>
              </div>
              <div v-else class="text-sm text-slate-500">No recent orders.</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Modal>

    <Modal v-model="showRolesModal" title="Edit user roles">
      <div v-if="selectedUser" class="space-y-4">
        <p class="text-slate-600">{{ selectedUser.email || selectedUser.phone }}</p>
        <div class="space-y-2">
          <Checkbox
            v-for="role in allRoles"
            :key="role.id"
            :id="`role-${role.id}`"
            :model-value="userRoles.includes(role.id)"
            :label="role.name"
            @update:model-value="toggleRole(role.id)"
          />
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" @click="showRolesModal = false">Cancel</Button>
          <Button variant="primary" :loading="updating" @click="handleUpdateRoles">Save</Button>
        </div>
      </div>
    </Modal>

    <Modal v-model="showReviewModal" title="Review customer">
      <div v-if="selectedUser" class="space-y-4">
        <p class="text-slate-600">{{ selectedUser.email || selectedUser.phone }}</p>
        <Input v-model.number="reviewForm.rating" type="number" min="1" max="10" label="Rating (1-10)" />
        <Textarea v-model="reviewForm.note" label="Internal note" placeholder="Premium client, return risk, special handling..." rows="4" />
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" @click="showReviewModal = false">Cancel</Button>
          <Button variant="primary" :loading="reviewing" @click="saveReview">Save</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardBody, Badge, Button, Modal, Checkbox, Input, Select, Pagination, Textarea } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const users = ref<any[]>([]);
const allRoles = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const limit = ref(25);
const filters = reactive({
  search: '',
  role: 'CUSTOMER',
  status: '',
});

const showRolesModal = ref(false);
const showReviewModal = ref(false);
const showDetailModal = ref(false);
const selectedUser = ref<any>(null);
const userRoles = ref<string[]>([]);
const updating = ref(false);
const reviewing = ref(false);
const deleting = ref(false);
const customerDetail = ref<any>(null);
const toast = useToast();
const reviewForm = ref({
  rating: 10,
  note: '',
});
const selectedUserRoleNames = ref('');

const roleOptions = [
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'SELLER', label: 'Sellers' },
  { value: 'ADMIN', label: 'Admins' },
  { value: '', label: 'All roles' },
];

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
];

function getRoleVariant(roleName: string) {
  if (roleName === 'ADMIN') return 'danger';
  if (roleName === 'SELLER') return 'accent';
  return 'default';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(amount: number | null | undefined, currency = 'BDT') {
  return `${currency} ${(amount ?? 0).toLocaleString()}`;
}

function openDetail(user: any) {
  selectedUser.value = user;
  selectedUserRoleNames.value = (user.roles || []).map((r: any) => r.role?.name).join(', ');
  customerDetail.value = null;
  showDetailModal.value = true;
  loadCustomerDetail(user.id);
}

function editUserRoles(user: any) {
  selectedUser.value = user;
  userRoles.value = user.roles.map((ur: any) => ur.role?.id || ur.role_id);
  showRolesModal.value = true;
}

function openReviewModal(user: any) {
  selectedUser.value = user;
  reviewForm.value = {
    rating: user.customerProfile?.internal_rating || 10,
    note: user.customerProfile?.internal_note || '',
  };
  showReviewModal.value = true;
}

function toggleRole(roleId: string) {
  const index = userRoles.value.indexOf(roleId);
  if (index > -1) userRoles.value.splice(index, 1);
  else userRoles.value.push(roleId);
}

async function handleUpdateRoles() {
  updating.value = true;
  try {
    await axios.put(`/api/admin/users/${selectedUser.value.id}/roles`, {
      role_ids: userRoles.value,
    });
    toast.success('Roles updated');
    showRolesModal.value = false;
    await loadUsers();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update roles');
  } finally {
    updating.value = false;
  }
}

async function saveReview() {
  if (!selectedUser.value) return;
  reviewing.value = true;
  try {
    await axios.patch(`/api/admin/customers/${selectedUser.value.id}/review`, {
      rating: Number(reviewForm.value.rating || 10),
      note: reviewForm.value.note || undefined,
    });
    toast.success('Customer review saved');
    showReviewModal.value = false;
    await loadUsers();
    if (showDetailModal.value) {
      await loadCustomerDetail(selectedUser.value.id);
    }
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save customer review');
  } finally {
    reviewing.value = false;
  }
}

async function deleteCustomer(user: any) {
  if (!confirm(`Delete customer ${user.email || user.phone || user.id}? This will also delete their related orders.`)) {
    return;
  }
  deleting.value = true;
  try {
    await axios.delete(`/api/admin/users/${user.id}`);
    toast.success('Customer deleted');
    showDetailModal.value = false;
    showReviewModal.value = false;
    await loadUsers();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete customer');
  } finally {
    deleting.value = false;
  }
}

async function loadUsers() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/users', {
      params: {
        page: page.value,
        limit: limit.value,
        search: filters.search || undefined,
        role: filters.role || undefined,
      },
    });
    const payload = response.data || {};
    users.value = payload.users || [];
    total.value = payload.total || 0;
    totalPages.value = payload.totalPages || 1;
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load users');
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  try {
    const response = await axios.get('/api/admin/roles');
    allRoles.value = response.data || [];
  } catch (error) {
    console.error('Failed to load roles:', error);
  }
}

async function loadCustomerDetail(userId: string) {
  try {
    const response = await axios.get(`/api/admin/customers/${userId}`);
    customerDetail.value = response.data;
  } catch (error) {
    console.error('Failed to load customer detail', error);
  }
}

function onFilterChange() {
  page.value = 1;
  loadUsers();
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  loadUsers();
}

onMounted(async () => {
  await loadUsers();
  await loadRoles();
});
</script>
