import React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';

function Card({ children, style, className, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress && ((e) => { haptics.light(); onPress(e); })}
      style={style}
      className={cn('rounded-2xl bg-surface dark:bg-surface-dark shadow-sm dark:border dark:border-border-dark overflow-hidden', onPress && 'active:opacity-90', className)}
    >
      {children}
    </Wrapper>
  );
}

Card.Content = ({ children, style, className }) => (
  <View style={style} className={cn('p-4', className)}>
    {children}
  </View>
);

Card.Actions = ({ children, style, className }) => (
  <View style={style} className={cn('flex-row justify-end p-2 gap-2', className)}>
    {children}
  </View>
);

export default Card;
