<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-teal-600 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-slate-900 mb-4">Page Not Found</h2>
      <p class="text-slate-600 mb-8">The page you're looking for doesn't exist.</p>
      <Button variant="primary" @click="$router.push('/')">
        Go Home
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@bridgechina/ui';
</script>

