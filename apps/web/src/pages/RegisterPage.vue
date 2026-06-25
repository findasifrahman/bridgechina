<template>
  <div class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <div class="w-full max-w-lg">
      <AuthOtpPanel
        title="Create account"
        subtitle="Enter your email to receive a verification code"
        :redirect-path="redirectPath"
        mode="register"
        @authenticated="handleAuthenticated"
      />
      <p class="mt-4 text-center text-sm text-slate-600">
        Already have an account?
        <RouterLink class="font-semibold text-teal-700 hover:text-teal-800" :to="{ name: 'login', query: { redirect: redirectPath } }">
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import AuthOtpPanel from '@/components/auth/AuthOtpPanel.vue';
import { useAuthStore } from '@/stores/auth';
import { resolveAuthRedirect } from '@/utils/auth-redirect';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const redirectPath = computed(() => String(route.query.redirect || '/user'));

function handleAuthenticated() {
  const target = route.query.redirect
    ? String(route.query.redirect)
    : resolveAuthRedirect(authStore.user?.roles || [], '/user');
  router.push(target);
}
</script>
