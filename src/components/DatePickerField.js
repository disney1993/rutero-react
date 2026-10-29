import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { Input, Dialog, Button } from './ui';
import { todayISO, formatDateDMY } from '../utils/rutas';
import { useCalendarTheme } from '../utils/calendarTheme';

// Date picker (react-native-calendars). Field shows dd/mm/yyyy; value stays ISO.
export default function DatePickerField({ label, value, onChange, error, required, placeholder, className }) {
  const { t } = useTranslation();
  const calendarTheme = useCalendarTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        <Input
          label={label}
          required={required}
          value={value ? formatDateDMY(value) : ''}
          placeholder={placeholder || 'dd/mm/yyyy'}
          editable={false}
          pointerEvents="none"
          right="calendar"
          onRightPress={() => setVisible(true)}
          error={error}
          className={className}
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
