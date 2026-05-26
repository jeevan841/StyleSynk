// client/src/context/AuthContext.jsx
// JWT Auth state — login, logout, role-based access

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [token,   setToken]   = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (token && !user) {
      authAPI.me()
        .then(data => setUser(data))
        .catch(() => { setToken(null); localStorage.removeItem('token'); });
    }
  }, [token, user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  const hasRole = useCallback((...roles) => {
    return roles.includes(user?.role);
  }, [user]);

  const isMinRole = useCallback((minRole) => {
    const hierarchy = { owner: 5, branch_manager: 4, receptionist: 3, stylist: 2, customer: 1 };
    return (hierarchy[user?.role] || 0) >= (hierarchy[minRole] || 0);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout, hasRole, isMinRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
