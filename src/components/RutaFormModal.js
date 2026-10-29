import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Dialog, Input, Button } from './ui';
import PaymentMethodField from './ui/PaymentMethodField';
import VehicleSelect from './ui/VehicleSelect';
import { useStatusColors, statusLabel, TIME_REGEX, todayISO, roundUpToNext15Minutes } from '../utils/rutas';
import { PHONE_REGEX } from '../utils/validators';
import { roundToNearest5, formatCurrency, DEFAULT_PRICE_PER_KM } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/apiClient';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { autoCompleteEnabled, estimateDurationMin, formatDuration, previewAutoCompleteTime } from '../utils/autoComplete';
import DatePickerField from './DatePickerField';
import TimePickerField from './TimePickerField';
import AddressAutocompleteInput from './AddressAutocompleteInput';

function personName(person) {
  if (!person) return null;
  const name = `${person.first_name || ''} ${person.last_name || ''}`.trim();
  return name || null;
}

function completionNames(ruta) {
  if (!ruta) return [];
  const fromPivot = (ruta.completions || [])
    .map((c) => personName(c.user))
    .filter(Boolean);
  if (fromPivot.length) return fromPivot;
  const legacy = personName(ruta.completer);
  return legacy ? [legacy] : [];
}

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
  passenger_count: '1',
  estimated_distance_km: '',
  // Road duration from OSRM (with distance); used by auto-complete ETA.
  estimated_duration_min: null,
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
    if (!form.client_name.trim() || form.client_name.trim().length < 2) e.client_name = i18n.t('rutaForm.errors.min2');
    if (!form.client_phone.trim()) e.client_phone = i18n.t('rutaForm.errors.required');
    else if (!PHONE_REGEX.test(form.client_phone.trim())) e.client_phone = i18n.t('rutaForm.errors.phone');
    if (!form.origin.trim() || form.origin.trim().length < 2) e.origin = i18n.t('rutaForm.errors.min2');
    if (!form.destination.trim() || form.destination.trim().length < 2) e.destination = i18n.t('rutaForm.errors.min2');
    if (!form.trip_date) e.trip_date = i18n.t('rutaForm.errors.date');
    if (!form.trip_time || !form.trip_time.trim()) e.trip_time = i18n.t('rutaForm.errors.timeRequired');
    else if (!TIME_REGEX.test(form.trip_time.trim())) e.trip_time = i18n.t('rutaForm.errors.time');
    if (form.passenger_count && (!/^\d+$/.test(form.passenger_count) || Number(form.passenger_count) < 1)) {
      e.passenger_count = i18n.t('rutaForm.errors.greaterThanZero');
    }
    if (form.estimated_distance_km && (isNaN(Number(form.estimated_distance_km)) || Number(form.estimated_distance_km) < 0)) {
      e.estimated_distance_km = i18n.t('validation.positiveNumber');
    }
    if (form.price_per_km && (isNaN(Number(form.price_per_km)) || Number(form.price_per_km) < 0)) {
      e.price_per_km = i18n.t('validation.positiveNumber');
    }
    // Without vehicles we cannot require one (e.g. driving for another owner).
    if (vehicles.length > 0 && !form.vehicle_id) e.vehicle_id = i18n.t('rutaForm.errors.vehicle');
  }
  if (form.final_price === '' || form.final_price == null) {
    e.final_price = i18n.t('rutaForm.errors.finalPriceRequired');
  } else if (isNaN(Number(form.final_price)) || Number(form.final_price) < 0) {
    e.final_price = i18n.t('validation.positiveNumber');
  }
  return e;
}

// fieldSet 'full': create or owner/admin edit. 'driverUpdate': driver editing
// a ruta they did not create (final_price, payment_method, notes; status via swipe).
export default function RutaFormModal({ visible, onDismiss, onSubmit, initialValues, defaultDate, defaultTime, fieldSet = 'full', vehicles = [], submitting }) {
  const STATUS_COLORS = useStatusColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState('');
  const [metaOpen, setMetaOpen] = useState(false);
  // Last auto-filled km: overwrite only if current matches or is empty.
  const lastAutoDistanceRef = useRef(null);
  const isEditing = !!initialValues;

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setDistanceError('');
      setMetaOpen(false);
      lastAutoDistanceRef.current = null;
      if (initialValues) {
        setForm({
          ...emptyForm,
          ...initialValues,
          // trip_date arrives as full ISO; date picker expects "YYYY-MM-DD".
          trip_date: initialValues.trip_date ? initialValues.trip_date.slice(0, 10) : '',
          passenger_count: initialValues.passenger_count != null && initialValues.passenger_count !== ''
            ? String(initialValues.passenger_count)
            : '1',
          estimated_distance_km: initialValues.estimated_distance_km ? String(initialValues.estimated_distance_km) : '',
          estimated_duration_min: initialValues.estimated_duration_min ?? null,
          price_per_km: initialValues.price_per_km ? String(initialValues.price_per_km) : '',
          final_price: initialValues.final_price != null && initialValues.final_price !== ''
            ? String(initialValues.final_price)
            : '',
        });
      } else {
        const defaultVehicle = vehicles.find((v) => v.is_default) || vehicles[0];
        setForm({
          ...emptyForm,
          trip_date: defaultDate || todayISO(),
          trip_time: defaultTime || roundUpToNext15Minutes(),
          passenger_count: '1',
          status: 'pending',
          price_per_km: user?.price_per_km
            ? String(user.price_per_km)
            : (user?.currency || 'EUR') === 'EUR' ? String(DEFAULT_PRICE_PER_KM) : '',
          vehicle_id: defaultVehicle ? defaultVehicle.id : null,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues, defaultDate, defaultTime]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const selectOrigin = (place) => setForm((f) => ({ ...f, origin: place.display_name, origin_lat: place.lat, origin_lng: place.lon }));
  const selectDestination = (place) => setForm((f) => ({ ...f, destination: place.display_name, destination_lat: place.lat, destination_lng: place.lon }));
  const changeOrigin = (text) => setForm((f) => ({ ...f, origin: text, origin_lat: null, origin_lng: null, estimated_duration_min: null }));
  const changeDestination = (text) => setForm((f) => ({ ...f, destination: text, destination_lat: null, destination_lng: null, estimated_duration_min: null }));
  const changeDistance = (text) => setForm((f) => ({ ...f, estimated_distance_km: text, estimated_duration_min: null }));

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
      const km = String(resp.data.distance_km);
      lastAutoDistanceRef.current = km;
      setForm((f) => ({
        ...f,
        estimated_distance_km: km,
        estimated_duration_min: resp.data.duration_min ?? resp.data.estimated_duration_min ?? null,
      }));
    }).catch((err) => {
      if (cancelled) return;
      setDistanceError(err.response?.data?.message || i18n.t('rutaForm.distanceError'));
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
  const tripDurationLabel = form.estimated_duration_min != null && Number(form.estimated_duration_min) > 0
    ? formatDuration(Number(form.estimated_duration_min))
    : null;

  const metaCreatorName = isEditing ? personName(initialValues?.creator) : null;
  const metaCompleters = isEditing ? completionNames(initialValues) : [];
  const metaCancellerName = isEditing ? personName(initialValues?.canceller) : null;
  const hasMetaDetails = !!(metaCreatorName || metaCompleters.length || metaCancellerName);

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValid) return;

    // Status is not editable here (swipe/list only). Create always pending;
    // edit echoes the loaded status so the API does not clear it.
    const payload = {
      status: isEditing ? form.status : 'pending',
      notes: form.notes || null,
      final_price: Number(form.final_price),
    };
    if (form.payment_method) payload.payment_method = form.payment_method;

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
        trip_date: form.trip_date || null,
        trip_time: form.trip_time.trim(),
        passenger_count: form.passenger_count ? Number(form.passenger_count) : 1,
        estimated_distance_km: form.estimated_distance_km ? Number(form.estimated_distance_km) : null,
        estimated_duration_min: form.estimated_duration_min ? Number(form.estimated_duration_min) : null,
        price_per_km: form.price_per_km ? Number(form.price_per_km) : null,
        vehicle_id: form.vehicle_id,
      });
    }

    onSubmit(payload);
  };

  const pricePaymentRow = (
    <View className="flex-row flex-wrap gap-2 items-start">
      <View className="flex-1 min-w-[120px]">
        <Input
          label={t('rutaForm.finalPrice', { currency })}
          required
          value={form.final_price}
          onChangeText={set('final_price')}
          placeholder={t('rutaForm.placeholders.finalPrice')}
          keyboardType="decimal-pad"
          inputMode="decimal"
          error={submitted ? errors.final_price : undefined}
        />
      </View>
      <View className="flex-[1.4] min-w-[160px]">
        <PaymentMethodField
          label={t('rutaForm.paymentMethod')}
          value={form.payment_method}
          onChange={set('payment_method')}
          compact
          className="mb-1"
        />
      </View>
    </View>
  );

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 480, maxHeight: '90%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between gap-2 mb-2">
          <Text className="font-bold text-lg flex-shrink text-onSurface dark:text-onSurface-dark">
            {isEditing ? t('rutaForm.editTitle') : t('rutaForm.newTitle')}
          </Text>
          {isEditing && (
            <Text
              style={{
                backgroundColor: `${STATUS_COLORS[form.status] || STATUS_COLORS.pending}33`,
                color: STATUS_COLORS[form.status] || STATUS_COLORS.pending,
              }}
              className="text-[10px] font-semibold rounded px-1.5 py-0.5 overflow-hidden self-start"
            >
              {statusLabel(form.status)}
            </Text>
          )}
        </View>

        {fieldSet === 'full' && (
          <>
            <View className="flex-row flex-wrap gap-2">
              <View className="flex-1 min-w-[140px]">
                <Input
                  label={t('rutaForm.client')}
                  required
                  value={form.client_name}
                  onChangeText={set('client_name')}
                  placeholder={t('rutaForm.placeholders.client')}
                  autoCapitalize="words"
                  error={submitted ? errors.client_name : undefined}
                />
              </View>
              <View className="flex-1 min-w-[110px]">
                <Input
                  label={t('rutaForm.phone')}
                  required
                  value={form.client_phone}
                  onChangeText={set('client_phone')}
                  placeholder={t('rutaForm.placeholders.phone')}
                  keyboardType="phone-pad"
                  inputMode="tel"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  error={submitted ? errors.client_phone : undefined}
                />
              </View>
            </View>

            <AddressAutocompleteInput
              label={t('rutaForm.origin')}
              required
              value={form.origin}
              onChangeText={changeOrigin}
              onSelectPlace={selectOrigin}
              placeholder={t('rutaForm.placeholders.origin')}
              error={submitted ? errors.origin : undefined}
            />
            <AddressAutocompleteInput
              label={t('rutaForm.destination')}
              required
              value={form.destination}
              onChangeText={changeDestination}
              onSelectPlace={selectDestination}
              placeholder={t('rutaForm.placeholders.destination')}
              error={submitted ? errors.destination : undefined}
            />

            <Text className="opacity-60 text-xs mb-2 text-onSurface dark:text-onSurface-dark">
              {t('rutaForm.addressHint')}
            </Text>

            <View className="flex-row flex-wrap gap-2">
              <View className="flex-1 min-w-[120px]">
                <DatePickerField
                  label={t('rutaForm.date')}
                  required
                  value={form.trip_date}
                  onChange={set('trip_date')}
                  placeholder={t('rutaForm.placeholders.date')}
                  error={submitted ? errors.trip_date : undefined}
                />
              </View>
              <View className="flex-1 min-w-[100px]">
                <TimePickerField
                  label={t('rutaForm.time')}
                  required
                  value={form.trip_time}
                  onChange={set('trip_time')}
                  placeholder={t('rutaForm.placeholders.time')}
                  error={submitted ? errors.trip_time : undefined}
                />
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <View className="flex-1 min-w-[100px]">
                <Input
                  label={calculatingDistance ? t('rutaForm.calculatingDistance') : t('rutaForm.distance')}
                  value={form.estimated_distance_km}
                  onChangeText={changeDistance}
                  placeholder={t('rutaForm.placeholders.distance')}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  editable={!calculatingDistance}
                  error={submitted ? errors.estimated_distance_km : undefined}
                />
              </View>
              <View className="flex-1 min-w-[100px]">
                <Input
                  label={t('rutaForm.pricePerKm')}
                  value={form.price_per_km}
                  onChangeText={set('price_per_km')}
                  placeholder={t('rutaForm.placeholders.pricePerKm')}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  error={submitted ? errors.price_per_km : undefined}
                />
              </View>
            </View>
            {(!!distanceError || tripDurationLabel || (form.origin_lat != null && form.destination_lat != null && !calculatingDistance)) && (
              <Text className={distanceError ? 'text-error dark:text-error-dark text-xs mb-2' : 'opacity-70 text-xs mb-2 text-onSurface dark:text-onSurface-dark'}>
                {distanceError
                  || (tripDurationLabel
                    ? t('rutaForm.distanceAutoWithDuration', { duration: tripDurationLabel })
                    : t('rutaForm.distanceAuto'))}
              </Text>
            )}
            {/* TODO: Google Maps navigation deep-link when coords exist (full routing later). */}

            {suggestedPrice !== null && (
              <View className="flex-row items-center justify-between rounded-xl px-3 py-1 mb-2 bg-primary/10 dark:bg-primary-dark/20">
                <Text className="text-primary dark:text-primary-dark">
                  {t('rutaForm.suggestedPrice')} <Text className="font-bold">{formatCurrency(suggestedPrice, currency)}</Text>
                </Text>
                <Button compact mode="text" onPress={() => set('final_price')(String(suggestedPrice))}>
                  {t('rutaForm.useThisPrice')}
                </Button>
              </View>
            )}

            {pricePaymentRow}

            <View className="flex-row flex-wrap gap-2">
              {vehicles.length > 0 && (
                <View className="flex-[2] min-w-[160px]">
                  <VehicleSelect
                    label={t('rutaForm.vehicle')}
                    required
                    value={form.vehicle_id}
                    vehicles={vehicles}
                    onChange={(id) => set('vehicle_id')(id ?? null)}
                    placeholder={t('rutaForm.placeholders.vehicle')}
                    error={submitted ? errors.vehicle_id : undefined}
                  />
                </View>
              )}
              <View className="flex-1 min-w-[72px]">
                <Input
                  label={t('rutaForm.passengers')}
                  value={form.passenger_count}
                  onChangeText={set('passenger_count')}
                  placeholder={t('rutaForm.placeholders.passengers')}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  error={submitted ? errors.passenger_count : undefined}
                />
              </View>
            </View>
          </>
        )}

        {fieldSet !== 'full' && pricePaymentRow}

        {((isEditing && form.status === 'pending') || !isEditing) && autoCompleteEnabled(user) && (
          <View className="rounded-xl px-2.5 py-1.5 mb-2 bg-primary/10 dark:bg-primary-dark/20">
            <Text className="text-xs text-onSurface dark:text-onSurface-dark">
              {form.trip_time
                ? t('rutaForm.autoCompleteAt', { time: previewAutoCompleteTime(form, user), duration: formatDuration(estimateDurationMin(form, user)) })
                : t('rutaForm.autoCompleteEndOfDay')}
              {' '}{t('rutaForm.autoCompleteFixLater')}
            </Text>
          </View>
        )}

        <Input label={t('form.notesOptional')} value={form.notes} onChangeText={set('notes')} multiline numberOfLines={2} />

        {hasMetaDetails && (
          <Pressable
            onPress={() => setMetaOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: metaOpen }}
            className="mt-1 mb-0.5 py-0.5"
          >
            <Text className="text-[10px] opacity-50 text-onSurface dark:text-onSurface-dark">
              {t('rutaForm.metaDetails')} {metaOpen ? '▴' : '▾'}
            </Text>
            {metaOpen && (
              <View className="mt-0.5 gap-px">
                {!!metaCreatorName && (
                  <Text className="text-[10px] opacity-50 text-onSurface dark:text-onSurface-dark">
                    {t('planner.createdBy', { name: metaCreatorName })}
                  </Text>
                )}
                {metaCompleters.length > 0 && (
                  <Text className="text-[10px] opacity-50 text-onSurface dark:text-onSurface-dark">
                    {t('planner.completedBy', { name: metaCompleters.join(', ') })}
                  </Text>
                )}
                {!!metaCancellerName && (
                  <Text className="text-[10px] opacity-50 text-onSurface dark:text-onSurface-dark">
                    {t('planner.cancelledBy', { name: metaCancellerName })}
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || (submitted && !isValid)}
          className="mt-3"
        >
          {isEditing ? t('form.saveChanges') : t('rutaForm.create')}
        </Button>
        <Button mode="text" onPress={onDismiss} className="mt-0.5">{t('common.cancel')}</Button>
      </ScrollView>
    </Dialog>
  );
}
