import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, TextInput, Button, SegmentedButtons, HelperText, IconButton, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { CODE_REGEX } from '../utils/validators';
import RutasPlanner from '../components/RutasPlanner';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function DriverModeScreen() {
  const theme = useTheme();
  const { user } = useAuth();

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const resp = await api.get('/driver/my-codes');
      const active = resp.data.filter((e) => e.owner_month_code?.month === currentMonth());
      setEntries(active);
      setSelectedOwnerId((prev) => prev ?? active[0]?.owner_month_code.owner_id ?? null);
    } catch (err) {
      setJoinMessage(errorMessage(err, 'No se pudieron cargar tus códigos'));
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

  const handleJoin = async () => {
    setCodeError('');
    const code = codeInput.trim().toUpperCase();
    if (!CODE_REGEX.test(code)) {
      setCodeError('El código tiene 8 caracteres (letras y números)');
      return;
    }
    setJoining(true);
    try {
      await api.post('/driver/join-code', { code, month: currentMonth() });
      setCodeInput('');
      setJoinMessage('Te uniste correctamente');
      loadEntries();
    } catch (err) {
      setJoinMessage(errorMessage(err, 'Código inválido'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.joinSection}>
        <Text variant="labelLarge">Unirme a un código de propietario</Text>
        <View style={styles.joinRow}>
          <TextInput
            mode="outlined"
            label="Código (8 caracteres)"
            value={codeInput}
            onChangeText={setCodeInput}
            autoCapitalize="characters"
            maxLength={8}
            style={styles.codeInput}
          />
          <Button mode="contained" onPress={handleJoin} loading={joining} disabled={joining}>Unirme</Button>
        </View>
        <HelperText type={codeError ? 'error' : 'info'} visible={!!codeError || !!joinMessage}>
          {codeError || joinMessage}
        </HelperText>
      </View>

      {loadingEntries ? (
        <ActivityIndicator style={styles.loader} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <IconButton icon="account-arrow-right-outline" size={40} style={styles.emptyIcon} disabled />
          <Text style={styles.emptyText}>Aún no te has unido a ningún propietario este mes.{'\n'}Introduce un código arriba para empezar.</Text>
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
              style={styles.ownerPicker}
            />
          )}

          <View style={styles.plannerWrap}>
            <RutasPlanner
              key={selectedOwnerId}
              filterRuta={(ruta) => ruta.owner_id === selectedOwnerId && ruta.driver_id === user.id}
              createExtra={{ owner_id: selectedOwnerId }}
              canDelete={(ruta) => ruta.created_by === user.id && ruta.driver_id === user.id}
              editFieldSet={(ruta) => (ruta.created_by === user.id ? 'full' : 'driverUpdate')}
              emptyMessage="No tienes rutas este día para este propietario."
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  joinSection: { padding: 16, paddingBottom: 0 },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codeInput: { flex: 1 },
  ownerPicker: { marginHorizontal: 16, marginTop: 8 },
  loader: { marginTop: 24 },
  emptyState: { alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  emptyIcon: { opacity: 0.4 },
  emptyText: { textAlign: 'center', opacity: 0.6 },
  plannerWrap: { flex: 1 },
});
