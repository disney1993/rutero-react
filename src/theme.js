import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';

const ROUNDNESS = 16;

export const lightTheme = {
  ...MD3LightTheme,
  roundness: ROUNDNESS,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5',
    secondary: '#059669',
    tertiary: '#F59E0B',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: ROUNDNESS,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',
    secondary: '#34D399',
    tertiary: '#FBBF24',
  },
};

export const navLightTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.elevation.level2,
    text: lightTheme.colors.onSurface,
    border: lightTheme.colors.outlineVariant,
  },
};

export const navDarkTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.elevation.level2,
    text: darkTheme.colors.onSurface,
    border: darkTheme.colors.outlineVariant,
  },
};
