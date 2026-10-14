import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ColorPicker, { Panel1, HueSlider, Preview, Swatches } from 'reanimated-color-picker';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import i18n from '../../i18n';
import FieldLabel from './FieldLabel';
import Button from './Button';
import { cn } from './cn';
import { isValidHexColor } from '../../utils/validators';
import { haptics } from '../../utils/haptics';

// `name` es el valor que se guarda (en español, por compatibilidad con los
// datos existentes); `label` es su traducción para mostrarlo.
function withLabel(c) {
  const key = c.name.toLowerCase().replace(/[\u00e1\u00e9\u00ed\u00f3\u00fa]/g, (ch) => 'aeiou'['\u00e1\u00e9\u00ed\u00f3\u00fa'.indexOf(ch)]);
  return Object.defineProperty(c, 'label', { get: () => i18n.t(`carColors.${key}`, { defaultValue: c.name }), enumerable: true });
}

// Colores de carrocería más comunes, en orden de popularidad mundial
// (informes anuales de color de BASF/Axalta: blanco, negro, gris y plata
// suman ~80 %; después azul, rojo y, muy por detrás, verde, amarillo y
// naranja). El nombre es lo que se guarda y se muestra en listados; el hex
// solo se usa para pintar la muestra.
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

// Colores que estuvieron en la paleta y ya no se muestran (para ahorrar una
// fila), pero que pueden estar guardados: se siguen pintando con su tono real
// y en el formulario aparecen en la muestra "Otro".
const RETIRED_CAR_COLORS = [
  { name: 'Marrón', hex: '#5D4037' },
  { name: 'Beige', hex: '#D7CCC8' },
].map(withLabel);

// Todos los nombres reconocidos, para pintar el color de un vehículo guardado.
export const KNOWN_CAR_COLORS = [...CAR_COLOR_PALETTE, ...RETIRED_CAR_COLORS];

const findByName = (list, value) => list.find((c) => c.name.toLowerCase() === (value || '').trim().toLowerCase());

// Hex con el que pintar un color guardado (nombre de la paleta o #RRGGBB), o null.
export function carColorToHex(value) {
  if (isValidHexColor(value || '')) return value;
  return findByName(KNOWN_CAR_COLORS, value)?.hex || null;
}

// Atajos dentro del selector "Otro": tonos de coche habituales que no están
// en la paleta principal (granate, azul marino, verde oscuro, champán...).
const EXTRA_CAR_COLORS = ['#7B1E2B', '#1B2A4A', '#1F4D3A', '#C9B37E', '#4A4F55', '#8FA3B8', '#6B2C91', '#00838F'];

const DEFAULT_CUSTOM = '#1565C0';

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

// Hoja inferior con un selector visual (tono + saturación/brillo), sin que el
// usuario tenga que saber qué es un código RGB/hex: solo toca y arrastra.
function CustomColorSheet({ visible, initial, onCancel, onConfirm }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onShow={() => setDraft(initial)}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Dentro de un Modal en Android hace falta su propio root para que funcionen los gestos. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 justify-end">
          <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={onCancel} />
          <View
            style={{ paddingBottom: insets.bottom + 12 }}
            className="rounded-t-3xl px-5 bg-background dark:bg-background-dark"
          >
            <View className="items-center pt-2.5 pb-1">
              <View className="w-10 h-1 rounded-full bg-border dark:bg-border-dark" />
            </View>
            <Text className="text-center font-bold text-base py-2 text-onSurface dark:text-onSurface-dark">
              {t('colorPicker.title')}
            </Text>

            <ColorPicker
              value={initial}
              onCompleteJS={(c) => { haptics.selection(); setDraft(c.hex.slice(0, 7).toUpperCase()); }}
              style={{ gap: 16 }}
            >
              <Preview hideInitialColor hideText style={{ height: 36, borderRadius: 12 }} />
              <Panel1 style={{ height: 180, borderRadius: 16 }} thumbSize={28} />
              <HueSlider style={{ borderRadius: 12 }} sliderThickness={26} thumbSize={30} />
              <View>
                <Text className="mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('colorPicker.moreColors')}</Text>
                <Swatches colors={EXTRA_CAR_COLORS} swatchStyle={{ width: 32, height: 32, borderRadius: 16, marginHorizontal: 0 }} style={{ justifyContent: 'space-between' }} />
              </View>
            </ColorPicker>

            <View className="flex-row gap-3 mt-5">
              <Button mode="outlined" className="flex-1" onPress={onCancel}>{t('common.cancel')}</Button>
              <Button mode="contained" className="flex-1" onPress={() => onConfirm(draft)}>{t('colorPicker.use')}</Button>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default function ColorPickerField({ label, required, value, onChange, error, className }) {
  const { t } = useTranslation();
  const matched = useMemo(() => findByName(CAR_COLOR_PALETTE, value), [value]);
  // Un color personalizado se guarda como hex (#RRGGBB); así lo sigue
  // pintando getVehicleSwatchColor en el resto de la app. Un color retirado
  // de la paleta (p. ej. "Plata") se muestra igual, en la muestra "Otro".
  const customHex = matched ? null : (isValidHexColor(value || '') ? value : findByName(RETIRED_CAR_COLORS, value)?.hex || null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <View className="flex-row flex-wrap">
        {CAR_COLOR_PALETTE.map((c) => (
          <Swatch
            key={c.name}
            hex={c.hex}
            label={c.label}
            selected={matched?.name === c.name}
            onPress={() => { haptics.selection(); onChange(c.name); }}
          />
        ))}
        {customHex ? (
          // El color elegido sustituye al lápiz; tocarlo de nuevo permite cambiarlo.
          <Swatch hex={customHex} label={t('colorPicker.other')} selected onPress={() => setSheetOpen(true)} />
        ) : (
          <Pressable onPress={() => { haptics.light(); setSheetOpen(true); }} accessibilityLabel={t('colorPicker.otherA11y')} className="items-center mr-3 mb-2 w-14">
            <View className="w-9 h-9 rounded-full items-center justify-center border border-dashed border-border dark:border-border-dark">
              <Icon name="palette-outline" size={18} />
            </View>
            <Text className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('colorPicker.other')}</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}

      <CustomColorSheet
        visible={sheetOpen}
        initial={customHex || DEFAULT_CUSTOM}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(hex) => { setSheetOpen(false); haptics.success(); onChange(hex); }}
      />
    </View>
  );
}
