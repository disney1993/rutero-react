import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Icon from './Icon';
import FieldLabel from './FieldLabel';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';

// Marco común de los campos de formulario. Claro: campo relleno gris sin
// borde (iOS). Oscuro: relleno violeta muy tenue con borde fino. El borde en
// claro es transparente (no ausente) para que no cambie la altura con error.
export function fieldFrameClass(error) {
  return cn(
    'border rounded-xl bg-fill dark:bg-fill-dark',
    error ? 'border-error dark:border-error-dark' : 'border-transparent dark:border-border-dark'
  );
}

export default function Input({
  label,
  required,
  left,
  right,
  onRightPress,
  error,
  style,
  className,
  inputClassName,
  ...rest
}) {
  const { resolvedScheme } = useThemeMode();
  const placeholderColor = colors[resolvedScheme].onSurfaceVariant;
  // minWidth: 0 evita que en web el texto tape el icono derecho en campos estrechos.
  const { style: inputStyle, ...inputRest } = rest;
  return (
    <View style={style} className={cn('mb-1', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <View
        className={cn('flex-row items-center px-3', fieldFrameClass(error))}
      >
        {!!left && <Icon name={left} size={20} className="mr-2" />}
        <TextInput
          placeholderTextColor={placeholderColor}
          className={cn('min-w-0 flex-1 py-2 text-onSurface dark:text-onSurface-dark', inputClassName)}
          style={[{ minWidth: 0, flex: 1 }, inputStyle]}
          {...inputRest}
        />
        {!!right && (
          <Pressable onPress={onRightPress} hitSlop={8} className="shrink-0 pl-2">
            <Icon name={right} size={20} />
          </Pressable>
        )}
      </View>
      {!!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}
    </View>
  );
}
