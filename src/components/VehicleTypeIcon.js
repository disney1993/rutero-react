import React from 'react';
import { Icon } from 'react-native-paper';
import { getVehicleType, vehicleTypeIcon } from '../utils/vehicles';

/** Renders the MCI glyph for a vehicle type key. */
export default function VehicleTypeIcon({ type, size = 20, color }) {
  const meta = getVehicleType(type);
  return <Icon source={meta.icon} size={size} color={color} />;
}

/** Paper `icon` prop helper (Avatar.Icon / IconButton / TextInput.Icon). */
export function vehicleIconSource(type) {
  return vehicleTypeIcon(type);
}
