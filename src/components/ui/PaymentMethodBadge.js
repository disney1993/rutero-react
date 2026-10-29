import React from 'react';
import { View, Text } from 'react-native';
import { getPaymentMethodColor } from '../../utils/paymentMethods';

/** Compact badge without SVG (safe for list screens / Home-adjacent imports). */
export default function PaymentMethodBadge({ method, themeColors, size = 'sm' }) {
  if (!method) return null;
  const bg = getPaymentMethodColor(method, themeColors);
  const pad = size === 'sm' ? 'rounded px-1 py-0.5' : 'rounded-lg px-1.5 py-1';
  const textClass = size === 'sm' ? 'text-[9px]' : 'text-xs';
  return (
    <View style={{ backgroundColor: bg }} className={`${pad} flex-row items-center`}>
      <Text className={`${textClass} font-bold text-white`}>{method.code}</Text>
    </View>
  );
}
