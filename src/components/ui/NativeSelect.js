import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Platform, StyleSheet, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import FieldLabel from './FieldLabel';
import { fieldFrameClass } from './Input';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';
import { haptics } from '../../utils/haptics';

// Same trigger height/padding as <Input> (border + px-3 + py-2).
const FIELD_HEIGHT = 40;
const FONT_SIZE = 14;

const EMPTY = '__empty__';
const OTHER = '__other__';

// Acepta strings o { value, label } (p. ej. vehículos por id + matrícula).
function normalizeOptions(options) {
  return (options || []).map((o) => (
    o != null && typeof o === 'object' && 'value' in o
      ? { value: String(o.value), label: String(o.label ?? o.value) }
      : { value: String(o), label: String(o) }
  ));
}

// Desplegable con el selector nativo de cada plataforma:
//  - Android: el desplegable del sistema (Spinner) dentro del marco del campo.
//  - iOS: un campo con flecha que abre la rueda del sistema (UIPickerView) en
//    una hoja inferior, el patrón estándar de "select" en iOS.
//  - Web: un <select> normal.
// Con `customLabel` se añade al final una opción para escribir un valor que
// no está en la lista (p. ej. una marca de moto que no está en el catálogo).
export default function NativeSelect({
  label,
  required,
  value,
  options = [],
  onChange,
  placeholder,
  customLabel,
  customPlaceholder,
  // Ordena las opciones alfabéticamente (con reglas del español: á, ñ...).
  sort = false,
  error,
  disabled = false,
  className,
}) {
  const { t } = useTranslation();
  if (placeholder == null) placeholder = t('common.selectPlaceholder');
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const insets = useSafeAreaInsets();

  const normalized = React.useMemo(() => normalizeOptions(options), [options]);
  const sorted = React.useMemo(
    () => (sort
      ? [...normalized].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
      : normalized),
    [normalized, sort]
  );
  const valueStr = value == null || value === '' ? '' : String(value);
  const inList = !!valueStr && sorted.some((o) => o.value === valueStr);
  // Valor fuera de la lista (escrito a mano o de un catálogo antiguo).
  const [customMode, setCustomMode] = useState(!!valueStr && !inList);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(EMPTY);

  // Si cambian las opciones (otra marca → otros modelos) se recalcula el modo.
  useEffect(() => {
    setCustomMode(!!valueStr && !sorted.some((o) => o.value === valueStr));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const pickerValue = customMode ? OTHER : inList ? valueStr : EMPTY;

  const handlePick = (next) => {
    if (next === pickerValue) return;
    haptics.selection();
    if (next === OTHER) {
      setCustomMode(true);
      onChange('');
    } else {
      setCustomMode(false);
      onChange(next === EMPTY ? '' : next);
    }
  };

  const itemStyle = { backgroundColor: c.surface, fontSize: FONT_SIZE };
  const items = [
    <Picker.Item key={EMPTY} label={placeholder} value={EMPTY} color={c.onSurfaceVariant} style={itemStyle} enabled={Platform.OS !== 'android' || pickerValue === EMPTY} />,
    ...sorted.map((o) => (
      <Picker.Item key={o.value} label={o.label} value={o.value} color={c.onSurface} style={itemStyle} />
    )),
    ...(customLabel ? [<Picker.Item key={OTHER} label={customLabel} value={OTHER} color={c.primary} style={itemStyle} />] : []),
  ];

  const frameClass = cn(
    'flex-row items-center',
    fieldFrameClass(error && !customMode),
    disabled && 'opacity-50'
  );

  const matched = sorted.find((o) => o.value === valueStr);
  const currentLabel = customMode ? customLabel : matched ? matched.label : null;

  return (
    <View className={cn('mb-1', className)}>
      <FieldLabel required={required}>{label}</FieldLabel>

      {Platform.OS === 'ios' ? (
        <Pressable
          disabled={disabled}
          onPress={() => { haptics.light(); setIosDraft(pickerValue); setIosOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${currentLabel || placeholder}`}
          className={cn(frameClass, 'px-3 active:opacity-70')}
        >
          <Text numberOfLines={1} className={cn('flex-1 py-2', currentLabel ? 'text-onSurface dark:text-onSurface-dark' : 'text-onSurfaceVariant dark:text-onSurfaceVariant-dark')}>
            {currentLabel || placeholder}
          </Text>
          <Icon name="chevron-down" size={20} color={c.onSurfaceVariant} />
        </Pressable>
      ) : (
        // Android Spinner defaults to ~56dp; clip/center inside Input-height frame.
        <View style={{ height: FIELD_HEIGHT, justifyContent: 'center' }} className={cn(frameClass, 'overflow-hidden')}>
          <Picker
            selectedValue={pickerValue}
            onValueChange={handlePick}
            enabled={!disabled}
            mode="dropdown"
            prompt={label}
            dropdownIconColor={c.onSurfaceVariant}
            dropdownIconRippleColor={c.border}
            style={{
              flex: 1,
              color: pickerValue === EMPTY ? c.onSurfaceVariant : c.onSurface,
              backgroundColor: 'transparent',
              fontSize: FONT_SIZE,
              height: Platform.OS === 'web' ? FIELD_HEIGHT - 2 : 56,
              marginLeft: Platform.OS === 'android' ? -4 : 0,
              borderWidth: 0,
            }}
          >
            {items}
          </Picker>
        </View>
      )}

      {customMode && (
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChange}
          placeholder={customPlaceholder}
          placeholderTextColor={c.onSurfaceVariant}
          className={cn(
            'mt-1.5 px-3 py-2 text-onSurface dark:text-onSurface-dark',
            fieldFrameClass(error)
          )}
        />
      )}
      {!!error && <Text className="text-error dark:text-error-dark text-xs mt-1">{error}</Text>}

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View className="flex-1 justify-end">
            <Pressable style={StyleSheet.absoluteFill} className="bg-black/40" onPress={() => setIosOpen(false)} />
            <View style={{ paddingBottom: insets.bottom }} className="rounded-t-3xl bg-background dark:bg-background-dark">
              <View className="flex-row items-center justify-between px-5 pt-4 pb-1">
                <Pressable onPress={() => setIosOpen(false)} hitSlop={10}>
                  <Text className="text-base text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('common.cancel')}</Text>
                </Pressable>
                <Text className="font-bold text-base text-onSurface dark:text-onSurface-dark">{label}</Text>
                <Pressable onPress={() => { setIosOpen(false); handlePick(iosDraft); }} hitSlop={10}>
                  <Text className="text-base font-semibold text-primary dark:text-primary-dark">{t('common.done')}</Text>
                </Pressable>
              </View>
              <Picker selectedValue={iosDraft} onValueChange={setIosDraft} itemStyle={{ color: c.onSurface }}>
                {items}
              </Picker>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
