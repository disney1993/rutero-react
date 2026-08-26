export const CURRENCY_SYMBOLS = { EUR: '€', USD: '$' };

export function roundToNearest5(amount) {
  return Math.round(amount / 5) * 5;
}

export function formatCurrency(amount, currency = 'EUR') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const value = Number(amount).toFixed(amount % 1 === 0 ? 0 : 2);
  return currency === 'USD' ? `${symbol}${value}` : `${value} ${symbol}`;
}
