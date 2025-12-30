<template>
  <Card>
    <CardHeader>
      <h3 class="text-xl font-semibold text-slate-900">Write a Review</h3>
      <p class="text-sm text-slate-600 mt-1">Share your experience with others</p>
    </CardHeader>
    <CardBody class="p-6">
      <div v-if="!authStore.isAuthenticated" class="text-center py-8">
        <p class="text-slate-700 mb-4">Please log in to write a review.</p>
        <div class="flex gap-3 justify-center">
          <Button variant="ghost" @click="$emit('cancel')">Cancel</Button>
          <Button variant="primary" @click="router.push('/login')">Log In</Button>
        </div>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Rating -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Rating</label>
          <div class="flex items-center gap-2">
            <button
              v-for="i in 5"
              :key="i"
              type="button"
              @click="form.rating = i"
              class="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                class="h-8 w-8 transition-colors"
                :class="i <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'"
              />
            </button>
            <span v-if="form.rating" class="ml-2 text-sm font-medium text-slate-700">
              {{ form.rating }} out of 5
            </span>
          </div>
        </div>

        <!-- Title -->
        <div>
          <label for="review-title" class="block text-sm font-medium text-slate-700 mb-1">Title (Optional)</label>
          <Input
            id="review-title"
            v-model="form.title"
            type="text"
            placeholder="Summarize your experience"
            maxlength="100"
          />
        </div>

        <!-- Comment -->
        <div>
          <Textarea
            id="review-comment"
            v-model="form.comment"
            label="Your Review"
            :rows="4"
            required
            placeholder="Tell others about your experience..."
          />
        </div>

        <!-- Submit Button -->
        <div class="flex gap-3">
          <Button type="button" variant="ghost" @click="$emit('cancel')" :disabled="submitting">
            Cancel
          </Button>
          <Button type="submit" variant="primary" :loading="submitting" :disabled="!form.rating || !form.comment">
            Submit Review
          </Button>
        </div>
      </form>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Star } from 'lucide-vue-next';
import { Card, CardHeader, CardBody, Input, Textarea, Button, useToast } from '@bridgechina/ui';
import axios from '@/utils/axios';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  entityType: string;
  entityId: string;
}>();

const emit = defineEmits<{
  submitted: [];
  cancel: [];
}>();

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const form = ref({
  rating: 0,
  title: '',
  comment: '',
});

const submitting = ref(false);

async function handleSubmit() {
  if (!form.value.rating || !form.value.comment) {
    toast.error('Please provide a rating and comment');
    return;
  }

  submitting.value = true;
  try {
    await axios.post('/api/user/reviews', {
      entity_type: props.entityType,
      entity_id: props.entityId,
      rating: form.value.rating,
      title: form.value.title || null,
      comment: form.value.comment,
    });

    toast.success('Review submitted successfully!');
    form.value = { rating: 0, title: '', comment: '' };
    emit('submitted');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to submit review. Please try again.');
  } finally {
    submitting.value = false;
  }
}
</script>

