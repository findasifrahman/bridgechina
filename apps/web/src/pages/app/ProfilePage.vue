<template>
  <div class="space-y-6">
    <PageHeader title="My Profile" />

    <div class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <User class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Account</h3>
          </div>
        </CardHeader>
        <CardBody>
          <form class="space-y-4" @submit.prevent="updateProfile">
            <Input v-model="profileForm.email" label="Email" type="email" disabled />
            <Input v-model="profileForm.phone" label="Phone" type="tel" placeholder="+880..." />
            <Input v-model="profileForm.full_name" label="Full name" placeholder="Your name" />
            <div class="grid gap-4 sm:grid-cols-2">
              <Input v-model="profileForm.preferred_language" label="Preferred language" placeholder="en" />
              <Input v-model="profileForm.preferred_currency" label="Preferred currency" placeholder="BDT" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Contact channel</label>
                <select
                  v-model="profileForm.preferred_contact_channel"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="wechat">WeChat</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <Input v-model="profileForm.wechat_id" label="WeChat ID" placeholder="WeChat ID" />
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="profileForm.marketing_consent"
                type="checkbox"
                id="marketing_consent"
                class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label for="marketing_consent" class="text-sm text-slate-700">
                I want product updates and shipment notices
              </label>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" @click="loadProfile">Cancel</Button>
              <Button variant="primary" type="submit" :loading="savingProfile">Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Lock class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Change password</h3>
          </div>
        </CardHeader>
        <CardBody>
          <form class="space-y-4" @submit.prevent="changePassword">
            <Input v-model="passwordForm.current_password" label="Current password" type="password" required />
            <Input v-model="passwordForm.new_password" label="New password" type="password" required />
            <Input v-model="passwordForm.confirm_password" label="Confirm password" type="password" required />
            <div class="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" @click="resetPasswordForm">Clear</Button>
              <Button variant="primary" type="submit" :loading="changingPassword" :disabled="!isPasswordFormValid">
                Change password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <MapPin class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Shipping addresses</h3>
          </div>
          <Button variant="primary" @click="showAddAddressModal = true">
            <Plus class="mr-2 h-4 w-4" />
            Add address
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div v-if="addresses.length === 0" class="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">
          No addresses saved yet.
        </div>
        <div v-else class="grid gap-4 lg:grid-cols-2">
          <div
            v-for="address in addresses"
            :key="address.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900">{{ address.name }}</p>
                <p class="text-sm text-slate-600">{{ address.phone }}</p>
              </div>
              <Button variant="ghost" size="sm" class="text-red-600 hover:bg-red-50" @click="deleteAddress(address.id)">
                Delete
              </Button>
            </div>
            <p class="mt-3 text-sm text-slate-600">
              {{ address.address_line }}
            </p>
            <p class="text-sm text-slate-600">
              {{ address.city }}{{ address.postal_code ? `, ${address.postal_code}` : '' }}{{ address.country ? `, ${address.country}` : '' }}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>

    <Modal v-model="showAddAddressModal" title="Add address">
      <form class="space-y-4" @submit.prevent="addAddress">
        <Input v-model="addressForm.name" label="Recipient name" required />
        <Input v-model="addressForm.phone" label="Phone" required />
        <Input v-model="addressForm.country" label="Country" placeholder="Bangladesh" />
        <Input v-model="addressForm.city" label="City" required />
        <Input v-model="addressForm.address_line" label="Address line" required />
        <Input v-model="addressForm.postal_code" label="Postal code" />
        <Input v-model="addressForm.notes" label="Notes" placeholder="Apartment, floor, landmark..." />
        <div class="flex items-center gap-2">
          <input
            v-model="addressForm.is_default"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span class="text-sm text-slate-700">Set as default address</span>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" @click="showAddAddressModal = false">Cancel</Button>
          <Button variant="primary" type="submit" :loading="savingAddress">Save</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { Button, Card, CardBody, CardHeader, Input, Modal, PageHeader } from '@bridgechina/ui';
import { Lock, MapPin, Plus, User } from 'lucide-vue-next';

const toast = useToast();

const profileForm = ref({
  email: '',
  phone: '',
  full_name: '',
  preferred_language: 'en',
  preferred_currency: 'BDT',
  preferred_contact_channel: '',
  wechat_id: '',
  marketing_consent: false,
});

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
});

const addressForm = ref({
  name: '',
  phone: '',
  country: 'Bangladesh',
  city: '',
  address_line: '',
  postal_code: '',
  notes: '',
  is_default: false,
});

const addresses = ref<any[]>([]);
const savingProfile = ref(false);
const changingPassword = ref(false);
const savingAddress = ref(false);
const showAddAddressModal = ref(false);

const isPasswordFormValid = computed(() => {
  return (
    passwordForm.value.current_password.length > 0 &&
    passwordForm.value.new_password.length >= 8 &&
    passwordForm.value.new_password === passwordForm.value.confirm_password
  );
});

async function loadProfile() {
  try {
    const response = await axios.get('/api/user/profile');
    profileForm.value = {
      email: response.data.email || '',
      phone: response.data.phone || '',
      full_name: response.data.customerProfile?.full_name || '',
      preferred_language: response.data.customerProfile?.preferred_language || 'en',
      preferred_currency: response.data.customerProfile?.preferred_currency || 'BDT',
      preferred_contact_channel: response.data.customerProfile?.preferred_contact_channel || '',
      wechat_id: response.data.customerProfile?.wechat_id || '',
      marketing_consent: response.data.customerProfile?.marketing_consent || false,
    };
  } catch (error) {
    console.error('Failed to load profile', error);
  }
}

async function loadAddresses() {
  try {
    const response = await axios.get('/api/user/addresses');
    addresses.value = response.data || [];
  } catch (error) {
    console.error('Failed to load addresses', error);
  }
}

async function updateProfile() {
  savingProfile.value = true;
  try {
    await axios.patch('/api/user/profile', {
      phone: profileForm.value.phone,
      customerProfile: {
        full_name: profileForm.value.full_name || null,
        preferred_language: profileForm.value.preferred_language || null,
        preferred_currency: profileForm.value.preferred_currency || 'BDT',
        preferred_contact_channel: profileForm.value.preferred_contact_channel || null,
        wechat_id: profileForm.value.wechat_id || null,
        marketing_consent: profileForm.value.marketing_consent,
      },
    });
    toast.success('Profile updated');
    await loadProfile();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update profile');
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  if (!isPasswordFormValid.value) {
    toast.error('Please make sure the passwords match and meet the minimum length.');
    return;
  }

  changingPassword.value = true;
  try {
    await axios.patch('/api/user/password', {
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
    });
    toast.success('Password changed');
    resetPasswordForm();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to change password');
  } finally {
    changingPassword.value = false;
  }
}

function resetPasswordForm() {
  passwordForm.value = {
    current_password: '',
    new_password: '',
    confirm_password: '',
  };
}

async function addAddress() {
  savingAddress.value = true;
  try {
    await axios.post('/api/user/addresses', {
      ...addressForm.value,
      is_default: !!addressForm.value.is_default,
    });
    toast.success('Address added');
    showAddAddressModal.value = false;
    addressForm.value = {
      name: '',
      phone: '',
      country: 'Bangladesh',
      city: '',
      address_line: '',
      postal_code: '',
      notes: '',
      is_default: false,
    };
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
