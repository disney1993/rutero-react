import React from 'react';
import { Modal, Pressable, View, Text } from 'react-native';
import { cn } from './cn';

function Dialog({ visible, onDismiss, children, dismissable = true, contentClassName, contentStyle }) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-4"
        onPress={dismissable ? onDismiss : undefined}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[{ maxWidth: 448 }, contentStyle]}
          className={cn('w-full bg-surface dark:bg-surface-dark rounded-2xl p-4', contentClassName)}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

Dialog.Title = ({ children, className }) => (
  <Text className={cn('text-lg font-semibold mb-2 text-onSurface dark:text-onSurface-dark', className)}>
    {children}
  </Text>
);

Dialog.Content = ({ children, className }) => <View className={cn('mb-4', className)}>{children}</View>;

Dialog.Actions = ({ children, className }) => (
  <View className={cn('flex-row justify-end gap-2', className)}>{children}</View>
);

export default Dialog;
