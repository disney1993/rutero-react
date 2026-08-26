import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../utils/apiClient';

const STORAGE_KEY = 'rutero.session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session = JSON.parse(raw);
          setAuthToken(session.token);
          setToken(session.token);
          setUser(session.user);
        }
      } catch (e) {
        // Sesión corrupta o inaccesible: se ignora y el usuario vuelve a iniciar sesión.
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const login = async (nextUser, nextToken) => {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  };

  const updateUser = async (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: next, token })).catch(() => {});
      return next;
    });
  };

  const refreshUser = async () => {
    const resp = await api.get('/user');
    await updateUser(resp.data);
    return resp.data;
  };

  const logout = async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ user, token, bootstrapping, isAdmin: !!user?.is_admin, login, logout, updateUser, refreshUser }),
    [user, token, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
