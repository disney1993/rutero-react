import React from 'react';
import { Pressable, Text } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';

export default function FAB({ icon, label, onPress, style, className }) {
  return (
    <Pressable
      onPress={(e) => { haptics.medium(); onPress?.(e); }}
      style={style}
      className={cn(
        'absolute bottom-6 right-6 bg-primary dark:bg-primary-dark rounded-full items-center justify-center shadow-lg flex-row active:scale-95 active:opacity-90',
        label ? 'px-5 h-14' : 'w-14 h-14',
        className
      )}
    >
      <Icon name={icon} size={24} color="#fff" />
      {!!label && <Text className="text-white font-medium ml-2">{label}</Text>}
    </Pressable>
  );
}
