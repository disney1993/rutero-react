import { isValidHexColor } from './validators';

// Debe coincidir con AvatarPalette::COLORS en rutero-api/app/Support/AvatarPalette.php
export const AVATAR_PALETTE = [
  '#EF5350', '#EC407A', '#AB47BC', '#7E57C2',
  '#5C6BC0', '#42A5F5', '#29B6F6', '#26C6DA',
  '#26A69A', '#66BB6A', '#9CCC65', '#FFA726',
  '#FF7043', '#8D6E63', '#78909C',
];

export function getInitials(firstName, lastName) {
  const a = (firstName || '').trim().charAt(0).toUpperCase();
  const b = (lastName || '').trim().charAt(0).toUpperCase();
  return `${a}${b}` || '?';
}

export function getRandomAvatarColor() {
  return AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
}

// Color determinístico por vehículo: el mismo coche siempre tiene el mismo
// color en toda la app, para poder identificarlo de un vistazo en listados.
// Se usa solo como último recurso cuando el vehículo no tiene color propio.
export function getVehicleColor(vehicleId) {
  if (!vehicleId) return null;
  return AVATAR_PALETTE[vehicleId % AVATAR_PALETTE.length];
}

// Color real del vehículo (el que el usuario eligió en ColorPickerField):
// puede ser el nombre de un color de la paleta ("Rojo") o un hex propio
// ("#RRGGBB"). Se usa para pintar el selector y el listado de rutas, para
// distinguir coches de un vistazo además de por la matrícula.
export function getVehicleSwatchColor(vehicle, carColorPalette) {
  if (!vehicle) return null;
  const raw = (vehicle.color || '').trim();
  if (isValidHexColor(raw)) return raw;
  const match = carColorPalette?.find((c) => c.name.toLowerCase() === raw.toLowerCase());
  if (match) return match.hex;
  return getVehicleColor(vehicle.id);
}
