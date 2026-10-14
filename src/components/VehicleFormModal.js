import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { Dialog, Input, Button, NativeSelect, ColorPickerField, VehicleTypeSelect, getVehicleType, carColorToHex } from './ui';
import { PLATE_REGEX, PLATE_MAX_LENGTH, sanitizePlate, isValidHexColor } from '../utils/validators';
import { api } from '../utils/apiClient';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const currentYear = new Date().getFullYear();
// Opciones de los desplegables: años del más reciente al más antiguo y plazas
// de 1 (solo el conductor) a 90 (autobús grande: articulado o de dos pisos).
const MIN_YEAR = 1950;
export const MAX_SEATS = 90;
const YEAR_OPTIONS = Array.from({ length: currentYear + 1 - MIN_YEAR + 1 }, (_, i) => String(currentYear + 1 - i));
const SEAT_OPTIONS = Array.from({ length: MAX_SEATS }, (_, i) => String(i + 1));
// Al crear: año actual y 1 plaza (el mínimo, el propio conductor).
const emptyForm = { plate: '', make: '', model: '', color: '', year: String(currentYear), seats: '1', vehicle_type: '', is_default: false, notes: '' };

// Datos tal y como se envían a la API. También sirve para saber si al editar
// ha cambiado algo de verdad (escribir y deshacer no cuenta como cambio).
function toPayload(form) {
  return {
    plate: form.plate.trim(),
    make: form.make.trim(),
    model: form.model.trim(),
    color: form.color.trim(),
    year: Number(form.year),
    seats: Number(form.seats),
    // Se envía la clave canónica (p. ej. 'moto' → 'motocicleta').
    vehicle_type: getVehicleType(form.vehicle_type)?.value ?? form.vehicle_type,
    is_default: !!form.is_default,
    notes: form.notes || null,
  };
}

// Todo es obligatorio salvo las notas (mismas reglas que VehicleController).
function validate(form) {
  const e = {};
  if (!form.plate.trim()) e.plate = i18n.t('vehicleForm.errors.plateRequired');
  else if (!PLATE_REGEX.test(form.plate.trim())) e.plate = i18n.t('vehicleForm.errors.plateFormat', { max: PLATE_MAX_LENGTH });

  if (!form.make.trim()) e.make = i18n.t('vehicleForm.errors.makeRequired');
  // Obligatorio y de la lista: un valor antiguo/erróneo obliga a elegir uno válido.
  if (!getVehicleType(form.vehicle_type)) e.vehicle_type = i18n.t('vehicleForm.errors.typeRequired');
  if (!form.model.trim()) e.model = i18n.t('vehicleForm.errors.modelRequired');

  if (!form.color.trim()) e.color = i18n.t('vehicleForm.errors.colorRequired');
  else if (form.color.trim().startsWith('#') && !isValidHexColor(form.color)) e.color = i18n.t('vehicleForm.errors.colorInvalid');

  if (!YEAR_OPTIONS.includes(String(form.year))) e.year = i18n.t('vehicleForm.errors.yearRequired');
  if (!SEAT_OPTIONS.includes(String(form.seats))) e.seats = i18n.t('vehicleForm.errors.seatsRequired');
  return e;
}

export default function VehicleFormModal({ visible, onDismiss, onSubmit, initialValues, vehicles = [], submitting }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  // Campos que el usuario ya ha tocado: solo en esos se muestra el error al crear.
  const [touched, setTouched] = useState({});
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      setTouched({});
      if (initialValues) {
        const loaded = {
          ...emptyForm,
          ...initialValues,
          // Vehículos antiguos pueden tener campos a null: el formulario trabaja con texto.
          plate: sanitizePlate(initialValues.plate),
          make: initialValues.make || '',
          model: initialValues.model || '',
          color: initialValues.color || '',
          vehicle_type: initialValues.vehicle_type || '',
          notes: initialValues.notes || '',
          year: initialValues.year ? String(initialValues.year) : '',
          seats: initialValues.seats ? String(initialValues.seats) : '',
        };
        setForm(loaded);
        setInitialForm(loaded);
      } else {
        setForm(emptyForm);
        setInitialForm(emptyForm);
      }
      if (makes.length === 0) {
        api.get('/car-catalog/makes').then((resp) => setMakes(resp.data)).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues]);

  useEffect(() => {
    if (form.make.trim()) {
      api.get('/car-catalog/models', { params: { make: form.make.trim() } })
        .then((resp) => setModels(resp.data))
        .catch(() => setModels([]));
    } else {
      setModels([]);
    }
  }, [form.make]);

  const set = (key) => (value) => {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
    setForm((f) => ({ ...f, [key]: value }));
  };

  const isEditing = !!initialValues;
  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;
  const isDirty = !isEditing || JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(initialForm));
  const canSubmit = isValid && isDirty && !submitting;

  // Al editar los errores se ven desde el principio (el botón está bloqueado
  // y hay que saber por qué); al crear, solo en los campos ya tocados.
  const fieldError = (key) => (isEditing || submitted || touched[key] ? errors[key] : undefined);

  // Por qué está deshabilitado el botón (null si se puede pulsar).
  let blockedHint = null;
  if (!isValid) blockedHint = isEditing ? t('form.reviewRed') : t('form.completeRequired');
  else if (!isDirty) blockedHint = t('profile.noChanges');

  const handleSubmit = () => {
    setSubmitted(true);
    if (!canSubmit) return;
    onSubmit(toPayload(form));
  };

  // El primer vehículo se marca predeterminado automáticamente en el
  // backend; a partir del segundo, se puede elegir al crear o cambiar luego
  // desde la edición. Nunca se puede "desmarcar" sin promover otro vehículo.
  const isFirstVehicle = !initialValues && vehicles.length === 0;
  const isCurrentDefault = !!initialValues?.is_default;

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 480, maxHeight: '90%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text className="font-bold text-lg mb-4 text-onSurface dark:text-onSurface-dark">
          {initialValues ? t('vehicleForm.editTitle') : t('vehicleForm.newTitle')}
        </Text>
        <Text className="-mt-3 mb-3 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          <Text className="text-error dark:text-error-dark">*</Text> {t('form.requiredLegend')}
        </Text>

        <Input
          label={t('vehicleForm.plate')}
          required
          value={form.plate}
          onChangeText={(v) => set('plate')(sanitizePlate(v))}
          placeholder={t('vehicleForm.platePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={PLATE_MAX_LENGTH}
          error={fieldError('plate')}
        />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <NativeSelect
              label={t('vehicleForm.make')}
              required
              value={form.make}
              options={makes}
              sort
              onChange={(v) => { set('make')(v); setForm((f) => ({ ...f, model: '' })); }}
              placeholder={t('vehicleForm.makePlaceholder')}
              customLabel={t('vehicleForm.otherMake')}
              customPlaceholder={t('vehicleForm.typeMake')}
              error={fieldError('make')}
            />
          </View>
          <View className="flex-1">
            {/* Marca fuera del catálogo (p. ej. de moto o camión): sin lista de modelos, se escribe. */}
            {form.make && models.length === 0 ? (
              <Input
                label={t('vehicleForm.model')}
                required
                value={form.model}
                onChangeText={set('model')}
                placeholder={t('vehicleForm.typeModel')}
                error={fieldError('model')}
              />
            ) : (
              <NativeSelect
                label={t('vehicleForm.model')}
                required
                value={form.model}
                options={models}
                sort
                onChange={set('model')}
                placeholder={t('vehicleForm.modelPlaceholder')}
                customLabel={t('vehicleForm.otherModel')}
                customPlaceholder={t('vehicleForm.typeModel')}
                disabled={!form.make}
                error={fieldError('model')}
              />
            )}
          </View>
        </View>

        <ColorPickerField
          label={t('vehicleForm.color')}
          required
          value={form.color}
          onChange={set('color')}
          error={fieldError('color')}
          className="mb-1"
        />

        <VehicleTypeSelect
          label={t('vehicleForm.type')}
          required
          value={form.vehicle_type}
          onChange={set('vehicle_type')}
          paintColor={carColorToHex(form.color)}
          // Si el valor guardado no está en la lista se avisa ya al abrir.
          error={fieldError('vehicle_type')}
        />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <NativeSelect
              label={t('vehicleForm.year')}
              required
              value={form.year}
              options={YEAR_OPTIONS}
              onChange={set('year')}
              placeholder={t('vehicleForm.yearPlaceholder')}
              error={fieldError('year')}
            />
          </View>
          <View className="flex-1">
            <NativeSelect
              label={t('vehicleForm.seats')}
              required
              value={form.seats}
              options={SEAT_OPTIONS}
              onChange={set('seats')}
              placeholder={t('vehicleForm.seatsPlaceholder')}
              error={fieldError('seats')}
            />
          </View>
        </View>

        {isFirstVehicle && (
          <Text className="text-xs mb-3 text-primary dark:text-primary-dark">
            {t('vehicleForm.firstDefault')}
          </Text>
        )}
        {isCurrentDefault && (
          <Text className="text-xs mb-3 text-primary dark:text-primary-dark">
            {t('vehicleForm.isDefault')}
          </Text>
        )}
        {!isFirstVehicle && !isCurrentDefault && (
          <View className="flex-row items-center justify-between my-3">
            <Text className="text-onSurface dark:text-onSurface-dark">{t('vehicleForm.defaultSwitch')}</Text>
            <Switch value={!!form.is_default} onValueChange={set('is_default')} />
          </View>
        )}

        <Input label={t('form.notesOptional')} value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
          className="mt-4"
        >
          {isEditing ? t('form.saveChanges') : t('vehicleForm.add')}
        </Button>
        {!!blockedHint && !submitting && (
          <Text className="text-center text-xs mt-2 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{blockedHint}</Text>
        )}
        <Button mode="text" onPress={onDismiss} className="mt-1">{t('common.cancel')}</Button>
      </ScrollView>
    </Dialog>
  );
}
