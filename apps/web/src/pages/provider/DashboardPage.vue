<template>
  <div>
    <PageHeader title="Provider Dashboard" />
    <div class="grid md:grid-cols-3 gap-6 mb-8">
      <StatCard
        label="Assigned Conversations"
        :value="stats.assignedConversations || 0"
        icon="💬"
      />
      <StatCard
        label="Unread (24h)"
        :value="stats.unreadLast24h || 0"
        icon="🔔"
      />
      <StatCard
        label="Avg Response Time"
        :value="stats.avgResponseTimeMinutes ? `${stats.avgResponseTimeMinutes} min` : 'N/A'"
        icon="⏱️"
      />
    </div>

    <Card>
      <CardHeader>
        <h2 class="text-lg font-semibold">My Assigned Conversations</h2>
      </CardHeader>
      <CardBody>
        <div v-if="loading" class="text-center py-8 text-slate-500">Loading...</div>
        <div v-else-if="conversations.length === 0" class="text-center py-8 text-slate-500">
          No assigned conversations
        </div>
        <div v-else class="divide-y">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="p-4 hover:bg-slate-50 cursor-pointer"
            @click="$router.push(`/provider/inbox/${conv.id}`)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium">
                    {{ conv.external_from?.replace('whatsapp:', '') || 'Unknown' }}
                  </span>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-xs font-medium',
                      conv.mode === 'HUMAN' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                    ]"
                  >
                    {{ conv.mode }}
                  </span>
                  <span
                    v-if="conv.category_key"
                    class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
                  >
                    {{ conv.category_key }}
                  </span>
                </div>
                <p class="text-sm text-slate-600 line-clamp-2">
                  {{ conv.last_message_preview || 'No messages' }}
                </p>
                <div class="text-xs text-slate-500 mt-1">
                  {{ formatTime(conv.last_inbound_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/utils/axios';
import { PageHeader, StatCard, Card, CardHeader, CardBody } from '@bridgechina/ui';

const router = useRouter();
const stats = ref<any>({});
const conversations = ref<any[]>([]);
const loading = ref(true);

function formatTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

async function loadData() {
  loading.value = true;
  try {
    const [statsResponse, conversationsResponse] = await Promise.all([
      axios.get('/api/provider/stats'),
      axios.get('/api/provider/conversations', { params: { page: 1 } }),
    ]);
    stats.value = statsResponse.data;
    conversations.value = conversationsResponse.data.conversations || [];
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

