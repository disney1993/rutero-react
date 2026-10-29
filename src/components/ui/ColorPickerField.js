import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ColorPicker, { Panel1, HueSlider, Preview, Swatches } from 'reanimated-color-picker';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import FieldLabel from './FieldLabel';
import Button from './Button';
import { cn } from './cn';
import { isValidHexColor } from '../../utils/validators';
import { haptics } from '../../utils/haptics';
import { CAR_COLOR_PALETTE, KNOWN_CAR_COLORS, carColorToHex } from '../../utils/carColors';

export { CAR_COLOR_PALETTE, KNOWN_CAR_COLORS, carColorToHex };

const RETIRED_CAR_COLORS = KNOWN_CAR_COLORS.filter(
  (c) => !CAR_COLOR_PALETTE.some((p) => p.name === c.name),
);

const findByName = (list, value) => list.find((c) => c.name.toLowerCase() === (value || '').trim().toLowerCase());
const findByHex = (list, value) => list.find((c) => c.hex.toUpperCase() === (value || '').trim().toUpperCase());

// Atajos dentro del selector "Otro": tonos de coche habituales que no están
// en la paleta principal (granate, azul marino, verde oscuro, champán...).
const EXTRA_CAR_COLORS = ['#7B1E2B', '#1B2A4A', '#1F4D3A', '#C9B37E', '#4A4F55', '#8FA3B8', '#6B2C91', '#00838F'];

const DEFAULT_CUSTOM = '#1565C0';

function Swatch({ hex, selected, onPress, label }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label || hex} className="items-center mr-3 mb-2 w-14">
      <View
        style={{ backgroundColor: hex }}
        className={cn(
          'w-9 h-9 rounded-full items-center justify-center border',
          selected ? 'border-primary dark:border-primary-dark border-2' : 'border-border dark:border-border-dark'
        )}
      >
        {selected && <Icon name="check" size={18} color={isLight(hex) ? '#1C1B1F' : '#FFFFFF'} />}
      </View>
      {!!label && (
        <Text numberOfLines={1} className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          {label}
        </Text>
      )}
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
function CustomColorSheet({ visible, initial, onCancel, onConfirm, title, extraColors, swatchesLabel }) {
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
              <View className="w-10 h-1 rounded-full bg-border dark:border-border-dark" />
            </View>
            <Text className="text-center font-bold text-base py-2 text-onSurface dark:text-onSurface-dark">
              {title}
            </Text>

            <ColorPicker
              value={initial}
              onCompleteJS={(c) => { haptics.selection(); setDraft(c.hex.slice(0, 7).toUpperCase()); }}
              style={{ gap: 16 }}
            >
              <Preview hideInitialColor hideText style={{ height: 36, borderRadius: 12 }} />
              <Panel1 style={{ height: 180, borderRadius: 16 }} thumbSize={28} />
              <HueSlider style={{ borderRadius: 12 }} sliderThickness={26} thumbSize={30} />
              {!!extraColors?.length && (
                <View>
                  <Text className="mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                    {swatchesLabel || t('colorPicker.moreColors')}
                  </Text>
                  <Swatches
                    colors={extraColors}
                    swatchStyle={{ width: 32, height: 32, borderRadius: 16, marginHorizontal: 0 }}
                    style={{ justifyContent: 'space-between' }}
                  />
                </View>
              )}
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

/**
 * Color picker with palette swatches + free hex via reanimated-color-picker.
 * - Default (vehicles): inline palette + sheet with extra car tones.
 * - storeAsHex (avatars): always stores #RRGGBB.
 * - triggerOnly: no inline grid; a button/swatch opens the sheet (palette → sheet swatches).
 */
export default function ColorPickerField({
  label,
  required,
  value,
  onChange,
  error,
  className,
  palette = CAR_COLOR_PALETTE,
  storeAsHex = false,
  sheetTitle,
  extraColors = EXTRA_CAR_COLORS,
  triggerOnly = false,
  triggerLabel,
  swatchesLabel,
}) {
  const { t } = useTranslation();
  const matched = useMemo(
    () => (storeAsHex ? findByHex(palette, value) : findByName(palette, value)),
    [palette, storeAsHex, value]
  );
  // Un color personalizado se guarda como hex (#RRGGBB); así lo sigue
  // pintando getVehicleSwatchColor en el resto de la app. Un color retirado
  // de la paleta (p. ej. "Plata") se muestra igual, en la muestra "Otro".
  const customHex = matched
    ? null
    : (isValidHexColor(value || '')
      ? value
      : (!storeAsHex ? findByName(RETIRED_CAR_COLORS, value)?.hex || null : null));
  const [sheetOpen, setSheetOpen] = useState(false);
  const resolvedSheetTitle = sheetTitle || t('colorPicker.title');
  const currentHex = customHex || matched?.hex || (isValidHexColor(value || '') ? value : DEFAULT_CUSTOM);
  const sheetExtraColors = triggerOnly
    ? palette.map((c) => c.hex)
    : extraColors;
  const openSheet = () => {
    haptics.light();
    setSheetOpen(true);
  };

  return (
    <View className={className}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {triggerOnly ? (
        <Pressable
          onPress={openSheet}
          accessibilityLabel={triggerLabel || t('profile.changeColor')}
          className="flex-row items-center self-start rounded-full border border-border dark:border-border-dark px-3 py-2 active:opacity-80"
        >
          <View
            style={{ backgroundColor: currentHex }}
            className="w-8 h-8 rounded-full mr-3 border border-border dark:border-border-dark"
          />
          <Text className="font-medium text-onSurface dark:text-onSurface-dark">
            {triggerLabel || t('profile.changeColor')}
          </Text>
          <Icon name="chevron-right" size={20} className="ml-1" />
        </Pressable>
      ) : (
        <View className="flex-row flex-wrap">
          {palette.map((c) => (
            <Swatch
              key={c.hex + (c.name || '')}
              hex={c.hex}
              label={c.label}
              selected={storeAsHex ? matched?.hex === c.hex : matched?.name === c.name}
              onPress={() => {
                haptics.selection();
                onChange(storeAsHex ? c.hex : c.name);
              }}
            />
          ))}
          {customHex ? (
            // El color elegido sustituye al lápiz; tocarlo de nuevo permite cambiarlo.
            <Swatch hex={customHex} label={t('colorPicker.other')} selected onPress={() => setSheetOpen(true)} />
          ) : (
            <Pressable onPress={openSheet} accessibilityLabel={t('colorPicker.otherA11y')} className="items-center mr-3 mb-2 w-14">
              <View className="w-9 h-9 rounded-full items-center justify-center border border-dashed border-border dark:border-border-dark">
                <Icon name="palette-outline" size={18} />
              </View>
              <Text className="text-[10px] mt-1 text-center text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('colorPicker.other')}</Text>
            </Pressable>
          )}
        </View>
      )}
      {!!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}

      <CustomColorSheet
        visible={sheetOpen}
        initial={currentHex}
        title={resolvedSheetTitle}
        extraColors={sheetExtraColors}
        swatchesLabel={swatchesLabel || (triggerOnly ? t('colorPicker.suggested') : undefined)}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(hex) => { setSheetOpen(false); haptics.success(); onChange(hex); }}
      />
    </View>
  );
}
