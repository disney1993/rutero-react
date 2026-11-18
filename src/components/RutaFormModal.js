import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Portal, Modal, Text, TextInput, Button, HelperText, Menu, useTheme } from 'react-native-paper';
import {
  STATUS_OPTIONS,
  STATUS_COLORS,
  PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHOD,
  TIME_REGEX,
  normalizeStatus,
  normalizePaymentMethod,
  nowTimeRounded,
  normalizeTripDate,
  normalizeTripTime,
  resolveDurationMin,
  MIN_TRIP_DURATION_MIN,
} from '../utils/rutas';
import { PHONE_REGEX } from '../utils/validators';
import { roundToNearest5, formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/apiClient';
import DatePickerField from './DatePickerField';
import TimePickerField from './TimePickerField';
import AddressAutocompleteInput from './AddressAutocompleteInput';
import { PaymentMethodIcon } from './PaymentMethodIcon';
import { vehicleIconSource } from './VehicleTypeIcon';
import { vehicleTypeLabel } from '../utils/vehicles';

const emptyForm = {
  client_name: '',
  client_phone: '',
  origin: '',
  origin_lat: null,
  origin_lng: null,
  destination: '',
  destination_lat: null,
  destination_lng: null,
  trip_date: '',
  trip_time: '',
  passenger_count: '',
  estimated_distance_km: '',
  estimated_duration_min: String(MIN_TRIP_DURATION_MIN),
  price_per_km: '',
  final_price: '',
  payment_method: DEFAULT_PAYMENT_METHOD,
  status: 'pending',
  notes: '',
  vehicle_id: null,
};

function str(v) {
  if (v == null) return '';
  return String(v);
}

function formFromRuta(ruta) {
  const timeRaw = normalizeTripTime(ruta.trip_time) || '';
  return {
    ...emptyForm,
    client_name: str(ruta.client_name),
    client_phone: str(ruta.client_phone),
    origin: str(ruta.origin),
    origin_lat: ruta.origin_lat ?? null,
    origin_lng: ruta.origin_lng ?? null,
    destination: str(ruta.destination),
    destination_lat: ruta.destination_lat ?? null,
    destination_lng: ruta.destination_lng ?? null,
    trip_date: normalizeTripDate(ruta.trip_date),
    // Null en BD: no inventar hora al editar (evita “parece tener hora” vs Sin hora).
    trip_time: timeRaw,
    passenger_count: ruta.passenger_count != null && ruta.passenger_count !== '' ? String(ruta.passenger_count) : '',
    estimated_distance_km: ruta.estimated_distance_km != null && ruta.estimated_distance_km !== ''
      ? String(Math.round(Number(ruta.estimated_distance_km)))
      : '',
    estimated_duration_min: String(resolveDurationMin({
      durationFromApi: ruta.estimated_duration_min,
      distanceKm: ruta.estimated_distance_km,
    })),
    price_per_km: ruta.price_per_km != null && ruta.price_per_km !== '' ? String(ruta.price_per_km) : '',
    final_price: ruta.final_price != null && ruta.final_price !== '' ? String(ruta.final_price) : '',
    payment_method: normalizePaymentMethod(ruta.payment_method),
    status: normalizeStatus(ruta.status),
    notes: str(ruta.notes),
    vehicle_id: ruta.vehicle_id ?? null,
  };
}

function validate(form, fieldSet) {
  const e = {};
  if (fieldSet === 'full') {
    if (!form.client_name.trim() || form.client_name.trim().length < 2) e.client_name = 'Obligatorio (mín. 2)';
    if (!form.client_phone.trim()) e.client_phone = 'Obligatorio';
    else if (!PHONE_REGEX.test(form.client_phone.trim())) e.client_phone = 'Teléfono inválido';
    if (!form.origin.trim() || form.origin.trim().length < 2) e.origin = 'Obligatorio';
    if (!form.destination.trim() || form.destination.trim().length < 2) e.destination = 'Obligatorio';
    if (!form.trip_date) e.trip_date = 'Obligatorio';
    if (!String(form.trip_time || '').trim()) e.trip_time = 'Obligatorio';
    else if (!TIME_REGEX.test(form.trip_time.trim())) e.trip_time = 'Formato HH:MM';
    if (!form.vehicle_id) e.vehicle_id = 'Elige un vehículo';
    if (form.estimated_distance_km && (isNaN(Number(form.estimated_distance_km)) || Number(form.estimated_distance_km) < 0)) {
      e.estimated_distance_km = 'Número ≥ 0';
    }
    if (form.price_per_km && (isNaN(Number(form.price_per_km)) || Number(form.price_per_km) < 0)) {
      e.price_per_km = 'Número ≥ 0';
    }
  }
  if (form.final_price === '' || form.final_price == null) {
    e.final_price = 'Obligatorio';
  } else if (isNaN(Number(form.final_price)) || Number(form.final_price) < 0) {
    e.final_price = 'Número ≥ 0';
  }
  if (form.status === 'completed' && !String(form.payment_method || '').trim()) {
    e.payment_method = 'Obligatorio si está completada';
  }
  return e;
}

function PaymentChips({ value, onChange }) {
  return (
    <View style={styles.paymentRow}>
      {PAYMENT_METHODS.map((m) => {
        const selected = value === m.value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.payChip,
              {
                borderColor: m.color,
                backgroundColor: selected ? m.color : `${m.color}14`,
              },
            ]}
          >
            <PaymentMethodIcon method={m} size={16} color={selected ? '#fff' : m.color} />
            <Text
              variant="labelSmall"
              numberOfLines={1}
              style={{ color: selected ? '#fff' : m.color, fontWeight: selected ? '700' : '600' }}
            >
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatusChips({ value, onChange }) {
  return (
    <View style={styles.statusRow}>
      {STATUS_OPTIONS.map((s) => {
        const color = STATUS_COLORS[s.value];
        const selected = value === s.value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            style={[
              styles.statusChip,
              {
                borderColor: color,
                backgroundColor: selected ? color : 'transparent',
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: selected ? '#fff' : color }]} />
            <Text
              variant="labelMedium"
              numberOfLines={1}
              style={{ color: selected ? '#fff' : color, fontWeight: selected ? '700' : '600' }}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// fieldSet 'full': creación u owner/admin. 'driverUpdate': conductor limitado.
export default function RutaFormModal({
  visible,
  onDismiss,
  onSubmit,
  initialValues,
  defaultDate,
  defaultTime = null,
  fieldSet = 'full',
  vehicles = [],
  submitting,
}) {
  const theme = useTheme();
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState('');
  const [distanceProvider, setDistanceProvider] = useState(null);
  const [vehicleMenuOpen, setVehicleMenuOpen] = useState(false);
  const lastAutoDistanceRef = useRef(null);
  const isEditing = !!initialValues?.id;

  const defaultVehicle = useMemo(
    () => vehicles.find((v) => v.is_default) || vehicles[0] || null,
    [vehicles]
  );
  const vehicleLocked = vehicles.length <= 1;

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setDistanceError('');
      setDistanceProvider(null);
      setVehicleMenuOpen(false);
      lastAutoDistanceRef.current = null;
      if (isEditing) {
        const next = formFromRuta(initialValues);
        if (!next.vehicle_id && defaultVehicle) next.vehicle_id = defaultVehicle.id;
        setForm(next);
      } else {
        setForm({
          ...emptyForm,
          trip_date: defaultDate || '',
          trip_time: defaultTime || nowTimeRounded(),
          status: 'pending',
          price_per_km: user?.price_per_km != null ? String(user.price_per_km) : '',
          estimated_duration_min: String(MIN_TRIP_DURATION_MIN),
          vehicle_id: defaultVehicle ? defaultVehicle.id : null,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues, defaultDate, defaultTime, isEditing, defaultVehicle]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value == null ? '' : value }));

  const selectOrigin = (place) => setForm((f) => ({ ...f, origin: place.display_name, origin_lat: place.lat, origin_lng: place.lon }));
  const selectDestination = (place) => setForm((f) => ({ ...f, destination: place.display_name, destination_lat: place.lat, destination_lng: place.lon }));
  const changeOrigin = (text) => setForm((f) => ({
    ...f,
    origin: text,
    origin_lat: null,
    origin_lng: null,
    estimated_duration_min: String(resolveDurationMin({ distanceKm: f.estimated_distance_km })),
  }));
  const changeDestination = (text) => setForm((f) => ({
    ...f,
    destination: text,
    destination_lat: null,
    destination_lng: null,
    estimated_duration_min: String(resolveDurationMin({ distanceKm: f.estimated_distance_km })),
  }));

  useEffect(() => {
    const { origin_lat, origin_lng, destination_lat, destination_lng, estimated_distance_km } = form;
    if (origin_lat == null || destination_lat == null) return;
    if (estimated_distance_km !== '' && estimated_distance_km !== lastAutoDistanceRef.current) return;

    let cancelled = false;
    setDistanceError('');
    setCalculatingDistance(true);

    api.get('/geocode/distance', {
      params: { origin_lat, origin_lng, destination_lat, destination_lng },
    }).then((resp) => {
      if (cancelled) return;
      const km = String(Math.round(Number(resp.data.distance_km)));
      const duration = String(resolveDurationMin({
        durationFromApi: resp.data.duration_min,
        distanceKm: km,
      }));
      lastAutoDistanceRef.current = km;
      setDistanceProvider(resp.data.provider || resp.headers?.['x-geocode-provider'] || null);
      setForm((f) => ({
        ...f,
        estimated_distance_km: km,
        estimated_duration_min: duration,
      }));
    }).catch((err) => {
      if (cancelled) return;
      setDistanceProvider(null);
      setDistanceError(err.response?.data?.message || 'No se pudo calcular la distancia. Introdúcela a mano.');
      setForm((f) => ({
        ...f,
        estimated_duration_min: String(resolveDurationMin({ distanceKm: f.estimated_distance_km })),
      }));
    }).finally(() => {
      if (!cancelled) setCalculatingDistance(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.origin_lat, form.origin_lng, form.destination_lat, form.destination_lng]);

  const errors = validate(form, fieldSet);
  const isValid = Object.keys(errors).length === 0;
  const currency = user?.currency || 'EUR';
  const distanceNum = Number(form.estimated_distance_km);
  const priceKmNum = Number(form.price_per_km);
  const suggestedPrice = fieldSet === 'full' && distanceNum > 0 && priceKmNum > 0
    ? roundToNearest5(distanceNum * priceKmNum)
    : null;

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const vehicleLabel = selectedVehicle
    ? [
        selectedVehicle.plate || selectedVehicle.model || `#${selectedVehicle.id}`,
        vehicleTypeLabel(selectedVehicle.vehicle_type),
      ].filter(Boolean).join(' · ')
    : 'Elegir vehículo';
  const vehicleLeftIcon = selectedVehicle
    ? vehicleIconSource(selectedVehicle.vehicle_type)
    : 'car-outline';

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValid) return;

    const payload = {
      status: form.status,
      notes: form.notes || null,
      final_price: Number(form.final_price),
      payment_method: normalizePaymentMethod(form.payment_method),
    };

    if (fieldSet === 'full') {
      Object.assign(payload, {
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim(),
        origin: form.origin.trim(),
        origin_lat: form.origin_lat,
        origin_lng: form.origin_lng,
        destination: form.destination.trim(),
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        trip_date: form.trip_date,
        trip_time: form.trip_time.trim(),
        passenger_count: form.passenger_count ? Number(form.passenger_count) : null,
        estimated_distance_km: form.estimated_distance_km ? Number(form.estimated_distance_km) : null,
        estimated_duration_min: resolveDurationMin({
          durationFromApi: form.estimated_duration_min,
          distanceKm: form.estimated_distance_km,
        }),
        price_per_km: form.price_per_km ? Number(form.price_per_km) : null,
        estimated_price: suggestedPrice,
        vehicle_id: form.vehicle_id,
      });
    }

    onSubmit(payload);
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="titleMedium" style={styles.title}>
            {isEditing ? 'Editar ruta' : 'Nueva ruta'}
          </Text>

          {fieldSet === 'full' && (
            <>
              <TextInput
                mode="outlined"
                dense
                label="Cliente *"
                value={form.client_name}
                onChangeText={set('client_name')}
                style={styles.inputPrimary}
                error={submitted && !!errors.client_name}
              />
              {submitted && errors.client_name ? <HelperText type="error" visible>{errors.client_name}</HelperText> : null}

              <TextInput
                mode="outlined"
                dense
                label="Teléfono *"
                value={form.client_phone}
                onChangeText={set('client_phone')}
                keyboardType="phone-pad"
                style={styles.inputPrimary}
                error={submitted && !!errors.client_phone}
              />
              {submitted && errors.client_phone ? <HelperText type="error" visible>{errors.client_phone}</HelperText> : null}

              <View style={styles.row}>
                <View style={styles.half}>
                  <DatePickerField label="Fecha *" value={form.trip_date} onChange={set('trip_date')} error={submitted && !!errors.trip_date} />
                  {submitted && errors.trip_date ? <HelperText type="error" visible>{errors.trip_date}</HelperText> : null}
                </View>
                <View style={styles.half}>
                  <TimePickerField label="Hora *" value={form.trip_time} onChange={set('trip_time')} error={submitted && !!errors.trip_time} />
                  {submitted && errors.trip_time ? <HelperText type="error" visible>{errors.trip_time}</HelperText> : null}
                </View>
              </View>

              {vehicles.length > 0 && (
                <View style={styles.input}>
                  <Menu
                    visible={vehicleMenuOpen && !vehicleLocked}
                    onDismiss={() => setVehicleMenuOpen(false)}
                    anchor={
                      <Pressable onPress={() => !vehicleLocked && setVehicleMenuOpen(true)}>
                        <TextInput
                          mode="outlined"
                          dense
                          label="Vehículo"
                          value={vehicleLabel}
                          editable={false}
                          disabled={vehicleLocked}
                          left={<TextInput.Icon icon={vehicleLeftIcon} />}
                          right={<TextInput.Icon icon={vehicleLocked ? 'lock-outline' : 'chevron-down'} />}
                          error={submitted && !!errors.vehicle_id}
                          pointerEvents="none"
                        />
                      </Pressable>
                    }
                  >
                    {vehicles.map((v) => (
                      <Menu.Item
                        key={v.id}
                        onPress={() => {
                          set('vehicle_id')(v.id);
                          setVehicleMenuOpen(false);
                        }}
                        leadingIcon={vehicleIconSource(v.vehicle_type)}
                        title={`${v.plate || v.model || `#${v.id}`} · ${vehicleTypeLabel(v.vehicle_type)}`}
                      />
                    ))}
                  </Menu>
                  {submitted && errors.vehicle_id ? <HelperText type="error" visible>{errors.vehicle_id}</HelperText> : null}
                </View>
              )}

              <AddressAutocompleteInput
                label="Origen *"
                value={form.origin}
                onChangeText={changeOrigin}
                onSelectPlace={selectOrigin}
                error={submitted && !!errors.origin}
              />
              {submitted && errors.origin ? <HelperText type="error" visible>{errors.origin}</HelperText> : null}

              <View style={styles.rowMeta}>
                <TextInput
                  mode="outlined"
                  dense
                  label={calculatingDistance ? 'Km…' : 'Km'}
                  value={form.estimated_distance_km}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^\d]/g, '');
                    setForm((f) => ({
                      ...f,
                      estimated_distance_km: clean,
                      estimated_duration_min: String(resolveDurationMin({ distanceKm: clean })),
                    }));
                  }}
                  keyboardType="number-pad"
                  disabled={calculatingDistance}
                  style={[styles.inputMeta, styles.half]}
                  error={submitted && !!errors.estimated_distance_km}
                />
                <TextInput
                  mode="outlined"
                  dense
                  label="€/km"
                  value={form.price_per_km}
                  onChangeText={set('price_per_km')}
                  keyboardType="numeric"
                  style={[styles.inputMeta, styles.half]}
                  error={submitted && !!errors.price_per_km}
                />
              </View>
              <TextInput
                mode="outlined"
                dense
                label="Tiempo estimado"
                value={`${form.estimated_duration_min || MIN_TRIP_DURATION_MIN} min`}
                editable={false}
                style={styles.inputMeta}
              />
              {distanceError ? <HelperText type="error" visible>{distanceError}</HelperText> : null}
              {isAdmin && distanceProvider ? (
                <HelperText type="info" visible>
                  Distancia vía: {distanceProvider === 'google' ? 'Google Distance Matrix' : distanceProvider === 'osrm' ? 'OSRM (gratis)' : distanceProvider}
                </HelperText>
              ) : null}

              <AddressAutocompleteInput
                label="Destino *"
                value={form.destination}
                onChangeText={changeDestination}
                onSelectPlace={selectDestination}
                error={submitted && !!errors.destination}
              />
              {submitted && errors.destination ? <HelperText type="error" visible>{errors.destination}</HelperText> : null}

              <View
                style={[
                  styles.priceRow,
                  {
                    backgroundColor: theme.dark
                      ? 'rgba(0, 229, 255, 0.08)'
                      : theme.colors.primaryContainer,
                    borderColor: theme.dark ? theme.colors.primary : theme.colors.primary,
                  },
                ]}
              >
                <Pressable
                  onPress={() => suggestedPrice != null && set('final_price')(String(suggestedPrice))}
                  disabled={suggestedPrice == null}
                  style={styles.sugeridoCompact}
                >
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurface, opacity: 0.65 }}>
                    Sugerido
                  </Text>
                  <Text
                    variant="labelLarge"
                    numberOfLines={1}
                    style={{ color: theme.colors.primary, fontWeight: '700' }}
                  >
                    {suggestedPrice != null ? formatCurrency(suggestedPrice, currency) : '—'}
                  </Text>
                  {suggestedPrice != null && (
                    <Text variant="labelSmall" style={{ color: theme.colors.secondary, fontWeight: '600' }}>
                      Usar
                    </Text>
                  )}
                </Pressable>
                <TextInput
                  mode="outlined"
                  dense
                  label={`Final (${currency}) *`}
                  value={form.final_price}
                  onChangeText={set('final_price')}
                  keyboardType="numeric"
                  style={[styles.priceFinalInput, { backgroundColor: theme.colors.surface }]}
                  outlineColor={theme.colors.primary}
                  activeOutlineColor={theme.colors.secondary}
                  error={submitted && !!errors.final_price}
                />
              </View>
              {submitted && errors.final_price ? <HelperText type="error" visible>{errors.final_price}</HelperText> : null}
            </>
          )}

          {fieldSet === 'driverUpdate' && (
            <TextInput
              mode="outlined"
              dense
              label={`Final (${currency}) *`}
              value={form.final_price}
              onChangeText={set('final_price')}
              keyboardType="numeric"
              style={[styles.priceFinalInput, { backgroundColor: theme.colors.surface }]}
              outlineColor={theme.colors.primary}
              activeOutlineColor={theme.colors.secondary}
              error={submitted && !!errors.final_price}
            />
          )}

          <Text variant="labelMedium" style={styles.sectionLabel}>Estado</Text>
          <StatusChips value={form.status} onChange={set('status')} />

          <Text variant="labelMedium" style={styles.sectionLabel}>Pago</Text>
          <PaymentChips value={normalizePaymentMethod(form.payment_method)} onChange={set('payment_method')} />
          {submitted && errors.payment_method ? <HelperText type="error" visible>{errors.payment_method}</HelperText> : null}

          <TextInput
            mode="outlined"
            dense
            label="Notas"
            value={form.notes}
            onChangeText={set('notes')}
            style={styles.inputMeta}
          />

          <View style={styles.actions}>
            <Button mode="outlined" onPress={onDismiss} style={styles.actionBtn} compact>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || (submitted && !isValid)}
              style={styles.actionBtn}
              compact
            >
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 14,
    maxHeight: '96%',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  scrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 },
  title: { fontWeight: '700', marginBottom: 8 },
  sectionLabel: { marginTop: 4, marginBottom: 6, opacity: 0.7 },
  input: { marginBottom: 6 },
  inputPrimary: { marginBottom: 8 },
  inputMeta: { marginBottom: 4, opacity: 0.95 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  rowMeta: { flexDirection: 'row', gap: 8, marginBottom: 2, opacity: 0.92 },
  half: { flex: 1, minWidth: 0 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 8,
    minHeight: 44,
  },
  sugeridoCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingVertical: 2,
  },
  priceFinalInput: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    maxHeight: 48,
  },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  paymentRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  payChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, borderRadius: 10 },
});
