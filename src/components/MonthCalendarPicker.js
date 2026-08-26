import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button, Menu, useTheme } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { api } from '../utils/apiClient';
import { MONTH_NAMES, MIN_YEAR, MAX_YEAR, monthRange, partsFromISO, ymd } from '../utils/schedule';

const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

// Selector de mes/año con salto directo + rejilla de calendario (28-31 días
// según el mes) para elegir un día concreto. Rango permitido: desde enero
// de este año hasta 10 años en el futuro.
export default function MonthCalendarPicker({ visible, onDismiss, onSelectDate, selectedDate, fetchParams }) {
  const theme = useTheme();
  const initial = partsFromISO(selectedDate);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [monthMenuVisible, setMonthMenuVisible] = useState(false);
  const [yearMenuVisible, setYearMenuVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    if (visible) {
      const parts = partsFromISO(selectedDate);
      setYear(parts.year);
      setMonth(parts.month);
    }
  }, [visible, selectedDate]);

  const loadCounts = useCallback(async (y, m) => {
    try {
      const { from, to } = monthRange(y, m);
      const resp = await api.get('/rutas', { params: { date_from: from, date_to: to, ...(fetchParams || {}) } });
      const counts = {};
      resp.data.data.forEach((ruta) => {
        if (ruta.trip_date) counts[ruta.trip_date] = (counts[ruta.trip_date] || 0) + 1;
      });
      const marks = {};
      Object.keys(counts).forEach((date) => {
        marks[date] = { marked: true, dotColor: theme.colors.primary };
      });
      if (selectedDate) marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true };
      setMarkedDates(marks);
    } catch (err) {
      // Silencioso: los puntos de "hay rutas" son solo una ayuda visual.
    }
  }, [fetchParams, selectedDate, theme.colors.primary]);

  useEffect(() => {
    if (visible) loadCounts(year, month);
  }, [visible, year, month, loadCounts]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <Menu
            visible={monthMenuVisible}
            onDismiss={() => setMonthMenuVisible(false)}
            anchor={<Button mode="outlined" onPress={() => setMonthMenuVisible(true)}>{MONTH_NAMES[month - 1]}</Button>}
          >
            {MONTH_NAMES.map((name, idx) => (
              <Menu.Item key={name} title={name} onPress={() => { setMonth(idx + 1); setMonthMenuVisible(false); }} />
            ))}
          </Menu>

          <Menu
            visible={yearMenuVisible}
            onDismiss={() => setYearMenuVisible(false)}
            anchor={<Button mode="outlined" onPress={() => setYearMenuVisible(true)}>{year}</Button>}
          >
            {YEARS.map((y) => (
              <Menu.Item key={y} title={String(y)} onPress={() => { setYear(y); setYearMenuVisible(false); }} />
            ))}
          </Menu>
        </View>

        <Calendar
          key={`${year}-${month}`}
          current={ymd(year, month, 1)}
          minDate={ymd(MIN_YEAR, 1, 1)}
          maxDate={ymd(MAX_YEAR, 12, 31)}
          markedDates={markedDates}
          onDayPress={(day) => { onSelectDate(day.dateString); onDismiss(); }}
          onMonthChange={(m) => { setYear(m.year); setMonth(m.month); }}
          disableArrowLeft={year === MIN_YEAR && month === 1}
          disableArrowRight={year === MAX_YEAR && month === 12}
        />

        <View style={styles.footer}>
          <Button mode="text" onPress={() => { onSelectDate(new Date().toISOString().slice(0, 10)); onDismiss(); }}>
            Ir a hoy
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 16, borderRadius: 16, padding: 16 },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12, justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
});
