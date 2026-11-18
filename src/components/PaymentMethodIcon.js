import React from 'react';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { Icon } from 'react-native-paper';

/** Bizum corporate teal. */
export const BIZUM_COLOR = '#00AEB1';

/**
 * Bizum mark: stylized “%” (diagonal capsule + two dots).
 * Recreates the public brand glyph for UI chips; not an official asset file.
 */
export function BizumIcon({ size = 18, color = BIZUM_COLOR }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <G fill={color}>
        <Circle cx="7.2" cy="6.8" r="3.1" />
        <Circle cx="16.8" cy="17.2" r="3.1" />
        <Rect
          x="4.2"
          y="10.35"
          width="15.6"
          height="3.3"
          rx="1.65"
          transform="rotate(-38 12 12)"
        />
      </G>
    </Svg>
  );
}

/** Paper Icon source for payment methods (string MCI name or Bizum SVG). */
export function paymentMethodIconSource(method) {
  if (method?.icon === 'bizum' || method?.value === 'bizum') {
    return ({ size, color }) => <BizumIcon size={size} color={color} />;
  }
  return method?.icon || 'cash';
}

export function PaymentMethodIcon({ method, size = 18, color }) {
  const tint = color || method?.color || '#666';
  return <Icon source={paymentMethodIconSource(method)} size={size} color={tint} />;
}
