import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import { cn } from './cn';

/**
 * Confirmación dentro de un diálogo ya abierto. Abrir el diálogo global de
 * confirmación (useConfirm) encima de otro Modal no es fiable: en web queda
 * oculto y en iOS presentar un modal sobre otro puede fallar.
 */
export default function InlineConfirm({ title, message, confirmLabel, destructive = false, loading = false, onConfirm, onCancel, className }) {
  const { t } = useTranslation();
  return (
    <View
      className={cn(
        'rounded-2xl px-3 py-3 border',
        destructive ? 'border-error/40 bg-error/5 dark:border-error-dark/40' : 'border-primary/40 bg-primary/5 dark:border-primary-dark/40',
        className
      )}
      accessibilityLiveRegion="polite"
    >
      {!!title && <Text className="font-bold mb-1 text-onSurface dark:text-onSurface-dark">{title}</Text>}
      {!!message && <Text className="text-sm mb-2 text-onSurface dark:text-onSurface-dark">{message}</Text>}
      <View className="flex-row justify-end gap-2">
        <Button mode="text" onPress={onCancel} disabled={loading}>{t('common.cancel')}</Button>
        <Button
          mode="contained"
          onPress={onConfirm}
          loading={loading}
          disabled={loading}
          className={destructive ? 'bg-error dark:bg-error-dark' : undefined}
        >
          {confirmLabel || t('common.confirm')}
        </Button>
      </View>
    </View>
  );
}
