import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en-gb';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FAB, IconButton, SegmentedButtons } from '../components/ui';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors, withAlpha } from '../theme';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import {
  canManageVehicles,
  canShowCreateFab,
  isDriverWorkMode,
  isOwnerCapable,
} from '../utils/capabilities';
import { useDriverJornada } from '../hooks/useDriverJornada';
import { useStatusColors } from '../utils/rutas';
import { toastError, toastSuccess } from '../utils/toast';
import { haptics } from '../utils/haptics';
import RutaFormModal from '../components/RutaFormModal';
import JornadaBanner from '../components/JornadaBanner';
import SelectedUserBanner from '../components/SelectedUserBanner';

const DEFAULT_DURATION_MIN = 60;
const MIN_DURATION_MIN = 30;
const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => dayjs(d).format('YYYY-MM-DD');

// Rango de fechas a pedir a la API según la vista (en mes se incluyen los
// días de los meses vecinos que asoman en la rejilla).
function visibleRange(date, mode) {
  const d = dayjs(date);
  if (mode === 'day') return [d.startOf('day'), d.endOf('day')];
  if (mode === 'week') {
    const start = d.subtract((d.day() + 6) % 7, 'day').startOf('day'); // semana de lunes a domingo
    return [start, start.add(6, 'day').endOf('day')];
  }
  return [d.startOf('month').subtract(6, 'day'), d.endOf('month').add(6, 'day')];
}

// Cada viaje como evento del calendario: empieza a su hora y dura lo que su
// trayecto estimado (mínimo 30 min para que se pueda tocar). Los viajes sin
// hora van a la franja de "todo el día" (00:00 → 00:00 del día siguiente).
function toEvent(ruta) {
  const [y, m, d] = ruta.trip_date.slice(0, 10).split('-').map(Number);
  if (!ruta.trip_time) {
    const start = new Date(y, m - 1, d);
    return { ruta, title: ruta.client_name, start, end: dayjs(start).add(1, 'day').toDate() };
  }
  const [h, min] = ruta.trip_time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const duration = Math.max(MIN_DURATION_MIN, ruta.estimated_duration_min || DEFAULT_DURATION_MIN);
  return { ruta, title: ruta.client_name, start, end: dayjs(start).add(duration, 'minute').toDate() };
}

// Calendario de viajes con vista de día (por defecto), semana y mes. La
// pantalla "Rutas por día" es la vista en lista; esta es la vista agenda.
export default function RutasCalendarScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const targetUser = isAdmin ? selectedUser : user;
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const STATUS_COLORS = useStatusColors();

  const ownerCapable = isOwnerCapable(user, isAdmin);
  const driverMode = isDriverWorkMode(user, isAdmin);
  const showVehiclesNav = canManageVehicles(user, isAdmin);
  const jornada = useDriverJornada({ enabled: !isAdmin });
  const needsJoin = driverMode && jornada.loaded && !jornada.hasJoined;
  const showFab = canShowCreateFab({ user, isAdmin, hasJoinedJornada: jornada.hasJoined });

  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(() => new Date());
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [editingRuta, setEditingRuta] = useState(null);
  const [newDefaults, setNewDefaults] = useState({ date: toISODate(new Date()), time: null });
  const [submitting, setSubmitting] = useState(false);

  const userParams = isAdmin && targetUser ? { user_id: targetUser.id } : {};
  const [from, to] = visibleRange(date, mode);
  const rangeKey = `${from.format('YYYY-MM-DD')}_${to.format('YYYY-MM-DD')}`;

  const loadRutas = useCallback(async () => {
    if (!targetUser || needsJoin) {
      setRutas([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await api.get('/rutas', {
        params: { date_from: from.format('YYYY-MM-DD'), date_to: to.format('YYYY-MM-DD'), ...userParams },
      });
      const rows = resp.data.data || [];
      const filtered = driverMode
        ? rows.filter((r) => r.owner_id === jornada.selectedOwnerId && r.driver_id === user.id && r.trip_date)
        : rows.filter((r) => r.owner_id === targetUser.id && r.trip_date);
      setRutas(filtered);
    } catch (err) {
      toastError(errorMessage(err, t('planner.loadError')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, targetUser?.id, isAdmin, driverMode, needsJoin, jornada.selectedOwnerId, user?.id]);

  useFocusEffect(useCallback(() => { loadRutas(); }, [loadRutas]));

  useFocusEffect(useCallback(() => {
    if (!targetUser || driverMode) {
      setVehicles([]);
      setVehiclesLoaded(true);
      return;
    }
    api.get('/vehicles', { params: isAdmin ? { owner_id: targetUser.id } : {} })
      .then((resp) => setVehicles(resp.data))
      .catch(() => {})
      .finally(() => setVehiclesLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, targetUser?.id, driverMode]));

  const events = useMemo(() => (needsJoin ? [] : rutas.map(toEvent)), [rutas, needsJoin]);
  // La franja "todo el día" ocupa otra fila de hora entera bajo la cabecera;
  // solo hace falta si hay algún viaje antiguo sin hora.
  const hasAllDayEvents = useMemo(() => events.some((e) => !e.ruta.trip_time), [events]);
  const locale = i18n.language === 'en' ? 'en-gb' : 'es';
  const createBlocked = needsJoin
    || (!isAdmin && !driverMode && vehiclesLoaded && vehicles.length === 0);

  const title = useMemo(() => {
    const d = dayjs(date).locale(locale);
    if (mode === 'day') return d.format('dddd, D MMMM');
    if (mode === 'month') return d.format('MMMM YYYY');
    const [start, end] = visibleRange(date, 'week');
    return start.month() === end.month()
      ? `${start.format('D')}–${end.locale(locale).format('D MMM YYYY')}`
      : `${start.locale(locale).format('D MMM')} – ${end.locale(locale).format('D MMM YYYY')}`;
  }, [date, mode, locale]);

  const shift = (dir) => {
    haptics.selection();
    setDate((d) => dayjs(d).add(dir, mode).toDate());
  };

  const openCreate = (when) => {
    if (needsJoin) return;
    if (createBlocked) {
      if (showVehiclesNav) navigation.navigate('MyVehicles');
      return;
    }
    const d = dayjs(when || date);
    // Al tocar una franja horaria se propone esa hora (redondeada a 15 min).
    const time = when ? `${pad(d.hour())}:${pad(Math.floor(d.minute() / 15) * 15)}` : null;
    setEditingRuta(null);
    setNewDefaults({ date: d.format('YYYY-MM-DD'), time });
    setFormVisible(true);
  };

  const openEdit = (event) => {
    haptics.light();
    setEditingRuta(event.ruta);
    setFormVisible(true);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      const extra = driverMode
        ? { owner_id: jornada.selectedOwnerId }
        : (isAdmin ? { owner_id: targetUser.id } : {});
      if (editingRuta) {
        await api.put(`/rutas/${editingRuta.id}`, payload);
        toastSuccess(t('planner.updated'));
      } else {
        await api.post('/rutas', { ...payload, ...extra });
        toastSuccess(t('planner.created'));
      }
      setFormVisible(false);
      loadRutas();
    } catch (err) {
      toastError(errorMessage(err, t('planner.saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin && !targetUser) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <SelectedUserBanner />
      </View>
    );
  }

  // Eventos al estilo Calendario de iOS: fondo tintado del color de estado,
  // franja izquierda sólida y texto normal (legible también sobre neón).
  const eventCellStyle = (event) => {
    const tone = STATUS_COLORS[event.ruta.status] || c.primary;
    return {
      backgroundColor: withAlpha(tone, resolvedScheme === 'dark' ? 0.16 : 0.2),
      borderLeftWidth: 3,
      borderLeftColor: tone,
      borderRadius: 8,
    };
  };

  const calendarTheme = {
    palette: {
      primary: { main: c.primary, contrastText: c.onSurface },
      nowIndicator: c.error,
      gray: { 100: c.border, 200: c.border, 300: c.border, 500: c.onSurfaceVariant, 800: c.onSurface },
      moreLabel: c.primary,
    },
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {isAdmin && <SelectedUserBanner />}

      {!isAdmin && (
        <JornadaBanner
          showOwner={!driverMode && (ownerCapable || (vehiclesLoaded && vehicles.length > 0))}
          showDriver={driverMode}
          selectedDate={toISODate(date)}
          codeInput={jornada.codeInput}
          onCodeInputChange={jornada.setCodeInput}
          onJoin={jornada.join}
          joining={jornada.joining}
          codeError={jornada.codeError}
          joinMessage={jornada.joinMessage}
        />
      )}

      {driverMode && jornada.entries.length > 1 && (
        <SegmentedButtons
          value={jornada.selectedOwnerId ? String(jornada.selectedOwnerId) : ''}
          onValueChange={(v) => jornada.setSelectedOwnerId(Number(v))}
          buttons={jornada.entries.map((e) => ({
            value: String(e.owner_month_code.owner_id),
            label: e.owner_month_code.owner?.first_name || `#${e.owner_month_code.owner_id}`,
          }))}
          className="mx-3 mt-1"
        />
      )}

      {driverMode && (!jornada.loaded || jornada.loading) ? (
        <ActivityIndicator className="mt-10" />
      ) : needsJoin ? (
        <View className="flex-1 items-center justify-center px-6">
          <IconButton icon="account-arrow-right-outline" size={40} disabled className="opacity-40" />
          <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
            {t('driver.noOwners')}
          </Text>
        </View>
      ) : (
        <>
          <View className="px-3 pt-1 pb-2">
            <SegmentedButtons
              value={mode}
              onValueChange={setMode}
              buttons={[
                { value: 'day', label: t('calendar.day') },
                { value: 'week', label: t('calendar.week') },
                { value: 'month', label: t('calendar.month') },
              ]}
            />
            <View className="flex-row items-center mt-2">
              <IconButton icon="chevron-left" onPress={() => shift(-1)} accessibilityLabel={t('calendar.previous')} />
              {/* En la vista Día la fecha va aquí y no en la cabecera del
                  calendario (ver renderHeader), que ocupaba mucho alto. */}
              <Text numberOfLines={1} className="flex-1 text-center font-semibold capitalize text-onSurface dark:text-onSurface-dark">
                {title}
              </Text>
              {loading && <ActivityIndicator size="small" color={c.primary} className="mr-1" />}
              <Pressable
                onPress={() => { haptics.selection(); setDate(new Date()); }}
                className="px-3 py-1 rounded-full border border-primary dark:border-primary-dark active:opacity-70"
              >
                <Text className="text-xs font-semibold text-primary dark:text-primary-dark">{t('common.today')}</Text>
              </Pressable>
              <IconButton icon="chevron-right" onPress={() => shift(1)} accessibilityLabel={t('calendar.next')} />
            </View>
          </View>

          <View className="flex-1" onLayout={(e) => setCalendarHeight(e.nativeEvent.layout.height)}>
            {calendarHeight > 0 && (
              <BigCalendar
                key={`${resolvedScheme}-${locale}`}
                events={events}
                height={calendarHeight}
                mode={mode}
                date={date}
                locale={locale}
                weekStartsOn={1}
                theme={calendarTheme}
                swipeEnabled
                onSwipeEnd={(d) => setDate(d)}
                scrollOffsetMinutes={7 * 60}
                showAdjacentMonths
                moreLabel={t('calendar.more')}
                hourRowHeight={56}
                // Sin fondo propio: lo pone el contenedor. En la vista de mes, en
                // Android, la librería aplica este estilo a cada fila de semana y
                // (con el zIndex negativo de las celdas) tapaba todos los días
                // salvo el lunes.
                headerContainerStyle={{ backgroundColor: c.background }}
                bodyContainerStyle={mode === 'month' ? undefined : { backgroundColor: c.background }}
                showAllDayEventCell={hasAllDayEvents}
                // Vista Día: sin cabecera (día de la semana + número grande); la
                // fecha ya se muestra entre las flechas. Semana/mes sí la necesitan.
                renderHeader={mode === 'day' && !hasAllDayEvents ? () => null : undefined}
                eventCellStyle={eventCellStyle}
                allDayEventCellStyle={eventCellStyle}
                // La librería no usa palette.contrastText para el texto de los
                // eventos (toma el blanco de sus paletas de solapamiento):
                // sobre el fondo tintado hace falta el color de texto normal.
                eventCellTextColor={c.onSurface}
                allDayEventCellTextColor={c.onSurface}
                onPressEvent={openEdit}
                onPressCell={(d) => {
                  if (mode === 'month') { haptics.selection(); setDate(d); setMode('day'); }
                  else openCreate(d);
                }}
                onPressDateHeader={(d) => { haptics.selection(); setDate(d); setMode('day'); }}
              />
            )}
          </View>

          {showFab && (
            <FAB
              icon={createBlocked ? 'lock-outline' : 'plus'}
              label={createBlocked ? undefined : t('rutaForm.newTitle')}
              onPress={() => openCreate(null)}
            />
          )}
        </>
      )}

      <RutaFormModal
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSubmit={handleSubmit}
        initialValues={editingRuta}
        defaultDate={newDefaults.date}
        defaultTime={newDefaults.time}
        fieldSet={driverMode && editingRuta ? 'driverUpdate' : 'full'}
        vehicles={vehicles}
        submitting={submitting}
      />
    </View>
  );
}
