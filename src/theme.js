import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';

// Paleta plana usada donde hace falta un color "crudo" fuera de className
// (RefreshControl tintColor, StatusBar, color de icono, fondos de Chip, etc.)
// Mismos valores que tailwind.config.js — mantener ambos en sync si cambian.
//
// Claro: tonos "papel" cálidos con superficies violeta-lavanda para que el
// header/las tarjetas se distingan del fondo general (nunca blanco puro).
// Oscuro: estética cyberpunk/neón — el fondo general es un gris neutro
// oscuro (sin tinte, para no deslumbrar en pantallas grandes de texto);
// el tinte violeta se reserva a la superficie elevada (header/tarjetas) y
// los acentos eléctricos (violeta, cian, lima) sobre texto claro legible.
export const colors = {
  light: {
    primary: '#5A31D8',
    secondary: '#0E7C7B',
    tertiary: '#B45309',
    background: '#F6F4EF',
    surface: '#ECE8F7',
    onSurface: '#241F33',
    onSurfaceVariant: '#5C5568',
    surfaceDisabled: '#DAD3EC',
    border: '#D3CBE6',
    error: '#C0293D',
  },
  dark: {
    primary: '#9D3DF2',
    secondary: '#00E5FF',
    tertiary: '#E9FF3D',
    background: '#0A0912',
    surface: '#15132A',
    onSurface: '#F1EEFF',
    onSurfaceVariant: '#B6AFD6',
    surfaceDisabled: '#2B2748',
    border: '#3A3560',
    error: '#FF3B6B',
  },
};

export const navLightTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: colors.light.primary,
    background: colors.light.background,
    card: colors.light.surface,
    text: colors.light.onSurface,
    border: colors.light.border,
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
  },
};
