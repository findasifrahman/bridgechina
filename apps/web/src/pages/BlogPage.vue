<template>
  <div class="mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-8">
      <p class="text-[10px] font-bold uppercase tracking-[0.34em] text-teal-700">Blog</p>
      <h1 class="mt-3 text-[34px] font-black tracking-tight text-slate-950 sm:text-[42px]"><Canvas>ChinaBuyBD</Canvas> updates</h1>
      <p class="mt-3 max-w-3xl text-[13px] leading-6 text-slate-600">
        We share sourcing notes, shopping updates, shipping tips, and marketplace guidance here.
      </p>

      <div class="mt-8 grid gap-4 md:grid-cols-2">
        <article
          v-for="post in posts"
          :key="post.title"
          class="rounded-[22px] border border-slate-200 bg-slate-50 p-5"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">{{ post.tag }}</p>
          <h2 class="mt-2 text-[18px] font-black tracking-tight text-slate-950">{{ post.title }}</h2>
          <p class="mt-2 text-[12px] leading-6 text-slate-600">{{ post.summary }}</p>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const posts = [
  {
    tag: 'Shopping',
    title: 'How premium factory products appear first',
    summary: 'Manual products added by admin show before OTAPI results so customers see curated items first.',
  },
  {
    tag: 'Shipping',
    title: 'How shipping ranges are configured',
    summary: 'Admin can set air and sea per-kg price ranges and keep them visible across the storefront and dashboards.',
  },
  {
    tag: 'MOQ',
    title: 'Why minimum order rules matter',
    summary: 'MOQ settings protect bulk purchasing workflows and keep low-value checkout attempts from going through.',
  },
  {
    tag: 'Support',
    title: 'Need sourcing help from China?',
    summary: 'Our team stays available through WhatsApp for repeat orders, sourcing questions, and B2B support.',
  },
];
</script>
