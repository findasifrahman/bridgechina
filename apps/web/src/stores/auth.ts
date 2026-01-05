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
    console.log('[Auth] Initializing auth store...');
    if (accessToken.value) {
      console.log('[Auth] Token found, fetching user...');
      await fetchUser();
    } else {
      console.log('[Auth] No token found');
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser,
    refreshToken,
    init,
  };
});

