<template>
  <div>
    <PageHeader :title="`Request: ${request?.category?.name || 'Service'}`" />
    
    <div v-if="loading" class="text-center py-8 text-slate-500">Loading request details...</div>
    <div v-else-if="!request" class="text-center py-8 text-red-500">Request not found.</div>
    <div v-else class="grid lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2">
        <CardHeader>
          <h3 class="text-lg font-semibold">Request Details</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-4">
            <div>
              <p class="text-sm font-medium text-slate-500">Category</p>
              <p class="text-slate-800">{{ request.category?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">City</p>
              <p class="text-slate-800">{{ request.city?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">Status</p>
              <Badge :variant="getStatusVariant(request.status)">{{ request.status }}</Badge>
            </div>
            <div v-if="request.request_payload">
              <p class="text-sm font-medium text-slate-500">Request Details</p>
              <pre class="bg-slate-50 p-3 rounded text-sm overflow-x-auto">{{ JSON.stringify(request.request_payload, null, 2) }}</pre>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Provider Offer</h3>
        </CardHeader>
        <CardBody>
          <div v-if="approvedOffer" class="space-y-3">
            <div>
              <p class="text-sm font-medium text-slate-500">Provider Note</p>
              <p class="text-slate-800 whitespace-pre-wrap">{{ approvedOffer.provider_note }}</p>
            </div>
            <div v-if="approvedOffer.payload_json && Object.keys(approvedOffer.payload_json).length > 0">
              <p class="text-sm font-medium text-slate-500">Offer Details</p>
              <pre class="bg-slate-50 p-2 rounded text-sm overflow-x-auto">{{ JSON.stringify(approvedOffer.payload_json, null, 2) }}</pre>
            </div>
            <Badge variant="success">Approved & Sent</Badge>
          </div>
          <div v-else class="text-sm text-slate-500">
            No offer received yet. Waiting for provider response.
          </div>
        </CardBody>
      </Card>

      <Card class="lg:col-span-3" v-if="request.status === 'quoted' || request.status === 'awaiting_payment'">
        <CardHeader>
          <h3 class="text-lg font-semibold">Payment Proof</h3>
        </CardHeader>
        <CardBody>
          <div v-if="paymentProof" class="space-y-3">
            <div>
              <p class="text-sm font-medium text-slate-500">Status</p>
              <Badge :variant="getPaymentProofVariant(paymentProof.status)">{{ paymentProof.status }}</Badge>
            </div>
            <div v-if="paymentProof.asset?.public_url">
              <p class="text-sm font-medium text-slate-500 mb-2">Uploaded Image</p>
              <img :src="paymentProof.asset.public_url" alt="Payment proof" class="max-w-md rounded-lg border" />
            </div>
            <p v-if="paymentProof.notes" class="text-sm text-slate-600">{{ paymentProof.notes }}</p>
          </div>
          <div v-else>
            <form @submit.prevent="uploadPaymentProof" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Upload Payment Proof</label>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  @change="handleFileSelect"
                  class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
              <Textarea
                v-model="paymentProofForm.notes"
                label="Notes (optional)"
                rows="3"
              />
              <Button type="submit" variant="primary" :loading="uploading" :disabled="!selectedFile">
                Upload Payment Proof
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardHeader, CardBody, Badge, Textarea, Button } from '@bridgechina/ui';

const route = useRoute();
const toast = useToast();

const request = ref<any>(null);
const approvedOffer = ref<any>(null);
const paymentProof = ref<any>(null);
const loading = ref(true);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const paymentProofForm = ref({
  notes: '',
});

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'new': return 'default';
    case 'dispatched': return 'warning';
    case 'quoted': return 'warning';
    case 'awaiting_payment': return 'warning';
    case 'confirmed': return 'success';
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    default: return 'default';
  }
}

function getPaymentProofVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'submitted': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    default: return 'default';
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
}

async function loadRequestDetails() {
  loading.value = true;
  try {
    const requestId = route.params.id as string;
    const response = await axios.get(`/api/user/requests/${requestId}`);
    request.value = response.data;

    // Find approved offer that was sent to user
    if (request.value.providerOffers) {
      approvedOffer.value = request.value.providerOffers.find(
        (offer: any) => offer.status === 'sent_to_user' || offer.status === 'approved'
      );
    }

    // Load payment proof if exists
    try {
      const proofResponse = await axios.get(`/api/user/requests/${requestId}/payment-proof`);
      paymentProof.value = proofResponse.data;
    } catch (error) {
      // Payment proof might not exist yet
      paymentProof.value = null;
    }
  } catch (error: any) {
    console.error('Failed to load request details:', error);
    toast.error(error.response?.data?.error || 'Failed to load request details');
  } finally {
    loading.value = false;
  }
}

async function uploadPaymentProof() {
  if (!selectedFile.value) {
    toast.error('Please select a file');
    return;
  }

  uploading.value = true;
  try {
    const requestId = route.params.id as string;

    // Step 1: Upload file and create media asset
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    const assetResponse = await axios.post('/api/user/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Step 2: Create payment proof record
    await axios.post(`/api/user/requests/${requestId}/payment-proof`, {
      asset_id: assetResponse.data.id,
      notes: paymentProofForm.value.notes || null,
    });

    toast.success('Payment proof uploaded successfully');
    await loadRequestDetails();
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    selectedFile.value = null;
    paymentProofForm.value.notes = '';
  } catch (error: any) {
    console.error('Failed to upload payment proof:', error);
    toast.error(error.response?.data?.error || 'Failed to upload payment proof');
  } finally {
    uploading.value = false;
  }
}

onMounted(() => {
  loadRequestDetails();
});
</script>

