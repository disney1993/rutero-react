import React from 'react';
import { View, Pressable, Text } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';

export default function SegmentedButtons({
  value,
  onValueChange,
  buttons,
  style,
  className,
  compact = false,
  /** Shrink-to-content width (no flex-1 segments). Use for tiny type pickers. */
  inline = false,
}) {
  const { resolvedScheme } = useThemeMode();
  const { primary: primaryColor, onPrimary } = colors[resolvedScheme];
  return (
    <View
      style={style}
      className={cn(
        'flex-row rounded-full border border-primary dark:border-primary-dark overflow-hidden',
        inline && 'self-start',
        className
      )}
    >
      {buttons.map((b, i) => {
        const active = b.value === value;
        const isDisabled = !!b.disabled;
        return (
          <Pressable
            key={b.value}
            disabled={isDisabled}
            accessibilityState={{ disabled: isDisabled, selected: active }}
            accessibilityLabel={b.accessibilityLabel || b.label}
            accessibilityHint={b.accessibilityHint}
            onPress={() => {
              if (isDisabled || active) return;
              haptics.selection();
              onValueChange?.(b.value);
            }}
            className={cn(
              'flex-row items-center justify-center',
              !inline && 'flex-1',
              compact ? (inline ? 'py-0.5 px-2.5' : 'py-1 px-1.5') : 'py-2 px-2',
              active && 'bg-primary dark:bg-primary-dark',
              i > 0 && 'border-l border-primary dark:border-primary-dark',
              isDisabled && 'opacity-40'
            )}
          >
            {!!b.icon && (
              <Icon name={b.icon} size={compact ? 14 : 16} color={active ? onPrimary : primaryColor} className="mr-1" />
            )}
            {!!b.dotColor && (
              <View
                style={{ backgroundColor: b.dotColor }}
                className={cn(
                  'rounded-full mr-1.5',
                  compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
                  active && 'border border-onPrimary dark:border-onPrimary-dark'
                )}
              />
            )}
            <Text
              numberOfLines={1}
              className={cn(
                compact && 'text-xs',
                active ? 'text-onPrimary dark:text-onPrimary-dark font-semibold' : 'text-primary dark:text-primary-dark'
              )}
            >
              {b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
