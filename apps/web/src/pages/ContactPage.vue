<template>
  <div class="py-6 px-4 sm:px-6 lg:px-8">
    <!-- Hero Section -->
    <div class="max-w-7xl mx-auto mb-12">
      <div class="relative isolate overflow-hidden bg-gradient-to-br from-teal-600 via-blue-500 to-purple-600 px-6 pt-16 shadow-2xl rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
        <svg viewBox="0 0 1024 1024" class="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0" aria-hidden="true">
          <circle cx="512" cy="512" r="512" fill="url(#759c1ed7-077c-4473-a3bc-9bdcb615dd04)" fill-opacity="0.7" />
          <defs>
            <radialGradient id="759c1ed7-077c-4473-a3bc-9bdcb615dd04">
              <stop stop-color="#14B8A6" />
              <stop offset="1" stop-color="#8B5CF6" />
            </radialGradient>
          </defs>
        </svg>
        <div class="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
          <h1 class="text-4xl font-bold tracking-tight text-white sm:text-5xl">Get in Touch</h1>
          <p class="mt-6 text-lg leading-8 text-gray-100">We're here to help you navigate China with confidence. Reach out to us through any channel.</p>
          <div class="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
            <a href="tel:+19502074050" class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-teal-600 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Call Now
            </a>
            <a href="https://wa.me/19502074050" class="text-sm font-semibold leading-6 text-white hover:text-gray-200">
              WhatsApp <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div class="relative mt-16 h-80 lg:mt-8">
          <img class="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10" src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop" alt="Contact us" width="1824" height="1080" />
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto">
      <!-- Office Locations -->
      <div class="grid md:grid-cols-2 gap-8 mb-12">
        <!-- Guangzhou Office -->
        <Card class="overflow-hidden">
          <div class="relative h-48 bg-gradient-to-br from-teal-500 to-blue-500">
            <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=400&fit=crop" alt="Guangzhou Office" class="w-full h-full object-cover opacity-80" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div class="absolute bottom-4 left-4 right-4 text-white">
              <h3 class="text-2xl font-bold mb-1 flex items-center gap-2">
                <Building2 class="h-6 w-6" />
                Guangzhou Office
              </h3>
              <p class="text-sm text-white/90">China Headquarters</p>
            </div>
          </div>
          <CardBody class="p-6">
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <MapPin class="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-slate-900">29 29D Rogjin Building</p>
                  <p class="text-sm text-slate-600">Taojin, 13th Floor</p>
                  <p class="text-sm text-slate-600">BridgeCHINA OFFICE</p>
                  <p class="text-sm text-slate-600">Guangzhou, China</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <Phone class="h-5 w-5 text-teal-600 flex-shrink-0" />
                <a href="tel:+19502074050" class="text-sm text-slate-700 hover:text-teal-600">+1 950 207 4050</a>
              </div>
              <div class="flex items-center gap-3">
                <Mail class="h-5 w-5 text-teal-600 flex-shrink-0" />
                <a href="mailto:info@bridgechina.com" class="text-sm text-slate-700 hover:text-teal-600">info@bridgechina.com</a>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=29+29D+Rogjin+Building+Taojin+13th+Floor+Guangzhou+China"
                target="_blank"
                class="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                <MapPin class="h-4 w-4" />
                View on Google Maps
              </a>
            </div>
          </CardBody>
        </Card>

        <!-- Dhaka Office -->
        <Card class="overflow-hidden">
          <div class="relative h-48 bg-gradient-to-br from-purple-500 to-pink-500">
            <img src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=400&fit=crop" alt="Dhaka Office" class="w-full h-full object-cover opacity-80" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div class="absolute bottom-4 left-4 right-4 text-white">
              <h3 class="text-2xl font-bold mb-1 flex items-center gap-2">
                <Building2 class="h-6 w-6" />
                Dhaka Office
              </h3>
              <p class="text-sm text-white/90">Bangladesh Branch</p>
            </div>
          </div>
          <CardBody class="p-6">
            <div class="space-y-4">
              <div class="flex items-start gap-3">
                <MapPin class="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-slate-900">Banani, 1216</p>
                  <p class="text-sm text-slate-600">Dhaka, Bangladesh</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <Phone class="h-5 w-5 text-purple-600 flex-shrink-0" />
                <a href="tel:+19502074050" class="text-sm text-slate-700 hover:text-purple-600">+1 950 207 4050</a>
              </div>
              <div class="flex items-center gap-3">
                <Mail class="h-5 w-5 text-purple-600 flex-shrink-0" />
                <a href="mailto:info@bridgechina.com" class="text-sm text-slate-700 hover:text-purple-600">info@bridgechina.com</a>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Banani+1216+Dhaka+Bangladesh"
                target="_blank"
                class="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                <MapPin class="h-4 w-4" />
                View on Google Maps
              </a>
            </div>
          </CardBody>
        </Card>
      </div>

      <!-- Contact Form -->
      <div class="grid md:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <h2 class="text-2xl font-bold text-slate-900">Send us a Message</h2>
            <p class="text-sm text-slate-600 mt-1">Fill out the form and we'll get back to you within 24 hours</p>
          </CardHeader>
          <CardBody class="p-6">
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div>
                <label for="name" class="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                <Input
                  id="name"
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  id="email"
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label for="phone" class="block text-sm font-medium text-slate-700 mb-1">Phone (Optional)</label>
                <Input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label for="service" class="block text-sm font-medium text-slate-700 mb-1">Service Category</label>
                <Select
                  id="service"
                  v-model="form.service"
                  :options="serviceOptions"
                  placeholder="Select a service"
                />
              </div>
              <div>
                <label for="message" class="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  rows="4"
                  required
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Tell us how we can help you..."
                ></textarea>
              </div>
              <Button type="submit" variant="primary" full-width :loading="submitting">
                <Send class="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </form>
          </CardBody>
        </Card>

        <!-- Quick Contact Cards -->
        <div class="space-y-4">
          <Card class="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardBody class="p-6">
              <div class="flex items-start gap-4">
                <div class="bg-green-500 rounded-full p-3">
                  <MessageCircle class="h-6 w-6 text-white" />
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-slate-900 mb-2">WhatsApp</h3>
                  <p class="text-sm text-slate-600 mb-3">Chat with us instantly</p>
                  <a
                    href="https://wa.me/19502074050"
                    target="_blank"
                    class="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    Open WhatsApp
                    <ExternalLink class="h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card class="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardBody class="p-6">
              <div class="flex items-start gap-4">
                <div class="bg-blue-500 rounded-full p-3">
                  <Phone class="h-6 w-6 text-white" />
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-slate-900 mb-2">Phone</h3>
                  <p class="text-sm text-slate-600 mb-3">Call us directly</p>
                  <a
                    href="tel:+19502074050"
                    class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    +1 950 207 4050
                    <Phone class="h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card class="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardBody class="p-6">
              <div class="flex items-start gap-4">
                <div class="bg-purple-500 rounded-full p-3">
                  <Mail class="h-6 w-6 text-white" />
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-slate-900 mb-2">Email</h3>
                  <p class="text-sm text-slate-600 mb-3">Send us an email</p>
                  <a
                    href="mailto:info@bridgechina.com"
                    class="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                  >
                    info@bridgechina.com
                    <Mail class="h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <!-- FAQ Section -->
      <Card class="mb-12">
        <CardHeader>
          <h2 class="text-3xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h2>
          <p class="text-slate-600">Find answers to common questions about our services</p>
        </CardHeader>
        <CardBody class="p-6">
          <div class="space-y-4">
            <div
              v-for="(faq, index) in faqs"
              :key="index"
              class="border border-slate-200 rounded-lg overflow-hidden"
            >
              <button
                @click="toggleFaq(index)"
                class="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span class="font-semibold text-slate-900 pr-4">{{ faq.question }}</span>
                <ChevronDown
                  :class="['h-5 w-5 text-slate-500 flex-shrink-0 transition-transform', { 'rotate-180': openFaqs.includes(index) }]"
                />
              </button>
              <div
                v-show="openFaqs.includes(index)"
                class="px-4 pb-4 text-slate-700 text-sm leading-relaxed"
              >
                {{ faq.answer }}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Send,
  ExternalLink,
  ChevronDown,
} from 'lucide-vue-next';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Button,
  useToast,
} from '@bridgechina/ui';
import axios from '@/utils/axios';

const toast = useToast();

const form = ref({
  name: '',
  email: '',
  phone: '',
  service: '',
  message: '',
});

const submitting = ref(false);

const serviceOptions = [
  { value: '', label: 'General Inquiry' },
  { value: 'hotel', label: 'Hotel Booking' },
  { value: 'transport', label: 'Transport Services' },
  { value: 'halal-food', label: 'Halal Food' },
  { value: 'medical', label: 'Medical Assistance' },
  { value: 'translation', label: 'Translation & Help' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'tours', label: 'Tours' },
  { value: 'esim', label: 'eSIM Plans' },
  { value: 'other', label: 'Other' },
];

const openFaqs = ref<number[]>([]);

const faqs = [
  {
    question: 'How quickly can you respond to my inquiry?',
    answer: 'We typically respond to all inquiries within 24 hours. For urgent matters, please call us directly or use WhatsApp for instant support.',
  },
  {
    question: 'Do you provide services in English?',
    answer: 'Yes! All our services are available in English. We have English-speaking staff available to assist you with hotels, transport, medical help, and more.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept various payment methods including cash, bank transfers, mobile payment apps, and international payment options. Please contact us for specific payment arrangements.',
  },
  {
    question: 'Can you help with visa and travel documents?',
    answer: 'While we don\'t process visas directly, we can provide guidance and connect you with trusted partners who can assist with visa applications and travel documentation.',
  },
  {
    question: 'Do you offer 24/7 support?',
    answer: 'We offer support during business hours (9 AM - 9 PM China time). For emergencies, we have a dedicated emergency contact line available 24/7.',
  },
  {
    question: 'How do I book a hotel through BridgeChina?',
    answer: 'You can browse hotels on our website, or contact us directly. We\'ll help you find the perfect accommodation that meets your needs and budget, with English-speaking support.',
  },
  {
    question: 'What areas in China do you cover?',
    answer: 'We primarily operate in Guangzhou and surrounding areas, but we can assist with services across China. Contact us to discuss your specific location needs.',
  },
  {
    question: 'Can you help with halal food delivery?',
    answer: 'Yes! We partner with verified halal restaurants and can arrange food delivery to your location. Browse our halal food section or contact us directly.',
  },
];

function toggleFaq(index: number) {
  const idx = openFaqs.value.indexOf(index);
  if (idx > -1) {
    openFaqs.value.splice(idx, 1);
  } else {
    openFaqs.value.push(index);
  }
}

async function handleSubmit() {
  submitting.value = true;
  try {
    // In a real app, you'd send this to your backend API
    // For now, we'll just show a success message
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    form.value = {
      name: '',
      email: '',
      phone: '',
      service: '',
      message: '',
    };
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Failed to send message. Please try again.');
  } finally {
    submitting.value = false;
  }
}
</script>
