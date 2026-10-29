import i18n from '../i18n';
import { isValidHexColor } from './validators';

// `name` is the stored value (Spanish, for existing data); `label` is translated.
function withLabel(c) {
  const key = c.name.toLowerCase().replace(/[\u00e1\u00e9\u00ed\u00f3\u00fa]/g, (ch) => 'aeiou'['\u00e1\u00e9\u00ed\u00f3\u00fa'.indexOf(ch)]);
  return Object.defineProperty(c, 'label', { get: () => i18n.t(`carColors.${key}`, { defaultValue: c.name }), enumerable: true });
}

export const CAR_COLOR_PALETTE = [
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Negro', hex: '#1C1C1C' },
  { name: 'Gris', hex: '#9E9E9E' },
  { name: 'Plata', hex: '#C7C7C7' },
  { name: 'Azul', hex: '#1565C0' },
  { name: 'Rojo', hex: '#D32F2F' },
  { name: 'Verde', hex: '#2E7D32' },
  { name: 'Amarillo', hex: '#FBC02D' },
  { name: 'Naranja', hex: '#EF6C00' },
].map(withLabel);

const RETIRED_CAR_COLORS = [
  { name: 'Marrón', hex: '#5D4037' },
  { name: 'Beige', hex: '#D7CCC8' },
].map(withLabel);

export const KNOWN_CAR_COLORS = [...CAR_COLOR_PALETTE, ...RETIRED_CAR_COLORS];

const findByName = (list, value) => list.find((c) => c.name.toLowerCase() === (value || '').trim().toLowerCase());

/** Hex for a stored color name or #RRGGBB, or null. */
export function carColorToHex(value) {
  if (isValidHexColor(value || '')) return value;
  return findByName(KNOWN_CAR_COLORS, value)?.hex || null;
}
