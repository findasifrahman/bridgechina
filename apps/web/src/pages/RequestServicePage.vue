<template>
  <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <PageHeader
      title="Request a Service"
      subtitle="Tell us what you need and we'll handle it for you"
    />
    
    <!-- Step Indicator -->
    <div class="mb-8">
      <div class="flex items-center justify-center space-x-4">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="flex items-center"
        >
          <div
            :class="[
              'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
              currentStep > index
                ? 'bg-teal-600 text-white'
                : currentStep === index
                ? 'bg-teal-600 text-white ring-4 ring-teal-200'
                : 'bg-slate-200 text-slate-600',
            ]"
          >
            {{ index + 1 }}
          </div>
          <div
            v-if="index < steps.length - 1"
            :class="[
              'w-16 h-1 mx-2',
              currentStep > index ? 'bg-teal-600' : 'bg-slate-200',
            ]"
          ></div>
        </div>
      </div>
      <p class="text-center mt-4 text-slate-600 font-medium">{{ steps[currentStep] }}</p>
    </div>

    <Card>
      <CardBody>
        <!-- Step 1: City + Category -->
        <div v-if="currentStep === 0" class="space-y-6">
          <Select
            v-model="form.city_id"
            label="City"
            :options="cityOptions"
            placeholder="Select a city"
            required
          />
          <Select
            v-model="form.category_key"
            label="Service Category"
            :options="categoryOptions"
            placeholder="Select a service"
            required
          />
        </div>

        <!-- Step 2: Category-specific fields -->
        <div v-if="currentStep === 1" class="space-y-6">
          <HotelFields v-if="form.category_key === 'hotel'" v-model="categoryData" />
          <TransportFields v-else-if="form.category_key === 'transport'" v-model="categoryData" />
          <FoodFields v-else-if="form.category_key === 'halal_food'" v-model="categoryData" />
          <MedicalFields v-else-if="form.category_key === 'medical'" v-model="categoryData" />
          <TranslationFields v-else-if="form.category_key === 'translation_help'" v-model="categoryData" />
          <ShoppingFields v-else-if="form.category_key === 'shopping_service'" v-model="categoryData" />
          <TourFields v-else-if="form.category_key === 'tours'" v-model="categoryData" />
          <EsimFields v-else-if="form.category_key === 'esim'" v-model="categoryData" />
        </div>

        <!-- Step 3: Contact details -->
        <div v-if="currentStep === 2" class="space-y-6">
          <Input
            v-model="form.customer_name"
            label="Your Name"
            required
          />
          <Input
            v-model="form.phone"
            label="Phone"
            type="tel"
            required
          />
          <Input
            v-model="form.whatsapp"
            label="WhatsApp (optional)"
            type="tel"
          />
          <Input
            v-model="form.email"
            label="Email (optional)"
            type="email"
          />
          <Textarea
            v-model="form.notes"
            label="Additional Notes"
            rows="4"
          />
        </div>

        <!-- Success Screen -->
        <div v-if="currentStep === 3" class="text-center py-8">
          <div class="text-6xl mb-4">✅</div>
          <h3 class="text-2xl font-bold text-slate-900 mb-2">Request Submitted!</h3>
          <p class="text-slate-600 mb-4">
            Your request ID: <span class="font-semibold text-teal-600">{{ submittedRequestId }}</span>
          </p>
          <p class="text-slate-600 mb-6">We'll contact you shortly to confirm your request.</p>
          <div class="flex gap-4 justify-center">
            <Button variant="primary" @click="$router.push('/user/requests')">
              View My Requests
            </Button>
            <Button variant="secondary" @click="resetForm">
              Submit Another Request
            </Button>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div v-if="currentStep < 3" class="flex justify-between mt-8">
          <Button
            v-if="currentStep > 0"
            variant="ghost"
            @click="currentStep--"
          >
            Previous
          </Button>
          <div v-else></div>
          <Button
            v-if="currentStep < 2"
            variant="primary"
            :disabled="!canProceed"
            @click="currentStep++"
          >
            Next
          </Button>
          <Button
            v-else
            variant="primary"
            :loading="loading"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            Submit Request
          </Button>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import { Card, CardBody, PageHeader, Select, Input, Textarea, Button, useToast } from '@bridgechina/ui';
import HotelFields from '@/components/request/HotelFields.vue';
import TransportFields from '@/components/request/TransportFields.vue';
import FoodFields from '@/components/request/FoodFields.vue';
import MedicalFields from '@/components/request/MedicalFields.vue';
import TranslationFields from '@/components/request/TranslationFields.vue';
import ShoppingFields from '@/components/request/ShoppingFields.vue';
import TourFields from '@/components/request/TourFields.vue';
import EsimFields from '@/components/request/EsimFields.vue';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const steps = ['Select Service', 'Service Details', 'Contact Information', 'Confirmation'];
const currentStep = ref(0);
const loading = ref(false);
const submittedRequestId = ref('');

const form = ref({
  city_id: '',
  category_key: '',
  customer_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  notes: '',
});

const categoryData = ref<any>({});

const cityOptions = ref<{ value: string; label: string }[]>([]);
const categoryOptions = [
  { value: 'hotel', label: 'Hotel Booking' },
  { value: 'transport', label: 'Transport' },
  { value: 'halal_food', label: 'Halal Food' },
  { value: 'medical', label: 'Medical Assistance' },
  { value: 'translation_help', label: 'Translation & Help' },
  { value: 'shopping_service', label: 'Shopping Service' },
  { value: 'tours', label: 'Tours' },
  { value: 'esim', label: 'eSIM Plans' },
];

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return form.value.city_id && form.value.category_key;
  }
  return true;
});

const canSubmit = computed(() => {
  return form.value.customer_name && form.value.phone;
});

onMounted(async () => {
  try {
    const response = await axios.get('/api/public/cities');
    cityOptions.value = response.data.map((city: any) => ({
      value: city.id,
      label: city.name,
    }));
  } catch (error) {
    console.error('Failed to load cities');
  }
});

async function handleSubmit() {
  loading.value = true;
  try {
    const requestPayload: any = {
      ...categoryData.value,
      notes: form.value.notes,
    };

    const response = await axios.post('/api/public/service-request', {
      category_key: form.value.category_key,
      city_id: form.value.city_id,
      customer_name: form.value.customer_name,
      phone: form.value.phone,
      whatsapp: form.value.whatsapp || null,
      email: form.value.email || null,
      request_payload: requestPayload,
    });

    submittedRequestId.value = response.data.id;
    currentStep.value = 3;
    toast.success('Request submitted successfully!');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to submit request');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = {
    city_id: '',
    category_key: '',
    customer_name: '',
    phone: '',
    whatsapp: '',
    email: '',
    notes: '',
  };
  categoryData.value = {};
  currentStep.value = 0;
  submittedRequestId.value = '';
}
</script>
