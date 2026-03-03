import axios from 'axios';

const api = axios.create({
  baseURL: '/', // Use root, paths like /api/auth will be proxied by Vite
  withCredentials: true,
});

// Add response interceptor for 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect only if not already on login page to avoid loops
      if (window.location.pathname !== '/login') {
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
