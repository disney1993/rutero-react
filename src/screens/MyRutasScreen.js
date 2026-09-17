import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { IconButton } from '../components/ui';
import { api } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import RutasPlanner from '../components/RutasPlanner';
import OwnerCodeDialog from '../components/OwnerCodeDialog';
import SelectedUserBanner from '../components/SelectedUserBanner';

export default function MyRutasScreen({ navigation }) {
  const { user, isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const targetUser = isAdmin ? selectedUser : user;

  const [vehicles, setVehicles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [codeDialogVisible, setCodeDialogVisible] = useState(false);

  useLayoutEffect(() => {
    // El código para conductores es del propio dueño de la sesión; no tiene
    // sentido mientras el admin está viendo la cuenta de otro usuario.
    navigation.setOptions({
      headerRight: isAdmin ? undefined : () => (
        <IconButton icon="account-key-outline" onPress={() => setCodeDialogVisible(true)} accessibilityLabel="Código para conductores" />
      ),
    });
  }, [navigation, isAdmin]);

  useFocusEffect(useCallback(() => {
    if (!targetUser) { setLoaded(true); return; }
    api.get('/vehicles', { params: isAdmin ? { owner_id: targetUser.id } : {} })
      .then((resp) => setVehicles(resp.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [isAdmin, targetUser?.id]));

  if (isAdmin && !targetUser) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <SelectedUserBanner />
      </View>
    );
  }

  return (
    <>
      {isAdmin && <SelectedUserBanner />}
      <RutasPlanner
        key={targetUser.id}
        fetchParams={isAdmin ? { user_id: targetUser.id } : {}}
        filterRuta={(ruta) => ruta.owner_id === targetUser.id}
        createExtra={isAdmin ? { owner_id: targetUser.id } : {}}
        vehicles={vehicles}
        emptyMessage="No hay rutas este día. Toca + para crear una."
        createBlocked={!isAdmin && loaded && vehicles.length === 0}
        createBlockedMessage="Paso 1: registra un vehículo antes de crear tu primera ruta"
        onCreateBlockedPress={() => navigation.navigate('MyVehicles')}
      />
      <OwnerCodeDialog visible={codeDialogVisible} onDismiss={() => setCodeDialogVisible(false)} />
    </>
  );
}
