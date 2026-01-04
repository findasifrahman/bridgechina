<template>
  <div>
    <PageHeader title="My Service Requests" />
    <Card>
      <CardBody>
        <EmptyState
          v-if="requests.length === 0"
          title="No requests yet"
          description="Submit your first service request"
        />
        <div v-else class="space-y-4">
          <div v-for="request in requests" :key="request.id" class="border-b pb-4">
            <div class="flex justify-between items-center">
              <div class="flex-1 cursor-pointer" @click="$router.push(`/app/requests/${request.id}`)">
                <p class="font-semibold">{{ request.category?.name || 'Service' }}</p>
                <p class="text-sm text-slate-600">{{ request.city?.name || 'N/A' }}</p>
                <p class="text-sm text-slate-500">{{ new Date(request.created_at).toLocaleDateString() }}</p>
              </div>
              <StatusChip :status="request.status" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardBody, StatusChip, EmptyState } from '@bridgechina/ui';

const requests = ref<any[]>([]);

onMounted(async () => {
  try {
    const response = await axios.get('/api/user/requests');
    requests.value = response.data;
  } catch (error) {
    console.error('Failed to load requests');
  }
});
</script>

