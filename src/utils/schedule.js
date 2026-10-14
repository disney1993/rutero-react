export const CURRENT_YEAR = new Date().getFullYear();
export const MIN_YEAR = CURRENT_YEAR;
export const MAX_YEAR = CURRENT_YEAR + 10;

import { LocaleConfig } from 'react-native-calendars';

// Nombres de los meses en el idioma activo (configurados en src/i18n).
export function monthNames() {
  const names = LocaleConfig.locales[LocaleConfig.defaultLocale]?.monthNames || LocaleConfig.locales.es.monthNames;
  return names.map((n) => n.charAt(0).toUpperCase() + n.slice(1));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function ymd(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function monthRange(year, month) {
  const from = ymd(year, month, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const to = ymd(year, month, lastDay);
  return { from, to, lastDay };
}

export function partsFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function rutaHour(ruta) {
  if (!ruta.trip_time) return null;
  return Number(ruta.trip_time.slice(0, 2));
}
