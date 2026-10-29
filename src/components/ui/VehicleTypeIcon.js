import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import i18n from '../../i18n';

// Siluetas laterales (frontal a la derecha) en un viewBox de 64x32.
// `body` es la carrocería, `windows` las lunas (se "recortan" pintándolas con
// el color de fondo) y `wheels` las coordenadas X de las ruedas.
//
// Tipos básicos con la nomenclatura de la ficha técnica (DGT / Directiva
// 2007/46/CE): para turismos (categoría M1) la denominación de carrocería
// (AA berlina, AB berlina con portón trasero, AF vehículo de uso múltiple)
// y la categoría todoterreno; para motos (categoría L) y camiones
// (categoría N) un tipo genérico por categoría. `group` agrupa el desplegable.
// Las claves (`value`) son las que se guardan en vehicles.vehicle_type y
// coinciden con las que ya genera el seeder de rutero-api.
export const VEHICLE_TYPES = [
  {
    value: 'compacto',
    group: 'M1',
    body: 'M8 24V15Q8 12 11 11L17 6Q18 5 20 5H34Q36 5 38 7L43 11L52 13Q56 14 56 18V24Z',
    windows: 'M18.5 7.5L14.5 11H26V7.5ZM28 7.5V11H40L37 8Q36.5 7.5 35.5 7.5Z',
    wheels: [17, 46],
  },
  {
    value: 'sedan',
    group: 'M1',
    body: 'M4 24V18Q4 15 7 14L16 13L23 6Q24 5 26 5H38Q40 5 42 7L47 12L56 14Q60 15 60 19V24Z',
    windows: 'M24.5 7.5L19.5 12H31V7.5ZM33 7.5V12H44L40.5 8Q40 7.5 39 7.5Z',
    wheels: [15, 49],
  },
  {
    value: 'monovolumen',
    group: 'M1',
    aliases: ['familiar', 'furgoneta', 'ranchera'],
    body: 'M5 24V8Q5 4 9 4H34Q37 4 40 6L53 13Q59 14 59 18V24Z',
    windows: 'M8 6.5V12H19V6.5ZM21 6.5V12H31V6.5ZM33 6.5V12H47L39 7Q38 6.5 37 6.5Z',
    wheels: [15, 48],
  },
  {
    value: 'suv',
    group: 'M1',
    body: 'M5 23V9Q5 4 10 4H38Q41 4 43 6L48 11L56 12.5Q60 13.5 60 17V23Z',
    windows: 'M8 6.5V11H22V6.5ZM24 6.5V11H35V6.5ZM37 6.5V11H45L41.5 7Q41 6.5 40 6.5Z',
    wheels: [16, 49],
    wheelR: 5,
    wheelY: 24,
  },
  {
    value: 'motocicleta',
    group: 'L',
    aliases: ['moto', 'ciclomotor', 'scooter'],
    body:
      'M8 16Q8 13 11 13H22L26 10H37Q40 10 41 12L43 15H38L35 22H25L21 17H10Z' +
      'M42 6H47L48 8L46 9L52 23L49.5 24L43.5 10L41 9Z' +
      'M14 23L25 19L26 21L15 25Z',
    wheels: [14, 50],
    wheelR: 6,
  },
  {
    value: 'camion',
    group: 'N',
    aliases: ['camión', 'furgon', 'furgón'],
    body: 'M3 3H40V20H3ZM3 20.5H42V24H3ZM42 24V9Q42 7 44 7H52Q54 7 55 9L59 15Q60 16 60 18V24Z',
    windows: 'M45 9.5V14H56L53 10Q52.5 9.5 51.5 9.5Z',
    wheels: [11, 21, 51],
  },
// Nombre y descripción traducidos (getters: se leen con el idioma activo).
].map((t) => Object.defineProperties(t, {
  label: { get: () => i18n.t(`vehicleTypes.${t.value}.label`), enumerable: true },
  hint: { get: () => i18n.t(`vehicleTypes.${t.value}.hint`), enumerable: true },
}));

export const VEHICLE_TYPE_GROUPS = ['M1', 'L', 'N'].map((key) => ({
  key,
  get label() { return i18n.t(`vehicleTypes.groups.${key}`); },
}));

export function getVehicleType(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  return VEHICLE_TYPES.find((t) => t.value === key || t.aliases?.includes(key)) || null;
}

const TIRE_COLOR = '#2A2A2E';

// `color` pinta la carrocería (p. ej. el color elegido para el vehículo);
// `cutoutColor` debe ser el color del fondo sobre el que se dibuja (lunas,
// hueco de las ruedas y tapacubos). Con `outlineColor` se añade un contorno
// fino que no depende de la pintura, para que un coche blanco sobre fondo
// claro (o negro sobre oscuro) se siga distinguiendo; en ese modo las ruedas
// se pintan como neumáticos oscuros en vez de con el color de la carrocería.
export default function VehicleTypeIcon({ type, size = 48, color = '#007AFF', cutoutColor = '#FFFFFF', outlineColor }) {
  const def = typeof type === 'string' ? getVehicleType(type) : type;
  const shape = def || VEHICLE_TYPES[0];
  const r = shape.wheelR ?? 4.5;
  const cy = shape.wheelY ?? 24;
  // ~1 px en pantalla sea cual sea el tamaño (el viewBox mide 64 de ancho).
  const sw = outlineColor ? (1.1 * 64) / size : 0;
  const stroke = outlineColor ? { stroke: outlineColor, strokeWidth: sw, strokeLinejoin: 'round' } : {};
  const tireColor = outlineColor ? TIRE_COLOR : color;
  return (
    <Svg width={size} height={size / 2} viewBox="-1 -1 66 34" opacity={def ? 1 : 0.35}>
      <Path d={shape.body} fill={color} {...stroke} />
      {!!shape.windows && <Path d={shape.windows} fill={cutoutColor} opacity={0.9} {...stroke} strokeWidth={sw * 0.8} />}
      {shape.wheels.map((cx) => (
        <React.Fragment key={cx}>
          <Circle cx={cx} cy={cy} r={r + 1.6} fill={cutoutColor} />
          <Circle cx={cx} cy={cy} r={r} fill={tireColor} {...stroke} />
          <Circle cx={cx} cy={cy} r={r * 0.38} fill={cutoutColor} />
        </React.Fragment>
      ))}
    </Svg>
  );
}
