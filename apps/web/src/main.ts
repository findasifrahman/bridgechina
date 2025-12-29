import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import '@/utils/axios'; // Initialize axios configuration
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize auth store
const authStore = useAuthStore();
authStore.init();

console.log('[App] Mounting Vue app...');
app.mount('#app');
console.log('[App] Vue app mounted');

