<template>
  <div class="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
    <PageHeader :title="`${getCategoryName(categoryKey)} Profile`" />
    <div class="max-w-3xl">
      <Card>
        <CardBody>
          <form @submit.prevent="saveProfile" class="space-y-6">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                v-model="profileForm.is_active"
                class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <label for="is_active" class="text-sm font-medium text-slate-700">
                Active (this service is available)
              </label>
            </div>

            <Textarea
              v-model="profileForm.description"
              label="Service Description"
              rows="4"
              placeholder="Describe this specific service offering"
            />

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Pricing Information (JSON)</label>
              <textarea
                v-model="pricingInfoText"
                rows="6"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                placeholder='{"hourly_rate": 100, "currency": "CNY", "min_duration": 2}'
              ></textarea>
              <p class="text-xs text-slate-500 mt-1">Enter pricing information as JSON (optional)</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Availability Information (JSON)</label>
              <textarea
                v-model="availabilityInfoText"
                rows="6"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                placeholder='{"available_days": ["Monday", "Tuesday", "Wednesday"], "time_slots": "9am-6pm"}'
              ></textarea>
              <p class="text-xs text-slate-500 mt-1">Enter availability information as JSON (optional)</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Specializations/Features (JSON)</label>
              <textarea
                v-model="specializationsText"
                rows="6"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                placeholder='{"languages": ["English", "Mandarin"], "certifications": ["Tour Guide License"], "features": ["Airport pickup", "Custom itineraries"]}'
              ></textarea>
              <p class="text-xs text-slate-500 mt-1">Enter specializations or features as JSON (optional)</p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <Button variant="ghost" type="button" @click="$router.back()">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving">Save Service Profile</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useToast } from '@bridgechina/ui';
import { PageHeader, Card, CardBody, Textarea, Button } from '@bridgechina/ui';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const categoryKey = computed(() => (route.params.categoryKey as string) || '');
const saving = ref(false);

const profileForm = ref({
  is_active: true,
  description: '',
  pricing_info: null as any,
  availability_info: null as any,
  specializations: null as any,
});

const pricingInfoText = ref('');
const availabilityInfoText = ref('');
const specializationsText = ref('');

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

async function loadProfile() {
  try {
    const response = await axios.get('/api/provider/profile');
    const serviceProfiles = response.data.serviceProfiles || [];
    const existing = serviceProfiles.find((sp: any) => sp.category_key === categoryKey.value);
    
    if (existing) {
      profileForm.value = {
        is_active: existing.is_active ?? true,
        description: existing.description || '',
        pricing_info: existing.pricing_info,
        availability_info: existing.availability_info,
        specializations: existing.specializations,
      };
      
      pricingInfoText.value = existing.pricing_info ? JSON.stringify(existing.pricing_info, null, 2) : '';
      availabilityInfoText.value = existing.availability_info ? JSON.stringify(existing.availability_info, null, 2) : '';
      specializationsText.value = existing.specializations ? JSON.stringify(existing.specializations, null, 2) : '';
    }
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to load service profile');
  }
}

async function saveProfile() {
  saving.value = true;
  try {
    // Parse JSON fields
    let pricingInfo = null;
    let availabilityInfo = null;
    let specializations = null;
    
    if (pricingInfoText.value.trim()) {
      try {
        pricingInfo = JSON.parse(pricingInfoText.value);
      } catch (e) {
        toast.error('Invalid JSON in Pricing Information');
        saving.value = false;
        return;
      }
    }
    
    if (availabilityInfoText.value.trim()) {
      try {
        availabilityInfo = JSON.parse(availabilityInfoText.value);
      } catch (e) {
        toast.error('Invalid JSON in Availability Information');
        saving.value = false;
        return;
      }
    }
    
    if (specializationsText.value.trim()) {
      try {
        specializations = JSON.parse(specializationsText.value);
      } catch (e) {
        toast.error('Invalid JSON in Specializations');
        saving.value = false;
        return;
      }
    }
    
    await axios.post('/api/provider/profile/service', {
      category_key: categoryKey.value,
      is_active: profileForm.value.is_active,
      description: profileForm.value.description || null,
      pricing_info: pricingInfo,
      availability_info: availabilityInfo,
      specializations: specializations,
    });
    
    toast.success('Service profile saved');
    router.push({ name: 'provider-profile' });
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to save service profile');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (!categoryKey.value) {
    toast.error('Invalid category');
    router.push({ name: 'provider-profile' });
    return;
  }
  loadProfile();
});
</script>

