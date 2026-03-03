import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credential, password) => {
    await api.post('/api/auth/login', { credential, password });
    await checkAuth();
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const hasPermission = (permission) => {
    const perms = user?.permissions || [];
    if (!permission) return true;
    return perms.includes('*') || perms.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
