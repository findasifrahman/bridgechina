<template>
  <div class="min-h-screen overflow-x-hidden bg-[linear-gradient(90deg,#f8fafc_0%,#ffffff_28%,#ffffff_100%)] text-slate-900 lg:pt-14">
    <header class="sticky top-0 z-50 border-b border-slate-200 bg-white text-slate-900 shadow-sm backdrop-blur-xl lg:fixed lg:left-0 lg:right-0 lg:top-0">
      <div class="px-3 py-2 sm:px-4">
        <div class="flex items-center gap-3 md:grid md:h-14 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <router-link to="/shopping" class="flex min-w-0 items-center gap-3">
            <img src="/logo_verticle.png" alt="BridgeChina" class="h-9 w-9 rounded-2xl object-contain shadow-[0_10px_20px_rgba(15,23,42,0.08)] ring-1 ring-slate-200" />
            <div class="min-w-0 leading-tight">
              <p class="truncate text-[15px] font-black tracking-tight text-slate-900">ChinaBuyBD</p>
              <p class="truncate text-[10px] font-medium text-slate-500">Redefined sourcing for premium ecommerce</p>
            </div>
          </router-link>

          <div class="flex items-center gap-2 md:hidden">
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 backdrop-blur transition-colors hover:bg-slate-50"
              :aria-expanded="mobileMenuOpen"
              aria-label="Toggle navigation menu"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <X v-if="mobileMenuOpen" class="h-5 w-5" />
              <Menu v-else class="h-5 w-5" />
            </button>
          </div>

          <form class="hidden md:flex md:min-w-0" @submit.prevent="submitSearch">
            <div class="flex h-10 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur focus-within:border-rose-200 focus-within:bg-white">
              <span class="pl-4 text-slate-400">
                <Search class="h-4 w-4" />
              </span>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search products, factories, or keywords..."
                class="w-full bg-transparent px-3 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                @click="openImagePicker"
                class="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                title="Search by image"
              >
                <Camera class="h-4 w-4" />
              </button>
            </div>
          </form>
          <input ref="headerImageInput" type="file" accept="image/*" class="hidden" @change="handleHeaderImageSelect" />

          <div class="hidden items-center gap-1 md:flex">
            <router-link
              to="/shopping"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Shop
            </router-link>
            <router-link
              to="/blog"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Blog
            </router-link>
            <router-link
              to="/contact"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Contact
            </router-link>
            <router-link
              v-if="isAuthenticated"
              :to="userRoles.includes('ADMIN') || userRoles.includes('EDITOR') ? '/admin' : userRoles.includes('SELLER') ? '/seller' : '/user'"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Dashboard
            </router-link>
            <router-link
              v-else
              to="/login"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Sign in
            </router-link>
            <Button
              v-if="isAuthenticated"
              variant="primary"
              size="sm"
              class="ml-1 rounded-full border border-rose-200 bg-white px-4 py-2 text-[13px] font-semibold text-rose-700 shadow-none hover:bg-rose-50"
              @click="$emit('signOut')"
            >
              Sign out
            </Button>
          </div>
        </div>

        <form class="mt-3 flex md:hidden" @submit.prevent="submitSearch">
          <div class="flex h-11 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur focus-within:border-rose-200 focus-within:bg-white">
            <span class="pl-4 text-slate-400">
              <Search class="h-4 w-4" />
            </span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search products, factories, or keywords..."
              class="w-full bg-transparent px-3 text-[12px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              @click="openImagePicker"
              class="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
              title="Search by image"
            >
              <Camera class="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <div v-if="mobileMenuOpen" class="border-t border-slate-200 bg-white md:hidden">
        <div class="max-h-[72vh] space-y-4 overflow-y-auto px-3 py-4">
          <div class="grid gap-2">
            <router-link
              to="/shopping"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur"
              @click="mobileMenuOpen = false"
            >
              Shop
            </router-link>
            <router-link
              to="/blog"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur"
              @click="mobileMenuOpen = false"
            >
              Blog
            </router-link>
            <router-link
              to="/contact"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur"
              @click="mobileMenuOpen = false"
            >
              Contact
            </router-link>
            <router-link
              v-if="isAuthenticated"
              :to="userRoles.includes('ADMIN') || userRoles.includes('EDITOR') ? '/admin' : userRoles.includes('SELLER') ? '/seller' : '/user'"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur"
              @click="mobileMenuOpen = false"
            >
              Dashboard
            </router-link>
            <router-link
              v-else
              to="/login"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur"
              @click="mobileMenuOpen = false"
            >
              Sign in
            </router-link>
            <Button
              v-if="isAuthenticated"
              variant="primary"
              size="sm"
              class="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-none hover:bg-rose-50"
              @click="$emit('signOut'); mobileMenuOpen = false"
            >
              Sign out
            </Button>
          </div>

          <div class="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)] backdrop-blur">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400">Shop by category</p>
              </div>
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600"
                @click="openShopping(); mobileMenuOpen = false"
              >
                All products
              </button>
            </div>

            <div class="mt-3 space-y-2">
              <div v-for="cat in categories" :key="`mobile-${cat.slug}`" class="rounded-[20px] border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  @click="toggleCategory(cat.slug)"
                >
                  <span class="min-w-0">
                    <span class="block text-[12px] font-semibold leading-5 text-slate-900">{{ cat.name }}</span>
                    <span class="block text-[10px] text-slate-500">{{ cat.children?.length || 0 }} subcategories</span>
                  </span>
                  <ChevronRight class="h-4 w-4 flex-shrink-0 text-slate-300 transition-transform" :class="{ 'rotate-90 text-rose-400': expandedCategorySlug === cat.slug }" />
                </button>
                <div v-if="expandedCategorySlug === cat.slug" class="border-t border-slate-200 bg-white px-2 py-2">
                  <button
                    v-for="sub in cat.children || []"
                    :key="sub.slug"
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                    @click="openCategory(sub.slug); mobileMenuOpen = false"
                  >
                    <span>{{ sub.name }}</span>
                    <span class="text-[10px] text-slate-400">{{ sub.products?.length || '' }}</span>
                  </button>
                  <button
                    type="button"
                    class="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                    @click="openCategory(cat.slug); mobileMenuOpen = false"
                  >
                    View all {{ cat.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="grid w-full gap-0 lg:items-stretch">
      <aside class="hidden overflow-hidden border-r border-slate-200 bg-white text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.04)] lg:fixed lg:left-0 lg:top-[3.5rem] lg:z-40 lg:flex lg:h-[calc(100vh-3.5rem)] lg:w-[230px] lg:flex-col">
        <div class="flex h-full flex-col overflow-hidden">
          <div class="border-b border-slate-200 px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="mt-1 text-[15px] font-black tracking-tight text-slate-900">Shop by category</h2>
              </div>
              <span class="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600">Live</span>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-2.5 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div class="relative">
              <div class="absolute left-[15px] top-1.5 bottom-2 w-px bg-[linear-gradient(180deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.22)_12%,rgba(148,163,184,0.18)_88%,rgba(148,163,184,0)_100%)]" />

              <div
                v-for="cat in categories"
                :key="cat.slug"
                class="group relative mb-1.5 rounded-[18px] border border-transparent px-1.5 py-0.5 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50"
              >
                <button
                  type="button"
                  @click="toggleCategory(cat.slug)"
                  class="relative flex w-full items-center justify-between gap-2.5 rounded-[16px] px-2 py-2 text-left transition-colors"
                >
                  <span class="flex min-w-0 items-center gap-2.5">
                    <span
                      class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white ring-1 ring-slate-100 transition-transform duration-200 group-hover:scale-[1.02]"
                      :style="categoryBadgeStyle(cat.slug)"
                    >
                      <component :is="categoryIcon(cat.icon)" class="h-4 w-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-[12px] font-semibold leading-5 text-slate-900">{{ cat.name }}</span>
                    </span>
                  </span>
                  <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-transform duration-200" :class="{ 'rotate-90 text-rose-500': expandedCategorySlug === cat.slug }" />
                </button>

                <div v-if="expandedCategorySlug === cat.slug" class="mt-1 space-y-1 border-l border-dashed border-slate-200 pl-3">
                  <button
                    v-for="sub in cat.children || []"
                    :key="sub.slug"
                    type="button"
                    @click="openCategory(sub.slug)"
                    class="group/sub flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-[11px] text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                  >
                    <span class="flex items-center gap-3">
                      <span class="h-px w-2.5 rounded-full bg-slate-200 transition-colors group-hover/sub:bg-rose-300" />
                      <span
                        class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[9px] font-bold"
                        :style="subcategoryBadgeStyle(cat.slug, sub.slug)"
                      >
                        {{ sub.name.slice(0, 1).toUpperCase() }}
                      </span>
                    </span>
                    <span class="min-w-0 flex-1 truncate">{{ sub.name }}</span>
                  </button>
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-[14px] px-2.5 py-2 text-left text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                    @click="openCategory(cat.slug)"
                  >
                    <span>View all {{ cat.name }}</span>
                    <ArrowRight class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="min-w-0 lg:ml-[230px]">
        <slot />

        <footer class="border-t border-white/10 bg-[linear-gradient(135deg,#8f0f1b_0%,#b91c1c_52%,#0f766e_100%)] px-4 py-6 text-white shadow-[0_-10px_28px_rgba(127,29,29,0.14)]">
          <div class="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 xl:grid-cols-[1.1fr_0.8fr_1fr]">
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-white/[0.55]">ChinaBuyBD</p>
              <p class="text-[14px] font-black tracking-tight text-white">Premium China shopping concierge</p>
              <p class="text-[11px] leading-5 text-white/[0.72]">
                Room 13D, No. 29, Jianshe Sixth Road, Yuexiu District, Rongjin Building, Taojin, Guangzhou
              </p>
              <div class="flex flex-wrap gap-2 pt-1.5">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.08] px-2.5 py-1 text-[10px] font-medium text-white/[0.86]">
                  <MapPin class="h-3 w-3 text-teal-200" />
                  Guangzhou
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.08] px-2.5 py-1 text-[10px] font-medium text-white/[0.86]">
                  <Clock3 class="h-3 w-3 text-rose-200" />
                  24/7 support
                </span>
              </div>
            </div>

            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-white/[0.55]">Quick links</p>
              <div class="mt-2 space-y-1 text-[12px]">
                <router-link class="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-white/[0.84] transition-colors hover:bg-white/[0.08] hover:text-white" to="/shopping">
                  <span>Shop</span>
                  <ArrowRight class="h-3.5 w-3.5 text-teal-200" />
                </router-link>
                <router-link class="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-white/[0.84] transition-colors hover:bg-white/[0.08] hover:text-white" to="/blog">
                  <span>Blog</span>
                  <ArrowRight class="h-3.5 w-3.5 text-teal-200" />
                </router-link>
                <router-link class="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-white/[0.84] transition-colors hover:bg-white/[0.08] hover:text-white" to="/contact">
                  <span>Contact</span>
                  <ArrowRight class="h-3.5 w-3.5 text-teal-200" />
                </router-link>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-white/[0.55]">Connect with us</p>
              <div class="grid gap-2">
                <div v-for="social in socialChips.slice(0, 3)" :key="social.label" class="flex items-center gap-2.5 rounded-[14px] border border-white/[0.12] bg-white/[0.08] px-2.5 py-2 backdrop-blur">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white" :style="social.badgeStyle">
                    <component :is="social.icon" class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-[12px] font-semibold text-white">{{ social.label }}</p>
                    <p class="text-[10px] leading-4 text-white/[0.65]">{{ social.note }}</p>
                  </div>
                </div>
              </div>
              <a class="flex items-center gap-2 rounded-[14px] border border-white/[0.12] bg-white/[0.08] px-2.5 py-2 text-[12px] text-white/[0.82] transition-colors hover:text-white" href="https://wa.me/8618989410063" target="_blank" rel="noreferrer">
                <MessageCircle class="h-4 w-4 text-green-300" />
                WhatsApp support
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button.vue';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ChevronRight,
  Clock3,
  CreditCard,
  Facebook,
  Gem,
  Headphones,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Search,
  Shield,
  Shirt,
  ShoppingBag,
  Sparkles,
  Stars,
  Truck,
  Watch,
  X,
  Youtube,
  Cpu,
  Home,
} from 'lucide-vue-next';

const props = defineProps<{
  isAuthenticated?: boolean;
  userRoles?: string[];
}>();

defineEmits<{
  signOut: [];
}>();

const router = useRouter();
const searchQuery = ref('');
const headerImageInput = ref<HTMLInputElement | null>(null);
const categories = ref<any[]>([]);
const expandedCategorySlug = ref('');
const mobileMenuOpen = ref(false);

const userRoles = computed(() => props.userRoles || []);

const iconMap: Record<string, any> = {
  'shopping-bag': ShoppingBag,
  gem: Gem,
  glasses: Package,
  laptop: Package,
  monitor: Package,
  smartphone: Package,
  watch: Watch,
  shirt: Shirt,
  home: Home,
  truck: Truck,
  camera: Package,
  headphones: Headphones,
  'gamepad-2': Package,
  'book-open': Package,
  sprout: Package,
  'badge-percent': Package,
  package: Package,
  shield: Shield,
  star: Stars,
  sparkles: Sparkles,
  cpu: Cpu,
};

const categoryPalettes = [
  { bg: 'rgba(255,255,255,0.12)', fg: '#38bdf8', border: 'rgba(56,189,248,0.24)' },
  { bg: 'rgba(255,255,255,0.12)', fg: '#2dd4bf', border: 'rgba(45,212,191,0.24)' },
  { bg: 'rgba(255,255,255,0.12)', fg: '#f59e0b', border: 'rgba(245,158,11,0.24)' },
  { bg: 'rgba(255,255,255,0.12)', fg: '#8b5cf6', border: 'rgba(139,92,246,0.24)' },
  { bg: 'rgba(255,255,255,0.12)', fg: '#0ea5e9', border: 'rgba(14,165,233,0.24)' },
  { bg: 'rgba(255,255,255,0.12)', fg: '#14b8a6', border: 'rgba(20,184,166,0.24)' },
];

function hashString(value: string) {
  return Array.from(value).reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) >>> 0), 0);
}

function categoryTone(seed: string) {
  return categoryPalettes[hashString(seed) % categoryPalettes.length];
}

function categoryBadgeStyle(seed: string) {
  const tone = categoryTone(seed);
  return {
    backgroundColor: tone.bg,
    color: tone.fg,
    boxShadow: `inset 0 0 0 1px ${tone.border}`,
  };
}

function subcategoryBadgeStyle(parentSeed: string, childSeed: string) {
  const tone = categoryTone(`${parentSeed}:${childSeed}`);
  return {
    backgroundColor: tone.bg,
    color: tone.fg,
    boxShadow: `inset 0 0 0 1px ${tone.border}`,
  };
}

const ecommerceHighlights = [
  {
    label: 'Secure checkout',
    description: 'Trusted payments and order handling.',
    icon: CreditCard,
    iconStyle: {
      background: 'rgba(255,255,255,0.10)',
      color: '#fef2f2',
    },
  },
  {
    label: 'Fast fulfillment',
    description: 'Shipping coordination with live support.',
    icon: Truck,
    iconStyle: {
      background: 'rgba(255,255,255,0.10)',
      color: '#a7f3d0',
    },
  },
  {
    label: 'Quality assurance',
    description: 'Curated sourcing checks before dispatch.',
    icon: BadgeCheck,
    iconStyle: {
      background: 'rgba(255,255,255,0.10)',
      color: '#fde68a',
    },
  },
  {
    label: 'Customer care',
    description: 'Real people available when you need them.',
    icon: Headphones,
    iconStyle: {
      background: 'rgba(255,255,255,0.10)',
      color: '#c7f9f1',
    },
  },
];

const socialChips = [
  {
    label: 'Facebook',
    note: 'Brand updates and promotions',
    icon: Facebook,
    badgeStyle: { color: '#1877f2' },
  },
  {
    label: 'Instagram',
    note: 'Lifestyle and product inspiration',
    icon: Instagram,
    badgeStyle: { color: '#e4405f' },
  },
  {
    label: 'YouTube',
    note: 'Guides, reviews, and explainers',
    icon: Youtube,
    badgeStyle: { color: '#ff0000' },
  },
  {
    label: 'Chat',
    note: 'Quick questions and support',
    icon: MessageCircle,
    badgeStyle: { color: '#0f766e' },
  },
];

function categoryIcon(icon?: string) {
  return iconMap[String(icon || '').toLowerCase()] || Package;
}

function submitSearch() {
  const keyword = searchQuery.value.trim();
  mobileMenuOpen.value = false;
  router.push(keyword ? { path: '/shopping/browse', query: { q: keyword } } : '/shopping');
}

function openShopping() {
  mobileMenuOpen.value = false;
  router.push('/shopping');
}

function openImagePicker() {
  headerImageInput.value?.click();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

async function handleHeaderImageSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  const storageKey = `shopping-image-search-${Date.now()}`;
  sessionStorage.setItem(storageKey, dataUrl);
  router.push({ path: '/shopping/browse', query: { imageSearchKey: storageKey } });
  target.value = '';
}

function openCategory(slug: string) {
  mobileMenuOpen.value = false;
  router.push({ path: '/shopping/browse', query: { category: slug } });
}

function toggleCategory(slug: string) {
  expandedCategorySlug.value = expandedCategorySlug.value === slug ? '' : slug;
}

async function loadCategories() {
  try {
    const apiBaseUrl = String((import.meta as any).env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const response = await fetch(`${apiBaseUrl}/api/public/shopping/categories`);
    const data = await response.json();
    categories.value = Array.isArray(data) ? data : [];
    if (!expandedCategorySlug.value) {
      expandedCategorySlug.value = categories.value[0]?.slug || '';
    }
  } catch (error) {
    console.error('Failed to load sidebar categories', error);
    categories.value = [];
  }
}

onMounted(loadCategories);
</script>
