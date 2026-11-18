import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions, RefreshControl, Pressable, Platform } from 'react-native';
import { Text, Avatar, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { STATUS_COLORS, shiftDate, formatDateHuman, todayISO, normalizeTripDate, normalizeTripTime } from '../utils/rutas';
import { rutaHour } from '../utils/schedule';
import { formatCurrency } from '../utils/currency';
import { getVehicleColor } from '../utils/avatar';
import { vehicleIconSource } from './VehicleTypeIcon';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { toastSuccess, toastError } from '../utils/toast';
import RutaFormModal from './RutaFormModal';
import MonthCalendarPicker from './MonthCalendarPicker';
import AppFab from './AppFab';

const IS_WEB = Platform.OS === 'web';

let RutasAgendaWeb = null;
if (IS_WEB) {
  // FullCalendar es DOM-only; en nativo se usa la agenda lista.
  // eslint-disable-next-line global-require
  RutasAgendaWeb = require('./RutasAgendaWeb').default;
}

export default function RutasPlanner({
  fetchParams = {},
  filterRuta = () => true,
  createExtra = {},
  canEdit = () => true,
  canDelete = () => true,
  editFieldSet = () => 'full',
  vehicles = [],
  emptyMessage = 'No hay rutas este día',
  createBlocked = false,
  createBlockedMessage = '',
  onCreateBlockedPress,
  lockedDate = null,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const currency = user?.currency || 'EUR';
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const [selectedDate, setSelectedDate] = useState(lockedDate || todayISO());
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRuta, setEditingRuta] = useState(null);
  const [createDefaults, setCreateDefaults] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (lockedDate) setSelectedDate(lockedDate);
  }, [lockedDate]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const dateFrom = shiftDate(selectedDate, -1);
      const dateTo = shiftDate(selectedDate, 1);
      const resp = await api.get('/rutas', { params: { date_from: dateFrom, date_to: dateTo, ...fetchParams } });
      setRutas(resp.data.data.filter(filterRuta));
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar las rutas'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, JSON.stringify(fetchParams)]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const prevDate = shiftDate(selectedDate, -1);
  const nextDate = shiftDate(selectedDate, 1);
  const withinWindow = (r) => {
    const d = normalizeTripDate(r.trip_date);
    if (d === selectedDate) return true;
    if (d === prevDate) return rutaHour(r) !== null && rutaHour(r) >= 22;
    if (d === nextDate) return rutaHour(r) !== null && rutaHour(r) <= 1;
    return false;
  };

  const visibleRutas = useMemo(
    () => rutas.filter((r) => {
      const d = normalizeTripDate(r.trip_date);
      const t = normalizeTripTime(r.trip_time);
      if (!t) return d === selectedDate;
      return withinWindow(r);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rutas, selectedDate]
  );

  const noTimeRutas = visibleRutas.filter((r) => normalizeTripDate(r.trip_date) === selectedDate && !normalizeTripTime(r.trip_time));
  const timedRutas = visibleRutas
    .filter((r) => normalizeTripTime(r.trip_time) && withinWindow(r))
    .sort((a, b) => {
      const da = `${normalizeTripDate(a.trip_date)}T${normalizeTripTime(a.trip_time)}`;
      const db = `${normalizeTripDate(b.trip_date)}T${normalizeTripTime(b.trip_time)}`;
      return da.localeCompare(db);
    });

  const isEmpty = noTimeRutas.length === 0 && timedRutas.length === 0;
  const useAgenda = IS_WEB && !!RutasAgendaWeb;

  const openCreate = (defaults = null) => {
    if (createBlocked) {
      if (onCreateBlockedPress) onCreateBlockedPress();
      else toastError(createBlockedMessage || 'No puedes crear rutas todavía');
      return;
    }
    setEditingRuta(null);
    setCreateDefaults(defaults);
    setFormVisible(true);
  };
  const openEdit = (ruta) => {
    setCreateDefaults(null);
    setEditingRuta(ruta);
    setFormVisible(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (editingRuta) {
        await api.put(`/rutas/${editingRuta.id}`, payload);
        toastSuccess('Ruta actualizada');
      } else {
        await api.post('/rutas', { ...payload, ...createExtra });
        toastSuccess('Ruta creada');
      }
      setFormVisible(false);
      setCreateDefaults(null);
      load();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo guardar la ruta'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (ruta) => {
    const ok = await confirm({
      title: t('alerts.confirmDeleteTitle'),
      message: t('alerts.confirmDeleteRutaMessage', { name: ruta.client_name }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;

    try {
      await api.delete(`/rutas/${ruta.id}`);
      toastSuccess('Ruta eliminada');
      load();
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo eliminar la ruta'));
    }
  };

  const formDefaultDate = editingRuta
    ? undefined
    : (createDefaults?.date || selectedDate);
  const formDefaultTime = editingRuta
    ? null
    : (createDefaults?.time || null);

  const renderRow = (item) => {
    const vehicle = vehicles.find((v) => v.id === item.vehicle_id);
    const vehicleColor = getVehicleColor(item.vehicle_id);
    const day = normalizeTripDate(item.trip_date);
    const time = normalizeTripTime(item.trip_time);
    const dayTag = day === prevDate ? 'ayer' : day === nextDate ? 'mañana' : null;
    const price = item.final_price ?? item.estimated_price;

    return (
      <Pressable key={item.id} onPress={() => openEdit(item)} style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.colors.outlineVariant },
        pressed && { backgroundColor: theme.colors.surfaceVariant },
      ]}>
        <Avatar.Icon
          icon={item.vehicle_id ? vehicleIconSource(vehicle?.vehicle_type) : 'car-off'}
          size={36}
          style={vehicleColor ? { backgroundColor: vehicleColor } : { backgroundColor: theme.colors.surfaceDisabled }}
          color="#fff"
        />
        <View style={styles.rowMain}>
          <View style={styles.rowHeaderLine}>
            <View style={styles.rowTimeAndStatus}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
              <Text variant="bodySmall" style={styles.time}>
                {time || 'Sin hora'}{dayTag ? ` (${dayTag})` : ''}
              </Text>
            </View>
            {price != null && (
              <Text variant="bodyMedium" style={styles.price}>
                {formatCurrency(price, currency)}{!item.final_price && '*'}
              </Text>
            )}
          </View>
          <Text variant="bodyMedium" numberOfLines={1}>{item.client_name}</Text>
          <Text variant="bodySmall" style={styles.route} numberOfLines={1}>{item.origin} → {item.destination}</Text>
        </View>
        <View style={styles.rowActions}>
          {canEdit(item) && <IconButton icon="pencil" size={16} onPress={() => openEdit(item)} />}
          {canDelete(item) && <IconButton icon="delete" size={16} onPress={() => confirmDelete(item)} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {createBlocked && (
        <Pressable onPress={onCreateBlockedPress} style={[styles.blockedBanner, { backgroundColor: theme.colors.tertiaryContainer }]}>
          <Text variant="bodyMedium" style={[styles.blockedBannerText, { color: theme.colors.onTertiaryContainer }]}>
            {createBlockedMessage || 'Necesitas registrar un vehículo antes de crear rutas'}
          </Text>
        </Pressable>
      )}

      {!useAgenda && (
        <View style={styles.dateBar}>
          <IconButton
            icon="chevron-left"
            disabled={!!lockedDate}
            onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
          />
          <Text
            variant="titleSmall"
            style={styles.dateLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            onPress={lockedDate ? undefined : () => setPickerVisible(true)}
          >
            {formatDateHuman(selectedDate)}
          </Text>
          <IconButton
            icon="chevron-right"
            disabled={!!lockedDate}
            onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : useAgenda ? (
        <RutasAgendaWeb
          selectedDate={selectedDate}
          rutas={visibleRutas}
          currency={currency}
          editable={!createBlocked}
          lockedDate={!!lockedDate}
          onSelectRuta={openEdit}
          onCreateAt={(slot) => openCreate(slot)}
          onDatesChange={(iso) => {
            if (!lockedDate && iso !== selectedDate) setSelectedDate(iso);
          }}
        />
      ) : (
        <FlatList
          data={isEmpty ? [] : timedRutas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, isWide && styles.listContentWide, isEmpty && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListHeaderComponent={
            isEmpty ? null : (
              <>
                {isWide && (
                  <View style={styles.tableHeader}>
                    <Text variant="labelSmall" style={styles.tableHeaderIconCol}> </Text>
                    <Text variant="labelSmall" style={styles.tableHeaderMain}>Cliente / trayecto</Text>
                    <Text variant="labelSmall" style={styles.tableHeaderPrice}>Precio</Text>
                    <Text variant="labelSmall" style={styles.tableHeaderActions}>Acciones</Text>
                  </View>
                )}
                {noTimeRutas.length > 0 && (
                  <View style={styles.noTimeSection}>
                    <Text variant="labelLarge" style={styles.noTimeLabel}>Sin hora asignada</Text>
                    {noTimeRutas.map(renderRow)}
                  </View>
                )}
              </>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconButton icon="calendar-blank-outline" size={40} style={styles.emptyIcon} disabled />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          }
          renderItem={({ item }) => renderRow(item)}
        />
      )}

      <AppFab
        icon={createBlocked ? 'lock-outline' : 'plus'}
        label={createBlocked ? undefined : 'Nueva ruta'}
        style={styles.fab}
        onPress={() => openCreate(null)}
      />

      <RutaFormModal
        visible={formVisible}
        onDismiss={() => { setFormVisible(false); setCreateDefaults(null); }}
        onSubmit={handleSubmit}
        initialValues={editingRuta}
        defaultDate={formDefaultDate}
        defaultTime={formDefaultTime}
        fieldSet={editingRuta ? editFieldSet(editingRuta) : 'full'}
        vehicles={vehicles}
        submitting={submitting}
      />

      <MonthCalendarPicker
        visible={pickerVisible && !lockedDate}
        onDismiss={() => setPickerVisible(false)}
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
        fetchParams={fetchParams}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blockedBanner: { margin: 12, marginBottom: 0, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  blockedBannerText: { textAlign: 'center' },
  dateBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingHorizontal: 4 },
  dateLabel: { flex: 1, textTransform: 'capitalize', textAlign: 'center' },
  loader: { marginTop: 40 },
  listContent: { padding: 12, paddingBottom: 96 },
  listContentWide: { maxWidth: 900, alignSelf: 'center', width: '100%' },
  listContentEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyIcon: { opacity: 0.4 },
  emptyText: { textAlign: 'center', opacity: 0.6, paddingHorizontal: 24 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 6, gap: 12 },
  tableHeaderIconCol: { width: 36 },
  tableHeaderMain: { flex: 1, opacity: 0.6 },
  tableHeaderPrice: { width: 70, opacity: 0.6 },
  tableHeaderActions: { width: 72, opacity: 0.6, textAlign: 'right' },
  noTimeSection: { marginBottom: 8 },
  noTimeLabel: { marginBottom: 6, opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1, minWidth: 0 },
  rowHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTimeAndStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  time: { fontVariant: ['tabular-nums'], opacity: 0.8 },
  price: { fontWeight: '700' },
  route: { marginTop: 2, opacity: 0.7 },
  rowActions: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
