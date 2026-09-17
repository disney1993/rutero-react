import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Input, Dialog, Button, cn } from './ui';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// Selector de hora en incrementos de 5 minutos (no todas las rutas son en
// punto: 10:05, 10:45...) sin depender de ninguna librería nueva.
export default function TimePickerField({ label, value, onChange, error }) {
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
      <Pressable onPress={() => setVisible(true)}>
        <Input
          label={label}
          value={value || ''}
          editable={false}
          pointerEvents="none"
          right="clock-outline"
          onRightPress={() => setVisible(true)}
          error={error}
        />
      </Pressable>

      <Dialog visible={visible} onDismiss={() => setVisible(false)}>
        <Text className="mb-3 text-center text-base font-medium text-onSurface dark:text-onSurface-dark">
          Elegir hora
        </Text>
        <View className="flex-row justify-center flex-1">
          <FlatList
            data={HOURS}
            keyExtractor={(h) => h}
            style={{ width: 70, maxHeight: 220 }}
            renderItem={({ item }) => (
              <Text
                onPress={() => setHour(item)}
                className={cn(
                  'text-center py-2.5 rounded-lg',
                  item === hour
                    ? 'bg-primary dark:bg-primary-dark text-white'
                    : 'text-onSurface dark:text-onSurface-dark'
                )}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {item}
              </Text>
            )}
          />
          <Text className="text-xl self-center mx-1 text-onSurface dark:text-onSurface-dark">:</Text>
          <FlatList
            data={MINUTES}
            keyExtractor={(m) => m}
            style={{ width: 70, maxHeight: 220 }}
            renderItem={({ item }) => (
              <Text
                onPress={() => setMinute(item)}
                className={cn(
                  'text-center py-2.5 rounded-lg',
                  item === minute
                    ? 'bg-primary dark:bg-primary-dark text-white'
                    : 'text-onSurface dark:text-onSurface-dark'
                )}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {item}
              </Text>
            )}
          />
        </View>
        <Button mode="text" onPress={useNow} className="mt-2 self-center">Ahora</Button>
        <View className="flex-row justify-end gap-2 mt-3">
          <Button mode="text" onPress={() => setVisible(false)}>Cancelar</Button>
          <Button mode="contained" onPress={confirm}>Aceptar</Button>
        </View>
      </Dialog>
    </>
  );
}
