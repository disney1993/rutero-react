import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { STATUS_COLORS, formatDateShort, todayISO, normalizeTripDate, normalizeTripTime, resolveDurationMin, MIN_TRIP_DURATION_MIN, shortClientName, shortPlaceName } from '../utils/rutas';
import { formatCurrency } from '../utils/currency';
import './rutero-fullcalendar.css';

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function localStamp(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    + `T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}

function eventLabel(ruta, currency) {
  const time = normalizeTripTime(ruta.trip_time);
  const client = shortClientName(ruta.client_name);
  const from = shortPlaceName(ruta.origin);
  const to = shortPlaceName(ruta.destination);
  const route = from && to ? `${from}→${to}` : (from || to || null);
  const price = ruta.final_price ?? ruta.estimated_price;
  const priceLabel = price != null ? formatCurrency(price, currency) : null;
  return [time, client, route, priceLabel].filter(Boolean).join(' · ');
}

function toEvent(ruta, currency) {
  const date = normalizeTripDate(ruta.trip_date);
  const time = normalizeTripTime(ruta.trip_time);
  const label = eventLabel(ruta, currency);
  const durationMin = resolveDurationMin({
    durationFromApi: ruta.estimated_duration_min,
    distanceKm: ruta.estimated_distance_km,
  });

  if (!time || !date) {
    return {
      id: String(ruta.id),
      title: label,
      start: date || undefined,
      allDay: true,
      backgroundColor: STATUS_COLORS[ruta.status] || '#78909C',
      borderColor: STATUS_COLORS[ruta.status] || '#78909C',
      extendedProps: { ruta, label },
    };
  }

  const start = `${date}T${time}:00`;
  const endDate = new Date(`${date}T${time}:00`);
  endDate.setMinutes(endDate.getMinutes() + durationMin);

  return {
    id: String(ruta.id),
    title: label,
    start,
    end: localStamp(endDate),
    backgroundColor: STATUS_COLORS[ruta.status] || '#78909C',
    borderColor: STATUS_COLORS[ruta.status] || '#78909C',
    extendedProps: { ruta, label },
  };
}

const VIEWS = [
  { value: 'timeGridDay', label: 'Día' },
  { value: 'timeGridWeek', label: 'Semana' },
  { value: 'listDay', label: 'Lista' },
];

/**
 * Agenda FullCalendar (solo web). Toolbar propia (Paper) porque el header
 * nativo de FC se rompe con el CSS reset de react-native-web.
 */
export default function RutasAgendaWeb({
  selectedDate,
  rutas,
  currency = 'EUR',
  editable = true,
  lockedDate = false,
  onSelectRuta,
  onCreateAt,
  onDatesChange,
}) {
  const theme = useTheme();
  const calendarRef = useRef(null);
  const syncingRef = useRef(false);
  const lastEmittedRef = useRef(selectedDate);
  const [view, setView] = useState('timeGridDay');
  const [title, setTitle] = useState('');

  const events = useMemo(
    () => (rutas || []).map((r) => toEvent(r, currency)),
    [rutas, currency]
  );

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api || !selectedDate) return;
    const current = toISODate(api.getDate());
    if (current === selectedDate) return;
    syncingRef.current = true;
    lastEmittedRef.current = selectedDate;
    api.gotoDate(selectedDate);
    requestAnimationFrame(() => { syncingRef.current = false; });
  }, [selectedDate]);

  useEffect(() => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    if (api.view.type !== view) api.changeView(view);
  }, [view]);

  const goPrev = () => calendarRef.current?.getApi?.()?.prev();
  const goNext = () => calendarRef.current?.getApi?.()?.next();
  const goToday = () => {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;
    api.today();
    if (onDatesChange) onDatesChange(todayISO());
  };

  const titleFallback = formatDateShort(selectedDate) || selectedDate;

  return (
    <View style={styles.wrap}>
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.outlineVariant }]}>
        <View style={styles.navRow}>
          {!lockedDate && (
            <View style={styles.navBtns}>
              <IconButton icon="chevron-left" size={22} onPress={goPrev} style={styles.iconBtn} />
              <IconButton icon="chevron-right" size={22} onPress={goNext} style={styles.iconBtn} />
              <IconButton
                icon="calendar-today"
                size={20}
                onPress={goToday}
                style={styles.iconBtn}
                accessibilityLabel="Hoy"
              />
            </View>
          )}
          <Text
            variant="titleSmall"
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title || titleFallback}
          </Text>
        </View>

        <SegmentedButtons
          value={view}
          onValueChange={setView}
          density="small"
          style={styles.viewSwitch}
          buttons={VIEWS.map((v) => ({
            value: v.value,
            label: v.label,
            style: styles.viewBtn,
          }))}
        />
      </View>

      <div
        className={`rutero-fc${theme.dark ? ' rutero-fc--dark' : ''}`}
        style={{ flex: 1, height: '100%', minHeight: 420 }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
          locale={esLocale}
          initialView={view}
          initialDate={selectedDate}
          headerToolbar={false}
          height="100%"
          expandRows
          nowIndicator
          editable={false}
          selectable={editable}
          selectMirror
          slotMinTime="-02:00:00"
          slotMaxTime="26:00:00"
          scrollTime="06:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          defaultTimedEventDuration={`00:${String(MIN_TRIP_DURATION_MIN).padStart(2, '0')}:00`}
          forceEventDuration
          displayEventTime={false}
          displayEventEnd={false}
          allDaySlot
          allDayText="Sin hora"
          events={events}
          eventContent={(arg) => {
            const label = arg.event.extendedProps?.label || arg.event.title || '';
            return {
              html: `<div class="rutero-ev">${escapeHtml(label)}</div>`,
            };
          }}
          datesSet={(info) => {
            setTitle(info.view.title);
            if (lockedDate || syncingRef.current) return;
            if (info.view.type !== 'timeGridDay' && info.view.type !== 'listDay') return;
            const iso = toISODate(info.view.currentStart);
            if (iso === lastEmittedRef.current) return;
            lastEmittedRef.current = iso;
            if (onDatesChange) onDatesChange(iso);
          }}
          eventClick={(info) => {
            const ruta = info.event.extendedProps?.ruta;
            if (ruta && onSelectRuta) onSelectRuta(ruta);
          }}
          dateClick={(info) => {
            if (!editable || !onCreateAt) return;
            if (info.allDay) {
              onCreateAt({ date: info.dateStr.slice(0, 10), time: null });
              return;
            }
            const d = info.date;
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            onCreateAt({ date, time });
          }}
          eventDidMount={(info) => {
            const ruta = info.event.extendedProps?.ruta;
            if (ruta) {
              info.el.title = `${ruta.origin || ''} → ${ruta.destination || ''}`;
            }
          }}
        />
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 520, paddingHorizontal: 8, paddingBottom: 72 },
  toolbar: {
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: { margin: 0 },
  title: {
    flex: 1,
    fontWeight: '700',
    textTransform: 'capitalize',
    ...(Platform.OS === 'web' ? { fontFamily: 'system-ui, sans-serif' } : null),
  },
  viewSwitch: { alignSelf: 'stretch' },
  viewBtn: { minWidth: 0 },
});
