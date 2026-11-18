import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, ActivityIndicator, TextInput, Button, HelperText, IconButton, Chip, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { CODE_REGEX } from '../utils/validators';
import { formatDateHuman } from '../utils/rutas';
import RutasPlanner from '../components/RutasPlanner';

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function ownerName(jornada) {
  const o = jornada?.owner;
  if (!o) return `Propietario #${jornada?.owner_id}`;
  return [o.first_name, o.last_name].filter(Boolean).join(' ') || `#${jornada.owner_id}`;
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
  const [activeJornada, setActiveJornada] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const resp = await api.get('/driver/jornadas');
      setEntries(resp.data || []);
    } catch (err) {
      setJoinMessage(errorMessage(err, 'No se pudieron cargar tus jornadas'));
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
      const resp = await api.post('/jornadas/join', { code });
      setCodeInput('');
      setJoinMessage('Te uniste correctamente');
      await loadEntries();
      if (resp.data?.jornada) {
        openJornada(resp.data.jornada);
      }
    } catch (err) {
      setJoinMessage(errorMessage(err, 'Código inválido'));
    } finally {
      setJoining(false);
    }
  };

  const openJornada = async (jornada) => {
    setActiveJornada(jornada);
    try {
      const resp = await api.get(`/jornadas/${jornada.id}/vehicles`);
      setVehicles(resp.data.data || []);
    } catch (err) {
      setVehicles([]);
    }
  };

  if (activeJornada) {
    const day = dateOnly(activeJornada.date);
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.activeHeader}>
          <IconButton icon="arrow-left" onPress={() => setActiveJornada(null)} />
          <View style={styles.activeHeaderText}>
            <Text variant="titleSmall">Jornada {activeJornada.label} · {formatDateHuman(day)}</Text>
            <Text variant="bodySmall" style={styles.muted}>{ownerName(activeJornada)}</Text>
          </View>
        </View>
        <View style={styles.plannerWrap}>
          <RutasPlanner
            key={activeJornada.id}
            lockedDate={day}
            fetchParams={{ jornada_id: activeJornada.id }}
            filterRuta={(ruta) => ruta.jornada_id === activeJornada.id || (ruta.owner_id === activeJornada.owner_id && dateOnly(ruta.trip_date) === day && ruta.driver_id === user.id)}
            createExtra={{ jornada_id: activeJornada.id }}
            vehicles={vehicles}
            canEdit={() => !!activeJornada.allow_edit}
            canDelete={(ruta) => !!activeJornada.allow_delete && ruta.created_by === user.id}
            editFieldSet={() => 'full'}
            createBlocked={!activeJornada.allow_create}
            createBlockedMessage="Esta jornada no permite crear viajes"
            emptyMessage="No hay viajes en esta jornada. Toca + para registrar uno."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.joinSection}>
        <Text variant="labelLarge">Unirme a una jornada</Text>
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
          <IconButton icon="calendar-account" size={40} style={styles.emptyIcon} disabled />
          <Text style={styles.emptyText}>
            Aún no te has unido a ninguna jornada.{'\n'}Introduce un código arriba para empezar el día.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const jornada = item.jornada;
            if (!jornada) return null;
            return (
              <Pressable
                onPress={() => openJornada(jornada)}
                style={({ pressed }) => [
                  styles.entryCard,
                  { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.entryTop}>
                  <Chip compact>{`Jornada ${jornada.label}`}</Chip>
                  <Text variant="bodySmall">{formatDateHuman(dateOnly(jornada.date))}</Text>
                </View>
                <Text variant="titleMedium">{ownerName(jornada)}</Text>
                <Text variant="bodySmall" style={styles.muted}>Código {jornada.code}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  joinSection: { padding: 16, paddingBottom: 0 },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codeInput: { flex: 1 },
  loader: { marginTop: 24 },
  emptyState: { alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  emptyIcon: { opacity: 0.4 },
  emptyText: { textAlign: 'center', opacity: 0.6 },
  list: { padding: 16, gap: 12 },
  entryCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, marginBottom: 10 },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  muted: { opacity: 0.65, marginTop: 2 },
  activeHeader: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  activeHeaderText: { flex: 1 },
  plannerWrap: { flex: 1 },
});
