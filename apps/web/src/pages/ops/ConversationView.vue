<template>
  <div class="flex-1 flex flex-col h-full">
    <!-- Chat Header -->
    <div class="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Back button (mobile only) -->
        <button
          v-if="mobile"
          @click="$emit('back')"
          class="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        >
          <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <!-- Avatar -->
        <div class="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
          <span class="text-white font-semibold text-sm">
            {{ getInitials(conversation?.external_from) }}
          </span>
        </div>
        
        <!-- User info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-slate-900 truncate">
            {{ formatPhoneNumber(conversation?.external_from) }}
          </div>
          <div class="text-xs text-slate-500">
            {{ conversation?.mode }} mode
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex gap-2 flex-shrink-0">
        <button
          v-if="conversation?.mode === 'AI'"
          @click="$emit('takeover')"
          class="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 active:bg-teal-800 transition-colors"
        >
          Take Over
        </button>
        <button
          v-else
          @click="$emit('release')"
          class="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 active:bg-slate-800 transition-colors"
        >
          Release
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto bg-[#ece5dd] p-4 space-y-3" ref="messagesContainer">
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
            'max-w-[75%] rounded-lg px-3 py-2 shadow-sm',
            msg.direction === 'OUTBOUND'
              ? 'bg-[#dcf8c6] rounded-tr-none'
              : 'bg-white rounded-tl-none'
          ]"
        >
          <p class="text-sm text-slate-900 whitespace-pre-wrap break-words">
            {{ msg.content }}
          </p>
          
          <!-- Images -->
          <div v-if="msg.meta_json?.mediaUrls?.length" class="mt-2 space-y-2">
            <div
              v-for="(url, idx) in msg.meta_json.mediaUrls"
              :key="idx"
              class="rounded overflow-hidden"
            >
              <img
                :src="url"
                :alt="`Media ${idx + 1}`"
                class="max-w-full h-auto"
                @error="handleImageError"
              />
            </div>
          </div>

          <!-- Single media URL -->
          <div v-else-if="msg.meta_json?.mediaUrl" class="mt-2 rounded overflow-hidden">
            <img
              :src="msg.meta_json.mediaUrl"
              alt="Media"
              class="max-w-full h-auto"
              @error="handleImageError"
            />
          </div>

          <div class="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1">
            <span>{{ formatTime(msg.created_at) }}</span>
            <span v-if="msg.direction === 'OUTBOUND'" class="text-teal-600">
              ✓
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reply Box -->
    <div class="bg-white border-t px-4 py-3 flex-shrink-0">
      <div v-if="conversation?.mode === 'HUMAN'" class="flex gap-2 items-end">
        <div class="flex-1 relative">
          <textarea
            :value="replyText"
            @input="$emit('update:reply-text', ($event.target as HTMLTextAreaElement).value)"
            @keydown.enter.exact.prevent="handleEnterKey"
            placeholder="Type a message..."
            rows="1"
            class="w-full px-4 py-2.5 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none max-h-32 overflow-y-auto"
            :disabled="sending"
            ref="textareaRef"
          />
        </div>
        <button
          @click="$emit('send')"
          :disabled="!replyText.trim() || sending"
          class="p-3 bg-teal-600 text-white rounded-full hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <svg v-if="!sending" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </div>
      <div v-else class="text-center py-2 text-sm text-slate-500">
        AI mode - take over to reply
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';

interface Props {
  conversation: any | null;
  messages: any[];
  replyText: string;
  sending: boolean;
  mobile?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:reply-text': [value: string];
  send: [];
  takeover: [];
  release: [];
  back: [];
}>();

const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function formatTime(date: string | Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
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

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none';
}

function handleEnterKey(e: KeyboardEvent) {
  if (e.shiftKey) {
    // Allow new line with Shift+Enter
    return;
  }
  // Send message with Enter
  if (props.replyText.trim() && !props.sending) {
    emit('send');
  }
}

// Auto-resize textarea
watch(() => props.replyText, () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
      textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 128)}px`;
    }
  });
});

// Scroll to bottom when new messages arrive
watch(() => props.messages.length, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { immediate: true });

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped>
/* WhatsApp-like background pattern */
.bg-\[#ece5dd\] {
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
</style>
