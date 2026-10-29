import i18n from '../i18n';

// Brand colors + short codes for compact list badges.
// Bizum primary from public Bizum Rules (HEX #05C0C7).
export const PAYMENT_METHODS = [
  { value: 'bizum', code: 'BZ', color: '#05C0C7' },
  { value: 'tarjeta', code: 'PT', color: '#2563EB' },
  { value: 'efectivo', code: 'PE', color: '#16A34A' },
  { value: 'no_pagado', code: 'NP', color: '#D64545' },
].map((m) => Object.defineProperty(m, 'label', { get: () => i18n.t(`payment.${m.value}`), enumerable: true }));

export function getPaymentMethod(value) {
  return PAYMENT_METHODS.find((m) => m.value === value) || null;
}

export function getPaymentMethodColor(method, themeColors) {
  if (!method) return themeColors.surfaceDisabled;
  return method.color || themeColors.primary;
}
