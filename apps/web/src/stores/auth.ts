import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from '@/utils/axios';
import type { User } from '@bridgechina/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value);

  async function login(emailOrPhone: string, password: string) {
    // Support both email and phone login
    const isEmail = emailOrPhone.includes('@');
    const loginData = isEmail 
      ? { email: emailOrPhone, password }
      : { phone: emailOrPhone, password };
    
    const response = await axios.post('/api/auth/login', loginData);
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    localStorage.setItem('accessToken', response.data.accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
  }

  async function register(data: { email?: string; phone?: string; password: string }) {
    const response = await axios.post('/api/auth/register', data);
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    localStorage.setItem('accessToken', response.data.accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
  }

  async function requestEmailCode(
    email: string,
    purpose: 'auth' | 'password_reset' = 'auth',
    intent: 'login' | 'register' = 'login'
  ) {
    await axios.post('/api/auth/email-code/request', { email, purpose, intent }, { timeout: 20000, suppressGlobalErrorToast: true } as any);
  }

  async function verifyEmailCode(data: { email: string; code: string; name?: string; phone?: string; intent?: 'login' | 'register' }) {
    const response = await axios.post('/api/auth/email-code/verify', data, { suppressGlobalErrorToast: true } as any);
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    localStorage.setItem('accessToken', response.data.accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
  }

  async function requestPhoneCode(phone: string, intent: 'login' | 'register' = 'login') {
    await axios.post('/api/auth/phone-code/request', { phone, purpose: 'auth', intent }, { timeout: 20000, suppressGlobalErrorToast: true } as any);
  }

  async function verifyPhoneCode(data: { phone: string; code: string; password?: string; name?: string; intent?: 'login' | 'register' }) {
    const response = await axios.post('/api/auth/phone-code/verify', data, { suppressGlobalErrorToast: true } as any);
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    localStorage.setItem('accessToken', response.data.accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
  }

  async function resetPasswordWithCode(data: { email: string; code: string; password: string }) {
    const response = await axios.post('/api/auth/password-reset/confirm', data);
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    localStorage.setItem('accessToken', response.data.accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
  }

  async function acceptOAuthAccessToken(token: string) {
    accessToken.value = token;
    localStorage.setItem('accessToken', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await fetchUser();
  }

  async function logout() {
    await axios.post('/api/auth/logout');
    user.value = null;
    accessToken.value = null;
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
  }

  async function fetchUser() {
    if (!accessToken.value) return;
    
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken.value}`;
      const response = await axios.get('/api/auth/me');
      user.value = response.data;
    } catch (error) {
      // Token might be expired, try refresh
      await refreshToken();
    }
  }

  async function refreshToken() {
    try {
      const response = await axios.post('/api/auth/refresh');
      accessToken.value = response.data.accessToken;
      user.value = response.data.user;
      localStorage.setItem('accessToken', response.data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
    } catch (error) {
      // Refresh failed, logout
      await logout();
    }
  }

  // Initialize auth state - call this from main.ts or App.vue
  async function init() {
    if (accessToken.value) {
      await fetchUser();
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    login,
    register,
    requestEmailCode,
    verifyEmailCode,
    requestPhoneCode,
    verifyPhoneCode,
    resetPasswordWithCode,
    acceptOAuthAccessToken,
    logout,
    fetchUser,
    refreshToken,
    init,
  };
});

