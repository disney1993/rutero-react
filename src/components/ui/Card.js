import React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from './cn';

function Card({ children, style, className, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={style}
      className={cn('rounded-2xl bg-surface dark:bg-surface-dark shadow-sm overflow-hidden', className)}
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
