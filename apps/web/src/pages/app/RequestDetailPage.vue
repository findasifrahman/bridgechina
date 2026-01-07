<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <PageHeader :title="`Request: ${request?.category?.name || 'Service'}`" />
      <Button variant="ghost" size="sm" @click="loadRequestDetails" :loading="loading">
        <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </div>
    
    <div v-if="loading" class="text-center py-8 text-slate-500">Loading request details...</div>
    <div v-else-if="!request" class="text-center py-8 text-red-500">Request not found.</div>
    <div v-else class="grid lg:grid-cols-3 gap-6">
      <!-- Request Details Card -->
      <Card class="lg:col-span-2">
        <CardHeader>
          <div class="flex items-center gap-2">
            <ClipboardList class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Request Details</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-2 gap-4">
            <div class="flex items-start gap-3">
              <Tag class="h-5 w-5 text-slate-400 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-500">Request ID</p>
                <code class="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{{ request.id }}</code>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <Tag class="h-5 w-5 text-slate-400 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-500">Category</p>
                <p class="text-slate-800 font-semibold">{{ request.category?.name || 'N/A' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <MapPin class="h-5 w-5 text-slate-400 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-500">City</p>
                <p class="text-slate-800 font-semibold">{{ request.city?.name || 'N/A' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <Activity class="h-5 w-5 text-slate-400 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-500">Status</p>
                <Badge :variant="getStatusVariant(request.status)">{{ request.status }}</Badge>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <Clock class="h-5 w-5 text-slate-400 mt-0.5" />
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-500">Created</p>
                <p class="text-slate-800">{{ new Date(request.created_at).toLocaleString() }}</p>
              </div>
            </div>
          </div>

          <!-- Formatted Request Payload - User-Friendly Display -->
          <div v-if="request.request_payload && formattedRequestInfo" class="mt-6 pt-6 border-t border-slate-200">
            <div class="flex items-center gap-2 mb-4">
              <FileText class="h-5 w-5 text-teal-600" />
              <h4 class="font-semibold text-slate-900">Request Details</h4>
            </div>
            <div class="bg-slate-50 rounded-lg p-6 space-y-4">
              <!-- Shopping Request (Cart Items) -->
              <template v-if="request.category?.key === 'shopping' && formattedRequestInfo.items">
                <div class="space-y-4">
                  <h5 class="font-semibold text-slate-900 mb-3">Items in Your Order</h5>
                  <div v-for="(item, idx) in formattedRequestInfo.items" :key="idx" class="bg-white rounded-lg p-4 border border-slate-200">
                    <div class="flex gap-4">
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.title"
                        class="w-20 h-20 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                      />
                      <div class="flex-1">
                        <h6 class="font-semibold text-slate-900 mb-2">{{ item.title }}</h6>
                        <div class="space-y-1 text-sm">
                          <div v-if="item.priceMin || item.priceMax" class="text-teal-600 font-medium">
                            Price: 
                            <span v-if="item.priceMin && item.priceMax && item.priceMin !== item.priceMax">
                              ¥{{ item.priceMin }} - ¥{{ item.priceMax }}
                            </span>
                            <span v-else-if="item.priceMin">
                              ¥{{ item.priceMin }}
                            </span>
                          </div>
                          <div v-if="item.qty" class="text-slate-600">
                            Quantity: <span class="font-medium">{{ item.qty }}</span>
                          </div>
                          <div v-if="item.skuDetails && item.skuDetails.length > 0" class="mt-2 pt-2 border-t border-slate-200">
                            <p class="text-xs font-medium text-slate-500 mb-1">Selected Options:</p>
                            <div class="space-y-1">
                              <div v-for="(sku, skuIdx) in item.skuDetails" :key="skuIdx" class="text-xs text-slate-600">
                                • {{ sku.sku?.props_names || `Option ${skuIdx + 1}` }} - Quantity: {{ sku.qty }}
                                <span v-if="sku.sku?.sale_price" class="text-teal-600">(¥{{ sku.sku.sale_price }})</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="formattedRequestInfo.totalItems" class="bg-white rounded-lg p-4 border border-slate-200">
                    <div class="flex justify-between items-center">
                      <span class="font-medium text-slate-700">Total Items:</span>
                      <span class="font-semibold text-slate-900">{{ formattedRequestInfo.totalItems }}</span>
                    </div>
                    <div v-if="formattedRequestInfo.estimatedTotalPrice" class="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                      <span class="font-medium text-slate-700">Estimated Total:</span>
                      <span class="text-lg font-bold text-teal-600">¥{{ formattedRequestInfo.estimatedTotalPrice }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Shopping Request (Simple Form) -->
              <template v-else-if="request.category?.key === 'shopping'">
                <div class="space-y-3">
                  <div v-if="formattedRequestInfo.items_description">
                    <p class="text-sm font-medium text-slate-500 mb-1">Items Description</p>
                    <p class="text-slate-900 whitespace-pre-wrap">{{ formattedRequestInfo.items_description }}</p>
                  </div>
                  <div v-if="formattedRequestInfo.budget" class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm font-medium text-slate-500 mb-1">Budget</p>
                      <p class="text-slate-900 font-semibold">¥{{ formattedRequestInfo.budget }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.preferred_stores">
                      <p class="text-sm font-medium text-slate-500 mb-1">Preferred Stores/Areas</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.preferred_stores }}</p>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Hotel Request -->
              <template v-else-if="request.category?.key === 'hotel'">
                <div class="space-y-3">
                  <div v-if="formattedRequestInfo.hotel_name" class="grid md:grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm font-medium text-slate-500 mb-1">Hotel Name</p>
                      <p class="text-slate-900 font-semibold">{{ formattedRequestInfo.hotel_name }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.check_in">
                      <p class="text-sm font-medium text-slate-500 mb-1">Check-in Date</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.check_in }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.check_out">
                      <p class="text-sm font-medium text-slate-500 mb-1">Check-out Date</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.check_out }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.guests">
                      <p class="text-sm font-medium text-slate-500 mb-1">Guests</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.guests }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.rooms">
                      <p class="text-sm font-medium text-slate-500 mb-1">Rooms</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.rooms }}</p>
                    </div>
                  </div>
                  <div v-if="formattedRequestInfo.special_requests" class="mt-4">
                    <p class="text-sm font-medium text-slate-500 mb-1">Special Requests</p>
                    <p class="text-slate-900 whitespace-pre-wrap">{{ formattedRequestInfo.special_requests }}</p>
                  </div>
                </div>
              </template>

              <!-- Transport Request -->
              <template v-else-if="request.category?.key === 'transport'">
                <div class="space-y-3">
                  <div class="grid md:grid-cols-2 gap-4">
                    <div v-if="formattedRequestInfo.from_location">
                      <p class="text-sm font-medium text-slate-500 mb-1">From</p>
                      <p class="text-slate-900 font-semibold">{{ formattedRequestInfo.from_location }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.to_location">
                      <p class="text-sm font-medium text-slate-500 mb-1">To</p>
                      <p class="text-slate-900 font-semibold">{{ formattedRequestInfo.to_location }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.date">
                      <p class="text-sm font-medium text-slate-500 mb-1">Date</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.date }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.time">
                      <p class="text-sm font-medium text-slate-500 mb-1">Time</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.time }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.passengers">
                      <p class="text-sm font-medium text-slate-500 mb-1">Passengers</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.passengers }}</p>
                    </div>
                    <div v-if="formattedRequestInfo.vehicle_type">
                      <p class="text-sm font-medium text-slate-500 mb-1">Vehicle Type</p>
                      <p class="text-slate-900">{{ formattedRequestInfo.vehicle_type }}</p>
                    </div>
                  </div>
                  <div v-if="formattedRequestInfo.special_requests" class="mt-4">
                    <p class="text-sm font-medium text-slate-500 mb-1">Special Requests</p>
                    <p class="text-slate-900 whitespace-pre-wrap">{{ formattedRequestInfo.special_requests }}</p>
                  </div>
                </div>
              </template>

              <!-- Generic Request Display -->
              <template v-else>
                <div class="space-y-3">
                  <div v-for="(value, key) in formattedRequestInfo" :key="key" class="grid md:grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm font-medium text-slate-500 mb-1">{{ formatKey(key) }}</p>
                      <p class="text-slate-900">{{ typeof value === 'object' ? JSON.stringify(value) : value }}</p>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Provider Offer Card -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Sparkles class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Provider Offer</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="approvedOffer" class="space-y-3">
            <div v-if="approvedOffer.provider_note">
              <p class="text-sm font-medium text-slate-500">Provider Note</p>
              <p class="text-slate-800 whitespace-pre-wrap">{{ approvedOffer.provider_note }}</p>
            </div>
            <div v-if="approvedOffer.payload_json && Object.keys(approvedOffer.payload_json).length > 0">
              <p class="text-sm font-medium text-slate-500">Offer Details</p>
              <pre class="bg-slate-50 p-2 rounded text-sm overflow-x-auto">{{ JSON.stringify(approvedOffer.payload_json, null, 2) }}</pre>
            </div>
            <Badge variant="success">Approved & Sent</Badge>
          </div>
          <div v-else class="text-sm text-slate-500 text-center py-4">
            No offer received yet. Waiting for provider response.
          </div>
        </CardBody>
      </Card>

      <!-- Payment Information Card -->
      <Card class="lg:col-span-3" v-if="showPaymentInfo">
        <CardHeader>
          <div class="flex items-center gap-2">
            <CreditCard class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Payment Information</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="text-center md:text-left">
              <p class="text-sm font-medium text-slate-500 mb-2">Total Amount</p>
              <p class="text-2xl font-bold text-slate-800">¥{{ (request.total_amount || 0).toFixed(2) }}</p>
            </div>
            <div class="text-center md:text-left">
              <p class="text-sm font-medium text-slate-500 mb-2">Paid Amount</p>
              <p class="text-2xl font-bold text-green-600">¥{{ (request.paid_amount || 0).toFixed(2) }}</p>
            </div>
            <div class="text-center md:text-left">
              <p class="text-sm font-medium text-slate-500 mb-2">Due Amount</p>
              <p class="text-2xl font-bold" :class="(request.due_amount || 0) > 0 ? 'text-orange-600' : 'text-green-600'">
                ¥{{ (request.due_amount || 0).toFixed(2) }}
              </p>
            </div>
          </div>
          <div class="mt-6 pt-6 border-t border-slate-200">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-slate-700">Payment Status</span>
              <Badge :variant="paymentStatusVariant">
                {{ paymentStatusText }}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Payment Proof Upload Card -->
      <Card class="lg:col-span-3" v-if="canUploadPayment">
        <CardHeader>
          <div class="flex items-center gap-2">
            <Upload class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Payment Proof</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="paymentProof" class="space-y-4 mb-6 pb-6 border-b border-slate-200">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500 mb-1">Status</p>
                <Badge :variant="getPaymentProofVariant(paymentProof.status)">{{ paymentProof.status }}</Badge>
              </div>
              <div v-if="paymentProof.amount" class="text-right">
                <p class="text-sm font-medium text-slate-500 mb-1">Amount</p>
                <p class="text-slate-800 font-semibold text-lg">¥{{ paymentProof.amount.toFixed(2) }}</p>
              </div>
            </div>
            <div v-if="paymentProof.asset?.public_url">
              <p class="text-sm font-medium text-slate-500 mb-2">Uploaded Image</p>
              <img :src="paymentProof.asset.public_url" alt="Payment proof" class="max-w-md rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity" @click="openImage(paymentProof.asset.public_url)" />
            </div>
            <p v-if="paymentProof.notes" class="text-sm text-slate-600">{{ paymentProof.notes }}</p>
            <div v-if="paymentProof.reviewer" class="text-xs text-slate-500 pt-2 border-t border-slate-200">
              Reviewed by: {{ paymentProof.reviewer.email }} at {{ new Date(paymentProof.reviewed_at).toLocaleString() }}
            </div>
          </div>
          <form @submit.prevent="uploadPaymentProof" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Upload Payment Proof</label>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileSelect"
                class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Amount (CNY) - Optional</label>
              <input
                v-model.number="paymentProofForm.amount"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter amount for this payment proof"
              />
              <p class="text-xs text-slate-500 mt-1">Leave empty if this is a full payment proof</p>
            </div>
            <Textarea
              v-model="paymentProofForm.notes"
              label="Notes (optional)"
              :rows="3"
            />
            <Button type="submit" variant="primary" :loading="uploading" :disabled="!selectedFile">
              Upload Payment Proof
            </Button>
          </form>
        </CardBody>
      </Card>

      <!-- Status Timeline -->
      <Card class="lg:col-span-3">
        <CardHeader>
          <div class="flex items-center gap-2">
            <History class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Status Timeline</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="!statusEvents || statusEvents.length === 0" class="text-sm text-slate-500 text-center py-4">
            No status updates yet.
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="event in statusEvents"
              :key="event.id"
              class="flex gap-4 pb-4 border-b border-slate-200 last:border-0"
            >
              <div class="flex-shrink-0">
                <div class="w-3 h-3 rounded-full bg-teal-500 mt-2"></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <Badge :variant="getStatusVariant(event.status_to)">{{ event.status_to }}</Badge>
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
                <p v-if="event.note_user" class="text-sm text-slate-800 mt-2 whitespace-pre-wrap bg-slate-50 p-2 rounded">
                  {{ event.note_user }}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Bundle Requests -->
      <Card class="lg:col-span-3" v-if="request.bundle_key && bundleRequests && bundleRequests.length > 0">
        <CardHeader>
          <div class="flex items-center gap-2">
            <Package class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Related Requests (Bundle)</h3>
          </div>
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
                class="p-3 border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/50 transition-colors cursor-pointer"
                @click="$router.push(`/user/requests/${bundleReq.id}`)"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-semibold text-sm">{{ bundleReq.category?.name || 'Service' }}</p>
                    <p class="text-xs text-slate-600">{{ bundleReq.city?.name || 'N/A' }}</p>
                  </div>
                  <Badge :variant="getStatusVariant(bundleReq.status)" size="sm">
                    {{ bundleReq.status }}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Source Badge -->
      <Card class="lg:col-span-3" v-if="request.conversation">
        <CardHeader>
          <div class="flex items-center gap-2">
            <MessageCircle class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Request Source</h3>
          </div>
        </CardHeader>
        <CardBody>
          <div class="flex items-center gap-2">
            <Badge v-if="request.conversation.channel === 'whatsapp'" variant="success">
              WhatsApp
            </Badge>
            <Badge v-else-if="request.conversation.channel === 'webchat'" variant="default">
              WebChat
            </Badge>
            <Badge v-else variant="default">
              Website Form
            </Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardHeader, CardBody, Badge, Textarea, Button } from '@bridgechina/ui';
import { ClipboardList, Tag, MapPin, Activity, Clock, FileText, Sparkles, CreditCard, Upload, History, Package, MessageCircle, RefreshCw } from 'lucide-vue-next';

const route = useRoute();
const toast = useToast();

const request = ref<any>(null);
const approvedOffer = ref<any>(null);
const paymentProof = ref<any>(null);
const statusEvents = ref<any[]>([]);
const bundleRequests = ref<any[]>([]);
const loading = ref(true);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const paymentProofForm = ref({
  notes: '',
  amount: undefined as number | undefined,
});

// Format request payload for user-friendly display (hide technical fields)
const formattedRequestInfo = computed(() => {
  if (!request.value?.request_payload) return null;
  const payload = request.value.request_payload;
  const categoryKey = request.value.category?.key;

  // Shopping requests from cart
  if (categoryKey === 'shopping' && payload.items && Array.isArray(payload.items)) {
    return {
      items: payload.items.map((item: any) => ({
        title: item.title,
        qty: item.qty,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
        imageUrl: item.imageUrl, // Show image for users
        skuDetails: item.skuDetails || [],
      })),
      totalItems: payload.totalItems,
      estimatedTotalPrice: payload.estimatedTotalPrice,
    };
  }

  // Shopping requests from form
  if (categoryKey === 'shopping') {
    return {
      items_description: payload.items_description,
      budget: payload.budget,
      preferred_stores: payload.preferred_stores,
    };
  }

  // Hotel requests
  if (categoryKey === 'hotel') {
    return {
      hotel_name: payload.hotel_name || payload.hotelName,
      check_in: payload.check_in || payload.checkIn,
      check_out: payload.check_out || payload.checkOut,
      guests: payload.guests,
      rooms: payload.rooms || payload.room_qty,
      special_requests: payload.special_requests || payload.specialRequests,
    };
  }

  // Transport requests
  if (categoryKey === 'transport') {
    return {
      from_location: payload.from_location || payload.fromLocation,
      to_location: payload.to_location || payload.toLocation,
      date: payload.date,
      time: payload.time,
      passengers: payload.passengers,
      vehicle_type: payload.vehicle_type || payload.vehicleType,
      special_requests: payload.special_requests || payload.specialRequests,
    };
  }

  // Generic: filter out technical fields for users
  const filtered: any = {};
  const hideFields = ['externalId', 'sourceUrl', 'imageUrl'];
  for (const [key, value] of Object.entries(payload)) {
    if (!hideFields.includes(key)) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
});

function formatKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Payment info display logic
const showPaymentInfo = computed(() => {
  // Show if total_amount is set OR paid_amount is set OR request is in payment-related status
  return request.value?.total_amount !== null && request.value?.total_amount !== undefined ||
         request.value?.paid_amount !== null && request.value?.paid_amount !== undefined ||
         ['quoted', 'awaiting_payment', 'partially_paid', 'paid', 'payment_done'].includes(request.value?.status);
});

const paymentStatusVariant = computed(() => {
  if (request.value?.is_fully_paid) return 'success';
  const paid = request.value?.paid_amount || 0;
  const total = request.value?.total_amount || 0;
  if (paid > 0 && paid < total) return 'warning';
  if (paid === 0 && total > 0) return 'default';
  return 'warning';
});

const paymentStatusText = computed(() => {
  const paid = request.value?.paid_amount || 0;
  const total = request.value?.total_amount || 0;
  if (request.value?.is_fully_paid || (paid > 0 && paid >= total)) {
    return 'Fully Paid ✓';
  }
  if (paid > 0 && paid < total) {
    return 'Partially Paid';
  }
  if (total > 0 && paid === 0 && !paymentProof.value) {
    return 'Payment Pending';
  }
  if (total > 0 && paid === 0 && paymentProof.value) {
    return 'Verification Pending';
  }
  return 'No Payment Required';
});

const canUploadPayment = computed(() => {
  // Allow upload if status requires payment OR if total_amount is set
  const status = request.value?.status;
  return ['quoted', 'awaiting_payment', 'partially_paid', 'confirmed', 'paid'].includes(status) ||
         (request.value?.total_amount !== null && request.value?.total_amount !== undefined && request.value?.total_amount > 0);
});

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'new': return 'default';
    case 'in_progress': return 'warning';
    case 'dispatched': return 'warning';
    case 'quoted': return 'warning';
    case 'awaiting_payment': return 'warning';
    case 'confirmed': return 'success';
    case 'paid': return 'success';
    case 'partially_paid': return 'warning';
    case 'booked': return 'success';
    case 'service_done': return 'success';
    case 'payment_done': return 'success';
    case 'complete': return 'success';
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

function openImage(url: string) {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
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

    // Load status events
    statusEvents.value = request.value.statusEvents || [];

    // Load bundle requests
    bundleRequests.value = request.value.bundleRequests || [];

    // Load payment proof if exists
    try {
      const proofResponse = await axios.get(`/api/user/requests/${requestId}/payment-proof`);
      paymentProof.value = proofResponse.data || null;
    } catch (error: any) {
      // Payment proof might not exist yet - silently handle
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
      amount: paymentProofForm.value.amount || null,
      notes: paymentProofForm.value.notes || null,
    });

    toast.success('Payment proof uploaded successfully');
    await loadRequestDetails();
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    selectedFile.value = null;
    paymentProofForm.value.notes = '';
    paymentProofForm.value.amount = undefined;
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
