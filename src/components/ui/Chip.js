import React from 'react';
import { View, Text } from 'react-native';
import { cn } from './cn';

export default function Chip({ children, compact = false, style, textStyle, className, textClassName }) {
  return (
    <View
      style={style}
      className={cn(
        'rounded-full bg-surfaceDisabled dark:bg-surfaceDisabled-dark self-start',
        compact ? 'px-2 py-0.5' : 'px-3 py-1',
        className
      )}
    >
      <Text style={textStyle} className={cn('text-xs text-onSurface dark:text-onSurface-dark', textClassName)}>
        {children}
      </Text>
    </View>
  );
}
