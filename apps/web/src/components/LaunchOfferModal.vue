<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-300"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      @click.self="handleBackdropClick"
      @keydown.esc="handleEsc"
    >
      <!-- Backdrop with gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-teal-900/90 backdrop-blur-sm" />

      <!-- Modal Card -->
      <div
        class="relative w-full max-w-7xl lg:w-[92vw] xl:w-[88vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden lg:h-[80vh] lg:max-h-[86vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <!-- Close Button -->
        <button
          @click="handleClose"
          class="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-md"
          aria-label="Close modal"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="grid lg:grid-cols-2 gap-0 lg:h-full">
          <!-- Left: Content Section -->
          <div class="p-6 lg:p-8 flex flex-col justify-center bg-gradient-to-br from-slate-50 to-white lg:h-full overflow-y-auto">
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 w-fit">
              <span class="text-xs font-semibold text-teal-700">MalishaGroup Venture • Korban Ali</span>
            </div>

            <!-- Title -->
            <h2 id="modal-title" class="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 ">
              MalishaGroup's BridgeChina is launching soon
            </h2>

            <!-- Subtitle -->
            <p class="text-lg text-slate-600 mb-4">
              Your all-in-one China experience: travel, medical help, tours, and agent-assisted shopping.
            </p>

            <!-- Small line -->
            <p class="text-sm text-slate-500 mb-6">
              Get priority access during launch month.
            </p>

            <!-- CTA Buttons -->
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                @click="handlePrimaryAction"
                class="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Join Waitlist
              </button>
              <button
                @click="handleSecondaryAction"
                class="px-6 py-3 bg-white border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold rounded-lg transition-colors"
              >
                Explore Site
              </button>
            </div>

            <!-- Tertiary CTA -->
            <button
              @click="handleTertiaryAction"
              class="text-sm text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-2 self-start"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contact on WhatsApp
            </button>

            <!-- Footer Controls -->
            <div class="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer group">
                <input
                  v-model="dontShowAgain"
                  type="checkbox"
                  class="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                />
                <span class="text-sm text-slate-600 group-hover:text-slate-900">
                  Join Us
                </span>
              </label>
            </div>
          </div>

          <!-- Right: Media Section -->
          <div class="relative bg-slate-100 lg:bg-slate-900/5 lg:h-full">
            <!-- Video -->
            <div v-if="!shouldUseImage && mode === 'video' && videoSrc" class="relative w-full h-full min-h-[320px] lg:min-h-0 lg:h-full">
              <video
                ref="videoRef"
                :src="videoSrc"
                :poster="poster"
                autoplay
                muted
                loop
                playsinline
                class="w-full h-full object-cover"
                @loadedmetadata="handleVideoLoaded"
              />
              <!-- Tap to unmute hint (mobile) -->
              <button
                v-if="isMuted"
                @click="handleUnmute"
                class="absolute bottom-4 right-4 lg:hidden px-3 py-2 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm"
              >
                <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" />
                </svg>
                Tap to unmute
              </button>
            </div>

            <!-- Image -->
            <div v-else-if="(shouldUseImage || mode === 'image') && imageSrc" class="relative w-full h-full min-h-[320px] lg:min-h-0 lg:h-full">
              <img
                :src="imageSrc"
                :alt="title || 'Launch announcement'"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Fallback placeholder -->
            <div v-else class="relative w-full h-full min-h-[320px] lg:min-h-0 lg:h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200">
              <div class="text-center p-8">
                <svg class="w-16 h-16 text-teal-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-teal-700 font-medium">Launching Soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

// Props
const props = withDefaults(defineProps<{
  modelValue: boolean;
  mode?: 'video' | 'image';
  src?: string;
  poster?: string;
  title?: string;
}>(), {
  mode: 'video',
  src: 'https://pub-01637ccce9644ffc8b9c5b8dd003cf33.r2.dev/korban_video.mp4',
  title: 'BridgeChina Launch',
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'primary': [];
  'secondary': [];
  'tertiary': [];
  'close': [dontShowForDays?: number];
}>();

// State
const dontShowAgain = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
const isMuted = ref(true);
const imageSrc = ref<string | null>(null);
const shouldUseImage = ref(false);

// Computed
const videoSrc = computed(() => {
  if (shouldUseImage.value || props.mode === 'image') return null;
  return props.src || null;
});

// Check if image exists (for future use when image is provided)
async function checkImageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Initialize: check if image is provided, use image over video
onMounted(async () => {
  // Check if mode is explicitly set to image
  if (props.mode === 'image' && props.src) {
    const exists = await checkImageExists(props.src);
    if (exists) {
      imageSrc.value = props.src;
      shouldUseImage.value = true;
    }
  }
  // Note: If mode is 'video' but you want to check for image fallback later,
  // you can add that logic here by checking a separate image prop
});

// Video handlers
function handleVideoLoaded() {
  if (videoRef.value) {
    videoRef.value.muted = true;
    isMuted.value = true;
  }
}

function handleUnmute() {
  if (videoRef.value) {
    videoRef.value.muted = false;
    isMuted.value = false;
  }
}

// Modal handlers
function handleClose() {
  emit('update:modelValue', false);
}

function handleBackdropClick() {
  handleClose();
}

function handleEsc(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose();
  }
}

function handlePrimaryAction() {
  // Navigate to contact page or open email modal
  emit('primary');
}

function handleSecondaryAction() {
  // Close modal and scroll to services
  handleClose();
  emit('secondary');
  if (typeof window !== 'undefined') {
    // Scroll to services section if it exists, otherwise scroll to top tabs
    setTimeout(() => {
      const servicesSection = document.querySelector('#services') || 
                             document.querySelector('[data-section="services"]') ||
                             document.querySelector('.bg-white.border-b.border-slate-200'); // Scroll to top tabs section
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 300);
  }
}

function handleTertiaryAction() {
  // Open WhatsApp
  emit('tertiary');
  if (typeof window !== 'undefined') {
    // You can customize this WhatsApp number
    const whatsappNumber = '+861234567890'; // Replace with actual number
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  }
  handleClose();
}

// Watch modelValue to handle body scroll and emit close event
watch(() => props.modelValue, (isOpen) => {
  if (typeof document !== 'undefined') {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (videoRef.value) {
        videoRef.value.pause();
      }
      // Emit close event with cooldown preference when modal closes
      const cooldownDays = dontShowAgain.value ? 7 : undefined;
      emit('close', cooldownDays);
    }
  }
});

// Cleanup
onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  if (videoRef.value) {
    videoRef.value.pause();
  }
});
</script>

<style scoped>
/* Ensure video covers container */
video {
  object-fit: cover;
}
</style>

