export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export const STATUS_COLORS = {
  pending: '#FFA726',
  completed: '#66BB6A',
  rejected: '#EF5350',
  cancelled: '#78909C',
};

export function statusLabel(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
}

// Fecha de "hoy" en el calendario local del dispositivo (no UTC): usar
// toISOString() aquí convertiría a UTC y, en husos horarios positivos
// (p. ej. España), devolvería el día de ayer cerca de la medianoche.
export function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// La aritmética se hace anclada en UTC (no en hora local) para que sumar/restar
// días no dependa del huso horario del dispositivo: mezclar un parseo en hora
// local con una salida toISOString() (UTC) hacía que, en husos horarios
// positivos, avanzar un día no moviera la fecha y retroceder saltara dos.
export function shiftDate(iso, deltaDays) {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function formatDateHuman(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Refleja exactamente la regla de RutaController@update (rutero-api): el
// dueño (u owner_id) puede todo; cualquier otro que sea el conductor
// asignado solo puede tocar estado/pago/precio final/notas, nunca los
// datos del viaje, y solo puede borrar si además fue quien la creó; nadie
// más puede hacer nada. Única fuente de verdad para mostrar permisos en la
// UI (p. ej. en la búsqueda de "Jornada").
export function getDriverPermissions(ruta, user) {
  if (!user) return { canEditFull: false, canChangeStatusPayment: false, canDelete: false };
  if (user.is_admin || ruta.owner_id === user.id) {
    return { canEditFull: true, canChangeStatusPayment: true, canDelete: true };
  }
  if (ruta.driver_id === user.id) {
    return { canEditFull: false, canChangeStatusPayment: true, canDelete: ruta.created_by === user.id };
  }
  return { canEditFull: false, canChangeStatusPayment: false, canDelete: false };
}
