<template>
  <div class="space-y-4">
    <div v-if="loading" class="space-y-4">
      <SkeletonLoader v-for="i in 3" :key="i" class="h-32" />
    </div>
    
    <div v-else-if="reviews.length === 0" class="text-center py-8">
      <EmptyState
        title="No reviews yet"
        description="Be the first to review this item!"
      />
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {{ getUserInitials(review.user) }}
            </div>
            <div>
              <div class="font-semibold text-slate-900">
                {{ getUserDisplayName(review.user) }}
              </div>
              <div class="text-xs text-slate-500">
                {{ formatDate(review.created_at) }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <Star
              v-for="i in 5"
              :key="i"
              class="h-4 w-4"
              :class="i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'"
            />
          </div>
        </div>
        
        <div v-if="review.title" class="font-semibold text-slate-900 mb-2">
          {{ review.title }}
        </div>
        
        <p v-if="review.comment" class="text-slate-700 text-sm leading-relaxed">
          {{ review.comment }}
        </p>

        <div v-if="review.is_verified" class="mt-2">
          <Badge variant="success" size="sm">Verified Purchase</Badge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { SkeletonLoader, EmptyState, Badge } from '@bridgechina/ui';

defineProps<{
  reviews: any[];
  loading?: boolean;
}>();

function getUserInitials(user: any): string {
  if (user?.email) {
    return user.email.charAt(0).toUpperCase();
  }
  if (user?.phone) {
    return user.phone.slice(-1);
  }
  return 'U';
}

function getUserDisplayName(user: any): string {
  if (user?.email) {
    const email = user.email;
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (user?.phone) {
    return `User ${user.phone.slice(-4)}`;
  }
  return 'Anonymous User';
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
</script>

