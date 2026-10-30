import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'rutero.themeMode'; // 'system' | 'light' | 'dark'

// Same Fast Refresh / dual-module guard as AuthContext.
const ThemeModeContext =
  globalThis.__RUTERO_THEME_MODE_CONTEXT__ ??
  (globalThis.__RUTERO_THEME_MODE_CONTEXT__ = createContext(null));

export function ThemeModeProvider({ children }) {
  // NativeWind es la única fuente de verdad del modo resuelto: lo usan las
  // clases `dark:` y, a través de resolvedScheme, los colores que van por
  // `style` (tarjetas, iconos, cabecera, tab bar, pickers). Antes este último
  // salía de useColorScheme() de React Native y podía desincronizarse de las
  // clases (texto de modo oscuro sobre fondo claro en Android). Además, una vez
  // forzado claro/oscuro, useColorScheme() devuelve el modo forzado y "Sistema"
  // dejaba de seguir al teléfono.
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
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

  // Se pasa el modo tal cual ('system' incluido): NativeWind lo aplica a las
  // clases y al tema nativo de Android/iOS, y con 'system' vuelve a seguir al SO.
  useEffect(() => {
    setColorScheme(mode);
  }, [mode]);

  const resolvedScheme = colorScheme === 'dark' ? 'dark' : 'light';

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
