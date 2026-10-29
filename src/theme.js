import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';

// Paleta plana usada donde hace falta un color "crudo" fuera de className
// (RefreshControl tintColor, StatusBar, color de icono, fondos de Chip, etc.)
// Mismos valores que tailwind.config.js — mantener ambos en sync si cambian.
//
// Cada color tiene el MISMO significado en los dos modos; solo cambia el estilo:
//   primary   → acción principal / marca
//   secondary → éxito, completado, propietario, tendencia al alza
//   tertiary  → atención, pendiente, conductor, avisos
//   error     → peligro, cancelado, borrar
//
// Claro: estilo Apple (iOS). Fondo agrupado gris (#F2F2F7) con tarjetas
// blancas y sombra muy suave, campos rellenos sin borde y los colores del
// sistema en su variante accesible para que el texto pequeño se lea bien.
// Oscuro: cyberpunk. Fondo casi negro con un leve tinte violeta, superficies
// violeta profundo y acentos neón (violeta, verde, ámbar, rosa). Sobre un neón
// el texto va oscuro (onPrimary): el blanco sobre violeta brillante no se lee.
export const colors = {
  light: {
    primary: '#007AFF',
    onPrimary: '#FFFFFF',
    secondary: '#248A3D',
    tertiary: '#C93400',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    onSurface: '#1C1C1E',
    onSurfaceVariant: '#6C6C70',
    surfaceDisabled: '#E5E5EA',
    // Relleno de campos de formulario (tertiarySystemFill de iOS).
    fill: 'rgba(118,118,128,0.14)',
    border: '#D1D1D6',
    textDisabled: '#C7C7CC',
    error: '#D70015',
  },
  dark: {
    primary: '#B15CFF',
    onPrimary: '#0A0612',
    secondary: '#39FF9F',
    tertiary: '#FFC53D',
    background: '#07060D',
    surface: '#13111F',
    onSurface: '#F2EFFF',
    onSurfaceVariant: '#A49FC4',
    surfaceDisabled: '#241F3A',
    fill: 'rgba(177,92,255,0.08)',
    border: '#2E2850',
    textDisabled: '#4E4870',
    error: '#FF2E88',
  },
};

// Colores de estado de las rutas (puntos, fondos de fila, gráficas). Mismo
// significado que la paleta: verde = completado, ámbar = pendiente,
// rojo/rosa = cancelado. Usar con useStatusColors() (utils/rutas).
export const statusColors = {
  light: { pending: '#FF9500', completed: '#34C759', cancelled: '#FF3B30' },
  dark: { pending: '#FFC53D', completed: '#39FF9F', cancelled: '#FF2E88' },
};

// Degradado del anillo del avatar activo (tab bar y cuenta).
export const ringGradient = {
  light: ['#5856D6', '#007AFF', '#32ADE6'],
  dark: ['#39FF9F', '#B15CFF', '#FF2E88'],
};

// '#RRGGBB' + alpha (0..1) → 'rgba(...)'. Devuelve undefined si no es un hex.
export function withAlpha(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return undefined;
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw.slice(0, 6);
  if (full.length !== 6) return undefined;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Elevación según el modo: en claro una sombra neutra muy suave (tarjetas de
// iOS); en oscuro las sombras no se ven, así que el relieve es un halo neón
// del color dado. `strength`: 'soft' (tarjetas) | 'strong' (botones, FAB).
export function elevation(scheme, { color, strength = 'soft' } = {}) {
  if (scheme === 'dark') {
    if (!color) return undefined;
    const glow = strength === 'strong' ? withAlpha(color, 0.55) : withAlpha(color, 0.18);
    return { boxShadow: `0 0 ${strength === 'strong' ? 18 : 14}px ${glow}` };
  }
  return strength === 'strong'
    ? { boxShadow: '0 4px 14px rgba(0,0,0,0.14)' }
    : { boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.05)' };
}

export const navLightTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: colors.light.primary,
    background: colors.light.background,
    card: colors.light.surface,
    text: colors.light.onSurface,
    border: colors.light.border,
    notification: colors.light.error,
  },
};

export const navDarkTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: colors.dark.primary,
    background: colors.dark.background,
    card: colors.dark.surface,
    text: colors.dark.onSurface,
    border: colors.dark.border,
    notification: colors.dark.error,
  },
};
