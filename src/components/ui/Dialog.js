import React from 'react';
import { Modal, Pressable, View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { cn } from './cn';
import i18n from '../../i18n';

// El fondo oscuro es una capa hermana DETRÁS del contenido (no su padre):
// si el contenido estuviera dentro de un Pressable, este se quedaría con el
// toque al empezar a arrastrar sobre una zona sin inputs y el ScrollView
// interno nunca recibiría el gesto (solo se podía hacer scroll con la rueda
// del ratón o empezando el arrastre sobre un input).
function Dialog({ visible, onDismiss, children, dismissable = true, contentClassName, contentStyle }) {
  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 items-center justify-center px-4"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          className="bg-black/40 dark:bg-black/70"
          onPress={dismissable ? onDismiss : undefined}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('common.close')}
        />
        <View
          style={[{ maxWidth: 448 }, contentStyle]}
          className={cn('w-full bg-surface dark:bg-surface-dark dark:border dark:border-border-dark rounded-3xl p-4', contentClassName)}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

Dialog.Title = ({ children, className }) => (
  <Text className={cn('text-xl font-bold tracking-tight mb-1 text-onSurface dark:text-onSurface-dark', className)}>
    {children}
  </Text>
);

Dialog.Content = ({ children, className }) => <View className={cn('mb-2', className)}>{children}</View>;

Dialog.Actions = ({ children, className }) => (
  <View className={cn('flex-row justify-end gap-2', className)}>{children}</View>
);

export default Dialog;
