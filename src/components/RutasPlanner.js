import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, useWindowDimensions, RefreshControl, Pressable, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, IconButton, FAB, Menu, Dialog, Button, StatusBadge, SwipeToDelete, VehicleTypeIcon, Avatar } from './ui';
import { carColorToHex } from '../utils/carColors';
import { PAYMENT_METHODS, getPaymentMethod, getPaymentMethodColor } from '../utils/paymentMethods';
import PaymentMethodBadge from './ui/PaymentMethodBadge';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { api, errorMessage } from '../utils/apiClient';
import { STATUS_COLORS, STATUS_OPTIONS, shiftDate, formatDateHuman, todayISO, getDriverPermissions } from '../utils/rutas';
import { rutaHour } from '../utils/schedule';
import { formatCurrency } from '../utils/currency';
import { getInitials, resolveAvatarColor } from '../utils/avatar';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { toastSuccess, toastError, toastInfo } from '../utils/toast';
import { haptics } from '../utils/haptics';
import { useSwipeHint } from '../utils/swipeHint';
import RutaFormModal from './RutaFormModal';
import MonthCalendarPicker from './MonthCalendarPicker';
import AutoCompleteNotice from './AutoCompleteNotice';
import AutoCompleteReviewModal from './AutoCompleteReviewModal';
import { autoCompleteEnabled, formatEta, isEtaSoon } from '../utils/autoComplete';

// Cada cuánto se refresca la jornada abierta para reflejar los cierres
// automáticos que hace el cron del servidor.
const POLL_MS = 60000;
const SEEN_KEY = 'rutero.autoCompleteSeen';
const INTRO_KEY = 'rutero.autoCompleteIntroSeen';

function callClient(phone) {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => toastError(i18n.t('planner.callError')));
}

function whatsAppClient(phone) {
  const digits = phone.replace(/\D/g, '');
  Linking.openURL(`https://wa.me/${digits}`).catch(() => toastError(i18n.t('planner.whatsappError')));
}

// Fila compacta tipo tabla: icono del coche | hora + cliente + precio |
// trayecto. El estado y el método de pago se pueden cambiar aquí mismo
// (tocando el punto/la insignia) sin abrir el formulario completo; el resto
// de detalles (teléfono, notas, distancia...) se ven al tocar la fila.
// Acción rápida a todo lo alto de la fila (WhatsApp / llamar): columnas
// grandes para no tener que apuntar, sin abrir el detalle del viaje.
// En móvil solo el icono; en tablet/escritorio (showLabel) también el texto.
function QuickAction({ icon, label, color, onPress, showLabel }) {
  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: `${color}40` }}
      style={{ backgroundColor: `${color}1A` }}
      className={`${showLabel ? 'w-[72px]' : 'w-[52px]'} items-center justify-center border-l border-border dark:border-border-dark active:opacity-70`}
    >
      <Icon name={icon} size={24} color={color} />
      {showLabel && <Text style={{ color }} className="mt-0.5 text-[10px] font-semibold">{label}</Text>}
    </Pressable>
  );
}

function userInCompletions(item, userId) {
  if (!userId) return false;
  if ((item.completions || []).some((c) => c.user_id === userId || c.user?.id === userId)) return true;
  return item.completed_by === userId;
}

/** Compact list avatar: canceller when soft-deleted, else first completer. */
function rowAvatarPerson(item) {
  if (item.deleted_at && item.canceller) return item.canceller;
  if (item.status === 'completed') {
    const fromPivot = (item.completions || []).map((c) => c.user).find(Boolean);
    return fromPivot || item.completer || null;
  }
  return null;
}

function RutaRow({ item, prevDate, nextDate, currency, themeColors, vehicles, user, canDelete, onEdit, onDelete, onQuickUpdate, onSwiped, peek, onPeekDone, isWide, onRestore }) {
  const { t } = useTranslation();
  // Viaje eliminado (borrado blando): se ve atenuado y tachado; tocarlo ofrece restaurarlo.
  const isDeleted = !!item.deleted_at;
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);

  const vehicle = vehicles.find((v) => v.id === item.vehicle_id);
  const paint = carColorToHex(vehicle?.color);
  const dayTag = item.trip_date === prevDate ? t('planner.yesterday') : item.trip_date === nextDate ? t('planner.tomorrow') : null;
  const price = item.final_price ?? item.estimated_price;
  const paymentMethod = item.payment_method ? getPaymentMethod(item.payment_method) : null;
  const avatarPerson = rowAvatarPerson(item);
  const showWillComplete = item.status === 'pending' && !!item.auto_complete_eta && isEtaSoon(item.auto_complete_eta, 15);
  const alreadyMarked = userInCompletions(item, user?.id);
  const canChangeStatusPayment = !isDeleted && getDriverPermissions(item, user).canChangeStatusPayment;

  // Gestos: → completar (si ya está completado y este usuario aún no se ha
  // registrado, vuelve a enviar "completed" para sumar su marca; si ya está
  // en la lista, vuelve a pendiente). ← cancelar (= borrado blando).
  const rightSwipeAction = (() => {
    if (item.status !== 'completed') {
      return { status: 'completed', label: t('status.completed'), icon: 'check-circle-outline', color: STATUS_COLORS.completed };
    }
    if (!alreadyMarked) {
      return { status: 'completed', label: t('planner.markCompleted'), icon: 'check-circle-outline', color: STATUS_COLORS.completed };
    }
    return { status: 'pending', label: t('status.pending'), icon: 'clock-outline', color: STATUS_COLORS.pending };
  })();
  // Soft status tint on the details zone (same alpha as WhatsApp/call columns).
  const rowTintHex = isDeleted
    ? STATUS_COLORS.cancelled
    : (STATUS_COLORS[item.status] || STATUS_COLORS.pending);
  const rowTintBg = `${rowTintHex}1A`;
  return (
    <SwipeToDelete
      rounded={false}
      enabled={!isDeleted}
      onDelete={() => onDelete(item)}
      deleteLabel={t('planner.cancel')}
      deleteIcon="close-circle-outline"
      blockedReason={canDelete ? null : t('planner.cannotDelete')}
      onBlocked={toastInfo}
      onSwiped={onSwiped}
      peek={peek}
      onPeekDone={onPeekDone}
      rightSwipe={{
        label: rightSwipeAction.label,
        icon: rightSwipeAction.icon,
        color: rightSwipeAction.color,
        onTrigger: () => {
          // Align with auto-complete: completing via swipe defaults to cash.
          const patch = { status: rightSwipeAction.status };
          if (rightSwipeAction.status === 'completed') {
            patch.payment_method = 'efectivo';
          }
          onQuickUpdate(item, patch);
        },
        blockedReason: canChangeStatusPayment ? null : t('planner.cannotChangeStatus'),
      }}
    >
    <View className="flex-row items-stretch bg-background dark:bg-background-dark border-b border-border dark:border-border-dark">
    {/* Full details column tint (same 1A alpha as WhatsApp/call). Own View so
        Pressable / icon surface classes cannot hide or clip the wash. */}
    <View style={{ backgroundColor: rowTintBg }} className="flex-1">
    <Pressable
      onPress={() => { haptics.light(); if (isDeleted) onRestore(item); else onEdit(item); }}
      android_ripple={{ color: themeColors.border }}
      style={({ pressed }) => [
        pressed && { backgroundColor: themeColors.surfaceDisabled },
      ]}
      className={`flex-1 flex-row items-center gap-3 py-2.5 pr-2 ${isDeleted ? 'opacity-50' : ''}`}
    >
      <View className="w-12 h-9 rounded-lg items-center justify-center">
        {vehicle ? (
          <VehicleTypeIcon
            type={vehicle.vehicle_type}
            size={40}
            color={paint || themeColors.primary}
            cutoutColor={themeColors.background}
            outlineColor={paint ? themeColors.onSurface : undefined}
          />
        ) : (
          <Icon name="car-off" size={20} color={themeColors.onSurfaceVariant} />
        )}
      </View>
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
            {isDeleted && <StatusBadge tone="error">{t('status.cancelled')}</StatusBadge>}
            <Menu
              visible={paymentMenuVisible}
              onDismiss={() => setPaymentMenuVisible(false)}
              anchor={
                <Pressable disabled={!canChangeStatusPayment} onPress={() => setPaymentMenuVisible(true)} hitSlop={8}>
                  {paymentMethod ? (
                    <PaymentMethodBadge method={paymentMethod} themeColors={themeColors} size="sm" />
                  ) : canChangeStatusPayment ? (
                    <View className="rounded px-1 py-0.5 border border-dashed border-border dark:border-border-dark">
                      <Text className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark text-[9px]">{t('planner.payment')}</Text>
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
                <Menu.Item title={t('common.remove')} onPress={() => { setPaymentMenuVisible(false); onQuickUpdate(item, { payment_method: null }); }} />
              )}
            </Menu>
          </View>
          <View className="flex-row items-center gap-1.5">
            {!!avatarPerson && (
              <Avatar.Text
                size={18}
                label={getInitials(avatarPerson.first_name, avatarPerson.last_name)}
                color={resolveAvatarColor(avatarPerson.avatar_color)}
              />
            )}
            {price != null && (
              <Text className="font-bold text-onSurface dark:text-onSurface-dark">
                {formatCurrency(price, currency)}{!item.final_price && '*'}
              </Text>
            )}
          </View>
        </View>
        <Text numberOfLines={1} style={isDeleted ? { textDecorationLine: 'line-through' } : undefined} className="text-onSurface dark:text-onSurface-dark">{item.client_name}</Text>
        <Text numberOfLines={1} className="mt-0.5 opacity-70 text-xs text-onSurface dark:text-onSurface-dark">
          {item.origin} → {item.destination}
        </Text>
        {showWillComplete && (
          <Text numberOfLines={1} className="mt-0.5 opacity-60 text-[11px] text-onSurface dark:text-onSurface-dark">
            {t('planner.willComplete', { time: formatEta(item.auto_complete_eta, item.trip_date) })}
          </Text>
        )}
        {item.needs_review && (
          <View className="mt-1">
            <StatusBadge tone="tertiary">{t('review.autoCompleted')} · {t('planner.toReview')}</StatusBadge>
          </View>
        )}
        {item.auto_completed && !item.needs_review && (
          <Text numberOfLines={1} className="mt-0.5 opacity-60 text-[11px] italic text-onSurface dark:text-onSurface-dark">
            {t('review.autoCompleted')}
          </Text>
        )}
      </View>
    </Pressable>
    </View>
    {!!item.client_phone && (
      <>
        <QuickAction icon="whatsapp" label="WhatsApp" color="#25D366" showLabel={isWide} onPress={() => whatsAppClient(item.client_phone)} />
        <QuickAction icon="phone" label={t('planner.call')} color={themeColors.primary} showLabel={isWide} onPress={() => callClient(item.client_phone)} />
      </>
    )}
    </View>
    </SwipeToDelete>
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
  emptyMessage,
  createBlocked = false,
  createBlockedMessage = '',
  onCreateBlockedPress,
  showCreateFab = true,
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
  const navigation = useNavigation();
  const [reviewRutas, setReviewRutas] = useState([]);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [introVisible, setIntroVisible] = useState(false);
  const hideNotice = useCallback(() => setNotice(null), []);

  // Viajes cerrados por el cron y sin revisar (de cualquier fecha). Si hay
  // alguno que este dispositivo aún no había visto, se muestra el aviso
  // informativo, una sola vez por viaje.
  const loadReview = useCallback(async () => {
    if (!user) return;
    try {
      const { date, date_from, date_to, ...scope } = fetchParams;
      // Un admin sin usuario seleccionado vería los cierres de toda la plataforma.
      if (user.is_admin && !scope.user_id) {
        setReviewRutas([]);
        return;
      }
      const resp = await api.get('/rutas', { params: { ...scope, needs_review: 1 } });
      const pending = resp.data.data.filter(filterRuta);
      setReviewRutas(pending);

      const seenKey = `${SEEN_KEY}.${user.id}`;
      let seen = [];
      try {
        seen = JSON.parse((await AsyncStorage.getItem(seenKey)) || '[]');
      } catch (e) {
        seen = [];
      }
      const fresh = pending.filter((r) => !seen.includes(r.id));
      if (fresh.length > 0) {
        if (fresh.length === 1) {
          const r = fresh[0];
          const method = getPaymentMethod(r.payment_method);
          const price = r.final_price ?? r.estimated_price;
          setNotice({
            title: t('planner.noticeOne', { time: r.trip_time || '--:--' }),
            detail: [r.client_name, method?.label, price != null ? formatCurrency(price, currency) : null].filter(Boolean).join(' · '),
          });
        } else {
          setNotice({ title: t('planner.noticeMany', { count: fresh.length }), detail: t('planner.noticeManyDetail') });
        }
        const nextSeen = [...seen, ...fresh.map((r) => r.id)].slice(-500);
        AsyncStorage.setItem(seenKey, JSON.stringify(nextSeen)).catch(() => {});
      }
    } catch (err) {
      // Silencioso: es una comprobación de fondo y no debe distraer con errores.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currency, JSON.stringify(fetchParams)]);

  // "background": refresco periódico mientras la pantalla está abierta. No
  // muestra spinners ni toasts de error para no reclamar la atención de
  // quien puede estar conduciendo.
  const load = useCallback(async ({ silent = false, background = false } = {}) => {
    if (!silent && !background) setLoading(true);
    loadReview();
    try {
      const dateFrom = shiftDate(selectedDate, -1);
      const dateTo = shiftDate(selectedDate, 1);
      // with_deleted: los eliminados se muestran atenuados para poder restaurarlos.
      const resp = await api.get('/rutas', { params: { date_from: dateFrom, date_to: dateTo, with_deleted: 1, ...fetchParams } });
      // La API devuelve trip_date como timestamp ISO completo (p.ej.
      // "2026-09-19T00:00:00.000000Z"), pero aquí se compara contra fechas
      // "YYYY-MM-DD" (selectedDate, prevDate, nextDate) — hay que recortarlo
      // o esas comparaciones nunca coinciden y no se muestra ninguna ruta.
      const normalized = resp.data.data.map((r) => ({ ...r, trip_date: r.trip_date?.slice(0, 10) }));
      setRutas(normalized.filter(filterRuta));
    } catch (err) {
      if (!background) toastError(errorMessage(err, t('planner.loadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, JSON.stringify(fetchParams), loadReview]);

  useFocusEffect(useCallback(() => {
    load();
    const timer = setInterval(() => load({ background: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [load]));

  // Explicación única de que los viajes se completan solos.
  useEffect(() => {
    if (!user || !autoCompleteEnabled(user)) return;
    AsyncStorage.getItem(INTRO_KEY)
      .then((v) => { if (!v) setIntroVisible(true); })
      .catch(() => {});
  }, [user?.id]);

  const closeIntro = (goToSettings = false) => {
    setIntroVisible(false);
    AsyncStorage.setItem(INTRO_KEY, '1').catch(() => {});
    if (goToSettings) navigation.navigate('Account', { screen: 'SettingsTrips', initial: false });
  };

  const markReviewed = async (ruta) => {
    setReviewBusyId(ruta.id);
    try {
      await api.post(`/rutas/${ruta.id}/review`);
      setReviewRutas((prev) => prev.filter((r) => r.id !== ruta.id));
      load({ silent: true });
    } catch (err) {
      toastError(errorMessage(err, t('planner.reviewError')));
    } finally {
      setReviewBusyId(null);
    }
  };

  const markAllReviewed = async (list) => {
    setReviewBusyId('all');
    try {
      await Promise.all(list.map((r) => api.post(`/rutas/${r.id}/review`)));
      setReviewVisible(false);
      load({ silent: true });
    } catch (err) {
      toastError(errorMessage(err, t('planner.reviewAllError')));
      loadReview();
    } finally {
      setReviewBusyId(null);
    }
  };

  // Deshacer: el viaje vuelve a pendiente y el cron ya no lo vuelve a cerrar.
  const undoAutoComplete = async (ruta) => {
    setReviewBusyId(ruta.id);
    try {
      await api.put(`/rutas/${ruta.id}`, { status: 'pending' });
      setReviewRutas((prev) => prev.filter((r) => r.id !== ruta.id));
      toastSuccess(t('planner.undone'));
      load({ silent: true });
    } catch (err) {
      toastError(errorMessage(err, t('planner.undoError')));
    } finally {
      setReviewBusyId(null);
    }
  };

  const editFromReview = (ruta) => {
    setReviewVisible(false);
    openEdit({ ...ruta, trip_date: ruta.trip_date?.slice(0, 10) });
  };

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

  // Pista del gesto de borrar (igual que en Vehículos): al entrar, la primera
  // fila que se puede eliminar se asoma sola; máx. 3 veces o hasta que el
  // usuario deslice alguna.
  const swipeHint = useSwipeHint('rutero.rutaSwipeHint');
  const [peekId, setPeekId] = useState(null);
  const hintPendingRef = useRef(false);
  useFocusEffect(useCallback(() => {
    hintPendingRef.current = true;
    return () => { hintPendingRef.current = false; setPeekId(null); };
  }, []));
  useEffect(() => {
    if (!hintPendingRef.current || loading || !swipeHint.ready) return;
    const rows = [...noTimeRutas, ...timedRutas];
    if (rows.length === 0) return;
    hintPendingRef.current = false;
    if (!swipeHint.consume()) return;
    const live = rows.filter((r) => !r.deleted_at);
    if (live.length === 0) return;
    setPeekId((live.find((r) => canDelete(r)) || live[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutas, loading, swipeHint.ready]);

  const openCreate = () => {
    if (createBlocked) {
      if (onCreateBlockedPress) onCreateBlockedPress();
      else toastError(createBlockedMessage || t('planner.createBlocked'));
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
        toastSuccess(t('planner.updated'));
      } else {
        await api.post('/rutas', { ...payload, ...createExtra });
        toastSuccess(t('planner.created'));
      }
      setFormVisible(false);
      load();
    } catch (err) {
      toastError(errorMessage(err, t('planner.saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async (ruta) => {
    try {
      await api.delete(`/rutas/${ruta.id}`);
      toastSuccess(t('planner.deleted'));
      load();
      return true;
    } catch (err) {
      toastError(errorMessage(err, t('planner.deleteError')));
      return false;
    }
  };

  // Cambio rápido de estado/método de pago desde el propio listado, sin abrir
  // el detalle: son las dos acciones que se tocan a diario entre ruta y ruta.
  const confirmRestore = async (ruta) => {
    if (!canDelete(ruta)) {
      toastInfo(t('planner.cannotRestore'));
      return;
    }
    const ok = await confirm({
      title: t('planner.restoreTitle'),
      message: t('planner.restoreMessage', { name: ruta.client_name }),
      confirmLabel: t('planner.restore'),
    });
    if (!ok) return;
    try {
      await api.post(`/rutas/${ruta.id}/restore`);
      toastSuccess(t('planner.restored'));
      load();
    } catch (err) {
      toastError(errorMessage(err, t('planner.restoreError')));
    }
  };

  const quickUpdate = async (ruta, patch) => {
    try {
      const resp = await api.put(`/rutas/${ruta.id}`, patch);
      const updated = { ...resp.data, trip_date: resp.data.trip_date?.slice(0, 10) ?? ruta.trip_date };
      setRutas((prev) => prev.map((r) => (r.id === ruta.id ? updated : r)));
      // Tocar un viaje cerrado automáticamente cuenta como revisarlo.
      if (ruta.needs_review) loadReview();
    } catch (err) {
      toastError(errorMessage(err, t('planner.updateError')));
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
      canDelete={canDelete(item)}
      onEdit={openEdit}
      onDelete={confirmDelete}
      onQuickUpdate={quickUpdate}
      onSwiped={swipeHint.markLearned}
      peek={item.id === peekId}
      onPeekDone={() => setPeekId(null)}
      isWide={isWide}
      onRestore={confirmRestore}
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
            {createBlockedMessage || t('planner.needVehicle')}
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

      {reviewRutas.length > 0 && (
        <Pressable
          onPress={() => setReviewVisible(true)}
          className="mx-3 mt-2 rounded-xl py-2 px-3 flex-row items-center justify-between bg-tertiary/15 dark:bg-tertiary-dark/20"
        >
          <Text className="flex-1 text-tertiary dark:text-tertiary-dark">
            {t('planner.reviewBanner', { count: reviewRutas.length })}
          </Text>
          <Text className="font-bold text-tertiary dark:text-tertiary-dark">{t('planner.review')}</Text>
        </Pressable>
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
                    <Text className="flex-1 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{t('planner.colClient')}</Text>
                    <Text className="w-[70px] text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{t('planner.colPrice')}</Text>
                    <Text className="w-[72px] text-xs opacity-60 text-right text-onSurface dark:text-onSurface-dark">{t('planner.colActions')}</Text>
                  </View>
                )}
                {noTimeRutas.length > 0 && (
                  <View className="mb-2">
                    <Text className="mb-1.5 opacity-70 font-medium text-onSurface dark:text-onSurface-dark">{t('planner.noTime')}</Text>
                    {noTimeRutas.map(renderRow)}
                  </View>
                )}
              </>
            )
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <IconButton icon="calendar-blank-outline" size={40} disabled className="opacity-40" />
              <Text className="text-center opacity-60 px-6 text-onSurface dark:text-onSurface-dark">{emptyMessage ?? t('planner.emptyDay')}</Text>
            </View>
          }
          ListFooterComponent={!isEmpty ? (
            <View className="flex-row items-center justify-center gap-1.5 mt-3 px-4">
              <Icon name="gesture-swipe" size={18} color={themeColors.onSurfaceVariant} />
              <Text className="flex-1 text-center text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('planner.swipeHint')}
              </Text>
            </View>
          ) : null}
          renderItem={({ item }) => renderRow(item)}
        />
      )}

      {showCreateFab && (
        <FAB
          icon={createBlocked ? 'lock-outline' : 'plus'}
          label={createBlocked ? undefined : t('rutaForm.newTitle')}
          onPress={openCreate}
        />
      )}

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

      <AutoCompleteReviewModal
        visible={reviewVisible}
        rutas={reviewRutas}
        user={user}
        currency={currency}
        busyId={reviewBusyId}
        onDismiss={() => setReviewVisible(false)}
        onConfirm={markReviewed}
        onConfirmAll={markAllReviewed}
        onEdit={editFromReview}
        onUndo={undoAutoComplete}
      />

      <Dialog visible={introVisible} onDismiss={() => closeIntro()}>
        <Dialog.Title>{t('planner.introTitle')}</Dialog.Title>
        <Dialog.Content>
          <Text className="mb-2 text-onSurface dark:text-onSurface-dark">
            {t('planner.introP1')}
          </Text>
          <Text className="mb-2 text-onSurface dark:text-onSurface-dark">
            {t('planner.introP2')}
          </Text>
          <Text className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
            {t('planner.introP3')}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={() => closeIntro(true)}>{t('nav.settings')}</Button>
          <Button onPress={() => closeIntro()}>{t('common.gotIt')}</Button>
        </Dialog.Actions>
      </Dialog>

      <AutoCompleteNotice message={notice} onHidden={hideNotice} />
    </View>
  );
}
