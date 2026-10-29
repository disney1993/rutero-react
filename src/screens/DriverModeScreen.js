import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Input, SegmentedButtons, IconButton, PageContainer } from '../components/ui';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { getDriverPermissions, todayISO, formatDateHuman } from '../utils/rutas';
import { toastError } from '../utils/toast';
import { useDriverJornada } from '../hooks/useDriverJornada';
import JornadaBanner from '../components/JornadaBanner';
import RutasPlanner from '../components/RutasPlanner';

export default function DriverModeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const jornada = useDriverJornada();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Busca por nombre de cliente entre TODAS las rutas de este conductor (sin
  // límite de fecha) y las acota al propietario elegido arriba, para poder
  // saltar directo a un viaje sin navegar día a día.
  const onSearchChange = async (text) => {
    setSearch(text);
    if (!text.trim() || !jornada.selectedOwnerId) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const resp = await api.get('/rutas', { params: { search: text } });
      setSearchResults(resp.data.data.filter((r) => r.owner_id === jornada.selectedOwnerId));
    } catch (err) {
      toastError(errorMessage(err, t('driver.searchError')));
    } finally {
      setSearching(false);
    }
  };

  const goToResult = (ruta) => {
    setSelectedDate(ruta.trip_date.slice(0, 10));
    setSearch('');
    setSearchResults([]);
  };

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

      {jornada.loading ? (
        <ActivityIndicator className="mt-6" />
      ) : !jornada.hasJoined ? (
        <View className="items-center mt-6 px-6">
          <IconButton icon="account-arrow-right-outline" size={40} disabled className="opacity-40" />
          <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
            {t('driver.noOwners')}
          </Text>
        </View>
      ) : (
        <>
          {jornada.entries.length > 1 && (
            <SegmentedButtons
              value={jornada.selectedOwnerId ? String(jornada.selectedOwnerId) : ''}
              onValueChange={(v) => jornada.setSelectedOwnerId(Number(v))}
              buttons={jornada.entries.map((e) => ({
                value: String(e.owner_month_code.owner_id),
                label: e.owner_month_code.owner?.first_name || `#${e.owner_month_code.owner_id}`,
              }))}
              className="mx-4 mt-2"
            />
          )}

          <PageContainer className="px-4 pt-2">
            <Input
              label={t('driver.searchLabel')}
              value={search}
              onChangeText={onSearchChange}
              left="magnify"
            />
            {searching && <ActivityIndicator size="small" className="mt-1" />}
            {searchResults.length > 0 && (
              <View className="mb-2 rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark shadow-sm">
                {searchResults.map((ruta) => {
                  const perms = getDriverPermissions(ruta, user);
                  const canText = [
                    perms.canChangeStatusPayment && t('driver.permStatusPayment'),
                    perms.canDelete && t('driver.permDelete'),
                  ].filter(Boolean).join(', ') || t('driver.permNothing');
                  return (
                    <Pressable
                      key={ruta.id}
                      onPress={() => goToResult(ruta)}
                      className="p-3 border-b border-border dark:border-border-dark"
                    >
                      <Text numberOfLines={1} className="text-onSurface dark:text-onSurface-dark">
                        {ruta.client_name} · {formatDateHuman(ruta.trip_date.slice(0, 10))}
                      </Text>
                      <Text numberOfLines={1} className="text-xs opacity-60 mt-0.5 text-onSurface dark:text-onSurface-dark">
                        {t('driver.youCan', { list: canText })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </PageContainer>

          <View className="flex-1">
            <RutasPlanner
              key={jornada.selectedOwnerId}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              filterRuta={(ruta) => ruta.owner_id === jornada.selectedOwnerId && ruta.driver_id === user.id}
              createExtra={{ owner_id: jornada.selectedOwnerId }}
              canDelete={(ruta) => ruta.created_by === user.id && ruta.driver_id === user.id}
              editFieldSet={() => 'driverUpdate'}
              emptyMessage={t('driver.noRutasDay')}
            />
          </View>
        </>
      )}
    </View>
  );
}
