import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Icon, SwipeToDelete, VehicleTypeIcon } from './ui';
import { carColorToHex } from '../utils/carColors';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { vehicleDeleteBlockReason } from '../utils/vehicles';

// Fila del listado de vehículos: tocar para editar, deslizar de derecha a
// izquierda para eliminar. `onDelete(vehicle)` devuelve una promesa que se
// resuelve a true si se borró (si no, la tarjeta vuelve a su sitio). Con
// `peek` la tarjeta se asoma sola para enseñar el gesto.
export default function VehicleListItem({ vehicle, onEdit, onDelete, onBlocked, onSwiped, peek = false, onPeekDone }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const paint = carColorToHex(vehicle.color);

  return (
    <SwipeToDelete
      className="mb-2.5"
      onDelete={() => onDelete(vehicle)}
      blockedReason={vehicleDeleteBlockReason(vehicle)}
      onBlocked={onBlocked}
      onSwiped={onSwiped}
      peek={peek}
      onPeekDone={onPeekDone}
    >
      {/* El predeterminado se distingue ya en el listado: borde del color de marca + chip con estrella. */}
      <Card onPress={() => onEdit(vehicle)} className={vehicle.is_default ? 'border border-primary dark:border-primary-dark' : undefined}>
        <Card.Content className="flex-row items-center gap-3 py-3">
          <View className="w-14 h-10 rounded-xl items-center justify-center bg-background/60 dark:bg-background-dark/60">
            <VehicleTypeIcon
              type={vehicle.vehicle_type}
              size={44}
              color={paint || c.primary}
              cutoutColor={c.surface}
              outlineColor={paint ? c.onSurface : undefined}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text numberOfLines={1} className="shrink text-base font-semibold tracking-wide text-onSurface dark:text-onSurface-dark">
                {vehicle.plate || t('vehicles.noPlate')}
              </Text>
              {vehicle.is_default && (
                <View style={{ backgroundColor: c.primary }} className="flex-row items-center rounded-full pl-1.5 pr-2 py-0.5">
                  <Icon name="star" size={11} color={c.onPrimary} />
                  <Text className="ml-1 text-[10px] font-semibold text-onPrimary dark:text-onPrimary-dark">{t('vehicles.default')}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} className="text-sm mt-0.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || t('vehicles.noMakeModel')}
              {vehicle.year ? ` · ${vehicle.year}` : ''}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={c.onSurfaceVariant} />
        </Card.Content>
      </Card>
    </SwipeToDelete>
  );
}
