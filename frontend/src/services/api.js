import axios from 'axios';
import { getStoredToken, removeToken } from '../utils/token';
import { cacheGet, cacheSet } from '../utils/apiCache';

// In development: Vite proxy forwards /api/* to localhost:5001 (vite.config.js).
// In production: set VITE_API_URL to your deployed backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

const MAX_RETRIES    = 2;
const RETRY_DELAY_MS = 1000; // doubles each attempt: 1s, 2s

// ─── Request interceptor ─────────────────────────────────────────────────────
// Reads token from sessionStorage on every request — no stale-closure risk.

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses for offline fallback
    if (response.config.method === 'get') {
      cacheSet(response.config.url, response.config.params, response.data);
    }
    return response;
  },

  async (error) => {
    const config = error.config;

    // 1. Network retry — only when there is no response (server unreachable).
    //    Never retry 4xx / 5xx: those are intentional responses, not transient failures.
    if (!error.response && config) {
      config._retryCount = config._retryCount || 0;

      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        const delay = RETRY_DELAY_MS * config._retryCount; // 1s → 2s
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(config);
      }

      // All retries exhausted — serve from cache if available
      if (config.method === 'get') {
        const cached = cacheGet(config.url, config.params);
        if (cached) {
          window.dispatchEvent(new CustomEvent('ff:cache-hit'));
          return { data: cached.data, status: 200, _fromCache: true };
        }
      }
    }

    // 2. Expired / invalid token — notify AuthContext via custom event so that
    //    api.js and AuthContext stay decoupled (no circular import).
    if (error.response?.status === 401) {
      removeToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    return Promise.reject(error);
  }
);

export default api;
