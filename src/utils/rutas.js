export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const STATUS_COLORS = {
  pending: '#E8A054',
  completed: '#3DAB7E',
  cancelled: '#7A8794',
  rejected: '#EF5350',
};

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo', color: '#2E9E6B', icon: 'cash' },
  { value: 'tarjeta', label: 'Tarjeta', color: '#1E6BB8', icon: 'credit-card-outline' },
  { value: 'bizum', label: 'Bizum', color: '#00AEB1', icon: 'bizum' },
];

export const DEFAULT_PAYMENT_METHOD = 'efectivo';

export const PAYMENT_COLORS = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.color])
);

/** Map legacy / unknown values to the current set. */
export function normalizePaymentMethod(value) {
  if (value === 'transferencia') return 'bizum';
  if (PAYMENT_METHODS.some((m) => m.value === value)) return value;
  return DEFAULT_PAYMENT_METHOD;
}

export function statusLabel(status) {
  if (status === 'rejected') return 'Cancelado';
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
}

/** Normaliza estados legacy al set actual de 3. */
export function normalizeStatus(status) {
  if (status === 'rejected') return 'cancelled';
  if (STATUS_OPTIONS.some((s) => s.value === status)) return status;
  return 'pending';
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Hora local HH:MM redondeada a múltiplos de 5 (igual que el TimePicker). */
export function nowTimeRounded() {
  const now = new Date();
  const mins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const m = mins.reduce((closest, cur) => (
    Math.abs(cur - now.getMinutes()) < Math.abs(closest - now.getMinutes()) ? cur : closest
  ), 0);
  let h = now.getHours();
  let minute = m;
  if (Math.abs(55 - now.getMinutes()) < Math.abs(m - now.getMinutes()) && now.getMinutes() >= 58) {
    // cerca de la hora siguiente
  }
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function shiftDate(iso, deltaDays) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function formatDateHuman(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Compact date for dense form fields. */
export function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minimum trip duration stored / shown (minutes). Never null below this. */
export const MIN_TRIP_DURATION_MIN = 15;

/**
 * First whitespace-separated token, or fallback if empty.
 */
export function firstWord(value, fallback = '') {
  if (value == null || String(value).trim() === '') return fallback;
  return String(value).trim().split(/\s+/).filter(Boolean)[0] || fallback;
}

/**
 * Compact client label for calendar chips: first word only.
 * "Ana López" → "Ana" | "María" → "María"
 */
export function shortClientName(name) {
  return firstWord(name, 'Sin cliente');
}

/**
 * Compact place for calendar: first word + optional 2nd word (3 letters).
 * Uses the segment before the first comma (city), then:
 * "Madrid, España" → "Madrid"
 * "San Sebastián, España" → "San Seb"
 */
export function shortPlaceName(value) {
  if (value == null || String(value).trim() === '') return '';
  const city = String(value).split(',')[0].trim();
  const parts = city.split(/\s+/).filter(Boolean).map((p) => p.replace(/[^\p{L}\p{N}-]/gu, ''));
  const clean = parts.filter(Boolean);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];
  return `${clean[0]} ${clean[1].slice(0, 3)}`;
}

/**
 * Prefer Google/OSRM duration; else estimate from km (~40 km/h).
 * Always returns at least MIN_TRIP_DURATION_MIN.
 */
export function resolveDurationMin({ durationFromApi, distanceKm } = {}) {
  let mins = null;
  const fromApi = Number(durationFromApi);
  if (durationFromApi != null && durationFromApi !== '' && !Number.isNaN(fromApi) && fromApi > 0) {
    mins = Math.round(fromApi);
  } else {
    const km = Number(distanceKm);
    if (distanceKm != null && distanceKm !== '' && !Number.isNaN(km) && km > 0) {
      mins = Math.round((km / 40) * 60);
    }
  }
  if (mins == null || Number.isNaN(mins) || mins < MIN_TRIP_DURATION_MIN) {
    return MIN_TRIP_DURATION_MIN;
  }
  return mins;
}

/** API may send trip_date as YYYY-MM-DD or ISO datetime. */
export function normalizeTripDate(value) {
  if (value == null || value === '') return '';
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
}

/** API may send HH:MM:SS, HH:MM, or null. */
export function normalizeTripTime(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}
