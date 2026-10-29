import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

// Geometric marks drawn in-app (not scraped trademark assets).
// Bizum color from public Bizum Rules brand guide: primary #05C0C7.

export function BizumMark({ size = 22, color = '#fff' }) {
  // Stylized “B” + diagonal slash (Bizum-inspired, original geometry).
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        d="M7 4.5h6.2c2.6 0 4.3 1.5 4.3 3.6 0 1.5-.9 2.7-2.3 3.2 1.7.5 2.8 1.9 2.8 3.7 0 2.4-1.9 4-4.8 4H7V4.5zm3.1 2.3v3.4h2.8c1.1 0 1.8-.6 1.8-1.7s-.7-1.7-1.8-1.7H10.1zm0 5.6v3.8h3.2c1.3 0 2.1-.7 2.1-1.9s-.8-1.9-2.1-1.9h-3.2z"
        fill={color}
      />
      <Path d="M5.2 18.8l13.6-13.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function CardMark({ size = 22, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x={3} y={6} width={18} height={12} rx={2.2} fill={color} />
      <Rect x={3} y={9.2} width={18} height={2.4} fill="rgba(0,0,0,0.22)" />
      <Rect x={6} y={14} width={5.5} height={1.6} rx={0.6} fill="rgba(0,0,0,0.28)" />
    </Svg>
  );
}

export function CashMark({ size = 22, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x={2.5} y={7} width={19} height={10} rx={2} fill={color} />
      <Circle cx={12} cy={12} r={2.6} fill="rgba(0,0,0,0.28)" />
      <Circle cx={5.8} cy={12} r={1.1} fill="rgba(0,0,0,0.2)" />
      <Circle cx={18.2} cy={12} r={1.1} fill="rgba(0,0,0,0.2)" />
    </Svg>
  );
}

export function UnpaidMark({ size = 22, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
        <Circle cx={12} cy={12} r={8.2} />
        <Path d="M9 9l6 6M15 9l-6 6" />
      </G>
    </Svg>
  );
}

const ICONS = {
  bizum: BizumMark,
  tarjeta: CardMark,
  efectivo: CashMark,
  no_pagado: UnpaidMark,
};

export function PaymentMethodIcon({ methodValue, size = 22, color = '#fff' }) {
  const Comp = ICONS[methodValue];
  if (!Comp) return null;
  return <Comp size={size} color={color} />;
}
