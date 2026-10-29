import { isValidHexColor } from './validators';

// Soft pastel swatches for avatar UI (ColorPickerField modal + random pick).
// Free hex is also allowed; these are suggestions only.
export const AVATAR_PALETTE = [
  '#F48FB1', '#CE93D8', '#B39DDB', '#9FA8DA',
  '#90CAF9', '#81D4FA', '#80DEEA', '#80CBC4',
  '#A5D6A7', '#C5E1A5', '#FFE082', '#FFCC80',
  '#FFAB91', '#BCAAA4', '#B0BEC5',
];

// Swatches for ColorPickerField (storeAsHex): same tones as AVATAR_PALETTE.
export const AVATAR_COLOR_SWATCHES = AVATAR_PALETTE.map((hex) => ({ name: hex, hex }));

export const DEFAULT_AVATAR_COLOR = '#B0BEC5';

// Deterministic vehicle fallback when a car has no colour of its own.
// Kept separate so avatar pastels do not change vehicle list colours.
const VEHICLE_FALLBACK_PALETTE = [
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

/** Stored color or client fallback when older users have no avatar_color. */
export function resolveAvatarColor(color) {
  return isValidHexColor(color || '') ? color : DEFAULT_AVATAR_COLOR;
}

// Color determinístico por vehículo: el mismo coche siempre tiene el mismo
// color en toda la app, para poder identificarlo de un vistazo en listados.
// Se usa solo como último recurso cuando el vehículo no tiene color propio.
export function getVehicleColor(vehicleId) {
  if (!vehicleId) return null;
  return VEHICLE_FALLBACK_PALETTE[vehicleId % VEHICLE_FALLBACK_PALETTE.length];
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
