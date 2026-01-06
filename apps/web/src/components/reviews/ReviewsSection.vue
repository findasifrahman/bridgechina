<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Reviews</h2>
          <div v-if="averageRating" class="flex items-center gap-2 mt-2">
            <div class="flex items-center">
              <Star
                v-for="i in 5"
                :key="i"
                class="h-5 w-5"
                :class="i <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'"
              />
            </div>
            <span class="font-semibold text-slate-900">{{ averageRating.toFixed(1) }}</span>
            <span class="text-sm text-slate-600">({{ totalReviews }} {{ totalReviews === 1 ? 'review' : 'reviews' }})</span>
          </div>
        </div>
        <Button
          v-if="authStore.isAuthenticated && !hasUserReviewed"
          variant="primary"
          @click="showForm = true"
        >
          Write a Review
        </Button>
        <Button
          v-else-if="!authStore.isAuthenticated"
          variant="primary"
          @click="router.push('/login')"
        >
          Log In to Review
        </Button>
      </div>
    </CardHeader>
    <CardBody class="p-6">
      <!-- Review Form -->
      <div v-if="showForm" class="mb-6">
        <ReviewForm
          :entity-type="entityType"
          :entity-id="entityId"
          @submitted="handleReviewSubmitted"
          @cancel="showForm = false"
        />
      </div>

      <!-- Review List -->
      <ReviewList :reviews="reviews" :loading="loading" />
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Star } from 'lucide-vue-next';
import { Card, CardHeader, CardBody, Button } from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';
import ReviewList from './ReviewList.vue';
import ReviewForm from './ReviewForm.vue';

const props = defineProps<{
  entityType: string;
  entityId: string;
}>();

const router = useRouter();
const authStore = useAuthStore();

const reviews = ref<any[]>([]);
const averageRating = ref<number | null>(null);
const totalReviews = ref(0);
const loading = ref(true);
const showForm = ref(false);

const hasUserReviewed = computed(() => {
  if (!authStore.isAuthenticated || !authStore.user) return false;
  return reviews.value.some(r => r.user?.id === authStore.user?.id);
});

async function loadReviews() {
  loading.value = true;
  try {
    const response = await axios.get('/api/public/reviews', {
      params: {
        entity_type: props.entityType,
        entity_id: props.entityId,
      },
    });
    reviews.value = response.data.reviews || [];
    averageRating.value = response.data.averageRating;
    totalReviews.value = response.data.total || 0;
  } catch (error) {
    console.error('Failed to load reviews', error);
    reviews.value = [];
  } finally {
    loading.value = false;
  }
}

function handleReviewSubmitted() {
  showForm.value = false;
  loadReviews();
}

onMounted(() => {
  loadReviews();
});
</script>




