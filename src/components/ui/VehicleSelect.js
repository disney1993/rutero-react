import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import FieldLabel from './FieldLabel';
import VehicleTypeIcon from './VehicleTypeIcon';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';
import { carColorToHex } from '../../utils/carColors';
import { getVehicleColor } from '../../utils/avatar';
import { haptics } from '../../utils/haptics';

function vehiclePaint(vehicle, themePrimary) {
  return carColorToHex(vehicle?.color) || getVehicleColor(vehicle?.id) || themePrimary;
}

function OptionRow({ vehicle, label, selected, onPress, c }) {
  const paint = vehiclePaint(vehicle, c.primary);
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
        <VehicleTypeIcon
          type={vehicle.vehicle_type}
          size={48}
          color={paint}
          cutoutColor={c.surface}
          outlineColor={c.onSurface}
        />
      </View>
      <Text
        numberOfLines={1}
        className={cn(
          'flex-1 text-base',
          selected ? 'font-semibold text-primary dark:text-primary-dark' : 'text-onSurface dark:text-onSurface-dark'
        )}
      >
        {label}
      </Text>
      {selected && <Icon name="check-circle" size={22} color={c.primary} />}
    </Pressable>
  );
}

// Vehicle picker: trigger shows VehicleTypeIcon + plate; sheet lists the same
// visuals so the user can tell cars apart by type and colour (replaces the
// old SegmentedButtons colour-dot + NativeSelect text-only plate list).
export default function VehicleSelect({
  label,
  required,
  value,
  vehicles = [],
  onChange,
  placeholder,
  error,
  disabled = false,
  className,
}) {
  const { t } = useTranslation();
  if (placeholder == null) placeholder = t('rutaForm.placeholders.vehicle');
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = vehicles.find((v) => String(v.id) === String(value ?? ''));
  const selectedLabel = selected ? (selected.plate || `#${selected.id}`) : null;
  const paint = selected ? vehiclePaint(selected, c.primary) : null;

  const pick = (nextId) => {
    haptics.selection();
    onChange(nextId);
    setOpen(false);
  };

  return (
    <View className={cn('mb-1', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Pressable
        disabled={disabled}
        onPress={() => { haptics.light(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel || placeholder}`}
        className={cn(
          'flex-row items-center border rounded-2xl px-3 active:opacity-70',
          error ? 'border-error dark:border-error-dark' : 'border-border dark:border-border-dark',
          disabled && 'opacity-50'
        )}
      >
        <View className="w-8 items-center mr-2">
          {selected ? (
            <VehicleTypeIcon
              type={selected.vehicle_type}
              size={28}
              color={paint}
              cutoutColor={c.surface}
              outlineColor={c.onSurface}
            />
          ) : (
            <Icon name="car-outline" size={20} color={c.onSurfaceVariant} />
          )}
        </View>
        <Text
          numberOfLines={1}
          className={cn(
            'flex-1 py-2',
            selectedLabel ? 'text-onSurface dark:text-onSurface-dark' : 'text-onSurfaceVariant dark:text-onSurfaceVariant-dark'
          )}
        >
          {selectedLabel || placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color={c.onSurfaceVariant} />
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
              <View className="w-10 h-1 rounded-full bg-border dark:border-border-dark" />
            </View>
            <Text className="text-center font-bold text-base py-2 text-onSurface dark:text-onSurface-dark">
              {label}
            </Text>
            <ScrollView>
              {vehicles.map((v) => (
                <OptionRow
                  key={v.id}
                  vehicle={v}
                  label={v.plate || `#${v.id}`}
                  selected={String(v.id) === String(value ?? '')}
                  onPress={() => pick(v.id)}
                  c={c}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
