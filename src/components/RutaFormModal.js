import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Dialog, Input, Button, SegmentedButtons, PaymentMethodField, CAR_COLOR_PALETTE } from './ui';
import { STATUS_OPTIONS, STATUS_COLORS, TIME_REGEX, todayISO, roundUpToNext15Minutes } from '../utils/rutas';
import { PHONE_REGEX } from '../utils/validators';
import { getVehicleSwatchColor } from '../utils/avatar';
import { roundToNearest5, formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/apiClient';
import DatePickerField from './DatePickerField';
import TimePickerField from './TimePickerField';
import AddressAutocompleteInput from './AddressAutocompleteInput';

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
  price_per_km: '',
  final_price: '',
  payment_method: '',
  status: 'pending',
  notes: '',
  vehicle_id: null,
};

function validate(form, fieldSet, vehicles) {
  const e = {};
  if (fieldSet === 'full') {
    if (!form.client_name.trim() || form.client_name.trim().length < 2) e.client_name = 'Obligatorio, mínimo 2 caracteres';
    if (form.client_phone && !PHONE_REGEX.test(form.client_phone.trim())) e.client_phone = 'Teléfono inválido';
    if (!form.origin.trim() || form.origin.trim().length < 2) e.origin = 'Obligatorio, mínimo 2 caracteres';
    if (!form.destination.trim() || form.destination.trim().length < 2) e.destination = 'Obligatorio, mínimo 2 caracteres';
    if (!form.trip_date) e.trip_date = 'Elige una fecha';
    if (form.trip_time && !TIME_REGEX.test(form.trip_time.trim())) e.trip_time = 'Formato HH:MM (24h)';
    if (form.passenger_count && (!/^\d+$/.test(form.passenger_count) || Number(form.passenger_count) < 1)) {
      e.passenger_count = 'Debe ser un número mayor a 0';
    }
    if (form.estimated_distance_km && (isNaN(Number(form.estimated_distance_km)) || Number(form.estimated_distance_km) < 0)) {
      e.estimated_distance_km = 'Debe ser un número positivo';
    }
    if (form.price_per_km && (isNaN(Number(form.price_per_km)) || Number(form.price_per_km) < 0)) {
      e.price_per_km = 'Debe ser un número positivo';
    }
    // Sin vehículos no se puede exigir elegir uno (p. ej. conduciendo para un
    // propietario ajeno, donde ni siquiera se muestra el selector).
    if (vehicles.length > 0 && !form.vehicle_id) e.vehicle_id = 'Elige un vehículo';
  }
  if (form.final_price && (isNaN(Number(form.final_price)) || Number(form.final_price) < 0)) {
    e.final_price = 'Debe ser un número positivo';
  }
  return e;
}

// fieldSet 'full': creación u owner/admin editando. 'driverUpdate': el
// conductor editando una ruta que no creó él mismo (backend solo acepta
// final_price, payment_method, status, notes de todas formas).
export default function RutaFormModal({ visible, onDismiss, onSubmit, initialValues, defaultDate, fieldSet = 'full', vehicles = [], submitting }) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState('');
  // Recuerda el último valor que calculamos nosotros: si el km actual
  // coincide con eso (o está vacío), es seguro sobrescribirlo; si el
  // usuario lo cambió a mano, no lo tocamos.
  const lastAutoDistanceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setDistanceError('');
      lastAutoDistanceRef.current = null;
      if (initialValues) {
        setForm({
          ...emptyForm,
          ...initialValues,
          // trip_date llega como timestamp ISO completo; el selector de fecha
          // espera "YYYY-MM-DD".
          trip_date: initialValues.trip_date ? initialValues.trip_date.slice(0, 10) : '',
          passenger_count: initialValues.passenger_count ? String(initialValues.passenger_count) : '',
          estimated_distance_km: initialValues.estimated_distance_km ? String(initialValues.estimated_distance_km) : '',
          price_per_km: initialValues.price_per_km ? String(initialValues.price_per_km) : '',
          final_price: initialValues.final_price ? String(initialValues.final_price) : '',
        });
      } else {
        const defaultVehicle = vehicles.find((v) => v.is_default);
        setForm({
          ...emptyForm,
          trip_date: defaultDate || todayISO(),
          trip_time: roundUpToNext15Minutes(),
          status: 'pending',
          price_per_km: user?.price_per_km ? String(user.price_per_km) : '',
          vehicle_id: defaultVehicle ? defaultVehicle.id : null,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues, defaultDate]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const selectOrigin = (place) => setForm((f) => ({ ...f, origin: place.display_name, origin_lat: place.lat, origin_lng: place.lon }));
  const selectDestination = (place) => setForm((f) => ({ ...f, destination: place.display_name, destination_lat: place.lat, destination_lng: place.lon }));
  // Si el usuario reescribe la dirección a mano, las coordenadas ya elegidas
  // dejan de ser válidas para ese texto.
  const changeOrigin = (text) => setForm((f) => ({ ...f, origin: text, origin_lat: null, origin_lng: null }));
  const changeDestination = (text) => setForm((f) => ({ ...f, destination: text, destination_lat: null, destination_lng: null }));

  useEffect(() => {
    const { origin_lat, origin_lng, destination_lat, destination_lng, estimated_distance_km } = form;
    if (origin_lat == null || destination_lat == null) return;
    // Ya hay un km que el usuario escribió a mano (o que venía guardado) y
    // no coincide con nuestro último cálculo: respetarlo, no pisarlo.
    if (estimated_distance_km !== '' && estimated_distance_km !== lastAutoDistanceRef.current) return;

    let cancelled = false;
    setDistanceError('');
    setCalculatingDistance(true);

    api.get('/geocode/distance', {
      params: { origin_lat, origin_lng, destination_lat, destination_lng },
    }).then((resp) => {
      if (cancelled) return;
      const km = String(resp.data.distance_km);
      lastAutoDistanceRef.current = km;
      setForm((f) => ({ ...f, estimated_distance_km: km }));
    }).catch((err) => {
      if (cancelled) return;
      setDistanceError(err.response?.data?.message || 'No se pudo calcular la distancia automáticamente. Introdúcela a mano.');
    }).finally(() => {
      if (!cancelled) setCalculatingDistance(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.origin_lat, form.origin_lng, form.destination_lat, form.destination_lng]);

  const errors = validate(form, fieldSet, vehicles);
  const isValid = Object.keys(errors).length === 0;

  const currency = user?.currency || 'EUR';
  const distanceNum = Number(form.estimated_distance_km);
  const priceKmNum = Number(form.price_per_km);
  const suggestedPrice = fieldSet === 'full' && distanceNum > 0 && priceKmNum > 0
    ? roundToNearest5(distanceNum * priceKmNum)
    : null;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValid) return;

    const payload = { status: form.status, notes: form.notes || null };
    if (form.final_price !== '') payload.final_price = Number(form.final_price);
    if (form.payment_method) payload.payment_method = form.payment_method;

    if (fieldSet === 'full') {
      Object.assign(payload, {
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim() || null,
        origin: form.origin.trim(),
        origin_lat: form.origin_lat,
        origin_lng: form.origin_lng,
        destination: form.destination.trim(),
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        trip_date: form.trip_date || null,
        trip_time: form.trip_time || null,
        passenger_count: form.passenger_count ? Number(form.passenger_count) : null,
        estimated_distance_km: form.estimated_distance_km ? Number(form.estimated_distance_km) : null,
        price_per_km: form.price_per_km ? Number(form.price_per_km) : null,
        vehicle_id: form.vehicle_id,
      });
    }

    onSubmit(payload);
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 480, maxHeight: '90%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text className="font-bold text-lg mb-4 text-onSurface dark:text-onSurface-dark">
          {initialValues ? 'Editar ruta' : 'Nueva ruta'}
        </Text>

        {fieldSet === 'full' && (
          <>
            <Input label="Cliente" value={form.client_name} onChangeText={set('client_name')} error={submitted ? errors.client_name : undefined} />
            <Input label="Teléfono (opcional)" value={form.client_phone} onChangeText={set('client_phone')} keyboardType="phone-pad" error={submitted ? errors.client_phone : undefined} />

            <AddressAutocompleteInput label="Origen" value={form.origin} onChangeText={changeOrigin} onSelectPlace={selectOrigin} error={submitted ? errors.origin : undefined} />
            <AddressAutocompleteInput label="Destino" value={form.destination} onChangeText={changeDestination} onSelectPlace={selectDestination} error={submitted ? errors.destination : undefined} />

            <Text className="opacity-60 text-xs mb-3 text-onSurface dark:text-onSurface-dark">
              Elige una dirección de la lista para calcular el km automáticamente, o escríbela libremente e introduce el km a mano.
            </Text>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <DatePickerField label="Fecha" value={form.trip_date} onChange={set('trip_date')} error={submitted ? errors.trip_date : undefined} />
              </View>
              <View className="flex-1">
                <TimePickerField label="Hora (opcional)" value={form.trip_time} onChange={set('trip_time')} error={submitted ? errors.trip_time : undefined} />
              </View>
            </View>

            <Input
              label="Nº pasajeros (opcional)"
              value={form.passenger_count}
              onChangeText={set('passenger_count')}
              keyboardType="numeric"
              error={submitted ? errors.passenger_count : undefined}
            />

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Input
                  label={calculatingDistance ? 'Calculando distancia...' : 'Distancia km (opcional)'}
                  value={form.estimated_distance_km}
                  onChangeText={set('estimated_distance_km')}
                  keyboardType="numeric"
                  editable={!calculatingDistance}
                  error={submitted ? errors.estimated_distance_km : undefined}
                />
              </View>
              <View className="flex-1">
                <Input label="Precio/km (opcional)" value={form.price_per_km} onChangeText={set('price_per_km')} keyboardType="numeric" error={submitted ? errors.price_per_km : undefined} />
              </View>
            </View>
            {(!!distanceError || (form.origin_lat != null && form.destination_lat != null && !calculatingDistance)) && (
              <Text className={distanceError ? 'text-error dark:text-error-dark text-xs mb-3' : 'opacity-70 text-xs mb-3 text-onSurface dark:text-onSurface-dark'}>
                {distanceError || 'Distancia calculada automáticamente por carretera. Puedes ajustarla si lo necesitas.'}
              </Text>
            )}

            {suggestedPrice !== null && (
              <View className="flex-row items-center justify-between rounded-xl px-3 py-1.5 mb-3 bg-primary/10 dark:bg-primary-dark/20">
                <Text className="text-primary dark:text-primary-dark">
                  Precio sugerido: <Text className="font-bold">{formatCurrency(suggestedPrice, currency)}</Text>
                </Text>
                <Button compact mode="text" onPress={() => set('final_price')(String(suggestedPrice))}>
                  Usar este precio
                </Button>
              </View>
            )}

            {vehicles.length > 0 && (
              <>
                <Text className="mb-2 mt-1 font-medium text-onSurface dark:text-onSurface-dark">Vehículo</Text>
                <SegmentedButtons
                  value={form.vehicle_id ? String(form.vehicle_id) : ''}
                  onValueChange={(v) => set('vehicle_id')(v ? Number(v) : null)}
                  buttons={vehicles.map((v) => ({
                    value: String(v.id),
                    label: v.plate || `#${v.id}`,
                    dotColor: getVehicleSwatchColor(v, CAR_COLOR_PALETTE),
                  }))}
                  className="mb-1"
                />
                {submitted && !!errors.vehicle_id && (
                  <Text className="text-error dark:text-error-dark text-xs mb-3">{errors.vehicle_id}</Text>
                )}
              </>
            )}
          </>
        )}

        <Text className="mb-2 mt-1 font-medium text-onSurface dark:text-onSurface-dark">Estado</Text>
        <SegmentedButtons
          value={form.status}
          onValueChange={set('status')}
          buttons={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label, dotColor: STATUS_COLORS[s.value] }))}
          className="mb-1"
        />

        <Input
          label={`Precio final (opcional, en ${currency})`}
          value={form.final_price}
          onChangeText={set('final_price')}
          keyboardType="numeric"
          error={submitted ? errors.final_price : undefined}
        />

        <PaymentMethodField label="Método de pago (opcional)" value={form.payment_method} onChange={set('payment_method')} className="mb-1" />

        <Input label="Notas (opcional)" value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || (submitted && !isValid)}
          className="mt-4"
        >
          {initialValues ? 'Guardar cambios' : 'Crear ruta'}
        </Button>
        <Button mode="text" onPress={onDismiss} className="mt-1">Cancelar</Button>
      </ScrollView>
    </Dialog>
  );
}
