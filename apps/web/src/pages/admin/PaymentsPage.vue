<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <PageHeader title="Payment Proofs" subtitle="Review customer payment slips before warehouse processing" />
      <Button variant="ghost" size="sm" @click="loadProofs" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>

    <Card>
      <CardBody>
        <div v-if="loading" class="py-10 text-center text-slate-500">Loading payment proofs...</div>
        <div v-else-if="proofs.length === 0" class="py-10 text-center text-slate-500">No payment proofs found</div>
        <div v-else class="space-y-4">
          <div v-for="proof in proofs" :key="proof.id" class="rounded-2xl border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="font-semibold text-slate-900">Order #{{ proof.order?.order_number }}</div>
                <div class="text-sm text-slate-500">{{ proof.order?.user?.email || 'Customer' }} • {{ new Date(proof.created_at).toLocaleString() }}</div>
                <div class="mt-1 text-sm text-slate-500">Submitted by: {{ proof.submitter?.email || 'Customer' }}</div>
              </div>
              <Badge :variant="badgeVariant(proof.status)">{{ proof.status }}</Badge>
            </div>

            <div class="mt-4 grid gap-4 xl:grid-cols-[1fr_220px]">
              <div class="space-y-2">
                <div class="text-sm text-slate-600">Amount: <span class="font-medium text-slate-900">{{ proof.amount ?? 'n/a' }}</span></div>
                <div class="text-sm text-slate-600">Note: <span class="font-medium text-slate-900">{{ proof.notes || 'None' }}</span></div>
                <a v-if="proof.asset?.public_url" :href="proof.asset.public_url" target="_blank" class="inline-flex text-teal-600 hover:underline text-sm">
                  Open uploaded slip
                </a>
              </div>
              <div class="flex flex-wrap gap-2 xl:justify-end">
                <Button size="sm" variant="primary" @click="approve(proof.id)" :disabled="proof.status !== 'submitted'">Approve</Button>
                <Button size="sm" variant="ghost" class="text-red-600 hover:text-red-700" @click="reject(proof.id)" :disabled="proof.status !== 'submitted'">Reject</Button>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardBody, Button, Badge } from '@bridgechina/ui';
import { RefreshCw } from 'lucide-vue-next';

const toast = useToast();
const loading = ref(false);
const proofs = ref<any[]>([]);

function badgeVariant(value: string) {
  if (value === 'approved') return 'success';
  if (value === 'submitted') return 'warning';
  if (value === 'rejected') return 'danger';
  return 'default';
}

async function loadProofs() {
  loading.value = true;
  try {
    const response = await axios.get('/api/admin/payment-proofs');
    proofs.value = response.data || [];
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load payment proofs');
  } finally {
    loading.value = false;
  }
}

async function approve(id: string) {
  try {
    await axios.patch(`/api/admin/payment-proofs/${id}/approve`, {});
    toast.success('Payment proof approved');
    await loadProofs();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to approve proof');
  }
}

async function reject(id: string) {
  try {
    await axios.patch(`/api/admin/payment-proofs/${id}/reject`, {});
    toast.success('Payment proof rejected');
    await loadProofs();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to reject proof');
  }
}

onMounted(loadProofs);
</script>
