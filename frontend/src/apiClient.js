// frontend/src/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // This will be proxied by Vite to our backend
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('Interceptor caught an error:', error);
    if (error.response && error.response.status === 401) {
      console.log('401 error detected, redirecting to login.');
      localStorage.removeItem('token');
      window.location.href = '/'; // Redirect to login page
    }
    return Promise.reject(error);
  }
);

export default apiClient;