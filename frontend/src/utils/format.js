/**
 * Format a number for display — adds thousand separators, up to 2 decimal places.
 * Handles null/undefined gracefully.
 *
 * Examples:
 *   fmt(1500)     → "1,500"
 *   fmt(1500.5)   → "1,500.5"
 *   fmt(null)     → "0"
 */
export const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/**
 * Resolve a backend-relative image path to an absolute URL.
 *
 * Dev:  VITE_API_URL is unset → backendBase = '' → path is relative (e.g. "/uploads/file.jpg")
 *       Vite proxy forwards /uploads/* to localhost:5001 — no change needed.
 *
 * Prod: VITE_API_URL = "https://api.onrender.com/api" → strips "/api" suffix
 *       → "https://api.onrender.com" + "/uploads/file.jpg"
 *       → "https://api.onrender.com/uploads/file.jpg"
 *
 * Returns empty string for falsy input so callers can use: path && <img src={getImageUrl(path)} />
 */
const _backendBase = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : '';

export const getImageUrl = (path) => (path ? `${_backendBase}${path}` : '');
