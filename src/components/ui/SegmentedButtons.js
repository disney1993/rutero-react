import React from 'react';
import { View, Pressable, Text } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';

export default function SegmentedButtons({ value, onValueChange, buttons, style, className }) {
  const { resolvedScheme } = useThemeMode();
  const primaryColor = colors[resolvedScheme].primary;
  return (
    <View
      style={style}
      className={cn('flex-row rounded-full border border-primary dark:border-primary-dark overflow-hidden', className)}
    >
      {buttons.map((b, i) => {
        const active = b.value === value;
        return (
          <Pressable
            key={b.value}
            onPress={() => onValueChange(b.value)}
            className={cn(
              'flex-1 flex-row items-center justify-center py-2 px-2',
              active && 'bg-primary dark:bg-primary-dark',
              i > 0 && 'border-l border-primary dark:border-primary-dark'
            )}
          >
            {!!b.icon && (
              <Icon name={b.icon} size={16} color={active ? '#fff' : primaryColor} className="mr-1" />
            )}
            {!!b.dotColor && (
              <View
                style={{ backgroundColor: b.dotColor }}
                className={cn('w-2.5 h-2.5 rounded-full mr-1.5', active && 'border border-white')}
              />
            )}
            <Text numberOfLines={1} className={active ? 'text-white' : 'text-primary dark:text-primary-dark'}>{b.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
