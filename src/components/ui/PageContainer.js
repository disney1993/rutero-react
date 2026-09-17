import React from 'react';
import { View } from 'react-native';
import { cn } from './cn';

export default function PageContainer({ children, className, ...rest }) {
  return (
    <View className={cn('w-full max-w-5xl self-center px-4 md:px-8', className)} {...rest}>
      {children}
    </View>
  );
}
