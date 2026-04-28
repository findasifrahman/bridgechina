<template>
  <div class="min-h-screen grid place-items-center bg-[#f5f7fb] px-4">
    <div class="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p class="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Redirecting</p>
      <h1 class="mt-2 text-2xl font-black tracking-tight text-slate-900">Opening product details</h1>
      <p class="mt-3 text-sm text-slate-600">This route now uses the provider-aware shopping detail screen.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  const id = route.params.id as string;
  router.replace(`/shopping/item/${id}`);
});
</script>
