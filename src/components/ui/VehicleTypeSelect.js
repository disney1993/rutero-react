import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import FieldLabel from './FieldLabel';
import VehicleTypeIcon, { VEHICLE_TYPES, VEHICLE_TYPE_GROUPS, getVehicleType } from './VehicleTypeIcon';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';
import { haptics } from '../../utils/haptics';

function OptionRow({ type, label, hint, selected, onPress, c, paintColor }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.border }}
      className={cn(
        'flex-row items-center px-5 py-2.5 active:bg-black/5 dark:active:bg-white/5',
        selected && 'bg-primary/10 dark:bg-primary-dark/15'
      )}
    >
      <View className="w-16 h-11 rounded-xl items-center justify-center mr-4 bg-surface dark:bg-surface-dark">
        {type ? (
          <VehicleTypeIcon
            type={type}
            size={48}
            color={paintColor || (selected ? c.primary : c.onSurface)}
            cutoutColor={c.surface}
            outlineColor={paintColor ? c.onSurface : undefined}
          />
        ) : (
          <Icon name="help-circle-outline" size={22} color={c.onSurfaceVariant} />
        )}
      </View>
      <View className="flex-1">
        <Text
          className={cn(
            'text-base',
            selected ? 'font-semibold text-primary dark:text-primary-dark' : 'text-onSurface dark:text-onSurface-dark'
          )}
        >
          {label}
        </Text>
        {!!hint && <Text className="text-xs mt-0.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{hint}</Text>}
      </View>
      {selected && <Icon name="check-circle" size={22} color={c.primary} />}
    </Pressable>
  );
}

// Desplegable de tipo de vehículo: campo con el icono + nombre del tipo
// elegido que abre una hoja inferior (bottom sheet) con todas las opciones.
// `paintColor` (hex): color elegido para el vehículo; si llega, todos los
// dibujos se pintan con él y llevan un contorno fijo del color del tema.
export default function VehicleTypeSelect({ label, required, value, onChange, error, paintColor, className }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = getVehicleType(value);
  // Un valor guardado que no coincide con la lista (dato antiguo o erróneo)
  // se muestra como "Sin especificar" con su texto original, para que el
  // usuario vea qué había y elija un tipo válido (es obligatorio).
  const legacyText = !selected && value ? t('vehicleTypes.unknown', { value }) : null;

  const pick = (next) => {
    haptics.selection();
    onChange(next);
    setOpen(false);
  };

  return (
    <View className={cn('mb-1', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        onPress={() => { haptics.light(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || legacyText || t('vehicleTypes.unspecified')}`}
        className={cn(
          'flex-row items-center border rounded-2xl px-3 py-1.5 active:opacity-70',
          error ? 'border-error dark:border-error-dark' : 'border-border dark:border-border-dark'
        )}
      >
        <View className="w-14 items-center mr-2">
          {selected ? (
            <VehicleTypeIcon
              type={selected}
              size={44}
              color={paintColor || c.primary}
              cutoutColor={c.surface}
              outlineColor={paintColor ? c.onSurface : undefined}
            />
          ) : (
            <Icon name="car-outline" size={24} color={c.onSurfaceVariant} />
          )}
        </View>
        <Text
          numberOfLines={1}
          className={cn(
            'flex-1 py-1.5',
            selected || legacyText ? 'text-onSurface dark:text-onSurface-dark' : 'text-onSurfaceVariant dark:text-onSurfaceVariant-dark'
          )}
        >
          {selected?.label || legacyText || t('vehicleTypes.placeholder')}
        </Text>
        <Icon name="chevron-down" size={22} color={c.onSurfaceVariant} />
      </Pressable>
      {!!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View className="flex-1 justify-end">
          <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={() => setOpen(false)} />
          <View
            style={{ paddingBottom: insets.bottom + 8, maxHeight: '80%' }}
            className="rounded-t-3xl bg-background dark:bg-background-dark"
          >
            <View className="items-center pt-2.5 pb-1">
              <View className="w-10 h-1 rounded-full bg-border dark:bg-border-dark" />
            </View>
            <Text className="text-center font-bold text-base py-2 text-onSurface dark:text-onSurface-dark">
              {t('vehicleTypes.sheetTitle')}
            </Text>
            <ScrollView>
              {VEHICLE_TYPE_GROUPS.map((g) => (
                <View key={g.key}>
                  <Text className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                    {g.label}
                  </Text>
                  {VEHICLE_TYPES.filter((t) => t.group === g.key).map((t) => (
                    <OptionRow key={t.value} type={t} label={t.label} hint={t.hint} selected={selected?.value === t.value} onPress={() => pick(t.value)} c={c} paintColor={paintColor} />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
