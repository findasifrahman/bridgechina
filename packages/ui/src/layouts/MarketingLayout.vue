<template>
  <div class="min-h-screen overflow-x-hidden bg-[#eef3f9] text-slate-900">
    <header class="sticky top-0 z-50 border-b border-white/70 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div class="grid h-16 w-full grid-cols-[1fr_minmax(0,1.4fr)_auto] items-center gap-3 px-2 sm:px-3 lg:px-4">
        <router-link to="/shopping" class="flex items-center gap-3">
          <img src="/logo_verticle.png" alt="BridgeChina" class="h-10 w-10 rounded-2xl object-contain" />
          <div class="leading-tight">
            <p class="text-[15px] font-extrabold tracking-tight text-slate-900">ChinaBuyBD</p>
            <p class="text-[11px] font-medium text-slate-500">Premium China shopping concierge</p>
          </div>
        </router-link>

        <form class="hidden md:flex" @submit.prevent="submitSearch">
          <div class="flex h-11 w-full items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)] focus-within:border-teal-300">
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
              class="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-teal-50 hover:text-teal-700"
              title="Search by image"
            >
              <Camera class="h-4 w-4" />
            </button>
          </div>
        </form>
        <input ref="headerImageInput" type="file" accept="image/*" class="hidden" @change="handleHeaderImageSelect" />

        <div class="hidden items-center gap-2 md:flex">
  <router-link to="/shopping" class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900">
            Shop
          </router-link>
          <router-link to="/blog" class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900">
            Blog
          </router-link>
          <router-link to="/contact" class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900">
            Contact
          </router-link>
          <router-link
            v-if="isAuthenticated"
            :to="userRoles.includes('ADMIN') || userRoles.includes('EDITOR') ? '/admin' : userRoles.includes('SELLER') ? '/seller' : '/user'"
            class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Dashboard
          </router-link>
          <router-link
            v-else
            to="/login"
            class="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            Sign in
          </router-link>
          <Button
            v-if="isAuthenticated"
            variant="primary"
            size="sm"
            class="rounded-full bg-slate-900 px-4 py-2 text-white shadow-none hover:bg-slate-800"
            @click="$emit('signOut')"
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>

    <div class="grid w-full gap-0 lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside class="hidden overflow-hidden border-r border-white/70 bg-white/95 lg:flex lg:flex-col">
        <div class="sticky top-0 flex max-h-[calc(100vh-4rem)] flex-col overflow-hidden">
          <div class="border-b border-slate-100 px-4 py-3">
            <h2 class="mt-1 text-[14px] font-black tracking-tight text-slate-950">Shop by category</h2>
          </div>

          <div class="flex-1 overflow-y-auto px-2 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              @click="openShopping"
              class="mb-1.5 flex w-full items-center justify-between rounded-2xl border border-teal-500 bg-teal-600 px-3 py-2.5 text-left text-white shadow-[0_12px_30px_rgba(13,148,136,0.18)] transition-all hover:bg-teal-700"
            >
              <span class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white">
                  <ShoppingBag class="h-4 w-4" />
                </span>
                <span class="min-w-0">
                  <span class="block text-[11px] font-semibold leading-5">All products</span>
                </span>
              </span>
            </button>

            <div v-for="cat in categories" :key="cat.slug" class="mb-1.5 rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                @click="toggleCategory(cat.slug)"
                class="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-slate-700 transition-all hover:bg-teal-50 hover:text-slate-900"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <component :is="categoryIcon(cat.icon)" class="h-4 w-4" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate text-[11px] font-semibold leading-5 text-red-500">{{ cat.name }}</span>
                    <span class="block text-[9px] text-slate-500">{{ cat.children?.length || 0 }} subcategories</span>
                  </span>
                </span>
                <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-transform" :class="{ 'rotate-90': expandedCategorySlug === cat.slug }" />
              </button>

              <div v-if="expandedCategorySlug === cat.slug" class="border-t border-slate-100 p-2">
                <button
                  v-for="sub in cat.children || []"
                  :key="sub.slug"
                  type="button"
                  @click="openCategory(sub.slug)"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] text-blue-600 hover:bg-teal-50 hover:text-teal-800"
                >
                  <span>{{ sub.name }}</span>
                  <span class="text-[10px] text-slate-400">{{ sub.products?.length || '' }}</span>
                </button>
                <button
                  type="button"
                  class="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-medium text-teal-700 hover:bg-teal-50"
                  @click="openCategory(cat.slug)"
                >
                  View all {{ cat.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="min-h-[calc(100vh-4rem)] min-w-0">
        <slot />

        <footer class="border-t border-slate-200 bg-white/90 px-4 py-8 backdrop-blur">
          <div class="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">ChinaBuyBD</p>
              <p class="mt-2 text-sm font-semibold text-slate-900">Premium China shopping concierge</p>
              <p class="mt-2 text-[12px] leading-5 text-slate-500">
                Room 13D, No. 29, Jianshe Sixth Road, Yuexiu District, Rongjin Building, Taojin, Guangzhou
              </p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Contact</p>
              <div class="mt-2 space-y-2 text-[12px] text-slate-600">
                <div>Phone: +86 189 8941 0063</div>
                <a class="block text-teal-700 hover:text-teal-800" href="https://wa.me/8618989410063" target="_blank" rel="noreferrer">
                  WhatsApp: +86 189 8941 0063
                </a>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Links</p>
              <div class="mt-2 space-y-2 text-[12px]">
                <router-link class="block text-slate-600 hover:text-teal-700" to="/shopping">Shop</router-link>
                <router-link class="block text-slate-600 hover:text-teal-700" to="/blog">Blog</router-link>
                <router-link class="block text-slate-600 hover:text-teal-700" to="/contact">Contact</router-link>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Legal</p>
              <div class="mt-2 space-y-2 text-[12px]">
                <router-link class="block text-slate-600 hover:text-teal-700" to="/terms">Terms of condition</router-link>
                <div class="text-slate-500">Shipping time: 12-14 days</div>
              </div>
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
import { Camera, ChevronRight, Gem, Home, Package, Search, Shield, Shirt, ShoppingBag, Sparkles, Stars, Truck, Watch, Cpu } from 'lucide-vue-next';

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
  headphones: Package,
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

function categoryIcon(icon?: string) {
  return iconMap[String(icon || '').toLowerCase()] || Package;
}

function submitSearch() {
  const keyword = searchQuery.value.trim();
  router.push(keyword ? { path: '/shopping/browse', query: { q: keyword } } : '/shopping');
}

function openShopping() {
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
  router.push({ path: '/shopping/browse', query: { category: slug } });
}

function toggleCategory(slug: string) {
  expandedCategorySlug.value = expandedCategorySlug.value === slug ? '' : slug;
}

async function loadCategories() {
  try {
    const response = await fetch('/api/public/shopping/categories');
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
