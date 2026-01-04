<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-3 sticky top-0 z-10">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-lg font-semibold">Provider Offers Queue</h1>
        <div class="flex items-center gap-2">
          <select
            v-model="filters.status"
            @change="loadOffers"
            class="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="sent_to_user">Sent to User</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Offers List -->
    <div class="flex-1 overflow-y-auto bg-white">
      <div v-if="loading" class="p-4 text-center text-sm text-slate-500">
        Loading...
      </div>
      <div v-else-if="offers.length === 0" class="p-4 text-center text-sm text-slate-500">
        No offers found
      </div>
      <div v-else class="divide-y divide-slate-200">
        <div
          v-for="offer in offers"
          :key="offer.id"
          class="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
          @click="selectedOfferId = offer.id"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                  {{ offer.service_type }}
                </span>
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    getStatusClass(offer.status)
                  ]"
                >
                  {{ offer.status }}
                </span>
                <span v-if="offer.request?.sla_due_at" class="text-xs text-slate-500">
                  SLA: {{ formatSlaTime(offer.request.sla_due_at) }}
                </span>
              </div>
              
              <div class="text-sm font-medium text-slate-900 mb-1">
                Provider: {{ offer.provider?.email || offer.provider?.phone || 'Unknown' }}
              </div>
              
              <div class="text-sm text-slate-600 line-clamp-2 mb-1">
                {{ offer.provider_note || 'No note provided' }}
              </div>
              
              <div class="text-xs text-slate-500">
                Submitted: {{ formatTime(offer.submitted_at) }}
              </div>
            </div>
            
            <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Offer Detail Modal -->
    <div
      v-if="selectedOffer"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="selectedOfferId = null"
    >
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">Offer Details</h2>
            <button
              @click="selectedOfferId = null"
              class="text-slate-400 hover:text-slate-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Offer Info -->
          <div class="space-y-4 mb-6">
            <div>
              <div class="text-sm font-medium text-slate-700 mb-1">Status</div>
              <span
                :class="[
                  'inline-block px-3 py-1 rounded-full text-sm font-medium',
                  getStatusClass(selectedOffer.status)
                ]"
              >
                {{ selectedOffer.status }}
              </span>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-1">Service Type</div>
              <div class="text-sm text-slate-900">{{ selectedOffer.service_type }}</div>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-1">Provider</div>
              <div class="text-sm text-slate-900">
                {{ selectedOffer.provider?.email || selectedOffer.provider?.phone || 'Unknown' }}
              </div>
            </div>

            <div>
              <div class="text-sm font-medium text-slate-700 mb-1">Provider Note</div>
              <div class="text-sm text-slate-900 bg-slate-50 p-3 rounded">
                {{ selectedOffer.provider_note || 'No note provided' }}
              </div>
            </div>

            <div v-if="selectedOffer.payload_json">
              <div class="text-sm font-medium text-slate-700 mb-1">Additional Details</div>
              <pre class="text-xs text-slate-600 bg-slate-50 p-3 rounded overflow-auto">{{ JSON.stringify(selectedOffer.payload_json, null, 2) }}</pre>
            </div>

            <div v-if="selectedOffer.request?.providerMessageContexts?.[0]">
              <div class="text-sm font-medium text-slate-700 mb-1">User Request</div>
              <div class="text-sm text-slate-900 bg-blue-50 p-3 rounded">
                {{ selectedOffer.request.providerMessageContexts[0].user_message_text }}
              </div>
            </div>

            <div v-if="selectedOffer.reject_reason">
              <div class="text-sm font-medium text-red-700 mb-1">Reject Reason</div>
              <div class="text-sm text-red-900 bg-red-50 p-3 rounded">
                {{ selectedOffer.reject_reason }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              v-if="selectedOffer.status === 'submitted'"
              @click="handleApprove"
              :disabled="processing"
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Approve
            </button>
            <button
              v-if="selectedOffer.status === 'submitted'"
              @click="showRejectModal = true"
              :disabled="processing"
              class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reject
            </button>
            <button
              v-if="selectedOffer.status === 'approved'"
              @click="handleSendToUser"
              :disabled="processing"
              class="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send to User
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div
      v-if="showRejectModal"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="showRejectModal = false"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold mb-4">Reject Offer</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Reject Reason
          </label>
          <textarea
            v-model="rejectReason"
            rows="4"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Enter reason for rejection..."
          ></textarea>
        </div>
        <div class="flex gap-3">
          <button
            @click="showRejectModal = false"
            class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleReject"
            :disabled="!rejectReason.trim() || processing"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from '@/utils/axios';

const offers = ref<any[]>([]);
const selectedOfferId = ref<string | null>(null);
const selectedOffer = ref<any | null>(null);
const loading = ref(false);
const processing = ref(false);
const filters = ref({
  status: 'submitted',
});
const showRejectModal = ref(false);
const rejectReason = ref('');

function formatTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatSlaTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 0) return 'Overdue';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h`;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    sent_to_user: 'bg-blue-100 text-blue-700',
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
}

async function loadOffers() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.status) params.status = filters.value.status;
    
    const response = await axios.get('/api/ops/offers', { params });
    offers.value = response.data.offers || [];
  } catch (error) {
    console.error('Failed to load offers:', error);
    alert('Failed to load offers');
  } finally {
    loading.value = false;
  }
}

async function loadOfferDetail(id: string) {
  try {
    // Extract request ID from offer (we need to find which request this offer belongs to)
    // For now, find it from the offers list
    const offerFromList = offers.value.find(o => o.id === id);
    if (!offerFromList || !offerFromList.request_id) {
      console.error('Offer not found or missing request_id');
      return;
    }
    
    const response = await axios.get(`/api/ops/requests/${offerFromList.request_id}`);
    // Find the offer in the response
    const request = response.data.request;
    const offer = request.providerOffers?.find((o: any) => o.id === id);
    if (offer) {
      selectedOffer.value = {
        ...offer,
        request,
        provider: offer.provider,
      };
    }
  } catch (error) {
    console.error('Failed to load offer detail:', error);
    alert('Failed to load offer details');
  }
}

watch(selectedOfferId, (newId) => {
  if (newId) {
    loadOfferDetail(newId);
  } else {
    selectedOffer.value = null;
  }
});

async function handleApprove() {
  if (!selectedOffer.value) return;
  
  processing.value = true;
  try {
    await axios.post(`/api/ops/offers/${selectedOffer.value.id}/approve`);
    alert('Offer approved successfully');
    await loadOffers();
    selectedOfferId.value = null;
  } catch (error: any) {
    console.error('Failed to approve offer:', error);
    alert(error.response?.data?.error || 'Failed to approve offer');
  } finally {
    processing.value = false;
  }
}

async function handleReject() {
  if (!selectedOffer.value || !rejectReason.value.trim()) return;
  
  processing.value = true;
  try {
    await axios.post(`/api/ops/offers/${selectedOffer.value.id}/reject`, {
      reject_reason: rejectReason.value.trim(),
    });
    alert('Offer rejected successfully');
    showRejectModal.value = false;
    rejectReason.value = '';
    await loadOffers();
    selectedOfferId.value = null;
  } catch (error: any) {
    console.error('Failed to reject offer:', error);
    alert(error.response?.data?.error || 'Failed to reject offer');
  } finally {
    processing.value = false;
  }
}

async function handleSendToUser() {
  if (!selectedOffer.value) return;
  
  if (!confirm('Send this offer to the user via WhatsApp?')) return;
  
  processing.value = true;
  try {
    await axios.post(`/api/ops/offers/${selectedOffer.value.id}/send-to-user`);
    alert('Offer sent to user successfully');
    await loadOffers();
    selectedOfferId.value = null;
  } catch (error: any) {
    console.error('Failed to send offer to user:', error);
    alert(error.response?.data?.error || 'Failed to send offer to user');
  } finally {
    processing.value = false;
  }
}

onMounted(() => {
  loadOffers();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

