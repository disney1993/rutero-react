export const CURRENT_YEAR = new Date().getFullYear();
export const MIN_YEAR = CURRENT_YEAR;
export const MAX_YEAR = CURRENT_YEAR + 10;

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
  const t = typeof ruta.trip_time === 'string' ? ruta.trip_time : ruta.trip_time == null ? null : String(ruta.trip_time);
  if (!t) return null;
  // Prefer HH from HH:MM…; ignore ISO dates accidentally passed as time.
  const m = t.match(/^(\d{1,2}):/);
  if (!m) return null;
  return Number(m[1]);
}
