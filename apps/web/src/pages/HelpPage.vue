<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-amber-500 bg-clip-text text-transparent mb-2">
          Help & Tourist Guide
        </h1>
        <p class="text-slate-600">Essential information for your stay in Guangzhou, China</p>
      </div>

      <!-- Essential Apps Section -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <Smartphone class="h-5 w-5 text-teal-600" />
          <h2 class="text-xl font-bold text-teal-600">Essential Apps</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <a
            v-for="app in essentialApps"
            :key="app.name"
            :href="app.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex flex-col items-center p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-md transition-all group"
          >
            <div class="w-12 h-12 mb-2 rounded-lg bg-gradient-to-br from-teal-100 to-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <component :is="app.icon" class="h-6 w-6 text-teal-600" />
            </div>
            <span class="text-xs font-medium text-slate-700 text-center">{{ app.name }}</span>
            <span class="text-xs text-slate-500 mt-1">{{ app.category }}</span>
          </a>
        </div>
      </section>

      <!-- Popular Markets Section -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <ShoppingBag class="h-5 w-5 text-teal-600" />
          <h2 class="text-xl font-bold text-teal-600">Popular Markets in Guangzhou</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            v-for="market in markets"
            :key="market.name"
            class="hover:shadow-lg transition-shadow"
          >
            <CardBody class="p-4">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <component :is="market.icon" class="h-5 w-5 text-teal-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-slate-900 mb-1">{{ market.name }}</h3>
                  <div class="space-y-1 text-sm">
                    <div class="flex items-center gap-2 text-slate-600">
                      <MapPin class="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span class="truncate">{{ market.location }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-teal-600">
                      <Train class="h-4 w-4 text-teal-500 flex-shrink-0" />
                      <span class="font-medium">{{ market.metro }}</span>
                    </div>
                    <div v-if="market.hours" class="flex items-center gap-2 text-slate-500">
                      <Clock class="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span>{{ market.hours }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <!-- Emergency Contacts -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <Phone class="h-5 w-5 text-red-500" />
          <h2 class="text-xl font-bold text-teal-600">Emergency Contacts</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card
            v-for="contact in emergencyContacts"
            :key="contact.name"
            class="border-l-4"
            :class="contact.borderColor"
          >
            <CardBody class="p-4">
              <div class="flex items-center gap-3">
                <component :is="contact.icon" class="h-5 w-5" :class="contact.iconColor" />
                <div>
                  <div class="text-xs text-slate-500 mb-1">{{ contact.name }}</div>
                  <div class="font-bold text-slate-900">{{ contact.number }}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <!-- Tourist Information -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <Info class="h-5 w-5 text-teal-600" />
          <h2 class="text-xl font-bold text-teal-600">Tourist Information</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            v-for="info in touristInfo"
            :key="info.title"
            class="hover:shadow-md transition-shadow"
          >
            <CardBody class="p-4">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <component :is="info.icon" class="h-5 w-5 text-amber-600" />
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-slate-900 mb-2">{{ info.title }}</h3>
                  <p class="text-sm text-slate-600 leading-relaxed">{{ info.description }}</p>
                  <div v-if="info.actions" class="mt-3 flex flex-wrap gap-2">
                    <Button
                      v-for="action in info.actions"
                      :key="action.label"
                      :variant="action.variant || 'ghost'"
                      size="sm"
                      @click="handleAction(action)"
                    >
                      {{ action.label }}
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <!-- Quick Tips -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <Lightbulb class="h-5 w-5 text-amber-500" />
          <h2 class="text-xl font-bold text-teal-600">Quick Tips</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="tip in quickTips"
            :key="tip"
            class="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200"
          >
            <CheckCircle class="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
            <span class="text-sm text-slate-700">{{ tip }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  Smartphone,
  MessageCircle,
  CreditCard,
  Car,
  ShoppingBag,
  MapPin,
  Train,
  Clock,
  Phone,
  AlertCircle,
  Flame,
  HeartPulse,
  Info,
  FileText,
  Globe,
  Plane,
  Lightbulb,
  CheckCircle,
  Package,
  Gamepad2,
  Laptop,
  Stethoscope,
  Gift,
  Shirt,
} from 'lucide-vue-next';
import { Card, CardBody, Button } from '@bridgechina/ui';

const router = useRouter();

const essentialApps = [
  { name: 'WeChat', category: 'Social', icon: MessageCircle, url: 'https://www.wechat.com/' },
  { name: 'Alipay', category: 'Payment', icon: CreditCard, url: 'https://www.alipay.com/' },
  { name: 'Didi', category: 'Transport', icon: Car, url: 'https://www.didiglobal.com/' },
  { name: 'Meituan', category: 'Food', icon: ShoppingBag, url: 'https://www.meituan.com/' },
  { name: 'Baidu Maps', category: 'Navigation', icon: MapPin, url: 'https://map.baidu.com/' },
  { name: 'Ctrip', category: 'Travel', icon: Plane, url: 'https://www.ctrip.com/' },
  { name: 'JD.com', category: 'Shopping', icon: Package, url: 'https://www.jd.com/' },
  { name: 'Taobao', category: 'Shopping', icon: ShoppingBag, url: 'https://www.taobao.com/' },
  { name: 'Dianping', category: 'Reviews', icon: FileText, url: 'https://www.dianping.com/' },
  { name: 'Tencent Maps', category: 'Navigation', icon: MapPin, url: 'https://map.qq.com/' },
  { name: 'iQIYI', category: 'Entertainment', icon: Globe, url: 'https://www.iqiyi.com/' },
  { name: 'Baidu Translate', category: 'Translation', icon: Globe, url: 'https://fanyi.baidu.com/' },
];

const markets = [
  {
    name: 'Yide Road Ornaments Market',
    location: 'Yide Road, Yuexiu District',
    metro: 'Line 2, Haizhu Square Station, Exit A',
    hours: '9:00 AM - 6:00 PM',
    icon: Gift,
  },
  {
    name: 'Yide Road Toys Market',
    location: 'Yide Road, Yuexiu District',
    metro: 'Line 2, Haizhu Square Station, Exit A',
    hours: '9:00 AM - 6:00 PM',
    icon: Gamepad2,
  },
  {
    name: 'Dashatou Mobile Market',
    location: 'Dashatou Road, Haizhu District',
    metro: 'Line 2, Dashatou Station, Exit C',
    hours: '9:00 AM - 8:00 PM',
    icon: Smartphone,
  },
  {
    name: 'Tianhe Computer Market',
    location: 'Tianhe Road, Tianhe District',
    metro: 'Line 3, Gangding Station, Exit A',
    hours: '10:00 AM - 9:00 PM',
    icon: Laptop,
  },
  {
    name: 'Medical Equipment Market',
    location: 'Yide Road, Yuexiu District',
    metro: 'Line 2, Haizhu Square Station, Exit B',
    hours: '9:00 AM - 5:30 PM',
    icon: Stethoscope,
  },
  {
    name: 'Yide Road Clothing Market',
    location: 'Yide Road, Yuexiu District',
    metro: 'Line 2, Haizhu Square Station, Exit A',
    hours: '9:00 AM - 6:00 PM',
    icon: Shirt,
  },
  {
    name: 'Liwan Leather Market',
    location: 'Liwan District',
    metro: 'Line 1, Chen Clan Academy Station, Exit D',
    hours: '9:00 AM - 7:00 PM',
    icon: Package,
  },
  {
    name: 'Yide Road Hardware Market',
    location: 'Yide Road, Yuexiu District',
    metro: 'Line 2, Haizhu Square Station, Exit A',
    hours: '9:00 AM - 6:00 PM',
    icon: Package,
  },
  {
    name: 'Baiyun Leather Market',
    location: 'Baiyun District',
    metro: 'Line 2, Baiyun Culture Square Station, Exit C',
    hours: '9:00 AM - 7:00 PM',
    icon: Package,
  },
];

const emergencyContacts = [
  {
    name: 'Police',
    number: '110',
    icon: AlertCircle,
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
  },
  {
    name: 'Medical Emergency',
    number: '120',
    icon: HeartPulse,
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-500',
  },
  {
    name: 'Fire Department',
    number: '119',
    icon: Flame,
    borderColor: 'border-l-orange-500',
    iconColor: 'text-orange-500',
  },
  {
    name: 'BridgeChina Support',
    number: '+86 123 4567 890',
    icon: Phone,
    borderColor: 'border-l-teal-500',
    iconColor: 'text-teal-500',
  },
];

const touristInfo = [
  {
    title: 'Lost Passport',
    description: 'Contact your embassy immediately. We can help you with translation and transportation to the embassy. Keep a copy of your passport in a safe place.',
    icon: FileText,
    actions: [
      { label: 'Find Embassy', variant: 'primary' as const, action: 'embassy' },
    ],
  },
  {
    title: 'Medical Assistance',
    description: 'If you feel sick, contact our medical assistance service immediately. We can connect you with English-speaking doctors and provide translation support.',
    icon: HeartPulse,
    actions: [
      { label: 'Request Medical Help', variant: 'primary' as const, action: 'medical' },
    ],
  },
  {
    title: 'Translation Help',
    description: 'Need help communicating? Our translation service can assist with appointments, documents, and daily communication in Chinese.',
    icon: Globe,
    actions: [
      { label: 'Get Translation Help', variant: 'primary' as const, action: 'translation' },
    ],
  },
  {
    title: 'Transportation',
    description: 'Need airport pickup or point-to-point transport? Our verified drivers ensure safe and comfortable journeys with English support.',
    icon: Car,
    actions: [
      { label: 'Book Transport', variant: 'primary' as const, action: 'transport' },
    ],
  },
  {
    title: 'Currency Exchange',
    description: 'Exchange currency at banks or authorized exchange centers. Most ATMs accept international cards. Alipay and WeChat Pay are widely accepted.',
    icon: CreditCard,
    actions: [],
  },
  {
    title: 'Internet & SIM Cards',
    description: 'Get a local SIM card or eSIM plan to stay connected. Most hotels and cafes offer free WiFi. Consider our eSIM plans for instant connectivity.',
    icon: Smartphone,
    actions: [
      { label: 'View eSIM Plans', variant: 'primary' as const, action: 'esim' },
    ],
  },
];

const quickTips = [
  'Download WeChat and Alipay for payments - cash is rarely used',
  'Always carry your passport or a copy - required for hotels and some services',
  'Learn basic Chinese phrases or use translation apps',
  'Metro is the most convenient way to travel - get a metro card',
  'Bargaining is common in markets - start at 50% of asking price',
  'Tipping is not customary in China',
  'Tap water is not safe to drink - use bottled water',
  'Most restaurants close between 2-5 PM for lunch break',
  'Carry tissues - many public restrooms don\'t provide them',
  'Download Baidu Maps or Tencent Maps for navigation',
  'Keep emergency contacts saved in your phone',
  'Register with your embassy upon arrival',
];

function handleAction(action: any) {
  switch (action.action) {
    case 'embassy':
      router.push('/contact');
      break;
    case 'medical':
      router.push('/services/medical');
      break;
    case 'translation':
      router.push('/services/translation-help');
      break;
    case 'transport':
      router.push('/services/transport');
      break;
    case 'esim':
      router.push('/services/esim');
      break;
    default:
      break;
  }
}
</script>
