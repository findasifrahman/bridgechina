<template>
  <div>
    <PageHeader title="Lead Details">
      <template #actions>
        <Button variant="secondary" @click="$router.back()">Back</Button>
        <Button variant="primary" @click="handleConvertToRequest">Convert to Request</Button>
      </template>
    </PageHeader>
    <div v-if="lead" class="space-y-6">
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Lead Information</h3>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600">Name</p>
              <p class="font-semibold">{{ lead.name }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Phone</p>
              <p class="font-semibold">{{ lead.phone }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Email</p>
              <p class="font-semibold">{{ lead.email || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Status</p>
              <StatusChip :status="lead.status" />
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Edit Lead</h3>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="handleUpdate" class="space-y-4">
            <Select
              v-model="updateData.status"
              label="Status"
              :options="statusOptions"
            />
            <Textarea v-model="updateData.notes" label="Notes" />
            <Button variant="primary" type="submit" :loading="updating">Update</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { PageHeader, Card, CardHeader, CardBody, StatusChip, Select, Textarea, Button } from '@bridgechina/ui';

const route = useRoute();
const router = useRouter();
const lead = ref<any>(null);
const updating = ref(false);
const updateData = ref({
  status: '',
  notes: '',
});

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

onMounted(async () => {
  try {
    const response = await axios.get(`/api/admin/leads/${route.params.id}`);
    lead.value = response.data;
    updateData.value.status = response.data.status;
    updateData.value.notes = response.data.notes || '';
  } catch (error) {
    console.error('Failed to load lead');
  }
});

async function handleUpdate() {
  updating.value = true;
  try {
    await axios.patch(`/api/admin/leads/${route.params.id}`, updateData.value);
    lead.value = { ...lead.value, ...updateData.value };
  } catch (error) {
    console.error('Failed to update lead');
  } finally {
    updating.value = false;
  }
}

async function handleConvertToRequest() {
  // Navigate to request page with lead data pre-filled
  router.push({
    name: 'request',
    query: {
      lead_id: lead.value.id,
      name: lead.value.name,
      phone: lead.value.phone,
      email: lead.value.email || '',
    },
  });
}
</script>

