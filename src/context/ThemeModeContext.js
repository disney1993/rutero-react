import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'rutero.themeMode'; // 'system' | 'light' | 'dark'

const ThemeModeContext = createContext(null);

export function ThemeModeProvider({ children }) {
  const systemScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
    }).catch(() => {});
  }, []);

  const setMode = (next) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const resolvedScheme = mode === 'system' ? (systemScheme || 'light') : mode;

  // Mantiene las clases `dark:` de NativeWind sincronizadas con el modo
  // elegido por el usuario (system/light/dark), no solo con el SO.
  useEffect(() => {
    setColorScheme(resolvedScheme);
  }, [resolvedScheme]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, resolvedScheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode debe usarse dentro de <ThemeModeProvider>');
  return ctx;
}
