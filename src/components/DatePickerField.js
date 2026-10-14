import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { Input, Dialog, Button } from './ui';
import { todayISO, formatDateHuman } from '../utils/rutas';
import { useCalendarTheme } from '../utils/calendarTheme';

// Selector de fecha basado en react-native-calendars (ya usada en el resto
// de la app), en vez de escribir "YYYY-MM-DD" a mano.
export default function DatePickerField({ label, value, onChange, error }) {
  const { t } = useTranslation();
  const calendarTheme = useCalendarTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        <Input
          label={label}
          value={value ? formatDateHuman(value) : ''}
          editable={false}
          pointerEvents="none"
          right="calendar"
          onRightPress={() => setVisible(true)}
          error={error}
        />
      </Pressable>

      <Dialog visible={visible} onDismiss={() => setVisible(false)}>
        <Calendar
          key={calendarTheme.scheme}
          theme={calendarTheme.theme}
          firstDay={1}
          current={value || todayISO()}
          onDayPress={(day) => { onChange(day.dateString); setVisible(false); }}
          markedDates={value ? { [value]: { selected: true } } : {}}
        />
        <Button mode="text" onPress={() => { onChange(todayISO()); setVisible(false); }} className="mt-2 self-center">
          {t('common.today')}
        </Button>
      </Dialog>
    </>
  );
}
