<template>
  <div>
    <PageHeader title="Request Details">
      <template #actions>
        <Button variant="secondary" @click="$router.back()">Back</Button>
      </template>
    </PageHeader>
    <div v-if="request" class="space-y-6">
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Request Information</h3>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600">Category</p>
              <p class="font-semibold">{{ request.category.name }}</p>
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
              <p class="font-semibold">{{ request.city.name }}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Service-specific details -->
      <Card v-if="hotelBooking">
        <CardHeader>
          <h3 class="text-lg font-semibold">Hotel Booking Details</h3>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600">Check-in</p>
              <p class="font-semibold">{{ new Date(hotelBooking.checkin).toLocaleDateString() }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Check-out</p>
              <p class="font-semibold">{{ new Date(hotelBooking.checkout).toLocaleDateString() }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Guests</p>
              <p class="font-semibold">{{ hotelBooking.guests }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Rooms</p>
              <p class="font-semibold">{{ hotelBooking.rooms }}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card v-if="transportBooking">
        <CardHeader>
          <h3 class="text-lg font-semibold">Transport Booking Details</h3>
        </CardHeader>
        <CardBody>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600">Type</p>
              <p class="font-semibold">{{ transportBooking.type }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Pickup</p>
              <p class="font-semibold">{{ transportBooking.pickup_text }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Drop-off</p>
              <p class="font-semibold">{{ transportBooking.dropoff_text }}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600">Passengers</p>
              <p class="font-semibold">{{ transportBooking.passengers }}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Update Status</h3>
        </CardHeader>
        <CardBody>
          <div class="flex gap-4">
            <Select
              v-model="updateStatus"
              label="Status"
              :options="statusOptions"
            />
            <Button variant="primary" @click="handleUpdateStatus">Update</Button>
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
import { PageHeader, Card, CardHeader, CardBody, StatusChip, Select, Button } from '@bridgechina/ui';

const route = useRoute();
const request = ref<any>(null);
const hotelBooking = ref<any>(null);
const transportBooking = ref<any>(null);
const updateStatus = ref('');

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'booked', label: 'Booked' },
  { value: 'service_done', label: 'Service Done' },
  { value: 'payment_done', label: 'Payment Done' },
  { value: 'done', label: 'Done' },
  { value: 'complete', label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
];

onMounted(async () => {
  try {
    const response = await axios.get(`/api/admin/requests/${route.params.id}`);
    request.value = response.data;
    updateStatus.value = response.data.status;
    hotelBooking.value = response.data.hotelBooking;
    transportBooking.value = response.data.transportBooking;
  } catch (error) {
    console.error('Failed to load request');
  }
});

async function handleUpdateStatus() {
  try {
    await axios.patch(`/api/admin/requests/${route.params.id}`, {
      status: updateStatus.value,
    });
    request.value.status = updateStatus.value;
  } catch (error) {
    console.error('Failed to update status');
  }
}
</script>

