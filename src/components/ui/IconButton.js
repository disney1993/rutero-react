import React from 'react';
import { Pressable } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';

export default function IconButton({ icon, size = 24, onPress, disabled = false, iconColor, style, className }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={style}
      className={cn('items-center justify-center rounded-full p-2', disabled && 'opacity-40', className)}
    >
      <Icon name={icon} size={size} color={iconColor ?? '#49454F'} />
    </Pressable>
  );
}
