<template>
  <div>
    <PageHeader title="Request Details">
      <template #actions>
        <Button variant="secondary" @click="$router.back()">Back</Button>
      </template>
    </PageHeader>
    <div v-if="loading" class="text-center py-8 text-slate-500">Loading request details...</div>
    <div v-else-if="!request" class="text-center py-8 text-red-500">Request not found.</div>
    <div v-else class="space-y-6">
      <!-- Bundle Requests -->
      <Card v-if="request.bundle_key && bundleRequests && bundleRequests.length > 0">
        <CardHeader>
          <h3 class="text-lg font-semibold">Related Requests (Bundle)</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-3">
            <p class="text-sm text-slate-600">
              This request is part of a bundle with {{ bundleRequests.length }} other service request(s).
            </p>
            <div class="grid md:grid-cols-2 gap-3">
              <div
                v-for="bundleReq in bundleRequests"
                :key="bundleReq.id"
                class="p-3 border border-slate-200 rounded-lg hover:border-teal-300 transition-colors cursor-pointer"
                @click="$router.push(`/ops/requests/${bundleReq.id}`)"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-semibold text-sm">{{ bundleReq.category?.name || 'Service' }}</p>
                    <p class="text-xs text-slate-600">{{ bundleReq.city?.name || 'N/A' }}</p>
                  </div>
                  <StatusChip :status="bundleReq.status" />
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Request Information -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Request Information</h3>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600">Category</p>
              <p class="font-semibold">{{ request.category?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Status</p>
              <StatusChip :status="request.status" />
            </div>
            <div>
              <p class="text-sm text-slate-600">Customer</p>
              <p class="font-semibold">{{ request.customer_name }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Phone</p>
              <p class="font-semibold">{{ request.phone }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Email</p>
              <p class="font-semibold">{{ request.email || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">City</p>
              <p class="font-semibold">{{ request.city?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Created</p>
              <p class="font-semibold">{{ new Date(request.created_at).toLocaleString() }}</p>
            </div>
            <div v-if="request.bundle_key">
              <p class="text-sm text-slate-600">Bundle</p>
              <Badge variant="info">Part of bundle</Badge>
            </div>
            <div v-if="request.total_amount !== null && request.total_amount !== undefined">
              <p class="text-sm text-slate-600">Total Amount</p>
              <p class="font-semibold">¥{{ request.total_amount.toFixed(2) }}</p>
            </div>
            <div v-if="request.paid_amount !== null && request.paid_amount !== undefined">
              <p class="text-sm text-slate-600">Paid Amount</p>
              <p class="font-semibold">¥{{ request.paid_amount.toFixed(2) }}</p>
            </div>
            <div v-if="request.due_amount !== null && request.due_amount !== undefined">
              <p class="text-sm text-slate-600">Due Amount</p>
              <p class="font-semibold">¥{{ request.due_amount.toFixed(2) }}</p>
            </div>
            <div v-if="request.is_fully_paid !== null && request.is_fully_paid !== undefined">
              <p class="text-sm text-slate-600">Payment Status</p>
              <Badge :variant="request.is_fully_paid ? 'success' : 'warning'">
                {{ request.is_fully_paid ? 'Fully Paid' : 'Partially Paid' }}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Status Timeline -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Status Timeline</h3>
        </CardHeader>
        <CardBody>
          <div v-if="!statusEvents || statusEvents.length === 0" class="text-sm text-slate-500">
            No status updates yet.
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="(event, index) in statusEvents"
              :key="event.id"
              class="flex gap-4 pb-4 border-b last:border-0"
            >
              <div class="flex-shrink-0">
                <div class="w-2 h-2 rounded-full bg-teal-500 mt-2"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <StatusChip :status="event.status_to" size="sm" />
                  <span class="text-xs text-slate-500">
                    {{ new Date(event.created_at).toLocaleString() }}
                  </span>
                </div>
                <p v-if="event.status_from" class="text-sm text-slate-600">
                  Changed from <span class="font-medium">{{ event.status_from }}</span> to
                  <span class="font-medium">{{ event.status_to }}</span>
                </p>
                <p v-else class="text-sm text-slate-600">
                  Status set to <span class="font-medium">{{ event.status_to }}</span>
                </p>
                <p v-if="event.note_user" class="text-sm text-slate-800 mt-1">
                  {{ event.note_user }}
                </p>
                <p v-if="event.createdBy" class="text-xs text-slate-400 mt-1">
                  by {{ event.createdBy.email }}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Update Status Form -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Update Status</h3>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="handleUpdateStatus" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">New Status</label>
              <select
                v-model="statusForm.status_to"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              >
                <option value="">Select status...</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="quoted">Quoted</option>
                <option value="confirmed">Confirmed</option>
                <option value="paid">Paid</option>
                <option value="booked">Booked</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Internal Note (OPS only)</label>
              <textarea
                v-model="statusForm.note_internal"
                rows="3"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Internal notes for OPS team..."
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">User-Facing Note</label>
              <textarea
                v-model="statusForm.note_user"
                rows="3"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Message to show to the user..."
              ></textarea>
            </div>
            <!-- Provider Assignment -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Assign Provider (Optional)</label>
              <select
                v-model="statusForm.assigned_to"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                :disabled="loadingProviders"
              >
                <option value="">No provider assignment</option>
                <option v-for="provider in eligibleProviders" :key="provider.user_id" :value="provider.user_id">
                  {{ provider.display_name || provider.company_name || provider.user?.email || 'N/A' }} ({{ provider.user?.email }})
                </option>
              </select>
              <p v-if="loadingProviders" class="text-xs text-slate-500 mt-1">Loading providers...</p>
              <p v-else-if="eligibleProviders.length === 0" class="text-xs text-slate-500 mt-1">No eligible providers found for this service category and city.</p>
            </div>

            <!-- Payment Amount Fields -->
            <div class="grid md:grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Total Amount (CNY)</label>
                <input
                  v-model.number="statusForm.total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Paid Amount (CNY)</label>
                <input
                  v-model.number="statusForm.paid_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0.00"
                />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="statusForm.is_fully_paid"
                    type="checkbox"
                    class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                  />
                  <span class="text-sm text-slate-700">Fully Paid</span>
                </label>
              </div>
            </div>

            <div class="flex items-center gap-4 pt-2 border-t">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="statusForm.notify_user"
                  type="checkbox"
                  id="notify_user"
                  class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span class="text-sm text-slate-700">Notify user via {{ request.conversation?.channel === 'whatsapp' ? 'WhatsApp' : 'WebChat' }}</span>
              </label>
              <label v-if="statusForm.assigned_to" class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="statusForm.notify_provider"
                  type="checkbox"
                  id="notify_provider"
                  class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span class="text-sm text-slate-700">Notify provider via WhatsApp</span>
              </label>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" @click="resetStatusForm">Cancel</Button>
              <Button variant="primary" type="submit" :loading="updatingStatus">Update Status</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <!-- Provider Offers -->
      <Card v-if="request.providerOffers && request.providerOffers.length > 0">
        <CardHeader>
          <h3 class="text-lg font-semibold">Provider Offers</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-4">
            <div
              v-for="offer in request.providerOffers"
              :key="offer.id"
              class="p-4 border border-slate-200 rounded-lg"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-semibold">Provider</p>
                  <p class="text-sm text-slate-600">{{ offer.provider?.email || 'N/A' }}</p>
                </div>
                <StatusChip :status="offer.status" />
              </div>
              <p v-if="offer.provider_note" class="text-sm text-slate-800 mt-2">
                {{ offer.provider_note }}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Payment Proof -->
      <Card v-if="paymentProofs && paymentProofs.length > 0">
        <CardHeader>
          <h3 class="text-lg font-semibold">Payment Proof</h3>
        </CardHeader>
        <CardBody>
          <div v-for="proof in paymentProofs" :key="proof.id" class="space-y-3 mb-4 pb-4 border-b last:border-0 last:mb-0 last:pb-0">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">Status</p>
                <Badge :variant="getPaymentProofVariant(proof.status)">{{ proof.status }}</Badge>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">Uploaded</p>
                <p class="text-sm text-slate-800">{{ new Date(proof.created_at).toLocaleString() }}</p>
              </div>
            </div>
            <div v-if="proof.asset?.public_url">
              <p class="text-sm font-medium text-slate-500 mb-2">Uploaded Image</p>
              <img :src="proof.asset.public_url" alt="Payment proof" class="max-w-md rounded-lg border cursor-pointer hover:opacity-90" @click="window.open(proof.asset.public_url, '_blank')" />
            </div>
            <p v-if="proof.notes" class="text-sm text-slate-600">{{ proof.notes }}</p>
            <div v-if="proof.reviewedBy" class="text-xs text-slate-500">
              Reviewed by: {{ proof.reviewedBy.email }} at {{ new Date(proof.reviewed_at).toLocaleString() }}
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Request Payload (JSON view) -->
      <Card v-if="request.request_payload">
        <CardHeader>
          <h3 class="text-lg font-semibold">Request Details</h3>
        </CardHeader>
        <CardBody>
          <pre class="bg-slate-50 p-3 rounded text-sm overflow-x-auto">{{ JSON.stringify(request.request_payload, null, 2) }}</pre>
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
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  StatusChip,
  Button,
  Badge,
} from '@bridgechina/ui';

const route = useRoute();
const toast = useToast();
const request = ref<any>(null);
const statusEvents = ref<any[]>([]);
const bundleRequests = ref<any[]>([]);
const paymentProofs = ref<any[]>([]);
const loading = ref(true);
const updatingStatus = ref(false);

const statusForm = ref({
  status_to: '',
  note_internal: '',
  note_user: '',
  notify_user: false,
  notify_provider: false,
  assigned_to: '',
  total_amount: undefined as number | undefined,
  paid_amount: undefined as number | undefined,
  is_fully_paid: false,
});
const eligibleProviders = ref<any[]>([]);
const loadingProviders = ref(false);

async function loadRequest() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/ops/requests/${route.params.id}`);
    request.value = response.data.request;
    statusEvents.value = response.data.request.statusEvents || [];
    bundleRequests.value = response.data.bundleRequests || [];
    paymentProofs.value = response.data.request.paymentProofs || [];
    
    // Initialize form with current status and payment amounts
    statusForm.value.status_to = request.value.status || '';
    statusForm.value.assigned_to = request.value.assigned_to || '';
    statusForm.value.total_amount = request.value.total_amount || undefined;
    statusForm.value.paid_amount = request.value.paid_amount || undefined;
    statusForm.value.is_fully_paid = request.value.is_fully_paid || false;

    // Always load eligible providers
    await loadEligibleProviders();
  } catch (error: any) {
    console.error('Failed to load request:', error);
    toast.error(error.response?.data?.error || 'Failed to load request');
  } finally {
    loading.value = false;
  }
}

async function loadEligibleProviders() {
  loadingProviders.value = true;
  try {
    const response = await axios.get(`/api/ops/requests/${route.params.id}/providers`);
    eligibleProviders.value = response.data || [];
  } catch (error: any) {
    console.error('Failed to load providers:', error);
    // Don't show error toast for providers, it's optional
  } finally {
    loadingProviders.value = false;
  }
}

async function handleUpdateStatus() {
  if (!statusForm.value.status_to) {
    toast.error('Please select a status');
    return;
  }

  updatingStatus.value = true;
  try {
    // Prepare payload - convert empty string to undefined for assigned_to
    const payload = {
      ...statusForm.value,
      assigned_to: statusForm.value.assigned_to === '' ? undefined : statusForm.value.assigned_to,
    };
    await axios.post(`/api/ops/requests/${route.params.id}/status`, payload);
    toast.success('Status updated successfully');
    resetStatusForm();
    await loadRequest(); // Reload to get updated timeline
  } catch (error: any) {
    console.error('Failed to update status:', error);
    toast.error(error.response?.data?.error || 'Failed to update status');
  } finally {
    updatingStatus.value = false;
  }
}

function resetStatusForm() {
  statusForm.value = {
    status_to: request.value?.status || '',
    note_internal: '',
    note_user: '',
    notify_user: false,
    notify_provider: false,
    assigned_to: request.value?.assigned_to || '',
    total_amount: request.value?.total_amount || undefined,
    paid_amount: request.value?.paid_amount || undefined,
    is_fully_paid: request.value?.is_fully_paid || false,
  };
}

function getPaymentProofVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'submitted': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    default: return 'default';
  }
}

onMounted(() => {
  loadRequest();
});
</script>

