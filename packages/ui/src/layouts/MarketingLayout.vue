<template>
  <div class="min-h-screen [overflow-x:clip] bg-[linear-gradient(90deg,#f8fafc_0%,#ffffff_28%,#ffffff_100%)] text-slate-900 lg:pt-14">

    <!-- Drawer backdrop -->
    <Transition name="overlay-fade">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-[55] bg-black/65 backdrop-blur-[2px]"
        @click="drawerOpen = false"
      />
    </Transition>

    <!-- Category drawer (Amazon-style overlay) -->
    <div
      class="fixed inset-y-0 left-0 z-[60] flex w-[300px] flex-col bg-slate-950 text-white shadow-[20px_0_48px_rgba(0,0,0,0.55)] transition-transform duration-300 ease-in-out"
      :class="drawerOpen ? 'translate-x-0' : '-translate-x-full'"
      role="dialog"
      aria-modal="true"
      aria-label="Category navigation"
    >
      <!-- Drawer header: user greeting + close -->
      <div class="flex items-center gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
        <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/8">
          <Shield class="h-4 w-4 text-white/60" />
        </div>
        <p class="flex-1 text-[13px] font-semibold text-white">
          {{ isAuthenticated ? 'Hello!' : 'Hello, sign in' }}
        </p>
        <button
          type="button"
          @click="drawerOpen = false"
          class="rounded-full p-1.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close menu"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Mobile-only: nav links inside drawer -->
      <div class="border-b border-white/10 px-3 py-2 md:hidden">
        <router-link
          to="/shopping"
          class="flex items-center rounded-xl px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/8 hover:text-white"
          @click="closeDrawer"
        >Shop</router-link>
        <router-link
          to="/blog"
          class="flex items-center rounded-xl px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/8 hover:text-white"
          @click="closeDrawer"
        >Blog</router-link>
        <router-link
          to="/contact"
          class="flex items-center rounded-xl px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/8 hover:text-white"
          @click="closeDrawer"
        >Contact</router-link>
        <router-link
          v-if="isAuthenticated"
          :to="userRoles.includes('ADMIN') || userRoles.includes('EDITOR') ? '/admin' : userRoles.includes('SELLER') ? '/seller' : '/user'"
          class="flex items-center rounded-xl px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/8 hover:text-white"
          @click="closeDrawer"
        >Dashboard</router-link>
        <router-link
          v-else
          to="/login"
          class="flex items-center rounded-xl px-3 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/8 hover:text-white"
          @click="closeDrawer"
        >Sign in</router-link>
        <button
          v-if="isAuthenticated"
          type="button"
          class="mt-1 flex w-full items-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[13px] font-semibold text-white-200 hover:bg-rose-500/18"
          @click="$emit('signOut'); closeDrawer()"
        >Sign out</button>
      </div>

      <!-- Category section label -->
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
        <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-rose-300">Shop by category</p>
        <button
          type="button"
          class="text-[11px] font-medium text-white/70 hover:text-white"
          @click="openShopping"
        >All products →</button>
      </div>

      <!-- Category list -->
      <div class="flex-1 overflow-y-auto px-2.5 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div class="relative">
          <div class="absolute left-[15px] top-1.5 bottom-2 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.14)_12%,rgba(255,255,255,0.12)_88%,rgba(255,255,255,0)_100%)]" />

          <div
            v-for="cat in categories"
            :key="cat.slug"
            class="group relative mb-0.5 rounded-[18px] border border-transparent px-1.5 py-0.5 transition-all duration-200 hover:border-white/10 hover:bg-white/5"
          >
            <button
              type="button"
              @click="toggleCategory(cat.slug)"
              class="relative flex w-full items-center justify-between gap-2.5 rounded-[16px] px-2 py-1.5 text-left"
            >
              <span class="flex min-w-0 items-center gap-2.5">
                <span
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 ring-1 ring-white/5 transition-transform duration-200 group-hover:scale-[1.03]"
                  :style="categoryBadgeStyle(cat.slug)"
                >
                  <component :is="categoryIcon(cat.icon)" class="h-4 w-4" />
                </span>
                <span class="block truncate text-[12px] font-semibold text-white">{{ cat.name }}</span>
              </span>
              <ChevronRight
                class="h-3.5 w-3.5 flex-shrink-0 text-white/50 transition-transform duration-200"
                :class="{ 'rotate-90 text-rose-300': expandedCategorySlug === cat.slug }"
              />
            </button>

            <div v-if="expandedCategorySlug === cat.slug" class="mt-1 space-y-1 border-l border-dashed border-white/10 pl-3">
              <button
                v-for="sub in regularChildren(cat)"
                :key="sub.slug"
                type="button"
                @click="openCategory(sub.slug)"
                class="group/sub flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-1.5 text-left text-[11px] text-white/65 hover:bg-white/10 hover:text-white"
              >
                <span class="flex items-center gap-3">
                  <span class="h-px w-2 rounded-full bg-white/15 transition-colors group-hover/sub:bg-rose-300" />
                  <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/22 transition-colors group-hover/sub:bg-rose-300" />
                </span>
                <span class="min-w-0 flex-1 truncate">{{ sub.name }}</span>
              </button>
              <div v-if="brandChildren(cat).length > 0" class="mt-2 border-t border-white/10 pt-2">
                <div class="px-2.5 pb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/60">Brand selection</div>
                <button
                  v-for="sub in brandChildren(cat)"
                  :key="sub.slug"
                  type="button"
                  @click="openCategory(sub.slug)"
                  class="group/sub flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-1.5 text-left text-[11px] text-white/65 hover:bg-white/10 hover:text-white"
                >
                  <span class="flex items-center gap-3">
                    <span class="h-px w-2 rounded-full bg-white/15 group-hover/sub:bg-rose-300" />
                    <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/22 group-hover/sub:bg-rose-300" />
                  </span>
                  <span class="min-w-0 flex-1 truncate">{{ sub.name }}</span>
                </button>
              </div>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-[14px] px-2.5 py-1.5 text-left text-[11px] font-semibold text-rose-300 hover:bg-white/8"
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

    <!-- ── Navbar ────────────────────────────────────────── -->
    <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950 text-white lg:fixed lg:left-0 lg:right-0 lg:top-0">
      <div class="px-2 sm:px-3">
        <div class="flex h-14 items-center gap-1.5 sm:gap-2">

          <!-- Hamburger (always visible on all screen sizes) -->
          <button
            type="button"
            class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            @click="drawerOpen = !drawerOpen"
            aria-label="Open category menu"
          >
            <Menu class="h-[22px] w-[22px]" />
          </button>

          <!-- Logo -->
          <router-link to="/shopping" class="flex flex-shrink-0 items-center gap-2">
            <img
              src="/logo_verticle.png"
              alt="BridgeChina"
              class="h-8 w-8 rounded-xl object-contain shadow-[0_6px_16px_rgba(0,0,0,0.26)] ring-1 ring-white/10"
            />
            <div class="hidden min-w-0 leading-tight sm:block">
              <p class="truncate text-[14px] font-black tracking-tight text-white">ChinaBuyBD</p>
              <p class="truncate text-[10px] font-medium text-white/65">Premium China sourcing</p>
            </div>
          </router-link>

          <!-- Search bar (desktop) -->
          <form class="hidden min-w-0 flex-1 md:flex" @submit.prevent="submitSearch">
            <div class="flex h-10 w-full items-center overflow-hidden rounded-full border border-white/30 bg-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.18)] focus-within:border-rose-400/70 focus-within:ring-1 focus-within:ring-rose-300/25">
              <span class="pl-4 text-white/65">
                <Search class="h-4 w-4" />
              </span>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search products, factories, or keywords..."
                class="w-full bg-transparent px-3 text-[12px] font-medium text-white placeholder:text-white/55 focus:outline-none"
              />
              <button
                type="button"
                @click="openImagePicker"
                class="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white/70 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
                title="Search by image"
              >
                <Camera class="h-4 w-4" />
              </button>
            </div>
          </form>
          <input ref="headerImageInput" type="file" accept="image/*" class="hidden" @change="handleHeaderImageSelect" />

          <!-- Desktop nav links -->
          <div class="hidden items-center gap-0.5 md:flex">
            <router-link
              to="/shopping"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >Shop</router-link>
            <router-link
              to="/blog"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >Blog</router-link>
            <router-link
              to="/contact"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >Contact</router-link>
            <router-link
              v-if="isAuthenticated"
              :to="userRoles.includes('ADMIN') || userRoles.includes('EDITOR') ? '/admin' : userRoles.includes('SELLER') ? '/seller' : '/user'"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >Dashboard</router-link>
            <router-link
              v-else
              to="/login"
              class="rounded-full px-3 py-2 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >Sign in</router-link>
            <Button
              v-if="isAuthenticated"
              variant="ghost"
              size="sm"
              class="ml-0.5 rounded-full border border-rose-400/35 bg-rose-500/12 px-3.5 py-2 text-[12px] font-semibold text-white-100 hover:bg-rose-500/22 hover:border-rose-300/55"
              @click="$emit('signOut')"
            >Sign out</Button>
          </div>
        </div>

        <!-- Mobile search bar (below the icon row) -->
        <form class="pb-2.5 md:hidden" @submit.prevent="submitSearch">
          <div class="flex h-10 items-center overflow-hidden rounded-full border border-white/30 bg-white/10 focus-within:border-rose-400/70">
            <span class="pl-4 text-white/65">
              <Search class="h-4 w-4" />
            </span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search products..."
              class="w-full bg-transparent px-3 text-[12px] font-medium text-white placeholder:text-white/55 focus:outline-none"
            />
            <button
              type="button"
              @click="openImagePicker"
              class="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white/70 hover:bg-rose-500/20 hover:text-rose-200"
            >
              <Camera class="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </header>

    <!-- Main content — no left margin (sidebar is now an overlay) -->
    <main class="min-w-0">
      <slot />

      <footer class="border-t border-white/10 bg-slate-950 px-4 py-6 text-white shadow-[0_-10px_28px_rgba(0,0,0,0.18)]">
        <div class="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 xl:grid-cols-[1.1fr_0.8fr_1fr]">
          <div class="space-y-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-white/75">ChinaBuyBD</p>
            <p class="text-[14px] font-black tracking-tight text-white">Premium China shopping concierge</p>
            <p class="text-[11px] leading-5 text-white/80">
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
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-white/75">Quick links</p>
            <div class="mt-2 space-y-1 text-[12px]">
              <router-link class="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-white/90 transition-colors hover:bg-white/[0.08] hover:text-white" to="/shopping">
                <span>Shop</span>
                <ArrowRight class="h-3.5 w-3.5 text-teal-200" />
              </router-link>
              <router-link class="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-white/90 transition-colors hover:bg-white/[0.08] hover:text-white" to="/blog">
                <span>Blog</span>
                <ArrowRight class="h-3.5 w-3.5 text-teal-200" />
              </router-link>
              <router-link class="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-white/90 transition-colors hover:bg-white/[0.08] hover:text-white" to="/contact">
                <span>Contact</span>
                <ArrowRight class="h-3.5 w-3.5 text-teal-200" />
              </router-link>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-white/75">Connect with us</p>
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
</template>

<style scoped>
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>

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
  Laptop,
  Monitor,
  Smartphone,
  Glasses,
  Gamepad2,
  BookOpen,
  Sprout,
  BadgePercent,
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
const drawerOpen = ref(false);

const userRoles = computed(() => props.userRoles || []);

const iconMap: Record<string, any> = {
  'shopping-bag': ShoppingBag,
  gem: Gem,
  glasses: Glasses,
  laptop: Laptop,
  monitor: Monitor,
  smartphone: Smartphone,
  watch: Watch,
  shirt: Shirt,
  home: Home,
  truck: Truck,
  camera: Camera,
  headphones: Headphones,
  'gamepad-2': Gamepad2,
  'book-open': BookOpen,
  sprout: Sprout,
  'badge-percent': BadgePercent,
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

const ecommerceHighlights = [
  {
    label: 'Secure checkout',
    description: 'Trusted payments and order handling.',
    icon: CreditCard,
    iconStyle: { background: 'rgba(255,255,255,0.10)', color: '#fef2f2' },
  },
  {
    label: 'Fast fulfillment',
    description: 'Shipping coordination with live support.',
    icon: Truck,
    iconStyle: { background: 'rgba(255,255,255,0.10)', color: '#a7f3d0' },
  },
  {
    label: 'Quality assurance',
    description: 'Curated sourcing checks before dispatch.',
    icon: BadgeCheck,
    iconStyle: { background: 'rgba(255,255,255,0.10)', color: '#fde68a' },
  },
  {
    label: 'Customer care',
    description: 'Real people available when you need them.',
    icon: Headphones,
    iconStyle: { background: 'rgba(255,255,255,0.10)', color: '#c7f9f1' },
  },
];

const socialChips = [
  { label: 'Facebook', note: 'Brand updates and promotions', icon: Facebook, badgeStyle: { color: '#1877f2' } },
  { label: 'Instagram', note: 'Lifestyle and product inspiration', icon: Instagram, badgeStyle: { color: '#e4405f' } },
  { label: 'YouTube', note: 'Guides, reviews, and explainers', icon: Youtube, badgeStyle: { color: '#ff0000' } },
  { label: 'Chat', note: 'Quick questions and support', icon: MessageCircle, badgeStyle: { color: '#0f766e' } },
];

function categoryIcon(icon?: string) {
  return iconMap[String(icon || '').toLowerCase()] || Package;
}

function regularChildren(category: any) {
  return (Array.isArray(category?.children) ? category.children : []).filter((child: any) => child?.description !== 'brand-selection');
}

function brandChildren(category: any) {
  return (Array.isArray(category?.children) ? category.children : []).filter((child: any) => child?.description === 'brand-selection');
}

function closeDrawer() {
  drawerOpen.value = false;
}

function submitSearch() {
  const keyword = searchQuery.value.trim();
  closeDrawer();
  router.push(keyword ? { path: '/shopping/browse', query: { q: keyword } } : '/shopping');
}

function openShopping() {
  closeDrawer();
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
  closeDrawer();
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
  } catch (error) {
    console.error('Failed to load sidebar categories', error);
    categories.value = [];
  }
}

onMounted(loadCategories);
</script>
