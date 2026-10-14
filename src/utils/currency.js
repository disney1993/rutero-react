export const CURRENCY_SYMBOLS = { EUR: '€', USD: '$' };

// Precio/km propuesto cuando el usuario no ha configurado el suyo. Algo por
// encima de la mediana de las tarifas interurbanas de taxi por comunidad
// (1,40 €/km de trayecto) porque el precio sugerido es solo distancia ×
// precio/km, sin bajada de bandera, mínimos, esperas ni recargos nocturnos.
// Debe coincidir con rutero-api, config/taxi_tariffs.php.
export const DEFAULT_PRICE_PER_KM = 1.5;

export function roundToNearest5(amount) {
  return Math.round(amount / 5) * 5;
}

export function formatCurrency(amount, currency = 'EUR') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const value = Number(amount).toFixed(amount % 1 === 0 ? 0 : 2);
  return currency === 'USD' ? `${symbol}${value}` : `${value} ${symbol}`;
}
