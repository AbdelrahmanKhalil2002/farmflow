import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '../services/authService';
import { saveToken, getStoredToken, removeToken, isTokenExpired, decodeToken } from '../utils/token';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Session hydration ──────────────────────────────────────────────────────
  // Runs once on mount. Resolves before any route renders (loading gate below).
  useEffect(() => {
    const hydrate = async () => {
      const stored = getStoredToken();

      // No token — nothing to restore
      if (!stored) {
        setLoading(false);
        return;
      }

      // Token is present but already expired client-side — skip the network call
      if (isTokenExpired(stored)) {
        removeToken();
        setLoading(false);
        return;
      }

      // Token looks valid — confirm with the server
      try {
        const { data } = await getMe();
        setUser(data);
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          // Token rejected or account disabled — discard it
          removeToken();
        } else {
          // Network or server error — decode the token locally so the user
          // isn't stranded at /login while the server is temporarily unreachable.
          // ProtectedRoute will still enforce access; any API call that returns
          // 401 will fire auth:logout and clear the session.
          const decoded = decodeToken(stored);
          if (decoded) {
            setUser({ _id: decoded.id, role: decoded.role });
          } else {
            removeToken(); // token is malformed — discard
          }
        }
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Global 401 listener ────────────────────────────────────────────────────
  // api.js fires 'auth:logout' when any response returns 401.
  // This keeps api.js and AuthContext decoupled (no circular import).
  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  // ─── Auth actions ────────────────────────────────────────────────────────────

  const login = (userData, authToken) => {
    if (!authToken) {
      console.error('[AuthContext] login() called without a token — session not saved');
      return;
    }
    // Token is intentionally NOT stored in React state.
    // Keeping it in sessionStorage only reduces React DevTools exposure.
    saveToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  // ─── Loading gate ────────────────────────────────────────────────────────────
  // No route renders until hydration completes — eliminates the race condition
  // where ProtectedRoute checks user before getMe() has resolved.
  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
