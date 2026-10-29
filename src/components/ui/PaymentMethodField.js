import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';
import {
  PAYMENT_METHODS,
  getPaymentMethod,
  getPaymentMethodColor,
} from '../../utils/paymentMethods';
import { PaymentMethodIcon } from './PaymentMethodIcons';
import PaymentMethodBadge from './PaymentMethodBadge';

export { PAYMENT_METHODS, getPaymentMethod, getPaymentMethodColor, PaymentMethodBadge };

function Chip({ method, color, selected, onPress, compact }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={method.label}
      className={cn('items-center', compact ? 'mr-1.5 mb-1 w-11' : 'mr-2 mb-1.5 w-14')}
    >
      <View
        style={{ backgroundColor: color }}
        className={cn(
          'rounded-xl items-center justify-center border-2',
          compact ? 'w-10 h-8' : 'w-12 h-9',
          selected ? 'border-onSurface dark:border-onSurface-dark' : 'border-transparent'
        )}
      >
        <PaymentMethodIcon methodValue={method.value} size={compact ? 18 : 20} color="#fff" />
      </View>
      {!compact && (
        <Text numberOfLines={1} className="text-[10px] mt-0.5 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          {method.label}
        </Text>
      )}
    </Pressable>
  );
}

export default function PaymentMethodField({ label, value, onChange, className, compact = false }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const matched = getPaymentMethod(value);
  // Legacy stored values (e.g. "transferencia") still render without breaking.
  const isLegacyValue = !!value && !matched;

  return (
    <View className={className}>
      {!!label && (
        <View className={cn('flex-row items-center justify-between', compact ? 'mb-0.5' : 'mb-1')}>
          <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark" numberOfLines={1}>
            {label}
          </Text>
          {!!value && (
            <Pressable onPress={() => onChange('')}>
              <Text className="text-xs text-primary dark:text-primary-dark">{t('common.remove')}</Text>
            </Pressable>
          )}
        </View>
      )}
      <View className="flex-row flex-wrap">
        {PAYMENT_METHODS.map((m) => (
          <Chip
            key={m.value}
            method={m}
            color={getPaymentMethodColor(m, themeColors)}
            selected={matched?.value === m.value}
            onPress={() => onChange(m.value)}
            compact={compact}
          />
        ))}
        {isLegacyValue && (
          <View className={cn('items-center', compact ? 'mr-1.5 mb-1 w-11' : 'mr-2 mb-1.5 w-14')}>
            <View
              className={cn(
                'rounded-xl items-center justify-center bg-surfaceDisabled dark:bg-surfaceDisabled-dark',
                compact ? 'w-10 h-8' : 'w-12 h-9'
              )}
            >
              <Text numberOfLines={1} className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark font-bold text-xs">
                {value.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            {!compact && (
              <Text numberOfLines={1} className="text-[10px] mt-0.5 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {value}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
