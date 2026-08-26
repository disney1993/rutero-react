import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Modal, TextInput, Button, useTheme } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { todayISO, formatDateHuman } from '../utils/rutas';

// Selector de fecha basado en react-native-calendars (ya usada en el resto
// de la app), en vez de escribir "YYYY-MM-DD" a mano.
export default function DatePickerField({ label, value, onChange, error }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={value ? formatDateHuman(value) : ''}
        editable={false}
        onPressIn={() => setVisible(true)}
        right={<TextInput.Icon icon="calendar" onPress={() => setVisible(true)} />}
        error={error}
        style={styles.input}
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Calendar
            current={value || todayISO()}
            onDayPress={(day) => { onChange(day.dateString); setVisible(false); }}
            markedDates={value ? { [value]: { selected: true } } : {}}
          />
          <Button onPress={() => { onChange(todayISO()); setVisible(false); }} style={styles.todayButton}>
            Hoy
          </Button>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 4 },
  modal: { margin: 20, borderRadius: 16, padding: 8 },
  todayButton: { margin: 8 },
});
