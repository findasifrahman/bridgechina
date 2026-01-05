<template>
  <div class="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    <PageHeader title="Provider Profile" />
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Main Profile Information -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Provider Information</h3>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="updateProfile" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Provider Type</label>
              <select
                v-model="profileForm.provider_type"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select type</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>
            <Input
              v-model="profileForm.display_name"
              label="Display Name"
              placeholder="Your display name"
            />
            <Input
              v-if="profileForm.provider_type === 'company'"
              v-model="profileForm.company_name"
              label="Company Name"
              placeholder="Company name"
            />
            <Input
              v-model="profileForm.contact_name"
              label="Contact Name"
              placeholder="Contact person name"
            />
            <Input
              v-model="profileForm.email"
              label="Email"
              type="email"
              placeholder="Contact email"
            />
            <Input
              v-model="profileForm.whatsapp"
              label="WhatsApp"
              placeholder="WhatsApp number"
            />
            <Input
              v-model="profileForm.wechat"
              label="WeChat"
              placeholder="WeChat ID"
            />
            <Input
              v-model="profileForm.website"
              label="Website"
              type="url"
              placeholder="https://example.com"
            />
            <Textarea
              v-model="profileForm.description"
              label="Description"
              rows="4"
              placeholder="Describe your services"
            />
            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="loadProfile">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving">Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <!-- Location & Service Areas -->
      <Card>
        <CardHeader>
          <h3 class="text-lg font-semibold">Location & Service Areas</h3>
        </CardHeader>
        <CardBody>
          <form @submit.prevent="updateProfile" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Primary City</label>
              <select
                v-model="profileForm.city_id"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select city</option>
                <option v-for="city in cities" :key="city.id" :value="city.id">
                  {{ city.name }}
                </option>
              </select>
            </div>
            <Textarea
              v-model="profileForm.service_area"
              label="Service Area Description"
              rows="3"
              placeholder="Describe the areas you serve"
            />
            <Input
              v-model="profileForm.address_text"
              label="Address"
              placeholder="Your business address"
            />
            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="loadProfile">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving">Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <!-- Service Categories -->
      <Card class="md:col-span-2">
        <CardHeader>
          <h3 class="text-lg font-semibold">Service Categories</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <label
                v-for="category in serviceCategories"
                :key="category.key"
                class="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                :class="selectedCategories.includes(category.key) ? 'border-teal-500 bg-teal-50' : 'border-slate-200'"
              >
                <input
                  type="checkbox"
                  :value="category.key"
                  v-model="selectedCategories"
                  class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span class="text-sm font-medium">{{ category.name }}</span>
              </label>
            </div>
            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="loadProfile">Cancel</Button>
              <Button variant="primary" @click="updateCategories" :loading="saving">Save Categories</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <!-- Service Profiles -->
      <Card class="md:col-span-2">
        <CardHeader>
          <h3 class="text-lg font-semibold">Service-Specific Profiles</h3>
        </CardHeader>
        <CardBody>
          <div class="space-y-4">
            <div v-if="serviceProfiles.length === 0" class="text-sm text-slate-500">
              No service profiles configured. Select categories above and click "Save Categories", then configure individual service profiles.
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="serviceProfile in serviceProfiles"
                :key="serviceProfile.id"
                class="p-4 border rounded-lg"
              >
                <div class="flex justify-between items-center mb-3">
                  <h4 class="font-semibold">
                    {{ getCategoryName(serviceProfile.category_key) }}
                  </h4>
                  <router-link
                    :to="{ name: 'provider-service-profile', params: { categoryKey: serviceProfile.category_key } }"
                    class="text-teal-600 hover:text-teal-700 text-sm font-medium"
                  >
                    Configure →
                  </router-link>
                </div>
                <p class="text-sm text-slate-600">
                  Status: <span :class="serviceProfile.is_active ? 'text-green-600' : 'text-slate-400'">
                    {{ serviceProfile.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardHeader, CardBody, Input, Textarea, Button } from '@bridgechina/ui';

const profileForm = ref({
  provider_type: '',
  display_name: '',
  company_name: '',
  contact_name: '',
  email: '',
  whatsapp: '',
  wechat: '',
  website: '',
  description: '',
  city_id: '',
  service_area: '',
  address_text: '',
});

const selectedCategories = ref<string[]>([]);
const serviceProfiles = ref<any[]>([]);
const cities = ref<any[]>([]);
const serviceCategories = ref<any[]>([]);
const saving = ref(false);
const toast = useToast();

const serviceCategoryMap: Record<string, string> = {
  guide: 'Guide Service',
  hotel: 'Hotel Booking',
  transport: 'Transport',
  halal_food: 'Halal Food',
  medical: 'Medical Assistance',
  translation_help: 'Translation & Help',
  shopping: 'Shopping Service',
  tours: 'Tours',
  esim: 'eSIM Plans',
};

function getCategoryName(key: string): string {
  return serviceCategoryMap[key] || key;
}

async function loadCities() {
  try {
    const response = await axios.get('/api/public/cities');
    cities.value = response.data.filter((c: any) => c.is_active);
  } catch (error) {
    console.error('Failed to load cities:', error);
  }
}

async function loadServiceCategories() {
  try {
    // Use hardcoded service categories since they're standardized
    serviceCategories.value = Object.entries(serviceCategoryMap).map(([key, name]) => ({
      key,
      name,
    }));
  } catch (error) {
    console.error('Failed to load service categories:', error);
  }
}

async function loadProfile() {
  try {
    const response = await axios.get('/api/provider/profile');
    const profile = response.data;
    
    profileForm.value = {
      provider_type: profile.provider_type || '',
      display_name: profile.display_name || '',
      company_name: profile.company_name || '',
      contact_name: profile.contact_name || '',
      email: profile.email || '',
      whatsapp: profile.whatsapp || '',
      wechat: profile.wechat || '',
      website: profile.website || '',
      description: profile.description || '',
      city_id: profile.city_id || '',
      service_area: profile.service_area || '',
      address_text: profile.address_text || '',
    };
    
    selectedCategories.value = (profile.categories as string[]) || [];
    serviceProfiles.value = profile.serviceProfiles || [];
  } catch (error: any) {
    if (error.response?.status === 404) {
      toast.error('Provider profile not found. Please contact admin to create your profile.');
    } else {
      toast.error(error.response?.data?.error || 'Failed to load profile');
    }
  }
}

async function updateProfile() {
  saving.value = true;
  try {
    await axios.patch('/api/provider/profile', profileForm.value);
    toast.success('Profile updated');
    await loadProfile();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update profile');
  } finally {
    saving.value = false;
  }
}

async function updateCategories() {
  saving.value = true;
  try {
    await axios.patch('/api/provider/profile', {
      categories: selectedCategories.value,
    });
    toast.success('Categories updated');
    await loadProfile();
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to update categories');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadCities(), loadServiceCategories(), loadProfile()]);
});
</script>

