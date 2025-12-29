import axios from 'axios';

// Configure axios defaults
// Use VITE_API_URL if set, otherwise use relative paths (for same-origin)
const apiUrl = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = apiUrl;
axios.defaults.withCredentials = true;

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Dynamic import to avoid circular dependency
    let toast: any = null;
    try {
      const toastModule = await import('@bridgechina/ui');
      toast = toastModule.useToast();
    } catch (e) {
      // Toast not available, use console
      console.error('API Error:', error);
    }

    if (error.response) {
      // Server responded with error
      const message = error.response.data?.error || error.response.data?.message || 'An error occurred';
      if (toast) {
        toast.error(message);
      } else {
        console.error('API Error:', message);
      }

      // Handle 401 - try refresh token
      if (error.response.status === 401 && !error.config.url?.includes('/auth/refresh')) {
        try {
          const refreshResponse = await axios.post('/api/auth/refresh');
          const newToken = refreshResponse.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return axios.request(error.config);
        } catch (refreshError) {
          // Refresh failed, clear auth and redirect
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    } else if (error.request) {
      // Request made but no response
      if (toast) {
        toast.error('Network error. Please check your connection.');
      } else {
        console.error('Network error');
      }
    } else {
      // Something else happened
      if (toast) {
        toast.error('An unexpected error occurred');
      } else {
        console.error('Unexpected error');
      }
    }

    return Promise.reject(error);
  }
);

export default axios;

