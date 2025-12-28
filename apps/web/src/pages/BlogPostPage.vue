<template>
  <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <Card v-if="post">
      <CardBody>
        <h1 class="text-3xl font-bold mb-4">{{ post.title }}</h1>
        <div class="prose max-w-none" v-html="post.content_md"></div>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from '@/utils/axios';
import { Card, CardBody } from '@bridgechina/ui';

const route = useRoute();
const post = ref<any>(null);

onMounted(async () => {
  try {
    const response = await axios.get(`/api/public/blog/${route.params.slug}`);
    post.value = response.data;
  } catch (error) {
    console.error('Failed to load blog post');
  }
});
</script>

