import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';

// Colores identificativos + siglas de 2 letras: pensado para que, con el
// uso, la sigla sola (mostrada en las filas de rutas) baste para reconocer
// el método sin tener que leer la etiqueta completa cada vez.
// Bizum no tiene color fijo aquí: usa el color de marca de la app (primary
// del tema activo), resuelto en getPaymentMethodColor.
export const PAYMENT_METHODS = [
  { value: 'bizum', label: 'Bizum', code: 'PB', color: null },
  { value: 'tarjeta', label: 'Tarjeta', code: 'PT', color: '#2563EB' },
  { value: 'efectivo', label: 'Efectivo', code: 'PE', color: '#16A34A' },
  { value: 'no_pagado', label: 'No pagado', code: 'NP', color: '#D64545' },
];

export function getPaymentMethod(value) {
  return PAYMENT_METHODS.find((m) => m.value === value) || null;
}

// Color a pintar para un método de pago: el suyo propio, o el color de marca
// de la app si no tiene uno fijo (caso de Bizum).
export function getPaymentMethodColor(method, themeColors) {
  if (!method) return themeColors.surfaceDisabled;
  return method.color || themeColors.primary;
}

function Chip({ method, color, selected, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={method.label} className="items-center mr-2.5 mb-2 w-16">
      <View
        style={{ backgroundColor: color }}
        className={cn(
          'w-14 h-10 rounded-xl items-center justify-center border-2',
          selected ? 'border-onSurface dark:border-onSurface-dark' : 'border-transparent'
        )}
      >
        <Text className="text-white font-bold">{method.code}</Text>
      </View>
      <Text numberOfLines={1} className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
        {method.label}
      </Text>
    </Pressable>
  );
}

export default function PaymentMethodField({ label, value, onChange, className }) {
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const matched = getPaymentMethod(value);
  // Un valor guardado que ya no está en la lista (p. ej. "transferencia" de
  // antes de este selector): se muestra igual, sin romper nada.
  const isLegacyValue = !!value && !matched;

  return (
    <View className={className}>
      {!!label && (
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{label}</Text>
          {!!value && (
            <Pressable onPress={() => onChange('')}>
              <Text className="text-xs text-primary dark:text-primary-dark">Quitar</Text>
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
          />
        ))}
        {isLegacyValue && (
          <View className="items-center mr-2.5 mb-2 w-16">
            <View className="w-14 h-10 rounded-xl items-center justify-center bg-surfaceDisabled dark:bg-surfaceDisabled-dark">
              <Text numberOfLines={1} className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark font-bold text-xs">
                {value.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text numberOfLines={1} className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {value}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
