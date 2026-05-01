const SESSION_KEY = 'ff_token'; // ff = FarmFlow namespace

// ─── JWT decode (client-side only, no signature verification) ────────────────

export const decodeToken = (token) => {
  try {
    // Handle URL-safe base64 (RFC 4648)
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

/**
 * Returns true if the token is missing, malformed, or its exp claim has passed.
 * Includes a 10-second buffer for clock skew between client and server.
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return Date.now() >= (decoded.exp - 10) * 1000;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
//
// Default: sessionStorage — cleared when the tab closes, isolated per-tab.
// Persistent (Remember Me): localStorage — survives tab/window close.
//
// We never keep both at once; saving to one removes from the other so
// getStoredToken() always returns a single unambiguous value.
//
// For maximum security: use httpOnly cookies set by the backend.
// That change is out of scope for this MVP.

const PERSISTENT_KEY = 'ff_token_p';

export const saveToken = (token, persistent = false) => {
  if (persistent) {
    localStorage.setItem(PERSISTENT_KEY, token);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, token);
    localStorage.removeItem(PERSISTENT_KEY);
  }
};

export const getStoredToken = () =>
  sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(PERSISTENT_KEY) || null;

export const removeToken = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PERSISTENT_KEY);
};
