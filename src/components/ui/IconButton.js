import React from 'react';
import { Pressable } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';

export default function IconButton({ icon, size = 24, onPress, disabled = false, iconColor, style, className }) {
  return (
    <Pressable
      onPress={onPress && ((e) => { haptics.light(); onPress(e); })}
      disabled={disabled}
      hitSlop={8}
      style={style}
      className={cn('items-center justify-center rounded-full p-2 active:bg-black/10 dark:active:bg-white/10', disabled && 'opacity-40', className)}
    >
      <Icon name={icon} size={size} color={iconColor} />
    </Pressable>
  );
}
