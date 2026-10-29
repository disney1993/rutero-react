import React from 'react';
import { View } from 'react-native';
import { cn } from './cn';

export default function PageContainer({ children, className, ...rest }) {
  return (
    <View className={cn('w-full max-w-5xl self-center px-3 md:px-6', className)} {...rest}>
      {children}
    </View>
  );
}
