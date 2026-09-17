import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';

export default function Input({
  label,
  left,
  right,
  onRightPress,
  error,
  style,
  className,
  inputClassName,
  ...rest
}) {
  return (
    <View style={style} className={cn('mb-1', className)}>
      {!!label && (
        <Text className="mb-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{label}</Text>
      )}
      <View
        className={cn(
          'flex-row items-center border rounded-2xl px-3',
          error ? 'border-error dark:border-error-dark' : 'border-border dark:border-border-dark'
        )}
      >
        {!!left && <Icon name={left} size={20} className="mr-2" />}
        <TextInput
          placeholderTextColor="#79747E"
          className={cn('flex-1 py-2.5 text-onSurface dark:text-onSurface-dark', inputClassName)}
          {...rest}
        />
        {!!right && (
          <Pressable onPress={onRightPress} hitSlop={8}>
            <Icon name={right} size={20} className="ml-2" />
          </Pressable>
        )}
      </View>
      {!!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}
    </View>
  );
}
