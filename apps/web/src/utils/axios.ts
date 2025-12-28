import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = '';
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

      // Handle 401 - try refresh token (only for protected endpoints)
      if (error.response.status === 401 && !error.config.url?.includes('/auth/refresh')) {
        // Skip refresh for public endpoints
        const isPublicEndpoint = error.config.url?.includes('/public/') || 
                                 error.config.url?.includes('/auth/login') ||
                                 error.config.url?.includes('/auth/register');
        
        if (!isPublicEndpoint) {
          try {
            const refreshResponse = await axios.post('/api/auth/refresh');
            const newToken = refreshResponse.data.accessToken;
            localStorage.setItem('accessToken', newToken);
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return axios.request(error.config);
          } catch (refreshError) {
            // Refresh failed, clear auth - router will handle redirect
            localStorage.removeItem('accessToken');
            return Promise.reject(refreshError);
          }
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

