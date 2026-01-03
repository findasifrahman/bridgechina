<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- Mobile: List View -->
    <div v-if="!selectedConversationId || showListView" class="h-full flex flex-col md:hidden">
      <!-- Header -->
      <div class="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-lg font-semibold">WhatsApp Inbox</h1>
        </div>
        <!-- Search and Filter -->
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search conversations..."
            class="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select
            v-model="filters.mode"
            @change="loadConversations"
            class="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All</option>
            <option value="AI">AI</option>
            <option value="HUMAN">Human</option>
          </select>
        </div>
      </div>

      <!-- Conversations List -->
      <div class="flex-1 overflow-y-auto bg-white">
        <div v-if="loading" class="p-4 text-center text-sm text-slate-500">
          Loading...
        </div>
        <div v-else-if="conversations.length === 0" class="p-4 text-center text-sm text-slate-500">
          No conversations
        </div>
        <div v-else class="divide-y divide-slate-200">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="p-4 active:bg-slate-100 transition-colors cursor-pointer"
            @click="selectConversationMobile(conv.id)"
          >
            <div class="flex items-start gap-3">
              <!-- Avatar -->
              <div class="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                <span class="text-white font-semibold text-lg">
                  {{ getInitials(conv.external_from) }}
                </span>
              </div>
              
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="font-medium text-sm text-slate-900 truncate">
                      {{ formatPhoneNumber(conv.external_from) }}
                    </span>
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                        conv.mode === 'HUMAN' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                      ]"
                    >
                      {{ conv.mode }}
                    </span>
                  </div>
                  <span class="text-xs text-slate-500 flex-shrink-0 ml-2">
                    {{ formatTime(conv.last_inbound_at) }}
                  </span>
                </div>
                <p class="text-sm text-slate-600 truncate">
                  {{ conv.last_message_preview || 'No messages' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop: Side-by-side Layout -->
    <div class="hidden md:flex md:flex-col md:h-full">
      <!-- Header -->
      <div class="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 class="text-xl font-semibold">WhatsApp Inbox</h1>
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
        <div class="w-80 border-r bg-white overflow-y-auto">
          <div v-if="loading" class="p-4 text-center text-sm text-slate-500">
            Loading...
          </div>
          <div v-else-if="conversations.length === 0" class="p-4 text-center text-sm text-slate-500">
            No conversations
          </div>
          <div v-else class="divide-y divide-slate-200">
            <div
              v-for="conv in conversations"
              :key="conv.id"
              :class="[
                'p-4 cursor-pointer hover:bg-slate-50 transition-colors',
                selectedConversationId === conv.id ? 'bg-teal-50 border-l-4 border-teal-600' : ''
              ]"
              @click="selectConversation(conv.id)"
            >
              <div class="flex items-start gap-3">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                  <span class="text-white font-semibold text-sm">
                    {{ getInitials(conv.external_from) }}
                  </span>
                </div>
                
                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <span class="font-medium text-sm text-slate-900 truncate">
                        {{ formatPhoneNumber(conv.external_from) }}
                      </span>
                      <span
                        :class="[
                          'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                          conv.mode === 'HUMAN' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                        ]"
                      >
                        {{ conv.mode }}
                      </span>
                    </div>
                    <span class="text-xs text-slate-500 flex-shrink-0 ml-2">
                      {{ formatTime(conv.last_inbound_at) }}
                    </span>
                  </div>
                  <p class="text-sm text-slate-600 line-clamp-2">
                    {{ conv.last_message_preview || 'No messages' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat View (Right) -->
        <div class="flex-1 flex flex-col bg-white">
          <div v-if="!selectedConversation" class="flex-1 flex items-center justify-center text-slate-400">
            Select a conversation to view messages
          </div>
          <ConversationView
            v-else
            :conversation="selectedConversation"
            :messages="messages"
            :reply-text="replyText"
            :sending="sending"
            @update:reply-text="replyText = $event"
            @send="handleSend"
            @takeover="handleTakeover"
            @release="handleRelease"
          />
        </div>
      </div>
    </div>

    <!-- Mobile: Chat View -->
    <div v-if="selectedConversationId && !showListView" class="h-full flex flex-col md:hidden">
      <ConversationView
        :conversation="selectedConversation"
        :messages="messages"
        :reply-text="replyText"
        :sending="sending"
        :mobile="true"
        @update:reply-text="replyText = $event"
        @send="handleSend"
        @takeover="handleTakeover"
        @release="handleRelease"
        @back="showListView = true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from '@/utils/axios';
import ConversationView from './ConversationView.vue';

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
const showListView = ref(false); // For mobile navigation
let pollInterval: number | null = null;

function formatTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatPhoneNumber(phone: string | null) {
  if (!phone) return 'Unknown';
  return phone.replace('whatsapp:', '').replace(/^\+/, '');
}

function getInitials(phone: string | null) {
  if (!phone) return '?';
  const num = phone.replace('whatsapp:', '').replace(/^\+/, '');
  return num.slice(-2) || '?';
}

async function loadConversations() {
  loading.value = true;
  try {
    const params: any = {
      channel: 'twilio_whatsapp',
    };
    if (filters.value.mode) {
      params.mode = filters.value.mode;
    }
    if (searchQuery.value) {
      params.q = searchQuery.value;
    }

    const response = await axios.get('/api/ops/conversations', { params });
    conversations.value = response.data.conversations || [];

    // Select conversation from URL query param if present (desktop only)
    const convId = route.query.c as string;
    if (convId && !selectedConversationId.value && window.innerWidth >= 768) {
      selectConversation(convId);
    } else if (conversations.value.length > 0 && !selectedConversationId.value && window.innerWidth >= 768) {
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
  showListView.value = false;
  try {
    const response = await axios.get(`/api/ops/conversations/${id}`);
    selectedConversation.value = response.data;
    messages.value = response.data.messages || [];
    
    // Update URL
    router.replace({ query: { c: id } });
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
}

function selectConversationMobile(id: string) {
  selectConversation(id);
  showListView.value = false;
}

async function handleTakeover() {
  if (!selectedConversationId.value) return;
  try {
    await axios.post(`/api/ops/conversations/${selectedConversationId.value}/takeover`);
    await loadConversations();
    if (selectedConversationId.value) {
      await selectConversation(selectedConversationId.value);
    }
  } catch (error) {
    console.error('Failed to take over:', error);
    alert('Failed to take over conversation');
  }
}

async function handleRelease() {
  if (!selectedConversationId.value) return;
  try {
    await axios.post(`/api/ops/conversations/${selectedConversationId.value}/release`);
    await loadConversations();
    if (selectedConversationId.value) {
      await selectConversation(selectedConversationId.value);
    }
  } catch (error) {
    console.error('Failed to release:', error);
    alert('Failed to release conversation');
  }
}

async function handleSend() {
  if (!replyText.value.trim() || !selectedConversationId.value || sending.value) return;
  
  sending.value = true;
  try {
    await axios.post(`/api/ops/conversations/${selectedConversationId.value}/reply`, {
      text: replyText.value,
    });
    replyText.value = '';
    await selectConversation(selectedConversationId.value);
  } catch (error) {
    console.error('Failed to send message:', error);
    alert('Failed to send message');
  } finally {
    sending.value = false;
  }
}

function handleSearch() {
  loadConversations();
}

// Poll for new messages every 2 minutes
function startPolling() {
  pollInterval = window.setInterval(() => {
    loadConversations();
    if (selectedConversationId.value) {
      selectConversation(selectedConversationId.value);
    }
  }, 120000); // 2 minutes
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

onMounted(() => {
  loadConversations();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
