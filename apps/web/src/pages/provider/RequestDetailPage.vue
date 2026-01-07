<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-3 sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <button
          @click="$router.back()"
          class="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-semibold">Request Details</h1>
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-slate-500">Loading...</div>
    </div>

    <div v-else-if="request" class="flex-1 overflow-y-auto p-4">
      <!-- Request Info -->
      <div class="bg-white rounded-lg p-4 mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
            {{ request.request.category.key }}
          </span>
          <span
            :class="[
              'px-3 py-1 rounded-full text-sm font-medium',
              getStatusClass(dispatch?.status || 'sent')
            ]"
          >
            {{ dispatch?.status || 'sent' }}
          </span>
          <span v-if="request.request.sla_due_at" class="text-sm text-slate-500">
            SLA: {{ formatSlaTime(request.request.sla_due_at) }}
          </span>
        </div>

        <div class="text-sm text-slate-600 mb-2">
          <strong>City:</strong> {{ request.request.city.name }}
        </div>

        <div v-if="request.request.providerMessageContexts?.[0]" class="mb-4">
          <div class="text-sm font-medium text-slate-900 mb-2">User Request:</div>
          <div class="text-sm text-slate-700 bg-slate-50 p-3 rounded">
            {{ request.request.providerMessageContexts[0].user_message_text }}
          </div>
          
          <div v-if="request.request.providerMessageContexts[0].extracted_summary" class="mt-3">
            <div class="text-sm font-medium text-slate-900 mb-2">Summary:</div>
            <div class="text-sm text-slate-700 bg-blue-50 p-3 rounded">
              {{ request.request.providerMessageContexts[0].extracted_summary }}
            </div>
          </div>
        </div>

        <div v-if="request.request.providerMessageContexts?.[0]?.extracted_payload" class="mb-4">
          <div class="text-sm font-medium text-slate-900 mb-2">AI Extracted Details:</div>
          <pre class="text-xs text-slate-600 bg-slate-50 p-3 rounded overflow-auto">{{ JSON.stringify(request.request.providerMessageContexts[0].extracted_payload, null, 2) }}</pre>
        </div>
      </div>

      <!-- Request Payload (Organized View) -->
      <div v-if="request.request.request_payload" class="bg-white rounded-lg p-4 mb-4">
        <div class="text-sm font-medium text-slate-900 mb-3">Request Details</div>
        <div class="bg-slate-50 rounded-lg p-4 space-y-3">
          <!-- Shopping Request (Cart Items) -->
          <template v-if="request.request.category?.key === 'shopping' && request.request.request_payload.items && Array.isArray(request.request.request_payload.items)">
            <div class="space-y-3">
              <div v-for="(item, idx) in request.request.request_payload.items" :key="idx" class="bg-white rounded-lg p-3 border border-slate-200">
                <div class="flex gap-3">
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.title"
                    class="w-16 h-16 object-cover rounded border border-slate-200 flex-shrink-0"
                  />
                  <div class="flex-1">
                    <h6 class="font-semibold text-slate-900 text-sm mb-1">{{ item.title }}</h6>
                    <div class="text-xs space-y-1">
                      <div><span class="text-slate-500">Qty:</span> <span class="font-medium">{{ item.qty }}</span></div>
                      <div v-if="item.priceMin || item.priceMax">
                        <span class="text-slate-500">Price:</span>
                        <span v-if="item.priceMin && item.priceMax && item.priceMin !== item.priceMax" class="font-medium text-teal-600">
                          ¥{{ item.priceMin }}-{{ item.priceMax }}
                        </span>
                        <span v-else-if="item.priceMin" class="font-medium text-teal-600">¥{{ item.priceMin }}</span>
                      </div>
                      <div v-if="item.externalId" class="text-slate-400">
                        ID: {{ item.externalId }}
                      </div>
                      <div v-if="item.skuDetails && item.skuDetails.length > 0" class="mt-2 pt-2 border-t border-slate-200">
                        <div v-for="(sku, skuIdx) in item.skuDetails" :key="skuIdx" class="text-xs text-slate-600">
                          • {{ sku.sku?.props_names || `Option ${skuIdx + 1}` }} - Qty: {{ sku.qty }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Shopping Request (Simple Form) -->
          <template v-else-if="request.request.category?.key === 'shopping'">
            <div class="space-y-2 text-sm">
              <div v-if="request.request.request_payload.items_description">
                <span class="font-medium text-slate-700">Items:</span>
                <p class="text-slate-900 mt-1">{{ request.request.request_payload.items_description }}</p>
              </div>
              <div v-if="request.request.request_payload.budget" class="flex gap-4">
                <div>
                  <span class="font-medium text-slate-700">Budget:</span>
                  <span class="text-slate-900 ml-2">¥{{ request.request.request_payload.budget }}</span>
                </div>
                <div v-if="request.request.request_payload.preferred_stores">
                  <span class="font-medium text-slate-700">Stores:</span>
                  <span class="text-slate-900 ml-2">{{ request.request.request_payload.preferred_stores }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Hotel Request -->
          <template v-else-if="request.request.category?.key === 'hotel'">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div v-if="request.request.request_payload.hotel_name || request.request.request_payload.hotelName">
                <span class="font-medium text-slate-700">Hotel:</span>
                <p class="text-slate-900">{{ request.request.request_payload.hotel_name || request.request.request_payload.hotelName }}</p>
              </div>
              <div v-if="request.request.request_payload.check_in || request.request.request_payload.checkIn">
                <span class="font-medium text-slate-700">Check-in:</span>
                <p class="text-slate-900">{{ request.request.request_payload.check_in || request.request.request_payload.checkIn }}</p>
              </div>
              <div v-if="request.request.request_payload.check_out || request.request.request_payload.checkOut">
                <span class="font-medium text-slate-700">Check-out:</span>
                <p class="text-slate-900">{{ request.request.request_payload.check_out || request.request.request_payload.checkOut }}</p>
              </div>
              <div v-if="request.request.request_payload.guests">
                <span class="font-medium text-slate-700">Guests:</span>
                <p class="text-slate-900">{{ request.request.request_payload.guests }}</p>
              </div>
              <div v-if="request.request.request_payload.rooms || request.request.request_payload.room_qty">
                <span class="font-medium text-slate-700">Rooms:</span>
                <p class="text-slate-900">{{ request.request.request_payload.rooms || request.request.request_payload.room_qty }}</p>
              </div>
            </div>
          </template>

          <!-- Transport Request -->
          <template v-else-if="request.request.category?.key === 'transport'">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div v-if="request.request.request_payload.from_location || request.request.request_payload.fromLocation">
                <span class="font-medium text-slate-700">From:</span>
                <p class="text-slate-900">{{ request.request.request_payload.from_location || request.request.request_payload.fromLocation }}</p>
              </div>
              <div v-if="request.request.request_payload.to_location || request.request.request_payload.toLocation">
                <span class="font-medium text-slate-700">To:</span>
                <p class="text-slate-900">{{ request.request.request_payload.to_location || request.request.request_payload.toLocation }}</p>
              </div>
              <div v-if="request.request.request_payload.date">
                <span class="font-medium text-slate-700">Date:</span>
                <p class="text-slate-900">{{ request.request.request_payload.date }}</p>
              </div>
              <div v-if="request.request.request_payload.time">
                <span class="font-medium text-slate-700">Time:</span>
                <p class="text-slate-900">{{ request.request.request_payload.time }}</p>
              </div>
              <div v-if="request.request.request_payload.passengers">
                <span class="font-medium text-slate-700">Passengers:</span>
                <p class="text-slate-900">{{ request.request.request_payload.passengers }}</p>
              </div>
              <div v-if="request.request.request_payload.vehicle_type || request.request.request_payload.vehicleType">
                <span class="font-medium text-slate-700">Vehicle:</span>
                <p class="text-slate-900">{{ request.request.request_payload.vehicle_type || request.request.request_payload.vehicleType }}</p>
              </div>
            </div>
          </template>

          <!-- Generic Display -->
          <template v-else>
            <div class="space-y-2 text-sm">
              <div v-for="(value, key) in request.request.request_payload" :key="key">
                <span class="font-medium text-slate-700">{{ formatKey(key) }}:</span>
                <span class="text-slate-900 ml-2">{{ typeof value === 'object' ? JSON.stringify(value) : value }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Payment Proof -->
      <div v-if="request.request.paymentProofs && request.request.paymentProofs.length > 0" class="bg-white rounded-lg p-4 mb-4">
        <div class="text-sm font-medium text-slate-900 mb-3">Payment Proof</div>
        <div class="space-y-3">
          <div
            v-for="proof in request.request.paymentProofs"
            :key="proof.id"
            class="border border-slate-200 rounded-lg p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  proof.status === 'approved' ? 'bg-green-100 text-green-700' :
                  proof.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                ]"
              >
                {{ proof.status }}
              </span>
              <span class="text-xs text-slate-500">
                {{ formatTime(proof.created_at) }}
              </span>
            </div>
            <div v-if="proof.asset?.public_url" class="mb-2">
              <img :src="proof.asset.public_url" alt="Payment proof" class="max-w-full rounded border cursor-pointer hover:opacity-90" @click="window.open(proof.asset.public_url, '_blank')" />
            </div>
            <div v-if="proof.notes" class="text-sm text-slate-700 mb-2">{{ proof.notes }}</div>
            <div v-if="proof.reviewedBy" class="text-xs text-slate-500">
              Reviewed by: {{ proof.reviewedBy.email }} at {{ formatTime(proof.reviewed_at) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Existing Offers -->
      <div v-if="request.request.providerOffers && request.request.providerOffers.length > 0" class="bg-white rounded-lg p-4 mb-4">
        <div class="text-sm font-medium text-slate-900 mb-3">Your Previous Offers:</div>
        <div class="space-y-3">
          <div
            v-for="offer in request.request.providerOffers"
            :key="offer.id"
            class="border border-slate-200 rounded-lg p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  getOfferStatusClass(offer.status)
                ]"
              >
                {{ offer.status }}
              </span>
              <span class="text-xs text-slate-500">
                {{ formatTime(offer.submitted_at) }}
              </span>
            </div>
            <div class="text-sm text-slate-700 mb-2">{{ offer.provider_note }}</div>
            <div v-if="offer.reject_reason" class="text-xs text-red-600 bg-red-50 p-2 rounded">
              Rejected: {{ offer.reject_reason }}
            </div>
          </div>
        </div>
      </div>

      <!-- Offer Form -->
      <div class="bg-white rounded-lg p-4">
        <div class="text-sm font-medium text-slate-900 mb-3">Submit Offer</div>
        
        <form @submit.prevent="handleSubmit">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Your Response <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="form.provider_note"
              rows="4"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Provide availability, quote, timeline, or any relevant information..."
              required
            ></textarea>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Additional Details (JSON, optional)
            </label>
            <textarea
              v-model="formPayloadJson"
              rows="4"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
              placeholder='{"price": 500, "currency": "CNY", "eta": "2-3 days"}'
            ></textarea>
          </div>

          <button
            type="submit"
            :disabled="!form.provider_note.trim() || submitting"
            class="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="submitting">Submitting...</span>
            <span v-else>Submit for OPS Review</span>
          </button>
        </form>
      </div>

      <!-- Mark as Viewed Button -->
      <div class="mt-4">
        <button
          v-if="dispatch && dispatch.status === 'sent'"
          @click="markAsViewed"
          class="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          Mark as Viewed
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';

const route = useRoute();
const router = useRouter();

const request = ref<any | null>(null);
const dispatch = ref<any | null>(null);
const loading = ref(false);
const submitting = ref(false);
const form = ref({
  provider_note: '',
  payload_json: null as any,
});
const formPayloadJson = ref('');

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
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-yellow-100 text-yellow-700',
    responded: 'bg-green-100 text-green-700',
    skipped: 'bg-slate-100 text-slate-700',
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
}

function getOfferStatusClass(status: string) {
  const classes: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    sent_to_user: 'bg-blue-100 text-blue-700',
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
}

function formatKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function loadRequest() {
  loading.value = true;
  try {
    const response = await axios.get(`/api/provider/requests/${route.params.id}`);
    request.value = response.data.request;
    dispatch.value = response.data.dispatch;
  } catch (error: any) {
    console.error('Failed to load request:', error);
    if (error.response?.status === 403) {
      alert('Access denied - this request was not assigned to you');
      router.back();
    }
  } finally {
    loading.value = false;
  }
}

async function markAsViewed() {
  try {
    await axios.post(`/api/provider/requests/${route.params.id}/mark-viewed`);
    await loadRequest();
  } catch (error) {
    console.error('Failed to mark as viewed:', error);
    alert('Failed to mark as viewed');
  }
}

async function handleSubmit() {
  if (!form.value.provider_note.trim()) return;
  
  submitting.value = true;
  try {
    let payloadJson = null;
    if (formPayloadJson.value.trim()) {
      try {
        payloadJson = JSON.parse(formPayloadJson.value);
      } catch (e) {
        alert('Invalid JSON format in additional details');
        submitting.value = false;
        return;
      }
    }

    await axios.post(`/api/provider/requests/${route.params.id}/offers`, {
      provider_note: form.value.provider_note.trim(),
      payload_json: payloadJson,
    });

    alert('Offer submitted successfully! It will be reviewed by OPS.');
    form.value.provider_note = '';
    formPayloadJson.value = '';
    await loadRequest();
  } catch (error: any) {
    console.error('Failed to submit offer:', error);
    alert(error.response?.data?.error || 'Failed to submit offer');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadRequest();
});
</script>



