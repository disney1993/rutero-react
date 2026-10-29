import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors, elevation } from '../../theme';

const MODE_CONTAINER = {
  contained: 'bg-primary dark:bg-primary-dark',
  outlined: 'border border-primary dark:border-primary-dark bg-transparent',
  text: 'bg-transparent',
};

const MODE_TEXT = {
  contained: 'text-onPrimary dark:text-onPrimary-dark',
  outlined: 'text-primary dark:text-primary-dark',
  text: 'text-primary dark:text-primary-dark',
};

export default function Button({
  mode = 'contained',
  onPress,
  loading = false,
  disabled = false,
  icon,
  iconColor,
  compact = false,
  style,
  contentStyle,
  className,
  textClassName,
  children,
}) {
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const accentColor = iconColor || (mode === 'contained' ? c.onPrimary : c.primary);
  const isDisabled = disabled || loading;
  // Botón principal: plano en claro (como iOS), halo neón en oscuro.
  const glow = resolvedScheme === 'dark' && mode === 'contained' && !isDisabled ? elevation(resolvedScheme, { color: c.primary, strength: 'strong' }) : undefined;
  return (
    <Pressable
      onPress={(e) => {
        if (mode === 'contained') haptics.medium(); else haptics.light();
        onPress?.(e);
      }}
      disabled={isDisabled}
      style={[glow, style]}
      className={cn(
        'flex-row items-center justify-center rounded-full active:opacity-80 active:scale-[0.97]',
        compact ? 'px-3 py-1.5' : 'px-6 py-2.5',
        MODE_CONTAINER[mode],
        isDisabled && 'opacity-50',
        className
      )}
    >
      <>
        {loading && (
          <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 8 }} />
        )}
        {!loading && icon && <Icon name={icon} size={18} color={accentColor} className="mr-2" />}
        <Text style={contentStyle} className={cn('font-semibold', textClassName || MODE_TEXT[mode])}>
          {children}
        </Text>
      </>
    </Pressable>
  );
}
