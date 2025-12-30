<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="relative bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-t-2xl">
        <button
          @click="handleClose"
          class="absolute top-4 right-4 text-white hover:text-white/80 transition-colors"
        >
          <X class="h-6 w-6" />
        </button>
        <div class="flex items-center gap-3 text-white">
          <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <ShoppingCart class="h-6 w-6" />
          </div>
          <div>
            <h2 class="text-xl font-bold">Purchase eSIM Plan</h2>
            <p class="text-sm text-white/90">{{ plan?.name }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Not Logged In -->
        <div v-if="!authStore.isAuthenticated" class="text-center py-8">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <AlertCircle class="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 class="font-semibold text-slate-900 mb-2">Please Login First</h3>
            <p class="text-sm text-slate-600 mb-4">
              You need to be logged in to purchase an eSIM plan. We'll contact you within an hour after purchase.
            </p>
            <Button variant="primary" full-width @click="router.push('/login')">
              Go to Login
            </Button>
          </div>
        </div>

        <!-- Logged In -->
        <div v-else>
          <div v-if="!purchased" class="space-y-6">
            <!-- Plan Summary -->
            <div class="bg-slate-50 rounded-xl p-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-slate-600">Plan</span>
                <span class="font-semibold text-slate-900">{{ plan?.name }}</span>
              </div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-slate-600">Data</span>
                <span class="font-semibold text-slate-900">{{ plan?.data_text }}</span>
              </div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-slate-600">Validity</span>
                <span class="font-semibold text-slate-900">{{ plan?.validity_days }} days</span>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-slate-200">
                <span class="text-lg font-semibold text-slate-900">Total</span>
                <span class="text-2xl font-bold text-purple-600">${{ plan?.price }}</span>
              </div>
            </div>

            <!-- User Info -->
            <div>
              <h3 class="font-semibold text-slate-900 mb-3">Your Information</h3>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    v-model="userInfo.name"
                    type="text"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    v-model="userInfo.phone"
                    type="tel"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your phone number"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    v-model="userInfo.email"
                    type="email"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your email"
                  />
                </div>
              </div>
            </div>

            <!-- Purchase Button -->
            <Button
              variant="primary"
              full-width
              size="lg"
              :disabled="processing || !userInfo.name || !userInfo.phone"
              class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              @click="handlePurchase"
            >
              <Loader2 v-if="processing" class="h-5 w-5 mr-2 animate-spin" />
              <ShoppingCart v-else class="h-5 w-5 mr-2" />
              {{ processing ? 'Processing...' : 'Confirm Purchase' }}
            </Button>
          </div>

          <!-- Success Message -->
          <div v-else class="text-center py-8">
            <div class="bg-green-50 border border-green-200 rounded-xl p-6">
              <CheckCircle class="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 class="font-semibold text-slate-900 mb-2">Thank you for your interest, sir!</h3>
              <p class="text-sm text-slate-600 mb-4">
                We will contact you about the eSIM within an hour. Your request has been submitted successfully.
              </p>
              <Button variant="primary" full-width @click="handleClose">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { X, ShoppingCart, AlertCircle, CheckCircle, Loader2 } from 'lucide-vue-next';
import { Button } from '@bridgechina/ui';
import { useAuthStore } from '@/stores/auth';
import axios from '@/utils/axios';

const props = defineProps<{
  plan: any;
}>();

const emit = defineEmits<{
  close: [];
  purchased: [];
}>();

const router = useRouter();
const authStore = useAuthStore();

const isOpen = ref(true);
const purchased = ref(false);
const processing = ref(false);

const userInfo = ref({
  name: authStore.user?.email?.split('@')[0] || '',
  phone: authStore.user?.phone || '',
  email: authStore.user?.email || '',
});

watch(() => authStore.user, (user) => {
  if (user) {
    userInfo.value.name = user.email?.split('@')[0] || '';
    userInfo.value.phone = user.phone || '';
    userInfo.value.email = user.email || '';
  }
}, { immediate: true });

function handleClose() {
  isOpen.value = false;
  emit('close');
}

async function handlePurchase() {
  if (!props.plan || processing.value) return;

  processing.value = true;
  try {
    // Create service request for esim purchase
    await axios.post('/api/user/esim/purchase', {
      plan_id: props.plan.id,
      customer_name: userInfo.value.name,
      phone: userInfo.value.phone,
      email: userInfo.value.email,
    });

    purchased.value = true;
    emit('purchased');
  } catch (error: any) {
    console.error('Purchase failed:', error);
    alert(error.response?.data?.error || 'Failed to process purchase. Please try again.');
  } finally {
    processing.value = false;
  }
}
</script>

