import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';

const MODE_CONTAINER = {
  contained: 'bg-primary dark:bg-primary-dark',
  outlined: 'border border-primary dark:border-primary-dark bg-transparent',
  text: 'bg-transparent',
};

const MODE_TEXT = {
  contained: 'text-white',
  outlined: 'text-primary dark:text-primary-dark',
  text: 'text-primary dark:text-primary-dark',
};

export default function Button({
  mode = 'contained',
  onPress,
  loading = false,
  disabled = false,
  icon,
  compact = false,
  style,
  contentStyle,
  className,
  textClassName,
  children,
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={style}
      className={cn(
        'flex-row items-center justify-center rounded-full',
        compact ? 'px-3 py-1.5' : 'px-6 py-2.5',
        MODE_CONTAINER[mode],
        isDisabled && 'opacity-50',
        className
      )}
    >
      <>
        {loading && (
          <ActivityIndicator
            size="small"
            color={mode === 'contained' ? '#fff' : '#4F46E5'}
            style={{ marginRight: 8 }}
          />
        )}
        {!loading && icon && <Icon name={icon} size={18} color={mode === 'contained' ? '#fff' : '#4F46E5'} className="mr-2" />}
        <Text style={contentStyle} className={cn('font-medium', textClassName || MODE_TEXT[mode])}>
          {children}
        </Text>
      </>
    </Pressable>
  );
}
