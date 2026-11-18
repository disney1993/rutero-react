import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text, Button, ActivityIndicator, Switch, IconButton, Chip, HelperText, useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { api, errorMessage } from '../utils/apiClient';
import { shiftDate, formatDateHuman, todayISO } from '../utils/rutas';
import { useConfirm } from '../context/ConfirmContext';
import { toastSuccess, toastError } from '../utils/toast';

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function MyJornadasScreen() {
  const theme = useTheme();
  const confirm = useConfirm();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setMessage('');
    try {
      const resp = await api.get('/jornadas', { params: { date: selectedDate } });
      setJornadas(resp.data.data || []);
    } catch (err) {
      setMessage(errorMessage(err, 'No se pudieron cargar las jornadas'));
      setJornadas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createJornada = async () => {
    setCreating(true);
    try {
      await api.post('/jornadas', { date: selectedDate });
      toastSuccess('Jornada creada');
      load({ silent: true });
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo crear la jornada'));
    } finally {
      setCreating(false);
    }
  };

  const togglePermission = async (jornada, key, value) => {
    try {
      const resp = await api.patch(`/jornadas/${jornada.id}`, { [key]: value });
      setJornadas((prev) => prev.map((j) => (j.id === jornada.id ? { ...j, ...resp.data } : j)));
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo actualizar el permiso'));
    }
  };

  const copyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    toastSuccess('Código copiado');
  };

  const removeJornada = async (jornada) => {
    const ok = await confirm({
      title: 'Eliminar jornada',
      message: `¿Eliminar jornada ${jornada.label} del ${formatDateHuman(dateOnly(jornada.date))}?`,
      destructive: true,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/jornadas/${jornada.id}`);
      toastSuccess('Jornada eliminada');
      load({ silent: true });
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar'));
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <Chip compact>{`Jornada ${item.label}`}</Chip>
        <IconButton icon="delete-outline" size={18} onPress={() => removeJornada(item)} />
      </View>

      <View style={styles.codeRow}>
        <Text variant="headlineSmall" style={styles.code}>{item.code}</Text>
        <Button mode="outlined" onPress={() => copyCode(item.code)}>Copiar</Button>
      </View>

      <View style={styles.permRow}>
        <Text>Crear viajes</Text>
        <Switch value={!!item.allow_create} onValueChange={(v) => togglePermission(item, 'allow_create', v)} />
      </View>
      <View style={styles.permRow}>
        <Text>Editar viajes</Text>
        <Switch value={!!item.allow_edit} onValueChange={(v) => togglePermission(item, 'allow_edit', v)} />
      </View>
      <View style={styles.permRow}>
        <Text>Eliminar viajes</Text>
        <Switch value={!!item.allow_delete} onValueChange={(v) => togglePermission(item, 'allow_delete', v)} />
      </View>

      <Text variant="bodySmall" style={styles.meta}>
        Conductores unidos: {item.driver_entries?.length ?? 0}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.dateBar}>
        <IconButton icon="chevron-left" onPress={() => setSelectedDate((d) => shiftDate(d, -1))} />
        <Text variant="titleSmall" style={styles.dateLabel}>{formatDateHuman(selectedDate)}</Text>
        <IconButton icon="chevron-right" onPress={() => setSelectedDate((d) => shiftDate(d, 1))} />
      </View>

      <HelperText type="info" visible style={styles.hint}>
        Hasta 3 jornadas por día (A, B, C). Comparte el código con tus conductores.
      </HelperText>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={jornadas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load({ silent: true }); }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay jornadas este día. Crea una para generar un código.</Text>
          }
        />
      )}

      {!!message && <HelperText type="error" visible>{message}</HelperText>}

      <Button
        mode="contained"
        icon="plus"
        onPress={createJornada}
        loading={creating}
        disabled={creating || jornadas.length >= 3}
        style={styles.fab}
      >
        {jornadas.length >= 3 ? 'Máximo 3 jornadas' : 'Nueva jornada'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dateBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  dateLabel: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  hint: { marginHorizontal: 12 },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingBottom: 96, gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  code: { letterSpacing: 2, fontWeight: '700' },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  meta: { marginTop: 8, opacity: 0.65 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 32, paddingHorizontal: 24 },
  fab: { margin: 16 },
});
