import React from 'react';
import { Text } from 'react-native';

// Etiqueta de campo de formulario; con `required` añade un asterisco rojo.
export default function FieldLabel({ children, required }) {
  if (!children) return null;
  return (
    <Text className="mb-0.5 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
      {children}
      {required && <Text className="text-error dark:text-error-dark"> *</Text>}
    </Text>
  );
}
