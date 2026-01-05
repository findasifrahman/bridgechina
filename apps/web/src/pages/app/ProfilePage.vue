<template>
  <div>
    <PageHeader title="My Profile" />
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Personal Information -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <User class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Personal Information</h3>
          </div>
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

      <!-- Password Change -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-2">
            <Lock class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Change Password</h3>
          </div>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="changePassword" class="space-y-4">
            <Input
              v-model="passwordForm.current_password"
              label="Current Password"
              type="password"
              required
            />
            <div>
              <Input
                v-model="passwordForm.new_password"
                label="New Password"
                type="password"
                required
              />
              <div v-if="passwordForm.new_password" class="mt-2 space-y-1">
                <div class="flex items-center text-xs" :class="passwordChecks.length ? 'text-slate-600' : 'text-green-600'">
                  <span class="w-4">{{ passwordChecks.length ? '○' : '✓' }}</span>
                  <span>At least 8 characters</span>
                </div>
                <div class="flex items-center text-xs" :class="passwordChecks.uppercase ? 'text-slate-600' : 'text-green-600'">
                  <span class="w-4">{{ passwordChecks.uppercase ? '○' : '✓' }}</span>
                  <span>One uppercase letter</span>
                </div>
                <div class="flex items-center text-xs" :class="passwordChecks.lowercase ? 'text-slate-600' : 'text-green-600'">
                  <span class="w-4">{{ passwordChecks.lowercase ? '○' : '✓' }}</span>
                  <span>One lowercase letter</span>
                </div>
                <div class="flex items-center text-xs" :class="passwordChecks.number ? 'text-slate-600' : 'text-green-600'">
                  <span class="w-4">{{ passwordChecks.number ? '○' : '✓' }}</span>
                  <span>One number</span>
                </div>
              </div>
            </div>
            <Input
              v-model="passwordForm.confirm_password"
              label="Confirm New Password"
              type="password"
              required
            />
            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="resetPasswordForm">Cancel</Button>
              <Button variant="primary" type="submit" :loading="changingPassword" :disabled="!isPasswordFormValid">Change Password</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <!-- Customer Profile -->
      <Card class="md:col-span-2">
        <CardHeader>
          <div class="flex items-center gap-2">
            <UserCircle class="h-5 w-5 text-teal-600" />
            <h3 class="text-lg font-semibold">Customer Profile</h3>
          </div>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="updateCustomerProfile" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                v-model="customerProfileForm.full_name"
                label="Full Name"
                placeholder="Your full name"
              />
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
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select
                  v-model="customerProfileForm.gender"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input
                v-model.number="customerProfileForm.birth_year"
                label="Birth Year"
                type="number"
                placeholder="e.g., 1990"
                :min="1900"
                :max="new Date().getFullYear()"
              />
              <Input
                v-model="customerProfileForm.country_of_residence"
                label="Country of Residence"
                placeholder="e.g., US, UK"
              />
              <Input
                v-model="customerProfileForm.city_of_residence"
                label="City of Residence"
                placeholder="e.g., New York"
              />
              <Input
                v-model="customerProfileForm.preferred_currency"
                label="Preferred Currency"
                placeholder="e.g., USD, CNY, EUR"
              />
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Preferred Contact Channel</label>
                <select
                  v-model="customerProfileForm.preferred_contact_channel"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">None</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="wechat">WeChat</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <Input
                v-model="customerProfileForm.wechat_id"
                label="WeChat ID"
                placeholder="Your WeChat ID"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="customerProfileForm.marketing_consent"
                type="checkbox"
                id="marketing_consent"
                class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <label for="marketing_consent" class="text-sm text-slate-700">
                I consent to receive marketing communications
              </label>
            </div>
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
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <MapPin class="h-5 w-5 text-teal-600" />
              <h3 class="text-lg font-semibold">Addresses</h3>
            </div>
            <Button variant="primary" @click="showAddAddressModal = true" class="flex items-center gap-2">
              <Plus class="h-4 w-4" />
              Add Address
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div v-if="addresses.length === 0" class="text-center py-8 text-slate-500">
            <MapPin class="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No addresses saved yet</p>
            <p class="text-sm mt-1">Click "Add Address" above to add your first address</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="address in addresses"
              :key="address.id"
              class="p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-start hover:bg-slate-100 transition-colors"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <Tag class="h-4 w-4 text-slate-400" />
                  <p class="font-semibold text-slate-900">{{ address.label || 'Default' }}</p>
                </div>
                <p class="text-sm text-slate-600">{{ address.street }}, {{ address.city }}{{ address.postal_code ? `, ${address.postal_code}` : '' }}</p>
              </div>
              <Button variant="ghost" size="sm" @click="deleteAddress(address.id)" class="text-red-600 hover:text-red-700 hover:bg-red-50">
                Delete
              </Button>
            </div>
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
import { ref, onMounted, computed } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardHeader, CardBody, Input, Button, Modal } from '@bridgechina/ui';
import { User, Lock, UserCircle, MapPin, Plus, Tag } from 'lucide-vue-next';

const profileForm = ref({
  email: '',
  phone: '',
});

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
});

const customerProfileForm = ref({
  nationality: '',
  passport_name: '',
  preferred_language: '',
  full_name: '',
  gender: '',
  birth_year: undefined as number | undefined,
  country_of_residence: '',
  city_of_residence: '',
  preferred_currency: '',
  preferred_contact_channel: '',
  wechat_id: '',
  dietary_preferences: {} as any,
  travel_interests: {} as any,
  budget_preferences: {} as any,
  marketing_consent: false,
});

const addresses = ref<any[]>([]);
const saving = ref(false);
const savingProfile = ref(false);
const savingAddress = ref(false);
const changingPassword = ref(false);
const showAddAddressModal = ref(false);
const toast = useToast();

const addressForm = ref({
  label: '',
  street: '',
  city: '',
  postal_code: '',
});

const passwordChecks = computed(() => {
  const pwd = passwordForm.value.new_password;
  return {
    length: pwd.length < 8,
    uppercase: !/[A-Z]/.test(pwd),
    lowercase: !/[a-z]/.test(pwd),
    number: !/[0-9]/.test(pwd),
  };
});

const isPasswordFormValid = computed(() => {
  return (
    passwordForm.value.current_password.length > 0 &&
    passwordForm.value.new_password.length >= 8 &&
    /[A-Z]/.test(passwordForm.value.new_password) &&
    /[a-z]/.test(passwordForm.value.new_password) &&
    /[0-9]/.test(passwordForm.value.new_password) &&
    passwordForm.value.new_password === passwordForm.value.confirm_password
  );
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
      const cp = response.data.customerProfile;
      customerProfileForm.value = {
        nationality: cp.nationality || '',
        passport_name: cp.passport_name || '',
        preferred_language: cp.preferred_language || '',
        full_name: cp.full_name || '',
        gender: cp.gender || '',
        birth_year: cp.birth_year || undefined,
        country_of_residence: cp.country_of_residence || '',
        city_of_residence: cp.city_of_residence || '',
        preferred_currency: cp.preferred_currency || '',
        preferred_contact_channel: cp.preferred_contact_channel || '',
        wechat_id: cp.wechat_id || '',
        dietary_preferences: cp.dietary_preferences || {},
        travel_interests: cp.travel_interests || {},
        budget_preferences: cp.budget_preferences || {},
        marketing_consent: cp.marketing_consent || false,
      };
    } else {
      customerProfileForm.value = {
        nationality: '',
        passport_name: '',
        preferred_language: '',
        full_name: '',
        gender: '',
        birth_year: undefined,
        country_of_residence: '',
        city_of_residence: '',
        preferred_currency: '',
        preferred_contact_channel: '',
        wechat_id: '',
        dietary_preferences: {},
        travel_interests: {},
        budget_preferences: {},
        marketing_consent: false,
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

async function changePassword() {
  if (!isPasswordFormValid.value) {
    toast.error('Please fill all fields correctly');
    return;
  }

  changingPassword.value = true;
  try {
    await axios.patch('/api/user/password', {
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
    });
    toast.success('Password changed successfully');
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

async function updateCustomerProfile() {
  savingProfile.value = true;
  try {
    await axios.patch('/api/user/profile', {
      customerProfile: {
        nationality: customerProfileForm.value.nationality || null,
        passport_name: customerProfileForm.value.passport_name || null,
        preferred_language: customerProfileForm.value.preferred_language || null,
        full_name: customerProfileForm.value.full_name || null,
        gender: customerProfileForm.value.gender || null,
        birth_year: customerProfileForm.value.birth_year || null,
        country_of_residence: customerProfileForm.value.country_of_residence || null,
        city_of_residence: customerProfileForm.value.city_of_residence || null,
        preferred_currency: customerProfileForm.value.preferred_currency || null,
        preferred_contact_channel: customerProfileForm.value.preferred_contact_channel || null,
        wechat_id: customerProfileForm.value.wechat_id || null,
        dietary_preferences: customerProfileForm.value.dietary_preferences || null,
        travel_interests: customerProfileForm.value.travel_interests || null,
        budget_preferences: customerProfileForm.value.budget_preferences || null,
        marketing_consent: customerProfileForm.value.marketing_consent,
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
