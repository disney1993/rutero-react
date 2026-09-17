import React from 'react';
import { Text } from 'react-native';
import { cn } from './cn';

export const BADGE_TONES = {
  secondary: 'bg-secondary/20 dark:bg-secondary-dark/20 text-secondary dark:text-secondary-dark',
  tertiary: 'bg-tertiary/20 dark:bg-tertiary-dark/20 text-tertiary dark:text-tertiary-dark',
  error: 'bg-error/20 dark:bg-error-dark/20 text-error dark:text-error-dark',
  neutral: 'bg-surfaceDisabled dark:bg-surfaceDisabled-dark text-onSurfaceVariant dark:text-onSurfaceVariant-dark',
};

export default function StatusBadge({ tone, children }) {
  return (
    <Text className={cn('text-[10px] rounded px-1.5 py-0.5 overflow-hidden self-start', BADGE_TONES[tone])}>
      {children}
    </Text>
  );
}
