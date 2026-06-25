<template>
  <div class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <div class="w-full max-w-lg">
      <AuthOtpPanel :redirect-path="redirectPath" @authenticated="handleAuthenticated" />
      <div class="mt-4 text-center">
        <button
          v-if="!showPasswordLogin"
          type="button"
          class="text-sm font-semibold text-slate-700 underline-offset-4 hover:text-teal-700 hover:underline"
          @click="showPasswordLogin = true"
        >
          Sign in with email, password
        </button>
      </div>

      <form
        v-if="showPasswordLogin"
        class="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
        @submit.prevent="handlePasswordLogin"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-base font-bold text-slate-900">Password sign in</h2>
          <button type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-900" @click="showPasswordLogin = false">
            Hide
          </button>
        </div>
        <div class="space-y-4">
          <Input v-model="emailOrPhone" label="Email or phone" placeholder="admin@chinabuybd.com" />
          <Input v-model="password" label="Password" type="password" />
          <Button type="submit" variant="primary" full-width :loading="passwordLoading">
            Sign in
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthOtpPanel from '@/components/auth/AuthOtpPanel.vue';
import { useAuthStore } from '@/stores/auth';
import { resolveAuthRedirect } from '@/utils/auth-redirect';
import { Button, Input, useToast } from '@bridgechina/ui';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const redirectPath = computed(() => String(route.query.redirect || '/user'));
const showPasswordLogin = ref(false);
const passwordLoading = ref(false);
const emailOrPhone = ref('');
const password = ref('');

function handleAuthenticated() {
  const target = route.query.redirect
    ? String(route.query.redirect)
    : resolveAuthRedirect(authStore.user?.roles || [], '/user');
  router.push(target);
}

async function handlePasswordLogin() {
  if (!emailOrPhone.value.trim() || !password.value) {
    toast.error('Enter your email or phone and password');
    return;
  }

  passwordLoading.value = true;
  try {
    await authStore.login(emailOrPhone.value.trim(), password.value);
    handleAuthenticated();
    toast.success('Welcome back');
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Login failed');
  } finally {
    passwordLoading.value = false;
  }
}
</script>
