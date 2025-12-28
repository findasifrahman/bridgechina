<template>
  <div>
    <PageHeader title="User Management" />
    <Card>
      <CardBody>
        <Table :columns="columns">
          <tr v-for="user in users" :key="user.id">
            <td class="px-6 py-4 whitespace-nowrap">{{ user.email || user.phone || 'N/A' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex gap-1 flex-wrap">
                <Badge
                  v-for="role in user.roles"
                  :key="role.role.id"
                  :variant="getRoleVariant(role.role.name)"
                >
                  {{ role.role.name }}
                </Badge>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <StatusChip :status="user.status" />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <Button variant="ghost" size="sm" @click="editUserRoles(user)">Edit Roles</Button>
            </td>
          </tr>
        </Table>
        <EmptyState
          v-if="users.length === 0"
          title="No users"
          description="Users will appear here"
        />
      </CardBody>
    </Card>

    <!-- Edit Roles Modal -->
    <Modal v-model="showRolesModal" title="Edit User Roles">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import {
  PageHeader,
  Card,
  CardBody,
  Table,
  Badge,
  StatusChip,
  Button,
  Modal,
  Checkbox,
  EmptyState,
} from '@bridgechina/ui';

const users = ref<any[]>([]);
const allRoles = ref<any[]>([]);
const showRolesModal = ref(false);
const selectedUser = ref<any>(null);
const userRoles = ref<string[]>([]);
const updating = ref(false);
const toast = useToast();

const columns = [
  { key: 'email', label: 'Email/Phone' },
  { key: 'roles', label: 'Roles' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
];

function getRoleVariant(roleName: string) {
  if (roleName === 'ADMIN') return 'danger';
  if (roleName === 'SELLER') return 'accent';
  return 'default';
}

function editUserRoles(user: any) {
  selectedUser.value = user;
  userRoles.value = user.roles.map((ur: any) => ur.role_id);
  showRolesModal.value = true;
}

function toggleRole(roleId: string) {
  const index = userRoles.value.indexOf(roleId);
  if (index > -1) {
    userRoles.value.splice(index, 1);
  } else {
    userRoles.value.push(roleId);
  }
}

async function handleUpdateRoles() {
  updating.value = true;
  try {
    // We'll need to add this endpoint
    await axios.patch(`/api/admin/users/${selectedUser.value.id}/roles`, {
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

async function loadUsers() {
  try {
    const response = await axios.get('/api/admin/users');
    users.value = response.data;
  } catch (error) {
    console.error('Failed to load users');
  }
}

async function loadRoles() {
  try {
    // We'll need a roles endpoint or extract from users
    // For now, extract unique roles from users
    const roleMap = new Map();
    users.value.forEach((user) => {
      user.roles.forEach((ur: any) => {
        if (!roleMap.has(ur.role.id)) {
          roleMap.set(ur.role.id, ur.role);
        }
      });
    });
    allRoles.value = Array.from(roleMap.values());
  } catch (error) {
    console.error('Failed to load roles');
  }
}

onMounted(async () => {
  await loadUsers();
  await loadRoles();
});
</script>
