import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, IconButton, FAB, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useConfirm } from '../context/ConfirmContext';
import { toastSuccess, toastError } from '../utils/toast';
import VehicleFormModal from '../components/VehicleFormModal';

export default function MyVehiclesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const resp = await api.get('/vehicles');
      setVehicles(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar los vehículos'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
        await api.post('/vehicles', payload);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, vehicles.length === 0 && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconButton icon="car-outline" size={40} style={styles.emptyIcon} disabled />
              <Text style={styles.emptyText}>Aún no tienes vehículos.{'\n'}Añade uno para poder crear rutas.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => openEdit(item)}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.cardHeaderTitle} numberOfLines={1}>{item.plate || 'Sin matrícula'}</Text>
                  <Chip
                    compact
                    style={{ backgroundColor: item.active ? theme.colors.secondary : theme.colors.surfaceDisabled }}
                    textStyle={styles.chipText}
                  >
                    {item.active ? 'Activo' : 'Inactivo'}
                  </Chip>
                </View>
                <Text variant="bodyMedium">{[item.make, item.model].filter(Boolean).join(' ') || 'Sin marca/modelo'}</Text>
              </Card.Content>
              <Card.Actions>
                <IconButton icon="pencil" onPress={() => openEdit(item)} />
                <IconButton icon="delete" onPress={() => confirmDelete(item)} />
              </Card.Actions>
            </Card>
          )}
        />
      )}

      <FAB icon="plus" label="Nuevo vehículo" style={styles.fab} onPress={openCreate} />

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  listContent: { padding: 12, paddingBottom: 96 },
  listContentEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyIcon: { opacity: 0.4 },
  emptyText: { textAlign: 'center', opacity: 0.6, paddingHorizontal: 24 },
  card: { marginBottom: 10, borderRadius: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardHeaderTitle: { flex: 1, minWidth: 0 },
  chipText: { color: '#fff', fontSize: 12 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
