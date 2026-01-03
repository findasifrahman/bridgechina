<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <div class="border-b bg-white px-4 py-3 flex items-center justify-between">
      <h1 class="text-xl font-semibold">My Conversations</h1>
      <div class="flex items-center gap-2">
        <select
          v-model="filters.mode"
          @change="loadConversations"
          class="px-3 py-1.5 border rounded-md text-sm"
        >
          <option value="">All</option>
          <option value="AI">AI</option>
          <option value="HUMAN">Human</option>
        </select>
        <input
          v-model="searchQuery"
          @input="handleSearch"
          type="text"
          placeholder="Search..."
          class="px-3 py-1.5 border rounded-md text-sm w-48"
        />
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Conversations List (Left) -->
      <div class="w-80 border-r bg-slate-50 overflow-y-auto">
        <div v-if="loading" class="p-4 text-center text-sm text-slate-500">
          Loading...
        </div>
        <div v-else-if="conversations.length === 0" class="p-4 text-center text-sm text-slate-500">
          No conversations
        </div>
        <div
          v-else
          class="divide-y"
        >
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="[
              'p-4 cursor-pointer hover:bg-white transition-colors',
              selectedConversationId === conv.id ? 'bg-white border-l-4 border-teal-600' : ''
            ]"
            @click="selectConversation(conv.id)"
          >
            <div class="flex items-start justify-between mb-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-sm">
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
              <span class="text-xs text-slate-500">
                {{ formatTime(conv.last_inbound_at) }}
              </span>
            </div>
            <p class="text-sm text-slate-600 line-clamp-2">
              {{ conv.last_message_preview || 'No messages' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Chat View (Right) -->
      <div class="flex-1 flex flex-col bg-white">
        <div v-if="!selectedConversation" class="flex-1 flex items-center justify-center text-slate-400">
          Select a conversation to view messages
        </div>
        <div v-else class="flex-1 flex flex-col">
          <!-- Chat Header -->
          <div class="border-b px-4 py-3 flex items-center justify-between">
            <div>
              <div class="font-medium">
                {{ selectedConversation.external_from?.replace('whatsapp:', '') || 'Unknown' }}
              </div>
              <div class="text-sm text-slate-500">
                {{ selectedConversation.mode }} mode
                <span v-if="selectedConversation.category_key" class="ml-2">
                  · {{ selectedConversation.category_key }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                v-if="selectedConversation.mode === 'AI'"
                @click="handleTakeover"
                class="px-3 py-1.5 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700"
              >
                Take Over
              </button>
              <button
                v-else
                @click="handleRelease"
                class="px-3 py-1.5 bg-slate-600 text-white rounded-md text-sm hover:bg-slate-700"
              >
                Release to AI
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="[
                'flex',
                msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
              ]"
            >
              <div
                :class="[
                  'max-w-[70%] rounded-lg px-4 py-2',
                  msg.direction === 'OUTBOUND'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                ]"
              >
                <div class="text-sm whitespace-pre-wrap">
                  {{ msg.content }}
                </div>

                <div class="text-xs mt-1 opacity-70">
                  {{ formatTime(msg.created_at) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Reply Box -->
          <div v-if="selectedConversation.mode === 'HUMAN'" class="border-t p-4">
            <form @submit.prevent="handleSend" class="flex gap-2">
              <input
                v-model="replyText"
                type="text"
                placeholder="Type a message..."
                class="flex-1 px-3 py-2 border rounded-md"
                :disabled="sending"
              />
              <button
                type="submit"
                :disabled="!replyText.trim() || sending"
                class="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
          <div v-else class="border-t p-4 text-sm text-slate-500 text-center">
            AI mode - take over to reply
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';

const route = useRoute();
const router = useRouter();

const conversations = ref<any[]>([]);
const selectedConversationId = ref<string | null>(null);
const selectedConversation = ref<any | null>(null);
const messages = ref<any[]>([]);
const loading = ref(false);
const sending = ref(false);
const searchQuery = ref('');
const filters = ref({
  mode: '',
});
const replyText = ref('');
let pollInterval: number | null = null;

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

async function loadConversations() {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.value.mode) {
      params.mode = filters.value.mode;
    }

    const response = await axios.get('/api/provider/conversations', { params });
    conversations.value = response.data.conversations || [];

    // Select conversation from URL if present
    const convId = route.params.id as string;
    if (convId && !selectedConversationId.value) {
      selectConversation(convId);
    } else if (conversations.value.length > 0 && !selectedConversationId.value && !convId) {
      selectConversation(conversations.value[0].id);
    }
  } catch (error) {
    console.error('Failed to load conversations:', error);
  } finally {
    loading.value = false;
  }
}

async function selectConversation(id: string) {
  selectedConversationId.value = id;
  router.replace(`/provider/inbox/${id}`);
  
  try {
    const response = await axios.get(`/api/provider/conversations/${id}`);
    selectedConversation.value = response.data;
    messages.value = response.data.messages || [];
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
}

async function handleTakeover() {
  if (!selectedConversationId.value) return;
  
  try {
    await axios.post(`/api/provider/conversations/${selectedConversationId.value}/takeover`);
    await loadConversations();
    await selectConversation(selectedConversationId.value);
  } catch (error: any) {
    console.error('Failed to take over:', error);
    alert(error.response?.data?.error || 'Failed to take over conversation');
  }
}

async function handleRelease() {
  if (!selectedConversationId.value) return;
  
  try {
    await axios.post(`/api/provider/conversations/${selectedConversationId.value}/release`);
    await loadConversations();
    await selectConversation(selectedConversationId.value);
  } catch (error: any) {
    console.error('Failed to release:', error);
    alert(error.response?.data?.error || 'Failed to release conversation');
  }
}

async function handleSend() {
  if (!replyText.value.trim() || !selectedConversationId.value || sending.value) return;
  
  sending.value = true;
  try {
    await axios.post(`/api/provider/conversations/${selectedConversationId.value}/reply`, {
      text: replyText.value,
    });
    replyText.value = '';
    await selectConversation(selectedConversationId.value);
    await loadConversations();
  } catch (error: any) {
    console.error('Failed to send message:', error);
    alert(error.response?.data?.error || 'Failed to send message');
  } finally {
    sending.value = false;
  }
}

function handleSearch() {
  // Debounce search
  clearTimeout(pollInterval as any);
  pollInterval = window.setTimeout(() => {
    loadConversations();
  }, 500);
}

// Poll for new messages
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = window.setInterval(() => {
    if (selectedConversationId.value) {
      selectConversation(selectedConversationId.value);
    }
    loadConversations();
  }, 5000);
}

onMounted(() => {
  loadConversations();
  startPolling();
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

