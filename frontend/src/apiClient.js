// frontend/src/apiClient.js
import axios from 'axios';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second, will exponentially increase

// Error code to message mapping
const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  AUTH_ERROR: 'Please log in again.',
  PROCESSING_ERROR: 'An error occurred while processing. Please try again.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment.',
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet.',
};

// Check if browser is online
const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// Calculate delay with exponential backoff
const getRetryDelay = (retryCount) => {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount);
};

// Check if error is retryable
const isRetryableError = (error) => {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }
  const status = error.response.status;
  // Retry on 5xx errors or 429 (rate limit)
  return status >= 500 || status === 429;
};

// Sleep function for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in headers
apiClient.interceptors.request.use(
  (config) => {
    // Check if online before making request
    if (!isOnline()) {
      return Promise.reject({
        message: ERROR_MESSAGES.NETWORK_ERROR,
        code: 'NETWORK_ERROR',
        isOffline: true,
      });
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add retry count to config
    config.__retryCount = config.__retryCount || 0;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // If it's an offline error, don't retry
    if (error.isOffline) {
      return Promise.reject(error);
    }

    // Log the error
    console.error('API Error:', {
      url: config?.url,
      status: error.response?.status,
      message: error.message,
      retryCount: config?.__retryCount,
    });

    // Handle 401 - Unauthorized
    if (error.response && error.response.status === 401) {
      console.log('401 error detected, redirecting to login.');
      localStorage.removeItem('token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Check if we should retry
    if (config && isRetryableError(error) && config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;
      const delay = getRetryDelay(config.__retryCount);

      console.log(`Retrying request (${config.__retryCount}/${MAX_RETRIES}) in ${delay}ms...`);

      await sleep(delay);
      return apiClient(config);
    }

    // Transform error to include friendly message
    const enhancedError = {
      ...error,
      friendlyMessage: getFriendlyErrorMessage(error),
    };

    return Promise.reject(enhancedError);
  }
);

// Get friendly error message from error object
const getFriendlyErrorMessage = (error) => {
  if (error.isOffline) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (!error.response) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  const errorCode = error.response.data?.code;
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  const status = error.response.status;
  switch (status) {
    case 400:
      return error.response.data?.error || 'Invalid request. Please check your input.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 429:
      return ERROR_MESSAGES.RATE_LIMIT_ERROR;
    case 500:
      return 'Server error. Please try again later.';
    default:
      return error.response.data?.error || 'An unexpected error occurred.';
  }
};

// Utility: Check if currently online
export const checkOnline = isOnline;

// Utility: Get error message helper
export const getErrorMessage = (error) => {
  return error.friendlyMessage || getFriendlyErrorMessage(error);
};

export default apiClient;