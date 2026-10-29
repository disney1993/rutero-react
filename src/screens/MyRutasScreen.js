import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { IconButton, SegmentedButtons } from '../components/ui';
import { api } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import {
  canManageVehicles,
  canShowCreateFab,
  isDriverWorkMode,
  isOwnerCapable,
} from '../utils/capabilities';
import { todayISO } from '../utils/rutas';
import { useDriverJornada } from '../hooks/useDriverJornada';
import RutasPlanner from '../components/RutasPlanner';
import JornadaBanner from '../components/JornadaBanner';
import SelectedUserBanner from '../components/SelectedUserBanner';

export default function MyRutasScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const targetUser = isAdmin ? selectedUser : user;

  const driverMode = isDriverWorkMode(user, isAdmin);
  const ownerCapable = isOwnerCapable(user, isAdmin);
  const showVehiclesNav = canManageVehicles(user, isAdmin);

  const jornada = useDriverJornada({ enabled: !isAdmin && driverMode });
  const needsJoin = driverMode && jornada.loaded && !jornada.hasJoined;
  const showFab = canShowCreateFab({ user, isAdmin, hasJoinedJornada: jornada.hasJoined });

  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [vehicles, setVehicles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!targetUser || driverMode) {
      setVehicles([]);
      setLoaded(true);
      return;
    }
    api.get('/vehicles', { params: isAdmin ? { owner_id: targetUser.id } : {} })
      .then((resp) => setVehicles(resp.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [isAdmin, targetUser?.id, driverMode]));

  if (isAdmin && !targetUser) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <SelectedUserBanner />
      </View>
    );
  }

  const ownerSelector = !isAdmin && jornada.entries.length > 1 ? (
    <SegmentedButtons
      value={jornada.selectedOwnerId ? String(jornada.selectedOwnerId) : ''}
      onValueChange={(v) => jornada.setSelectedOwnerId(Number(v))}
      buttons={jornada.entries.map((e) => ({
        value: String(e.owner_month_code.owner_id),
        label: e.owner_month_code.owner?.first_name || `#${e.owner_month_code.owner_id}`,
      }))}
      className="mx-3 mt-2"
    />
  ) : null;

  // Driver mode: empty until joined; then trips for the selected owner.
  if (driverMode) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <JornadaBanner
          showDriver
          selectedDate={selectedDate}
          codeInput={jornada.codeInput}
          onCodeInputChange={jornada.setCodeInput}
          onJoin={jornada.join}
          joining={jornada.joining}
          codeError={jornada.codeError}
          joinMessage={jornada.joinMessage}
        />
        {!jornada.loaded || jornada.loading ? (
          <ActivityIndicator className="mt-10" />
        ) : needsJoin ? (
          <View className="flex-1 items-center justify-center px-6">
            <IconButton icon="account-arrow-right-outline" size={40} disabled className="opacity-40" />
            <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
              {t('driver.noOwners')}
            </Text>
            <Text className="text-center opacity-50 text-xs mt-2 text-onSurface dark:text-onSurface-dark">
              {t('driver.joinToSeeTrips')}
            </Text>
          </View>
        ) : (
          <>
            {ownerSelector}
            <RutasPlanner
              key={jornada.selectedOwnerId}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              filterRuta={(ruta) => ruta.owner_id === jornada.selectedOwnerId && ruta.driver_id === user.id}
              createExtra={{ owner_id: jornada.selectedOwnerId }}
              canDelete={(ruta) => ruta.created_by === user.id && ruta.driver_id === user.id}
              editFieldSet={() => 'driverUpdate'}
              emptyMessage={t('driver.noRutasDay')}
              showCreateFab={showFab}
            />
          </>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {isAdmin && <SelectedUserBanner />}
      {!isAdmin && (
        <JornadaBanner
          showOwner={ownerCapable || (loaded && vehicles.length > 0)}
          selectedDate={selectedDate}
        />
      )}
      <RutasPlanner
        key={targetUser.id}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        fetchParams={isAdmin ? { user_id: targetUser.id } : {}}
        filterRuta={(ruta) => ruta.owner_id === targetUser.id}
        createExtra={isAdmin ? { owner_id: targetUser.id } : {}}
        vehicles={vehicles}
        emptyMessage={t('rutas.emptyDayCreate')}
        createBlocked={!isAdmin && loaded && vehicles.length === 0}
        createBlockedMessage={t('rutas.step1Vehicle')}
        onCreateBlockedPress={() => {
          if (showVehiclesNav) navigation.navigate('MyVehicles');
        }}
        showCreateFab={showFab}
      />
    </View>
  );
}
