import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile, signout as apiSignout } from '../api/auth';
import { clearToken } from '../api/client';
import { clearAllData } from '../offline/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiSignout();
    } catch {}
    await clearToken();
    await clearAllData().catch(() => {});
    setUser(null);
  }, []);

  const updateUser = useCallback((fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
