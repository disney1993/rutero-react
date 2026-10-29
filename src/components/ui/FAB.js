import React from 'react';
import { Pressable, Text } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors, elevation } from '../../theme';

export default function FAB({ icon, label, onPress, style, className }) {
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  return (
    <Pressable
      onPress={(e) => { haptics.medium(); onPress?.(e); }}
      style={[elevation(resolvedScheme, { color: c.primary, strength: 'strong' }), style]}
      className={cn(
        'absolute bottom-6 right-6 bg-primary dark:bg-primary-dark rounded-full items-center justify-center flex-row active:scale-95 active:opacity-90',
        label ? 'px-5 h-14' : 'w-14 h-14',
        className
      )}
    >
      <Icon name={icon} size={24} color={c.onPrimary} />
      {!!label && <Text className="text-onPrimary dark:text-onPrimary-dark font-semibold ml-2">{label}</Text>}
    </Pressable>
  );
}
