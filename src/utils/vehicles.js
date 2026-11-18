/** Common fleet types + Material Community Icons (Paper). */
export const VEHICLE_TYPES = [
  { value: 'turismo', label: 'Turismo', icon: 'car' },
  { value: 'furgoneta', label: 'Furgoneta', icon: 'van-utility' },
  { value: 'camion', label: 'Camión', icon: 'truck' },
  { value: 'autobus', label: 'Autobús', icon: 'bus' },
  { value: 'moto', label: 'Moto', icon: 'motorbike' },
];

export const DEFAULT_VEHICLE_TYPE = 'turismo';

export const VEHICLE_TYPE_VALUES = VEHICLE_TYPES.map((t) => t.value);

const LEGACY_TYPE_MAP = {
  sedan: 'turismo',
  compacto: 'turismo',
  hatchback: 'turismo',
  suv: 'furgoneta',
  monovolumen: 'furgoneta',
  camioneta: 'furgoneta',
  'pick-up': 'furgoneta',
  pickup: 'furgoneta',
  van: 'furgoneta',
  microbus: 'autobus',
  bus: 'autobus',
};

export function normalizeVehicleType(value) {
  if (value == null || value === '') return DEFAULT_VEHICLE_TYPE;
  const key = String(value).trim().toLowerCase();
  if (LEGACY_TYPE_MAP[key]) return LEGACY_TYPE_MAP[key];
  if (VEHICLE_TYPES.some((t) => t.value === key)) return key;
  return DEFAULT_VEHICLE_TYPE;
}

export function getVehicleType(value) {
  const key = normalizeVehicleType(value);
  return VEHICLE_TYPES.find((t) => t.value === key) || VEHICLE_TYPES[0];
}

export function vehicleTypeIcon(value) {
  return getVehicleType(value).icon;
}

export function vehicleTypeLabel(value) {
  return getVehicleType(value).label;
}
