<template>
  <div>
    <!-- Floating Button -->
    <button
      v-if="!isOpen"
      class="fixed bottom-6 right-6 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg transition-all z-50"
      @click="isOpen = true"
    >
      <MessageCircle class="h-6 w-6" />
    </button>

    <!-- Chat Panel -->
    <div
      v-if="isOpen"
      class="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col z-50"
    >
      <div class="bg-teal-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <h3 class="font-semibold">Need Help?</h3>
        <button class="text-white hover:text-slate-200" @click="isOpen = false">
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <!-- Quick FAQ -->
        <div>
          <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Quick FAQ</h4>
          <div class="space-y-2">
            <button
              v-for="faq in quickFaqs"
              :key="faq.question"
              class="w-full text-left px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              @click="handleFaqClick(faq)"
            >
              {{ faq.question }}
            </button>
          </div>
        </div>

        <!-- AI Search -->
        <div>
          <h4 class="text-xs font-semibold text-slate-500 uppercase mb-2">Ask AI</h4>
          <div class="flex space-x-2">
            <Input
              v-model="aiQuery"
              placeholder="Ask anything..."
              size="sm"
              @keyup.enter="handleAiSearch"
            />
            <Button variant="primary" size="sm" @click="handleAiSearch">
              <Send class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="aiResponse" class="mt-2 p-3 bg-teal-50 rounded-lg text-sm text-slate-700">
            {{ aiResponse }}
          </div>
        </div>

        <!-- WhatsApp CTA -->
        <Button variant="accent" full-width @click="openWhatsApp" class="flex items-center justify-center space-x-2">
          <MessageCircle class="h-4 w-4" />
          <span>Chat on WhatsApp</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MessageCircle, X, Send } from 'lucide-vue-next';
import Input from './Input.vue';
import Button from './Button.vue';

const isOpen = ref(false);
const aiQuery = ref('');
const aiResponse = ref('');

const quickFaqs = [
  { question: 'Airport pickup safety?', answer: 'All our drivers are verified and insured.' },
  { question: 'How to pay?', answer: 'We accept cash, WeChat Pay, Alipay, and bank transfers.' },
  { question: 'Halal food delivery?', answer: 'Yes, we partner with verified halal restaurants.' },
  { question: 'Medical help?', answer: 'We can connect you with English-speaking medical professionals.' },
];

const handleFaqClick = (faq: any) => {
  aiResponse.value = faq.answer;
};

const handleAiSearch = async () => {
  if (!aiQuery.value.trim()) return;
  
  // Call AI search endpoint
  try {
    const response = await fetch('/api/public/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: aiQuery.value }),
    });
    const data = await response.json();
    aiResponse.value = data.response || 'I can help you with hotels, transport, food, medical assistance, and more. What do you need?';
  } catch (error) {
    aiResponse.value = 'I can help you with hotels, transport, food, medical assistance, and more. What do you need?';
  }
};

const openWhatsApp = () => {
  window.open('https://wa.me/1234567890', '_blank');
};
</script>

