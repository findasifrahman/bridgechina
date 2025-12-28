<template>
  <div>
    <PageHeader title="Leads">
      <template #actions>
        <Button variant="primary" @click="showCreateModal = true">New Lead</Button>
      </template>
    </PageHeader>
    <Card>
      <CardBody>
        <Table :columns="columns">
          <tr
            v-for="lead in leads"
            :key="lead.id"
            class="hover:bg-slate-50 cursor-pointer"
            @click="$router.push(`/admin/leads/${lead.id}`)"
          >
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.phone }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <StatusChip :status="lead.status" />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">{{ lead.owner?.email || 'Unassigned' }}</td>
            <td class="px-6 py-4 whitespace-nowrap">{{ new Date(lead.created_at).toLocaleDateString() }}</td>
          </tr>
        </Table>
        <EmptyState
          v-if="leads.length === 0"
          title="No leads"
          description="Leads will appear here"
        />
      </CardBody>
    </Card>

    <!-- Create Lead Modal -->
    <Modal v-model="showCreateModal" title="Create New Lead">
      <form @submit.prevent="handleCreateLead" class="space-y-4">
        <Input v-model="newLead.name" label="Name" required />
        <Input v-model="newLead.phone" label="Phone" required />
        <Input v-model="newLead.email" label="Email" type="email" />
        <Input v-model="newLead.whatsapp" label="WhatsApp" />
        <Textarea v-model="newLead.notes" label="Notes" />
        <div class="flex justify-end gap-3">
          <Button variant="ghost" @click="showCreateModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="creating">Create</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardBody, Table, Button, StatusChip, Modal, Input, Textarea, EmptyState } from '@bridgechina/ui';

const leads = ref<any[]>([]);
const showCreateModal = ref(false);
const creating = ref(false);
const newLead = ref({
  name: '',
  phone: '',
  email: '',
  whatsapp: '',
  notes: '',
});

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'owner', label: 'Owner' },
  { key: 'created', label: 'Created' },
];

async function loadLeads() {
  try {
    const response = await axios.get('/api/admin/leads');
    leads.value = response.data;
  } catch (error) {
    console.error('Failed to load leads');
  }
}

async function handleCreateLead() {
  creating.value = true;
  try {
    await axios.post('/api/public/lead', newLead.value);
    showCreateModal.value = false;
    newLead.value = { name: '', phone: '', email: '', whatsapp: '', notes: '' };
    await loadLeads();
  } catch (error) {
    console.error('Failed to create lead');
  } finally {
    creating.value = false;
  }
}

onMounted(loadLeads);
</script>
