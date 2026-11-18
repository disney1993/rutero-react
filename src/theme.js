import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';

const ROUNDNESS = 14;

/**
 * Light: soft pastel surfaces + muted teal primary (no purple-on-white).
 * Dark: cyberpunk near-black + neon cyan / magenta accents.
 */
export const lightTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: ROUNDNESS,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2F8F86',
    onPrimary: '#FFFFFF',
    primaryContainer: '#C9EFE8',
    onPrimaryContainer: '#063A35',
    secondary: '#D4846A',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#F8DED4',
    onSecondaryContainer: '#3E1C12',
    tertiary: '#6B7FD7',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#E0E5FF',
    onTertiaryContainer: '#1A2458',
    background: '#F3F7F5',
    onBackground: '#1A2422',
    surface: '#FAFCFB',
    onSurface: '#1A2422',
    surfaceVariant: '#E2ECE8',
    onSurfaceVariant: '#3F4F4B',
    outline: '#8AA39C',
    outlineVariant: '#C5D5D0',
    inverseSurface: '#2A3431',
    inverseOnSurface: '#ECF3F0',
    inversePrimary: '#7ED9CE',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: 'transparent',
      level1: '#F0F6F3',
      level2: '#EAF3EF',
      level3: '#E4EFEB',
      level4: '#E1EDE8',
      level5: '#DCEAE4',
    },
    backdrop: 'rgba(26, 36, 34, 0.35)',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: ROUNDNESS,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00E5FF',
    onPrimary: '#00363D',
    primaryContainer: '#004F59',
    onPrimaryContainer: '#97F0FF',
    secondary: '#FF2EC8',
    onSecondary: '#3B0029',
    secondaryContainer: '#6B004C',
    onSecondaryContainer: '#FFD8EC',
    tertiary: '#B8FF3C',
    onTertiary: '#1A2E00',
    tertiaryContainer: '#314F00',
    onTertiaryContainer: '#D4FF8A',
    background: '#07080F',
    onBackground: '#E6E8F2',
    surface: '#10121C',
    onSurface: '#E6E8F2',
    surfaceVariant: '#1C2030',
    onSurfaceVariant: '#A8B0C8',
    outline: '#4A536C',
    outlineVariant: '#2A3145',
    inverseSurface: '#E6E8F2',
    inverseOnSurface: '#12141E',
    inversePrimary: '#006874',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: '#12141F',
      level2: '#161928',
      level3: '#1A1E30',
      level4: '#1C2034',
      level5: '#1F243A',
    },
    backdrop: 'rgba(0, 0, 0, 0.55)',
  },
};

export const navLightTheme = {
  ...NavDefaultTheme,
  dark: false,
  colors: {
    ...NavDefaultTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.elevation.level2,
    text: lightTheme.colors.onSurface,
    border: lightTheme.colors.outlineVariant,
    notification: lightTheme.colors.secondary,
  },
};

export const navDarkTheme = {
  ...NavDarkTheme,
  dark: true,
  colors: {
    ...NavDarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.elevation.level2,
    text: darkTheme.colors.onSurface,
    border: darkTheme.colors.outlineVariant,
    notification: darkTheme.colors.secondary,
  },
};
