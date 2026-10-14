import React, { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Input, Button, SegmentedButtons, IconButton, cn, PageContainer } from '../components/ui';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { CODE_REGEX } from '../utils/validators';
import { getDriverPermissions, todayISO, formatDateHuman } from '../utils/rutas';
import { toastError } from '../utils/toast';
import RutasPlanner from '../components/RutasPlanner';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function DriverModeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const resp = await api.get('/driver/my-codes');
      const active = resp.data.filter((e) => e.owner_month_code?.month === currentMonth());
      setEntries(active);
      setSelectedOwnerId((prev) => prev ?? active[0]?.owner_month_code.owner_id ?? null);
    } catch (err) {
      setJoinMessage(errorMessage(err, t('driver.codesLoadError')));
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

  const handleJoin = async () => {
    setCodeError('');
    const code = codeInput.trim().toUpperCase();
    if (!CODE_REGEX.test(code)) {
      setCodeError(t('driver.codeFormat'));
      return;
    }
    setJoining(true);
    try {
      await api.post('/driver/join-code', { code, month: currentMonth() });
      setCodeInput('');
      setJoinMessage(t('driver.joined'));
      loadEntries();
    } catch (err) {
      setJoinMessage(errorMessage(err, t('driver.invalidCode')));
    } finally {
      setJoining(false);
    }
  };

  // Busca por nombre de cliente entre TODAS las rutas de este conductor (sin
  // límite de fecha) y las acota al propietario elegido arriba, para poder
  // saltar directo a un viaje sin navegar día a día.
  const onSearchChange = async (text) => {
    setSearch(text);
    if (!text.trim() || !selectedOwnerId) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const resp = await api.get('/rutas', { params: { search: text } });
      setSearchResults(resp.data.data.filter((r) => r.owner_id === selectedOwnerId));
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
      <PageContainer className="p-4 pb-0">
        <Text className="font-medium text-onSurface dark:text-onSurface-dark">{t('driver.joinTitle')}</Text>
        <View className="flex-row gap-2.5 items-start mt-1">
          <View className="flex-1">
            <Input
              label={t('driver.codeLabel')}
              value={codeInput}
              onChangeText={setCodeInput}
              autoCapitalize="characters"
              maxLength={8}
            />
          </View>
          <Button mode="contained" onPress={handleJoin} loading={joining} disabled={joining}>{t('driver.join')}</Button>
        </View>
        {(!!codeError || !!joinMessage) && (
          <Text className={cn('text-xs mb-1', codeError ? 'text-error dark:text-error-dark' : 'opacity-70 text-onSurface dark:text-onSurface-dark')}>
            {codeError || joinMessage}
          </Text>
        )}
      </PageContainer>

      {loadingEntries ? (
        <ActivityIndicator className="mt-6" />
      ) : entries.length === 0 ? (
        <View className="items-center mt-6 px-6">
          <IconButton icon="account-arrow-right-outline" size={40} disabled className="opacity-40" />
          <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
            {t('driver.noOwners')}
          </Text>
        </View>
      ) : (
        <>
          {entries.length > 1 && (
            <SegmentedButtons
              value={selectedOwnerId ? String(selectedOwnerId) : ''}
              onValueChange={(v) => setSelectedOwnerId(Number(v))}
              buttons={entries.map((e) => ({
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
              key={selectedOwnerId}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              filterRuta={(ruta) => ruta.owner_id === selectedOwnerId && ruta.driver_id === user.id}
              createExtra={{ owner_id: selectedOwnerId }}
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
