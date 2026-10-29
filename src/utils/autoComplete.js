// Cierre automático de viajes: lo ejecuta un cron en rutero-api
// (RutaAutoCompleter). Aquí solo se replica su fórmula para la vista previa
// del formulario ("se completará hacia las..."); en los listados manda el
// campo auto_complete_eta que devuelve el servidor.
//
// Una ruta pendiente se cierra con lo primero que ocurra:
//   1. empieza el siguiente viaje del mismo conductor/vehículo;
//   2. fin estimado = inicio + espera inicial + d + margen % de d + margen final.
//      Espera inicial: lo que suele tardar en arrancar el viaje (5-10 min).
//      Margen %: tráfico, que OSRM no conoce. Margen final: bajada y cobro.

import i18n from '../i18n';

export const AUTO_COMPLETE_DEFAULTS = {
  start_delay_min: 10,
  margin_min: 5,
  margin_pct: 10,
  default_duration_min: 60,
  fallback_speed_kmh: 50,
};

export function autoCompleteEnabled(user) {
  return user?.auto_complete_enabled !== false;
}

function settings(user) {
  return {
    start_delay_min: user?.auto_complete_start_delay_min ?? AUTO_COMPLETE_DEFAULTS.start_delay_min,
    margin_min: user?.auto_complete_margin_min ?? AUTO_COMPLETE_DEFAULTS.margin_min,
    margin_pct: user?.auto_complete_margin_pct ?? AUTO_COMPLETE_DEFAULTS.margin_pct,
    default_duration_min: user?.auto_complete_default_duration_min ?? AUTO_COMPLETE_DEFAULTS.default_duration_min,
  };
}

export function estimateDurationMin({ estimated_duration_min, estimated_distance_km }, user) {
  if (Number(estimated_duration_min) > 0) return Number(estimated_duration_min);
  const km = Number(estimated_distance_km);
  if (km > 0) return Math.ceil((km / AUTO_COMPLETE_DEFAULTS.fallback_speed_kmh) * 60);
  return settings(user).default_duration_min;
}

// Minutos que pasan desde el inicio hasta el cierre automático.
export function autoCompleteOffsetMin(ruta, user) {
  const { start_delay_min, margin_min, margin_pct } = settings(user);
  const d = estimateDurationMin(ruta, user);
  return start_delay_min + d + Math.ceil((d * margin_pct) / 100) + margin_min;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatMinutes(total) {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

// Texto "HH:MM" (o "HH:MM del día siguiente") para el formulario de ruta.
export function previewAutoCompleteTime(form, user) {
  if (!form.trip_time) return null;
  const [h, m] = form.trip_time.split(':').map(Number);
  const total = h * 60 + m + autoCompleteOffsetMin(form, user);
  const time = formatMinutes(total);
  return total >= 1440 ? i18n.t('autoComplete.nextDay', { time }) : time;
}

// auto_complete_eta llega como "YYYY-MM-DDTHH:MM" en hora local de España.
export function formatEta(eta, tripDate) {
  if (!eta) return null;
  const [date, time] = eta.split('T');
  if (!tripDate || date === tripDate) return time;
  const [, month, day] = date.split('-');
  return `${time} (${day}/${month})`;
}

/** Minutes from now until ETA (negative if overdue). Null if unparseable. */
export function minutesUntilEta(eta) {
  if (!eta || typeof eta !== 'string') return null;
  const [date, time] = eta.split('T');
  if (!date || !time) return null;
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  if (![y, mo, d, h, mi].every((n) => Number.isFinite(n))) return null;
  const etaMs = new Date(y, mo - 1, d, h, mi || 0).getTime();
  return (etaMs - Date.now()) / 60000;
}

/** List hint: only when pending and ETA is within `withinMin` (default 15). */
export function isEtaSoon(eta, withinMin = 15) {
  const mins = minutesUntilEta(eta);
  return mins != null && mins <= withinMin;
}

export function formatDuration(min) {
  if (min < 60) return i18n.t('duration.min', { min });
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? i18n.t('duration.hMin', { h, m }) : i18n.t('duration.h', { h });
}
