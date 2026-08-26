import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Portal, Modal, TextInput, Text, Button, useTheme } from 'react-native-paper';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// Selector de hora en incrementos de 5 minutos (no todas las rutas son en
// punto: 10:05, 10:45...) sin depender de ninguna librería nueva.
export default function TimePickerField({ label, value, onChange, error }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (visible) {
      const [h, m] = (value || '08:00').split(':');
      setHour(h);
      setMinute(MINUTES.includes(m) ? m : MINUTES.reduce((closest, cur) => (Math.abs(cur - m) < Math.abs(closest - m) ? cur : closest), '00'));
    }
  }, [visible, value]);

  const confirm = () => { onChange(`${hour}:${minute}`); setVisible(false); };
  const useNow = () => {
    const now = new Date();
    const roundedMinute = MINUTES.reduce((closest, cur) => (Math.abs(cur - now.getMinutes()) < Math.abs(closest - now.getMinutes()) ? cur : closest), '00');
    setHour(String(now.getHours()).padStart(2, '0'));
    setMinute(roundedMinute);
  };

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={value || ''}
        editable={false}
        onPressIn={() => setVisible(true)}
        right={<TextInput.Icon icon="clock-outline" onPress={() => setVisible(true)} />}
        error={error}
        style={styles.input}
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.title}>Elegir hora</Text>
          <View style={styles.columns}>
            <FlatList
              data={HOURS}
              keyExtractor={(h) => h}
              style={styles.column}
              renderItem={({ item }) => (
                <Text
                  style={[styles.option, item === hour && { backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer }]}
                  onPress={() => setHour(item)}
                >
                  {item}
                </Text>
              )}
            />
            <Text style={styles.colon}>:</Text>
            <FlatList
              data={MINUTES}
              keyExtractor={(m) => m}
              style={styles.column}
              renderItem={({ item }) => (
                <Text
                  style={[styles.option, item === minute && { backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer }]}
                  onPress={() => setMinute(item)}
                >
                  {item}
                </Text>
              )}
            />
          </View>
          <Button onPress={useNow} style={styles.nowButton}>Ahora</Button>
          <View style={styles.actions}>
            <Button onPress={() => setVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={confirm}>Aceptar</Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 4 },
  modal: { margin: 20, borderRadius: 16, padding: 16, maxHeight: '70%' },
  title: { marginBottom: 12, textAlign: 'center' },
  columns: { flexDirection: 'row', justifyContent: 'center', flex: 1 },
  column: { width: 70, maxHeight: 220 },
  colon: { fontSize: 22, alignSelf: 'center', marginHorizontal: 4 },
  option: { textAlign: 'center', paddingVertical: 10, borderRadius: 8, fontVariant: ['tabular-nums'] },
  nowButton: { marginTop: 8, alignSelf: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
});
