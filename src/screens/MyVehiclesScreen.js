import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Card, IconButton, FAB, Chip, PageContainer } from '../components/ui';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import { toastSuccess, toastError } from '../utils/toast';
import VehicleFormModal from '../components/VehicleFormModal';
import SelectedUserBanner from '../components/SelectedUserBanner';

export default function MyVehiclesScreen() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const { user, isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const targetUser = isAdmin ? selectedUser : user;

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!targetUser) return;
    if (!silent) setLoading(true);
    try {
      const resp = await api.get('/vehicles', { params: isAdmin ? { owner_id: targetUser.id } : {} });
      setVehicles(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar los vehículos'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, targetUser?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load({ silent: true }); };

  const openCreate = () => { setEditingVehicle(null); setFormVisible(true); };
  const openEdit = (vehicle) => { setEditingVehicle(vehicle); setFormVisible(true); };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, payload);
        toastSuccess('Vehículo actualizado');
      } else {
        await api.post('/vehicles', isAdmin ? { ...payload, owner_id: targetUser.id } : payload);
        toastSuccess('Vehículo añadido');
      }
      setFormVisible(false);
      load();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo guardar el vehículo'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (vehicle) => {
    const ok = await confirm({
      title: t('alerts.confirmDeleteTitle'),
      message: t('alerts.confirmDeleteVehicleMessage', { name: vehicle.plate || 'este vehículo' }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;

    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      toastSuccess('Vehículo eliminado');
      load();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar (revisa si tiene rutas asociadas)'));
    }
  };

  if (isAdmin && !targetUser) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <SelectedUserBanner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {isAdmin && <SelectedUserBanner />}
      {loading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <PageContainer className="flex-1">
          <FlatList
            data={vehicles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[{ padding: 12, paddingBottom: 96 }, vehicles.length === 0 && { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-12">
                <IconButton icon="car-outline" size={40} disabled className="opacity-40" />
                <Text className="text-center opacity-60 px-6 text-onSurface dark:text-onSurface-dark">
                  Aún no tienes vehículos.{'\n'}Añade uno para poder crear rutas.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Card className="mb-2.5" onPress={() => openEdit(item)}>
                <Card.Content>
                  <View className="flex-row justify-between items-center gap-2">
                    <Text
                      numberOfLines={1}
                      className="flex-1 text-base font-medium text-onSurface dark:text-onSurface-dark"
                    >
                      {item.plate || 'Sin matrícula'}
                    </Text>
                    <Chip
                      compact
                      style={{ backgroundColor: item.active ? themeColors.secondary : themeColors.surfaceDisabled }}
                      textClassName="text-white"
                    >
                      {item.active ? 'Activo' : 'Inactivo'}
                    </Chip>
                  </View>
                  <Text className="text-sm text-onSurface dark:text-onSurface-dark">
                    {[item.make, item.model].filter(Boolean).join(' ') || 'Sin marca/modelo'}
                  </Text>
                </Card.Content>
                <Card.Actions>
                  <IconButton icon="pencil" onPress={() => openEdit(item)} />
                  <IconButton icon="delete" onPress={() => confirmDelete(item)} />
                </Card.Actions>
              </Card>
            )}
          />
        </PageContainer>
      )}

      <FAB icon="plus" label="Nuevo vehículo" onPress={openCreate} />

      <VehicleFormModal
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        initialValues={editingVehicle}
        submitting={submitting}
      />
    </View>
  );
}
