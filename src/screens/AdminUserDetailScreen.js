import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Card, TextInput, Button, SegmentedButtons, HelperText, IconButton, FAB, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { isValidName, isValidEmail } from '../utils/validators';
import { useConfirm } from '../context/ConfirmContext';
import { toastSuccess, toastError } from '../utils/toast';
import VehicleFormModal from '../components/VehicleFormModal';
import RutasPlanner from '../components/RutasPlanner';

const TABS = [
  { value: 'profile', label: 'Perfil' },
  { value: 'vehicles', label: 'Vehículos' },
  { value: 'rutas', label: 'Rutas' },
];

export default function AdminUserDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const initialUser = route.params.user;

  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    navigation.setOptions({ title: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email });
  }, [user, navigation]);

  // --- Perfil ---
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user.second_last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole] = useState(user.role || 'user');
  const [plan, setPlan] = useState(user.plan || 'free');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profileDirty = (
    firstName.trim() !== (user.first_name || '') ||
    lastName.trim() !== (user.last_name || '') ||
    secondLastName.trim() !== (user.second_last_name || '') ||
    email.trim() !== (user.email || '') ||
    role !== (user.role || 'user') ||
    plan !== (user.plan || 'free')
  );
  const profileErrors = {};
  if (!isValidName(firstName)) profileErrors.firstName = 'Solo letras, entre 2 y 50 caracteres';
  if (!isValidName(lastName)) profileErrors.lastName = 'Solo letras, entre 2 y 50 caracteres';
  if (secondLastName.trim() && !isValidName(secondLastName)) profileErrors.secondLastName = 'Solo letras, entre 2 y 50 caracteres';
  if (!isValidEmail(email)) profileErrors.email = 'Ingresa un email válido';
  const profileValid = Object.keys(profileErrors).length === 0;

  const saveProfile = async () => {
    if (!profileValid) return;
    setSavingProfile(true);
    try {
      const resp = await api.patch(`/admin/users/${user.id}`, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
        email: email.trim(),
        role,
        plan,
      });
      setUser(resp.data);
      toastSuccess('Usuario actualizado');
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo actualizar el usuario'));
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmDeleteUser = async () => {
    const ok = await confirm({
      title: t('alerts.confirmDeleteTitle'),
      message: t('alerts.confirmDeleteUserMessage', { name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/users/${user.id}`);
      navigation.goBack();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar el usuario'));
      setDeleting(false);
    }
  };

  // --- Vehículos ---
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleFormVisible, setVehicleFormVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      const resp = await api.get('/vehicles', { params: { owner_id: user.id } });
      setVehicles(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar los vehículos'));
    } finally {
      setLoadingVehicles(false);
    }
  }, [user.id]);

  const submitVehicle = async (payload) => {
    setSavingVehicle(true);
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, payload);
      } else {
        await api.post('/vehicles', { ...payload, owner_id: user.id });
      }
      setVehicleFormVisible(false);
      loadVehicles();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo guardar el vehículo'));
    } finally {
      setSavingVehicle(false);
    }
  };

  const deleteVehicle = async (vehicle) => {
    const ok = await confirm({
      title: t('alerts.confirmDeleteTitle'),
      message: t('alerts.confirmDeleteVehicleMessage', { name: vehicle.plate || 'este vehículo' }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;

    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      loadVehicles();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar (revisa si tiene rutas asociadas)'));
    }
  };

  useFocusEffect(useCallback(() => {
    if (tab === 'vehicles' || tab === 'rutas') loadVehicles();
  }, [tab, loadVehicles]));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SegmentedButtons value={tab} onValueChange={setTab} buttons={TABS} style={styles.tabs} />

      {tab === 'profile' && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <View style={styles.row}>
            <TextInput mode="outlined" label="Nombre" value={firstName} onChangeText={setFirstName} style={[styles.input, styles.half]} error={!!profileErrors.firstName} />
            <TextInput mode="outlined" label="Primer apellido" value={lastName} onChangeText={setLastName} style={[styles.input, styles.half]} error={!!profileErrors.lastName} />
          </View>
          <HelperText type="error" visible={!!profileErrors.firstName || !!profileErrors.lastName}>
            {profileErrors.firstName || profileErrors.lastName}
          </HelperText>

          <TextInput mode="outlined" label="Segundo apellido" value={secondLastName} onChangeText={setSecondLastName} style={styles.input} error={!!profileErrors.secondLastName} />
          <HelperText type="error" visible={!!profileErrors.secondLastName}>{profileErrors.secondLastName}</HelperText>

          <TextInput mode="outlined" label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} error={!!profileErrors.email} />
          <HelperText type="error" visible={!!profileErrors.email}>{profileErrors.email}</HelperText>

          <Text variant="labelLarge" style={styles.label}>Rol</Text>
          <SegmentedButtons value={role} onValueChange={setRole} buttons={[{ value: 'user', label: 'Usuario' }, { value: 'admin', label: 'Admin' }]} style={styles.input} />

          <Text variant="labelLarge" style={styles.label}>Plan</Text>
          <SegmentedButtons value={plan} onValueChange={setPlan} buttons={[{ value: 'free', label: 'Gratuito' }, { value: 'premium', label: 'Premium' }]} style={styles.input} />

          <Button mode="contained" onPress={saveProfile} loading={savingProfile} disabled={savingProfile || !profileDirty || !profileValid} style={styles.saveButton}>
            Guardar cambios
          </Button>
          <Button mode="outlined" textColor={theme.colors.error} onPress={confirmDeleteUser} loading={deleting} disabled={deleting} style={[styles.deleteButton, { borderColor: theme.colors.error }]}>
            Eliminar usuario
          </Button>
        </ScrollView>
      )}

      {tab === 'vehicles' && (
        <>
          {loadingVehicles ? <ActivityIndicator style={styles.loader} /> : (
            <FlatList
              data={vehicles}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <IconButton icon="car-outline" size={40} style={styles.emptyIcon} disabled />
                  <Text style={styles.emptyText}>Sin vehículos</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Card style={styles.card} onPress={() => { setEditingVehicle(item); setVehicleFormVisible(true); }}>
                  <Card.Content>
                    <Text variant="titleMedium">{item.plate || 'Sin matrícula'}</Text>
                    <Text variant="bodySmall">{[item.make, item.model].filter(Boolean).join(' ')}</Text>
                  </Card.Content>
                  <Card.Actions>
                    <IconButton icon="pencil" onPress={() => { setEditingVehicle(item); setVehicleFormVisible(true); }} />
                    <IconButton icon="delete" onPress={() => deleteVehicle(item)} />
                  </Card.Actions>
                </Card>
              )}
            />
          )}
          <FAB icon="plus" style={styles.fab} onPress={() => { setEditingVehicle(null); setVehicleFormVisible(true); }} />
          <VehicleFormModal
            visible={vehicleFormVisible}
            onDismiss={() => setVehicleFormVisible(false)}
            onSubmit={submitVehicle}
            initialValues={editingVehicle}
            submitting={savingVehicle}
          />
        </>
      )}

      {tab === 'rutas' && (
        // Misma pantalla que ve el propio usuario en "Mis rutas" (mes/día,
        // franjas horarias, mismo formulario), pero con permisos de admin:
        // puede editar y eliminar cualquier ruta sin restricciones.
        <View style={styles.plannerWrap}>
          <RutasPlanner
            key={user.id}
            fetchParams={{ user_id: user.id }}
            filterRuta={(ruta) => ruta.owner_id === user.id}
            createExtra={{ owner_id: user.id }}
            vehicles={vehicles}
            emptyMessage="Este usuario no tiene rutas este día."
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { margin: 16, marginBottom: 8 },
  tabContent: { padding: 16, paddingTop: 4 },
  row: { flexDirection: 'row', gap: 10 },
  input: { marginBottom: 4 },
  half: { flex: 1 },
  label: { marginTop: 8, marginBottom: 8 },
  saveButton: { marginTop: 16, borderRadius: 10 },
  deleteButton: { marginTop: 12, borderRadius: 10 },
  loader: { marginTop: 24 },
  listContent: { padding: 12, paddingBottom: 80 },
  emptyState: { alignItems: 'center', marginTop: 24 },
  emptyIcon: { opacity: 0.4 },
  emptyText: { textAlign: 'center', opacity: 0.6 },
  card: { marginBottom: 8, borderRadius: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipText: { color: '#fff', fontSize: 12 },
  route: { marginTop: 2, opacity: 0.7 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  plannerWrap: { flex: 1 },
});
