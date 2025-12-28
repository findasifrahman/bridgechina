<template>
  <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <!-- BlogPage Loaded -->
    <PageHeader title="Blog" subtitle="Tips, guides, and updates" />
    <div class="grid md:grid-cols-3 gap-6">
      <Card v-for="post in posts" :key="post.id" :hover="true" @click="$router.push(`/blog/${post.slug}`)">
        <CardBody>
          <h3 class="font-semibold text-lg mb-2">{{ post.title }}</h3>
          <p class="text-slate-600 text-sm">{{ post.excerpt }}</p>
        </CardBody>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from '@/utils/axios';
import { PageHeader, Card, CardBody } from '@bridgechina/ui';

const posts = ref<any[]>([]);

onMounted(async () => {
  try {
    const response = await axios.get('/api/public/blog');
    posts.value = response.data;
  } catch (error) {
    console.error('Failed to load blog posts');
  }
});
</script>

