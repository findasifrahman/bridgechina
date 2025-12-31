<template>
  <div>
    <!-- Floating Button -->
    <button
      v-if="!isOpen"
      class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all z-[60] hover:scale-110 cursor-pointer"
      aria-label="Open AI Chat"
      @click.stop="openChat"
      type="button"
    >
      <MessageCircle class="h-5 w-5 sm:h-6 sm:w-6" />
    </button>

    <!-- Chat Panel -->
    <div
      v-if="isOpen"
      class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-80 md:w-96 h-[calc(100vh-8rem)] sm:h-[600px] max-h-[600px] bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col z-[60]"
    >
      <!-- Header -->
      <div class="bg-teal-600 text-white p-3 sm:p-4 rounded-t-lg flex justify-between items-center flex-shrink-0">
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-sm sm:text-base truncate">BridgeChina Assistant</h3>
          <p class="text-xs text-white/80 hidden sm:block">Ask me anything about China services</p>
        </div>
        <button 
          class="text-white hover:text-slate-200 flex-shrink-0 ml-2" 
          @click="closeChat"
          aria-label="Close chat"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-slate-50">
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="text-center py-8">
          <div class="inline-block bg-teal-100 rounded-full p-3 mb-3">
            <MessageCircle class="h-8 w-8 text-teal-600" />
          </div>
          <p class="text-sm text-slate-600 mb-2">Hi! 👋 I'm your BridgeChina assistant.</p>
          <p class="text-xs text-slate-500">I can help you with hotels, transport, food, medical help, tours, eSIM, and shopping.</p>
        </div>

        <!-- Messages -->
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="[
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          ]"
        >
          <div
            :class="[
              'max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 sm:py-2',
              message.role === 'user'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-900 border border-slate-200'
            ]"
          >
            <p class="text-xs whitespace-pre-wrap break-words leading-tight">{{ message.content }}</p>
            
            <!-- Images (for assistant messages) - Display with labels -->
            <div v-if="message.images && message.images.length > 0" class="mt-2 space-y-1.5">
              <div
                v-for="(img, imgIndex) in message.images.slice(0, 2)"
                :key="imgIndex"
                class="relative w-full rounded overflow-hidden bg-slate-100"
                :class="message.images.length === 1 ? 'h-32' : 'h-24'"
              >
                <img
                  :src="img"
                  :alt="`Item ${imgIndex + 1}`"
                  class="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                  @error="handleImageError"
                  @click="openImageModal(img)"
                />
                <div class="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] px-2 py-0.5">
                  Item {{ imgIndex + 1 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="loading" class="flex justify-start">
          <div class="bg-white border border-slate-200 rounded-lg px-4 py-2">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t border-slate-200 p-3 sm:p-4 bg-white">
        <div class="flex space-x-2">
          <Input
            v-model="currentQuery"
            placeholder="Type your message..."
            size="sm"
            class="flex-1 text-sm"
            :disabled="loading"
            @keyup.enter="handleSend"
          />
          <Button 
            variant="primary" 
            size="sm" 
            :disabled="loading || !currentQuery.trim()"
            @click="handleSend"
            class="flex-shrink-0"
          >
            <Send class="h-4 w-4" />
          </Button>
        </div>
        <p class="text-xs text-slate-500 mt-2 text-center">
          Powered by BridgeChina AI
        </p>
      </div>
    </div>

    <!-- Image Modal -->
    <div
      v-if="imageModalOpen && selectedImage"
      class="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
      @click="closeImageModal"
    >
      <div class="relative max-w-4xl max-h-[90vh] w-full" @click.stop>
        <button
          class="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 z-10"
          @click="closeImageModal"
          aria-label="Close image"
        >
          <X class="h-5 w-5 text-slate-900" />
        </button>
        <img
          :src="selectedImage"
          alt="Full size image"
          class="w-full h-auto max-h-[90vh] object-contain rounded-lg"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { MessageCircle, X, Send } from 'lucide-vue-next';
import Input from './Input.vue';
import Button from './Button.vue';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

const isOpen = ref(false);
const currentQuery = ref('');
const messages = ref<ChatMessage[]>([]);
const loading = ref(false);
const sessionId = ref<string | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const imageModalOpen = ref(false);
const selectedImage = ref<string | null>(null);

// Generate or retrieve session ID
function getSessionId(): string {
  if (!sessionId.value) {
    sessionId.value = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  return sessionId.value;
}

// Scroll to bottom of messages
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

// Handle image load errors
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

// Open image in modal
function openImageModal(imageUrl: string) {
  selectedImage.value = imageUrl;
  imageModalOpen.value = true;
}

// Close image modal
function closeImageModal() {
  imageModalOpen.value = false;
  selectedImage.value = null;
}

// Open chat
function openChat() {
  isOpen.value = true;
  // Reset if needed (will be handled by backend)
  if (messages.value.length === 0) {
    sessionId.value = null; // Reset session on new chat
  }
}

// Close chat
function closeChat() {
  isOpen.value = false;
}

// Send message
async function handleSend() {
  if (!currentQuery.value.trim() || loading.value) return;

  const userMessage = currentQuery.value.trim();
  currentQuery.value = '';

  // Add user message to UI
  messages.value.push({
    role: 'user',
    content: userMessage,
  });

  scrollToBottom();
  loading.value = true;

  try {
    // Use axios if available, otherwise use fetch with proper baseURL
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const endpoint = `${apiUrl}/api/public/ai-search`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userMessage,
        sessionId: getSessionId(),
      }),
    });

    // Check if response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 100));
      throw new Error('Server returned non-JSON response. Please check API configuration.');
    }

    const data = await response.json();

    // Update session ID if provided
    if (data.sessionId) {
      sessionId.value = data.sessionId;
    }

    // Check if reset is needed
    if (data.shouldReset) {
      messages.value = [];
      // Add greeting message
      messages.value.push({
        role: 'assistant',
        content: data.response || 'Hi again 👋 How can I help you today?',
        images: data.images || [],
      });
    } else {
      // Add assistant response
      messages.value.push({
        role: 'assistant',
        content: data.response || 'I apologize, I could not generate a response. How can I help you?',
        images: data.images || [],
      });
    }

    scrollToBottom();
  } catch (error: any) {
    console.error('Chat error:', error);
    let errorMessage = 'I apologize, I encountered an error. Please try again or contact us via WhatsApp.';
    
    if (error.message?.includes('404')) {
      errorMessage = 'API endpoint not found. Please check that VITE_API_URL is configured correctly.';
    } else if (error.message?.includes('non-JSON')) {
      errorMessage = 'Server configuration error. Please contact support.';
    }
    
    messages.value.push({
      role: 'assistant',
      content: errorMessage,
    });
    scrollToBottom();
  } finally {
    loading.value = false;
  }
}

// Watch for messages changes to auto-scroll
watch(messages, () => {
  scrollToBottom();
}, { deep: true });
</script>
