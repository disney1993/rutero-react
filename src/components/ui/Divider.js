import React from 'react';
import { View } from 'react-native';
import { cn } from './cn';

export default function Divider({ style, className }) {
  return <View style={style} className={cn('h-px bg-border dark:bg-border-dark', className)} />;
}
