import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function Icon({ name, size = 24, color = '#49454F', className }) {
  if (!name) return null;
  return <MaterialCommunityIcons name={name} size={size} color={color} className={className} />;
}
