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

// ─── sessionStorage helpers ───────────────────────────────────────────────────
//
// Why sessionStorage instead of localStorage?
//   - Cleared automatically when the browser tab is closed (shorter exposure window)
//   - Isolated per-tab (an XSS payload in one tab cannot read another tab's token)
//   - Same runtime XSS risk as localStorage, but smaller blast radius
//
// For maximum security: use httpOnly cookies set by the backend.
// That change is out of scope for this MVP.

export const saveToken  = (token) => sessionStorage.setItem(SESSION_KEY, token);
export const getStoredToken = ()    => sessionStorage.getItem(SESSION_KEY);
export const removeToken    = ()    => sessionStorage.removeItem(SESSION_KEY);
