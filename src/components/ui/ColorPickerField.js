import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Icon from './Icon';
import Input from './Input';
import { cn } from './cn';
import { isValidHexColor } from '../../utils/validators';

// Colores de carrocería más comunes. El nombre es lo que se guarda y se
// muestra en listados; el hex solo se usa para pintar la muestra.
export const CAR_COLOR_PALETTE = [
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Negro', hex: '#1C1C1C' },
  { name: 'Gris', hex: '#9E9E9E' },
  { name: 'Plata', hex: '#C7C7C7' },
  { name: 'Rojo', hex: '#D32F2F' },
  { name: 'Azul', hex: '#1565C0' },
  { name: 'Verde', hex: '#2E7D32' },
  { name: 'Amarillo', hex: '#FBC02D' },
  { name: 'Naranja', hex: '#EF6C00' },
  { name: 'Marrón', hex: '#5D4037' },
  { name: 'Beige', hex: '#D7CCC8' },
];

function Swatch({ hex, selected, onPress, label }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="items-center mr-3 mb-2 w-14">
      <View
        style={{ backgroundColor: hex }}
        className={cn(
          'w-9 h-9 rounded-full items-center justify-center border',
          selected ? 'border-primary dark:border-primary-dark border-2' : 'border-border dark:border-border-dark'
        )}
      >
        {selected && <Icon name="check" size={18} color={isLight(hex) ? '#1C1B1F' : '#FFFFFF'} />}
      </View>
      <Text numberOfLines={1} className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
        {label}
      </Text>
    </Pressable>
  );
}

// Heurística simple de luminancia para decidir el color del check.
function isLight(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function ColorPickerField({ label, value, onChange, error, className }) {
  const matched = useMemo(
    () => CAR_COLOR_PALETTE.find((c) => c.name.toLowerCase() === (value || '').trim().toLowerCase()),
    [value]
  );
  const [customMode, setCustomMode] = useState(() => !!value && !matched);
  const isCustomHex = isValidHexColor(value || '');

  return (
    <View className={className}>
      {!!label && (
        <Text className="mb-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{label}</Text>
      )}
      <View className="flex-row flex-wrap">
        {CAR_COLOR_PALETTE.map((c) => (
          <Swatch
            key={c.name}
            hex={c.hex}
            label={c.name}
            selected={!customMode && matched?.name === c.name}
            onPress={() => { setCustomMode(false); onChange(c.name); }}
          />
        ))}
        <Pressable onPress={() => { setCustomMode(true); onChange(''); }} className="items-center mr-3 mb-2 w-14">
          <View
            className={cn(
              'w-9 h-9 rounded-full items-center justify-center border border-dashed',
              customMode ? 'border-primary dark:border-primary-dark border-2' : 'border-border dark:border-border-dark'
            )}
          >
            <Icon name="pencil-outline" size={16} />
          </View>
          <Text className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">Otro</Text>
        </Pressable>
      </View>

      {customMode && (
        <View className="flex-row items-center gap-2 mt-1">
          {isCustomHex && <View style={{ backgroundColor: value }} className="w-6 h-6 rounded-full border border-border dark:border-border-dark" />}
          <View className="flex-1">
            <Input
              placeholder="#RRGGBB"
              value={value}
              onChangeText={onChange}
              autoCapitalize="characters"
              maxLength={7}
              error={error || (value && !isCustomHex ? 'Formato: #RRGGBB' : undefined)}
            />
          </View>
        </View>
      )}
      {!customMode && !!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}
    </View>
  );
}
