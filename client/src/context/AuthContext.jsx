import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services';
import { setUnauthorizedHandler } from '../services/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (body) => { const r = await authApi.login(body); setUser(r.user); return r.user; }, []);
  const register = useCallback(async (body) => { const r = await authApi.register(body); setUser(r.user); return r.user; }, []);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({
    user, loading, login, register, logout, setUser,
    isStaff: user?.role === 'ADMIN' || user?.role === 'EDITOR',
    isAdmin: user?.role === 'ADMIN',
  }), [user, loading, login, register, logout]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
