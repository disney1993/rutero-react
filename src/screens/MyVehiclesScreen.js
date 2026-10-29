import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { IconButton, FAB, PageContainer, Icon } from '../components/ui';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import { toastSuccess, toastError, toastInfo } from '../utils/toast';
import VehicleFormModal from '../components/VehicleFormModal';
import VehicleListItem from '../components/VehicleListItem';
import { sortVehiclesDefaultFirst, vehicleDeleteBlockReason } from '../utils/vehicles';
import { useSwipeHint } from '../utils/swipeHint';
import SelectedUserBanner from '../components/SelectedUserBanner';

export default function MyVehiclesScreen() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const { user, isAdmin, refreshUser } = useAuth();
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
      return resp.data;
    } catch (err) {
      toastError(errorMessage(err, t('vehicles.loadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, targetUser?.id]);

  // Pista del gesto de borrar: al entrar, la primera tarjeta que se puede
  // eliminar se asoma sola hacia la izquierda (como mucho 3 veces, y nunca
  // más una vez que el usuario ha deslizado alguna).
  const swipeHint = useSwipeHint('rutero.vehicleSwipeHint.v2');
  const [peekId, setPeekId] = useState(null);

  useFocusEffect(useCallback(() => {
    load().then((list) => {
      if (!list?.length || !swipeHint.consume()) return;
      const sorted = sortVehiclesDefaultFirst(list);
      setPeekId((sorted.find((v) => !vehicleDeleteBlockReason(v)) || sorted[0]).id);
    });
    return () => setPeekId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, swipeHint.ready]));

  const onRefresh = () => { setRefreshing(true); load({ silent: true }); };

  const openCreate = () => { setEditingVehicle(null); setFormVisible(true); };
  const openEdit = (vehicle) => { setEditingVehicle(vehicle); setFormVisible(true); };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, payload);
        toastSuccess(t('vehicles.updated'));
      } else {
        await api.post('/vehicles', isAdmin ? { ...payload, owner_id: targetUser.id } : payload);
        toastSuccess(t('vehicles.added'));
        // El primer vehículo activa has_owner_capability en la API (pestaña Vehículos, códigos…).
        if (!isAdmin) await refreshUser();
      }
      setFormVisible(false);
      load();
    } catch (err) {
      toastError(errorMessage(err, t('vehicles.saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (vehicle) => {
    // Las reglas (predeterminado / con viajes) ya se comprueban en VehicleListItem.
    // Devuelve true si se borró, para que la tarjeta no vuelva a su sitio.
    const ok = await confirm({
      title: t('alerts.confirmDeleteTitle'),
      message: t('alerts.confirmDeleteVehicleMessage', { name: vehicle.plate || t('vehicles.thisVehicle') }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return false;

    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      toastSuccess(t('vehicles.deleted'));
      load();
      return true;
    } catch (err) {
      toastError(errorMessage(err, t('vehicles.deleteError')));
      return false;
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
            data={sortVehiclesDefaultFirst(vehicles)}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[{ padding: 12, paddingBottom: 96 }, vehicles.length === 0 && { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-12">
                <IconButton icon="car-outline" size={40} disabled className="opacity-40" />
                <Text className="text-center opacity-60 px-6 text-onSurface dark:text-onSurface-dark">
                  {t('vehicles.empty')}
                </Text>
              </View>
            }
            ListFooterComponent={vehicles.length > 0 ? (
              <View className="flex-row items-center justify-center gap-1.5 mt-2 px-4">
                <Icon name="gesture-swipe-left" size={18} color={themeColors.onSurfaceVariant} />
                <Text className="text-center text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {t('vehicles.swipeHint')}
                </Text>
              </View>
            ) : null}
            renderItem={({ item }) => (
              <VehicleListItem
                vehicle={item}
                onEdit={openEdit}
                onDelete={confirmDelete}
                onBlocked={toastInfo}
                onSwiped={swipeHint.markLearned}
                peek={item.id === peekId}
                onPeekDone={() => setPeekId(null)}
              />
            )}
          />
        </PageContainer>
      )}

      <FAB icon="plus" label={t('vehicleForm.newTitle')} onPress={openCreate} />

      <VehicleFormModal
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        initialValues={editingVehicle}
        vehicles={vehicles}
        submitting={submitting}
      />
    </View>
  );
}
