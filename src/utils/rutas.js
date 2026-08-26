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

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
