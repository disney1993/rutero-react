import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Card, Input, Button, SegmentedButtons, IconButton, FAB, PageContainer } from '../components/ui';
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
    <View className="flex-1 bg-background dark:bg-background-dark">
      <SegmentedButtons value={tab} onValueChange={setTab} buttons={TABS} className="m-4 mb-2" />

      {tab === 'profile' && (
        <ScrollView contentContainerStyle={{ paddingTop: 4 }}>
        <PageContainer className="p-4 pt-0">
          {user.profile_incomplete && (
            <View className="rounded-xl px-3 py-2.5 mb-3 bg-error/15 dark:bg-error-dark/20">
              <Text className="text-error dark:text-error-dark text-sm">
                Este usuario no completó su perfil (falta nombre o apellido). Se le pedirá al iniciar sesión.
              </Text>
            </View>
          )}

          <Text className="mb-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">Tipo de usuario (según actividad)</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-4">
            {user.has_owner_capability && (
              <Text className="text-xs rounded px-2 py-1 bg-secondary/20 dark:bg-secondary-dark/20 text-secondary dark:text-secondary-dark">
                Propietario
              </Text>
            )}
            {user.has_driver_capability && (
              <Text className="text-xs rounded px-2 py-1 bg-tertiary/20 dark:bg-tertiary-dark/20 text-tertiary dark:text-tertiary-dark">
                Conductor
              </Text>
            )}
            {!user.has_owner_capability && !user.has_driver_capability && (
              <Text className="text-xs rounded px-2 py-1 bg-surfaceDisabled dark:bg-surfaceDisabled-dark text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                Sin actividad todavía (sin vehículos ni códigos)
              </Text>
            )}
          </View>

          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Input label="Nombre" value={firstName} onChangeText={setFirstName} error={profileErrors.firstName} />
            </View>
            <View className="flex-1">
              <Input label="Primer apellido" value={lastName} onChangeText={setLastName} error={profileErrors.lastName} />
            </View>
          </View>

          <Input label="Segundo apellido" value={secondLastName} onChangeText={setSecondLastName} error={profileErrors.secondLastName} />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" error={profileErrors.email} />

          <Text className="mt-2 mb-2 font-medium text-onSurface dark:text-onSurface-dark">Rol</Text>
          <SegmentedButtons value={role} onValueChange={setRole} buttons={[{ value: 'user', label: 'Usuario' }, { value: 'admin', label: 'Admin' }]} className="mb-1" />

          <Text className="mt-2 mb-2 font-medium text-onSurface dark:text-onSurface-dark">Plan</Text>
          <SegmentedButtons value={plan} onValueChange={setPlan} buttons={[{ value: 'free', label: 'Gratuito' }, { value: 'premium', label: 'Premium' }]} className="mb-1" />

          <Button mode="contained" onPress={saveProfile} loading={savingProfile} disabled={savingProfile || !profileDirty || !profileValid} className="mt-4">
            Guardar cambios
          </Button>
          <Button
            mode="outlined"
            onPress={confirmDeleteUser}
            loading={deleting}
            disabled={deleting}
            className="mt-3 border-error dark:border-error-dark"
            textClassName="text-error dark:text-error-dark"
          >
            Eliminar usuario
          </Button>
        </PageContainer>
        </ScrollView>
      )}

      {tab === 'vehicles' && (
        <>
          {loadingVehicles ? <ActivityIndicator className="mt-6" /> : (
            <PageContainer className="flex-1">
            <FlatList
              data={vehicles}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
              ListEmptyComponent={
                <View className="items-center mt-6">
                  <IconButton icon="car-outline" size={40} disabled className="opacity-40" />
                  <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">Sin vehículos</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Card className="mb-2" onPress={() => { setEditingVehicle(item); setVehicleFormVisible(true); }}>
                  <Card.Content>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-base font-medium text-onSurface dark:text-onSurface-dark">{item.plate || 'Sin matrícula'}</Text>
                      {item.is_default && <Text className="text-xs font-bold text-primary dark:text-primary-dark">· Predeterminado</Text>}
                    </View>
                    <Text className="text-xs text-onSurface dark:text-onSurface-dark">{[item.make, item.model].filter(Boolean).join(' ')}</Text>
                  </Card.Content>
                  <Card.Actions>
                    <IconButton icon="pencil" onPress={() => { setEditingVehicle(item); setVehicleFormVisible(true); }} />
                    <IconButton icon="delete" onPress={() => deleteVehicle(item)} />
                  </Card.Actions>
                </Card>
              )}
            />
            </PageContainer>
          )}
          <FAB icon="plus" onPress={() => { setEditingVehicle(null); setVehicleFormVisible(true); }} />
          <VehicleFormModal
            visible={vehicleFormVisible}
            onDismiss={() => setVehicleFormVisible(false)}
            onSubmit={submitVehicle}
            initialValues={editingVehicle}
            vehicles={vehicles}
            submitting={savingVehicle}
          />
        </>
      )}

      {tab === 'rutas' && (
        // Misma pantalla que ve el propio usuario en "Mis rutas" (mes/día,
        // franjas horarias, mismo formulario), pero con permisos de admin:
        // puede editar y eliminar cualquier ruta sin restricciones.
        <View className="flex-1">
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
