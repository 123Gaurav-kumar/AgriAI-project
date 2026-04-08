/**
 * API Utility
 * ─────────────────────────────────────────────────────────────
 * Configured Axios instance for all HTTP requests to the backend.
 *
 * Features:
 * - Base URL from environment variable
 * - Automatic JWT token injection in every request header
 * - Global error interceptor (auto-logout on 401)
 * - Consistent error message extraction
 */

import axios from 'axios';
import toast from 'react-hot-toast';

// Create Axios instance with base config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 60000, // 60 second timeout (AI analysis can be slow)
  headers: {
    'Content-Type': 'application/json'
  }
});

// ─── Request Interceptor ──────────────────────────────────────
// Runs before EVERY outgoing request
api.interceptors.request.use(
  (config) => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('agri_token');

    // If token exists, add it to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ─────────────────────────────────────
// Runs after EVERY incoming response
api.interceptors.response.use(
  // Success: pass through
  (response) => response,

  // Error: handle globally
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    // 401 = Token expired or invalid → force logout
    if (status === 401) {
      localStorage.removeItem('agri_token');
      localStorage.removeItem('agri_user');

      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
      }
    }

    // 429 = Rate limited
    if (status === 429) {
      toast.error('Too many requests. Please wait before trying again.');
    }

    // 500 = Server error
    if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject({ message, status, data: error.response?.data });
  }
);

export default api;