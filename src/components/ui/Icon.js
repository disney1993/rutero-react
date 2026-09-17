import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';

export default function Icon({ name, size = 24, color, className }) {
  const { resolvedScheme } = useThemeMode();
  if (!name) return null;
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color ?? colors[resolvedScheme].onSurfaceVariant}
      className={className}
    />
  );
}
