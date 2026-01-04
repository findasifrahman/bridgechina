<template>
  <div>
    <PageHeader title="My Profile" />
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Personal Information -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Personal Information</h3>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="updateProfile" class="space-y-4">
            <Input
              v-model="profileForm.email"
              label="Email"
              type="email"
              disabled
            />
            <Input
              v-model="profileForm.phone"
              label="Phone"
              type="tel"
              required
            />
            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="loadProfile">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving">Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <!-- Customer Profile -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Customer Profile</h3>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="updateCustomerProfile" class="space-y-4">
            <Input
              v-model="customerProfileForm.nationality"
              label="Nationality"
              placeholder="e.g., US, UK, CN"
            />
            <Input
              v-model="customerProfileForm.passport_name"
              label="Passport Name"
              placeholder="Name as on passport"
            />
            <Input
              v-model="customerProfileForm.preferred_language"
              label="Preferred Language"
              placeholder="e.g., en, zh, ar"
            />
            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="loadProfile">Cancel</Button>
              <Button variant="primary" type="submit" :loading="savingProfile">Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <!-- Addresses -->
      <Card class="md:col-span-2">
        <CardHeader>
          <h3 class="text-lg font-semibold">Addresses</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-3">
            <div
              v-for="address in addresses"
              :key="address.id"
              class="p-3 bg-slate-50 rounded-lg flex justify-between items-start"
            >
              <div>
                <p class="font-medium">{{ address.label || 'Default' }}</p>
                <p class="text-sm text-slate-600">{{ address.street }}, {{ address.city }}{{ address.postal_code ? `, ${address.postal_code}` : '' }}</p>
              </div>
              <Button variant="ghost" size="sm" @click="deleteAddress(address.id)">Delete</Button>
            </div>
            <Button variant="ghost" @click="showAddAddressModal = true">+ Add Address</Button>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Add Address Modal -->
    <Modal v-model="showAddAddressModal" title="Add Address">
      <form @submit.prevent="addAddress" class="space-y-4">
        <Input v-model="addressForm.label" label="Label (e.g., Home, Work)" />
        <Input v-model="addressForm.street" label="Street Address" required />
        <Input v-model="addressForm.city" label="City" required />
        <Input v-model="addressForm.postal_code" label="Postal Code" />
        <div class="flex justify-end gap-3 pt-4">
          <Button variant="ghost" type="button" @click="showAddAddressModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="savingAddress">Add</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardHeader, CardBody, Input, Button, Modal } from '@bridgechina/ui';

const profileForm = ref({
  email: '',
  phone: '',
});

const customerProfileForm = ref({
  nationality: '',
  passport_name: '',
  preferred_language: '',
});

const addresses = ref<any[]>([]);
const saving = ref(false);
const savingProfile = ref(false);
const savingAddress = ref(false);
const showAddAddressModal = ref(false);
const toast = useToast();

const addressForm = ref({
  label: '',
  street: '',
  city: '',
  postal_code: '',
});

async function loadProfile() {
  try {
    const response = await axios.get('/api/user/profile');
    profileForm.value = {
      email: response.data.email || '',
      phone: response.data.phone || '',
    };
    
    // Load customer profile if it exists
    if (response.data.customerProfile) {
      customerProfileForm.value = {
        nationality: response.data.customerProfile.nationality || '',
        passport_name: response.data.customerProfile.passport_name || '',
        preferred_language: response.data.customerProfile.preferred_language || '',
      };
    } else {
      customerProfileForm.value = {
        nationality: '',
        passport_name: '',
        preferred_language: '',
      };
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}

async function loadAddresses() {
  try {
    const response = await axios.get('/api/user/addresses');
    addresses.value = response.data;
  } catch (error) {
    console.error('Failed to load addresses:', error);
  }
}

async function updateProfile() {
  saving.value = true;
  try {
    await axios.patch('/api/user/profile', {
      phone: profileForm.value.phone,
    });
    toast.success('Profile updated');
    await loadProfile();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update profile');
  } finally {
    saving.value = false;
  }
}

async function updateCustomerProfile() {
  savingProfile.value = true;
  try {
    await axios.patch('/api/user/profile', {
      customerProfile: {
        nationality: customerProfileForm.value.nationality || null,
        passport_name: customerProfileForm.value.passport_name || null,
        preferred_language: customerProfileForm.value.preferred_language || null,
      },
    });
    toast.success('Customer profile updated');
    await loadProfile();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update customer profile');
  } finally {
    savingProfile.value = false;
  }
}

async function addAddress() {
  savingAddress.value = true;
  try {
    await axios.post('/api/user/addresses', addressForm.value);
    toast.success('Address added');
    showAddAddressModal.value = false;
    addressForm.value = { label: '', street: '', city: '', postal_code: '' };
    await loadAddresses();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to add address');
  } finally {
    savingAddress.value = false;
  }
}

async function deleteAddress(id: string) {
  if (!confirm('Delete this address?')) return;
  try {
    await axios.delete(`/api/user/addresses/${id}`);
    toast.success('Address deleted');
    await loadAddresses();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to delete address');
  }
}

onMounted(async () => {
  await Promise.all([loadProfile(), loadAddresses()]);
});
</script>
