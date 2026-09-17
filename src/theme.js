import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';

// Paleta plana usada donde hace falta un color "crudo" fuera de className
// (RefreshControl tintColor, StatusBar, color de icono, fondos de Chip, etc.)
// Mismos valores que tailwind.config.js — mantener ambos en sync si cambian.
export const colors = {
  light: {
    primary: '#4F46E5',
    secondary: '#059669',
    tertiary: '#F59E0B',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    onSurface: '#1C1B1F',
    onSurfaceVariant: '#49454F',
    surfaceDisabled: '#E7E0EC',
    border: '#CAC4D0',
    error: '#B3261E',
  },
  dark: {
    primary: '#818CF8',
    secondary: '#34D399',
    tertiary: '#FBBF24',
    background: '#141218',
    surface: '#141218',
    onSurface: '#E6E1E5',
    onSurfaceVariant: '#CAC4D0',
    surfaceDisabled: '#49454F',
    border: '#49454F',
    error: '#F2B8B5',
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
