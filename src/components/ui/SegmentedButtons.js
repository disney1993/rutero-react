import React from 'react';
import { View, Pressable, Text } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';

export default function SegmentedButtons({ value, onValueChange, buttons, style, className }) {
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
              <Icon name={b.icon} size={16} color={active ? '#fff' : '#4F46E5'} className="mr-1" />
            )}
            <Text className={active ? 'text-white' : 'text-primary dark:text-primary-dark'}>{b.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
