import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, useWindowDimensions, RefreshControl, Pressable, ActivityIndicator, Linking } from 'react-native';
import { Avatar, IconButton, FAB, Menu, getPaymentMethod, getPaymentMethodColor, PAYMENT_METHODS, CAR_COLOR_PALETTE } from './ui';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { STATUS_COLORS, STATUS_OPTIONS, shiftDate, formatDateHuman, todayISO, getDriverPermissions } from '../utils/rutas';
import { rutaHour } from '../utils/schedule';
import { formatCurrency } from '../utils/currency';
import { getVehicleSwatchColor } from '../utils/avatar';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { toastSuccess, toastError } from '../utils/toast';
import RutaFormModal from './RutaFormModal';
import MonthCalendarPicker from './MonthCalendarPicker';

function callClient(phone) {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => toastError('No se pudo abrir la app de llamadas'));
}

function whatsAppClient(phone) {
  const digits = phone.replace(/\D/g, '');
  Linking.openURL(`https://wa.me/${digits}`).catch(() => toastError('No se pudo abrir WhatsApp'));
}

// Fila compacta tipo tabla: icono del coche | hora + cliente + precio |
// trayecto. El estado y el método de pago se pueden cambiar aquí mismo
// (tocando el punto/la insignia) sin abrir el formulario completo; el resto
// de detalles (teléfono, notas, distancia...) se ven al tocar la fila.
function RutaRow({ item, prevDate, nextDate, currency, themeColors, vehicles, user, canEdit, canDelete, onEdit, onDelete, onQuickUpdate }) {
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);

  const vehicle = vehicles.find((v) => v.id === item.vehicle_id);
  const vehicleColor = getVehicleSwatchColor(vehicle, CAR_COLOR_PALETTE);
  const dayTag = item.trip_date === prevDate ? 'ayer' : item.trip_date === nextDate ? 'mañana' : null;
  const price = item.final_price ?? item.estimated_price;
  const paymentMethod = item.payment_method ? getPaymentMethod(item.payment_method) : null;
  const completerName = item.completer
    ? `${item.completer.first_name || ''} ${item.completer.last_name || ''}`.trim()
    : null;
  const canChangeStatusPayment = getDriverPermissions(item, user).canChangeStatusPayment;

  return (
    <Pressable
      onPress={() => onEdit(item)}
      style={({ pressed }) => [pressed && { backgroundColor: themeColors.surfaceDisabled }]}
      className="flex-row items-center gap-3 py-2.5 border-b border-border dark:border-border-dark"
    >
      <Avatar.Icon
        icon={item.vehicle_id ? 'car' : 'car-off'}
        size={36}
        style={{ backgroundColor: vehicleColor || themeColors.surfaceDisabled }}
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-1.5">
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <Pressable disabled={!canChangeStatusPayment} onPress={() => setStatusMenuVisible(true)} hitSlop={8}>
                  <View style={{ backgroundColor: STATUS_COLORS[item.status] }} className="w-2.5 h-2.5 rounded-full" />
                </Pressable>
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <Menu.Item
                  key={s.value}
                  title={s.label}
                  dotColor={STATUS_COLORS[s.value]}
                  selected={s.value === item.status}
                  onPress={() => { setStatusMenuVisible(false); onQuickUpdate(item, { status: s.value }); }}
                />
              ))}
            </Menu>
            <Text style={{ fontVariant: ['tabular-nums'] }} className="opacity-80 text-xs text-onSurface dark:text-onSurface-dark">
              {item.trip_time}{dayTag ? ` (${dayTag})` : ''}
            </Text>
            <Menu
              visible={paymentMenuVisible}
              onDismiss={() => setPaymentMenuVisible(false)}
              anchor={
                <Pressable disabled={!canChangeStatusPayment} onPress={() => setPaymentMenuVisible(true)} hitSlop={8}>
                  {paymentMethod ? (
                    <View style={{ backgroundColor: getPaymentMethodColor(paymentMethod, themeColors) }} className="rounded px-1 py-0.5">
                      <Text className="text-white text-[9px] font-bold">{paymentMethod.code}</Text>
                    </View>
                  ) : canChangeStatusPayment ? (
                    <View className="rounded px-1 py-0.5 border border-dashed border-border dark:border-border-dark">
                      <Text className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark text-[9px]">Pago</Text>
                    </View>
                  ) : null}
                </Pressable>
              }
            >
              {PAYMENT_METHODS.map((m) => (
                <Menu.Item
                  key={m.value}
                  title={m.label}
                  dotColor={getPaymentMethodColor(m, themeColors)}
                  selected={m.value === item.payment_method}
                  onPress={() => { setPaymentMenuVisible(false); onQuickUpdate(item, { payment_method: m.value }); }}
                />
              ))}
              {!!item.payment_method && (
                <Menu.Item title="Quitar" onPress={() => { setPaymentMenuVisible(false); onQuickUpdate(item, { payment_method: null }); }} />
              )}
            </Menu>
          </View>
          {price != null && (
            <Text className="font-bold text-onSurface dark:text-onSurface-dark">
              {formatCurrency(price, currency)}{!item.final_price && '*'}
            </Text>
          )}
        </View>
        <Text numberOfLines={1} className="text-onSurface dark:text-onSurface-dark">{item.client_name}</Text>
        <Text numberOfLines={1} className="mt-0.5 opacity-70 text-xs text-onSurface dark:text-onSurface-dark">
          {item.origin} → {item.destination}
        </Text>
        {item.status === 'completed' && completerName && (
          <Text numberOfLines={1} className="mt-0.5 opacity-60 text-[11px] italic text-onSurface dark:text-onSurface-dark">
            Completado por: {completerName}
          </Text>
        )}
      </View>
      <View className="flex-row">
        {!!item.client_phone && <IconButton icon="whatsapp" size={16} onPress={() => whatsAppClient(item.client_phone)} />}
        {!!item.client_phone && <IconButton icon="phone" size={16} onPress={() => callClient(item.client_phone)} />}
        {canEdit && <IconButton icon="pencil" size={16} onPress={() => onEdit(item)} />}
        {canDelete && <IconButton icon="delete" size={16} onPress={() => onDelete(item)} />}
      </View>
    </Pressable>
  );
}

// Vista de planificación reutilizada por "Mis rutas" (propietario), "Como
// conductor" y el detalle de usuario del admin — misma pantalla, distintas
// reglas de permiso/alcance según las props que reciba.
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
  // Por defecto la fecha seleccionada es interna (con su propia barra de
  // prev/next/día). Si el pantalla que la usa ya tiene su propio selector
  // (p.ej. un calendario de mes), puede controlarla desde afuera pasando
  // selectedDate/onDateChange y ocultar la barra con showDateBar={false}.
  selectedDate: controlledDate,
  onDateChange,
  showDateBar = true,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const currency = user?.currency || 'EUR';
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const isDateControlled = controlledDate !== undefined;
  const [internalDate, setInternalDate] = useState(todayISO());
  const selectedDate = isDateControlled ? controlledDate : internalDate;
  const setSelectedDate = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(selectedDate) : updater;
    if (isDateControlled) {
      onDateChange?.(next);
    } else {
      setInternalDate(next);
    }
  }, [isDateControlled, onDateChange, selectedDate]);

  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRuta, setEditingRuta] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const dateFrom = shiftDate(selectedDate, -1);
      const dateTo = shiftDate(selectedDate, 1);
      const resp = await api.get('/rutas', { params: { date_from: dateFrom, date_to: dateTo, ...fetchParams } });
      // La API devuelve trip_date como timestamp ISO completo (p.ej.
      // "2026-09-19T00:00:00.000000Z"), pero aquí se compara contra fechas
      // "YYYY-MM-DD" (selectedDate, prevDate, nextDate) — hay que recortarlo
      // o esas comparaciones nunca coinciden y no se muestra ninguna ruta.
      const normalized = resp.data.data.map((r) => ({ ...r, trip_date: r.trip_date?.slice(0, 10) }));
      setRutas(normalized.filter(filterRuta));
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

  // El día "visible" incluye un par de horas del día anterior/siguiente
  // (22:00-23:59 y 00:00-01:59) para no perder rutas que cruzan la
  // medianoche. Se ordenan por fecha+hora real, no por franjas en punto,
  // porque una ruta puede empezar a las 10:05 o a las 10:45.
  const prevDate = shiftDate(selectedDate, -1);
  const nextDate = shiftDate(selectedDate, 1);
  const withinWindow = (r) => {
    if (r.trip_date === selectedDate) return true;
    if (r.trip_date === prevDate) return rutaHour(r) !== null && rutaHour(r) >= 22;
    if (r.trip_date === nextDate) return rutaHour(r) !== null && rutaHour(r) <= 1;
    return false;
  };

  const noTimeRutas = rutas.filter((r) => r.trip_date === selectedDate && !r.trip_time);
  const timedRutas = rutas
    .filter((r) => r.trip_time && withinWindow(r))
    .sort((a, b) => `${a.trip_date}T${a.trip_time}`.localeCompare(`${b.trip_date}T${b.trip_time}`));

  const isEmpty = noTimeRutas.length === 0 && timedRutas.length === 0;

  const openCreate = () => {
    if (createBlocked) {
      if (onCreateBlockedPress) onCreateBlockedPress();
      else toastError(createBlockedMessage || 'No puedes crear rutas todavía');
      return;
    }
    setEditingRuta(null);
    setFormVisible(true);
  };
  const openEdit = (ruta) => { setEditingRuta(ruta); setFormVisible(true); };

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

  // Cambio rápido de estado/método de pago desde el propio listado, sin abrir
  // el detalle: son las dos acciones que se tocan a diario entre ruta y ruta.
  const quickUpdate = async (ruta, patch) => {
    try {
      const resp = await api.put(`/rutas/${ruta.id}`, patch);
      const updated = { ...resp.data, trip_date: resp.data.trip_date?.slice(0, 10) ?? ruta.trip_date };
      setRutas((prev) => prev.map((r) => (r.id === ruta.id ? updated : r)));
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo actualizar la ruta'));
    }
  };

  const renderRow = (item) => (
    <RutaRow
      key={item.id}
      item={item}
      prevDate={prevDate}
      nextDate={nextDate}
      currency={currency}
      themeColors={themeColors}
      vehicles={vehicles}
      user={user}
      canEdit={canEdit(item)}
      canDelete={canDelete(item)}
      onEdit={openEdit}
      onDelete={confirmDelete}
      onQuickUpdate={quickUpdate}
    />
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {createBlocked && (
        <Pressable
          onPress={onCreateBlockedPress}
          className="m-3 mb-0 rounded-xl py-2.5 px-3 bg-tertiary/15 dark:bg-tertiary-dark/20"
        >
          <Text className="text-center text-tertiary dark:text-tertiary-dark">
            {createBlockedMessage || 'Necesitas registrar un vehículo antes de crear rutas'}
          </Text>
        </Pressable>
      )}

      {showDateBar && (
        <View className="flex-row items-center pt-2 px-1">
          <IconButton icon="chevron-left" onPress={() => setSelectedDate((d) => shiftDate(d, -1))} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            onPress={() => setCalendarVisible(true)}
            className="flex-1 text-center capitalize font-medium text-onSurface dark:text-onSurface-dark"
          >
            {formatDateHuman(selectedDate)}
          </Text>
          <IconButton icon="chevron-right" onPress={() => setSelectedDate((d) => shiftDate(d, 1))} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlatList
          data={isEmpty ? [] : timedRutas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            { padding: 12, paddingBottom: 96 },
            isWide && { maxWidth: 900, alignSelf: 'center', width: '100%' },
            isEmpty && { flexGrow: 1 },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
          ListHeaderComponent={
            isEmpty ? null : (
              <>
                {isWide && (
                  <View className="flex-row items-center px-1 pb-1.5 gap-3">
                    <Text className="w-9 text-xs opacity-60"> </Text>
                    <Text className="flex-1 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">Cliente / trayecto</Text>
                    <Text className="w-[70px] text-xs opacity-60 text-onSurface dark:text-onSurface-dark">Precio</Text>
                    <Text className="w-[72px] text-xs opacity-60 text-right text-onSurface dark:text-onSurface-dark">Acciones</Text>
                  </View>
                )}
                {noTimeRutas.length > 0 && (
                  <View className="mb-2">
                    <Text className="mb-1.5 opacity-70 font-medium text-onSurface dark:text-onSurface-dark">Sin hora asignada</Text>
                    {noTimeRutas.map(renderRow)}
                  </View>
                )}
              </>
            )
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <IconButton icon="calendar-blank-outline" size={40} disabled className="opacity-40" />
              <Text className="text-center opacity-60 px-6 text-onSurface dark:text-onSurface-dark">{emptyMessage}</Text>
            </View>
          }
          renderItem={({ item }) => renderRow(item)}
        />
      )}

      <FAB
        icon={createBlocked ? 'lock-outline' : 'plus'}
        label={createBlocked ? undefined : 'Nueva ruta'}
        onPress={openCreate}
      />

      <RutaFormModal
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        initialValues={editingRuta}
        defaultDate={selectedDate}
        fieldSet={editingRuta ? editFieldSet(editingRuta) : 'full'}
        vehicles={vehicles}
        submitting={submitting}
      />

      <MonthCalendarPicker
        visible={calendarVisible}
        onDismiss={() => setCalendarVisible(false)}
        onSelectDate={setSelectedDate}
        selectedDate={selectedDate}
        fetchParams={fetchParams}
      />
    </View>
  );
}
