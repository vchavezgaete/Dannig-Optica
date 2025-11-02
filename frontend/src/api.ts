// src/api.ts
import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

/**
 * Decode JWT token payload
 */
function decodeJWT(token: string): { sub?: string; correo?: string; roles?: string[]; exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error decoding JWT:', error);
    }
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // If we can't decode or no exp, consider expired
  }
  
  // exp is in seconds, convert to milliseconds for comparison
  const expTime = payload.exp * 1000;
  const currentTime = Date.now();
  
  // Consider expired if within 1 minute of expiration (buffer for clock skew)
  return currentTime >= (expTime - 60000);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  
  // Validate token expiration before making request
  if (token) {
    if (isTokenExpired(token)) {
      // Token expired, clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("roles");
      
      // Only redirect if not already on login page
      if (!config.url?.includes('/auth/login') && window.location.pathname !== '/login') {
        if (import.meta.env.DEV) {
          console.warn('Token expired, redirecting to login');
        }
        // Use setTimeout to avoid navigation during request
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
      
      // Reject the request with a specific error
      return Promise.reject(new Error('Token expired'));
    }
    
    // Token is valid, add to headers
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  
  // Solo log en desarrollo
  if (import.meta.env.DEV) {
    console.log('API Request:', {
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token
    });
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Solo log en desarrollo
    if (import.meta.env.DEV) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status
      });
    }
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - token invalid or expired
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("roles");
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        if (import.meta.env.DEV) {
          console.warn('Unauthorized response, redirecting to login');
        }
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      }
    }
    
    // Handle network errors
    if (!error.response && error.code === 'ERR_NETWORK') {
      if (import.meta.env.DEV) {
        console.error('Network error:', error.message);
      }
      // You could show a toast notification here
      return Promise.reject({
        ...error,
        message: 'Sin conexión a internet. Por favor verifica tu conexión.',
        type: 'network'
      });
    }
    
    // Siempre logear errores, pero con menos detalle en producción
    const logData = import.meta.env.DEV ? {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    } : {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    };
    console.error('API Error:', logData);
    return Promise.reject(error);
  }
);
