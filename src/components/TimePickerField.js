import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Input, Dialog, Button, cn } from './ui';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const USE_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

function snapMinute(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return 0;
  return Math.min(55, Math.round(n / 5) * 5);
}

function parseTimeToDate(value) {
  const [hRaw, mRaw] = String(value || '08:00').split(':');
  const hours = Math.min(23, Math.max(0, Number(hRaw) || 0));
  const minutes = snapMinute(mRaw);
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hours, minutes);
  return d;
}

function formatHHMM(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(snapMinute(date.getMinutes())).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function snapDate(date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(snapMinute(next.getMinutes()));
  return next;
}

// Native time picker on iOS/Android (24h, 5-min snap). Web keeps a custom HH:mm wheel.
export default function TimePickerField({ label, value, onChange, error, required, placeholder, className }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [draftDate, setDraftDate] = useState(() => parseTimeToDate(value));

  const syncFromValue = () => {
    const next = parseTimeToDate(value);
    setDraftDate(next);
    setHour(String(next.getHours()).padStart(2, '0'));
    setMinute(String(next.getMinutes()).padStart(2, '0'));
  };

  useEffect(() => {
    if (visible) syncFromValue();
  }, [visible, value]);

  const open = () => {
    syncFromValue();
    setVisible(true);
  };

  const confirmCustom = () => {
    onChange(`${hour}:${minute}`);
    setVisible(false);
  };

  const confirmNative = () => {
    onChange(formatHHMM(draftDate));
    setVisible(false);
  };

  const useNowCustom = () => {
    const now = new Date();
    setHour(String(now.getHours()).padStart(2, '0'));
    setMinute(String(snapMinute(now.getMinutes())).padStart(2, '0'));
  };

  const useNowNative = () => {
    setDraftDate(snapDate(new Date()));
  };

  const onNativeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setVisible(false);
      if (event?.type === 'dismissed' || !selectedDate) return;
      onChange(formatHHMM(selectedDate));
      return;
    }
    if (selectedDate) setDraftDate(snapDate(selectedDate));
  };

  return (
    <>
      <Pressable onPress={open}>
        <Input
          label={label}
          required={required}
          value={value || ''}
          placeholder={placeholder}
          editable={false}
          pointerEvents="none"
          right="clock-outline"
          onRightPress={open}
          error={error}
          className={className}
        />
      </Pressable>

      {USE_NATIVE && visible && Platform.OS === 'android' && (
        <DateTimePicker
          value={draftDate}
          mode="time"
          is24Hour
          display="default"
          onChange={onNativeChange}
        />
      )}

      {USE_NATIVE && Platform.OS === 'ios' && (
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Text className="mb-2 text-center text-base font-medium text-onSurface dark:text-onSurface-dark">
            {t('timePicker.title')}
          </Text>
          <DateTimePicker
            value={draftDate}
            mode="time"
            is24Hour
            display="spinner"
            minuteInterval={5}
            onChange={onNativeChange}
            style={{ alignSelf: 'center' }}
          />
          <Button mode="text" onPress={useNowNative} className="mt-2 self-center">{t('timePicker.now')}</Button>
          <View className="flex-row justify-end gap-2 mt-3">
            <Button mode="text" onPress={() => setVisible(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" onPress={confirmNative}>{t('common.accept')}</Button>
          </View>
        </Dialog>
      )}

      {!USE_NATIVE && (
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Text className="mb-2 text-center text-base font-medium text-onSurface dark:text-onSurface-dark">
            {t('timePicker.title')}
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
          <Button mode="text" onPress={useNowCustom} className="mt-2 self-center">{t('timePicker.now')}</Button>
          <View className="flex-row justify-end gap-2 mt-3">
            <Button mode="text" onPress={() => setVisible(false)}>{t('common.cancel')}</Button>
            <Button mode="contained" onPress={confirmCustom}>{t('common.accept')}</Button>
          </View>
        </Dialog>
      )}
    </>
  );
}
