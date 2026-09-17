import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { Dialog, Input, Button, ColorPickerField } from './ui';
import { PLATE_REGEX, isValidHexColor } from '../utils/validators';
import { api } from '../utils/apiClient';
import AutocompleteInput from './AutocompleteInput';

const emptyForm = { plate: '', make: '', model: '', color: '', year: '', seats: '', vehicle_type: '', active: true, notes: '' };
const currentYear = new Date().getFullYear();

function validate(form) {
  const e = {};
  if (!form.plate.trim()) e.plate = 'La matrícula es obligatoria';
  else if (!PLATE_REGEX.test(form.plate.trim())) e.plate = 'Solo letras, números y guiones (máx. 20)';

  if (!form.make.trim()) e.make = 'La marca es obligatoria';
  if (!form.model.trim()) e.model = 'El modelo es obligatorio';

  if (form.year && (!/^\d{4}$/.test(form.year) || Number(form.year) < 1900 || Number(form.year) > currentYear + 1)) {
    e.year = `Debe estar entre 1900 y ${currentYear + 1}`;
  }
  if (form.seats && (!/^\d+$/.test(form.seats) || Number(form.seats) < 1 || Number(form.seats) > 9)) {
    e.seats = 'Entre 1 y 9 asientos';
  }
  if (form.color.trim() && form.color.trim().startsWith('#') && !isValidHexColor(form.color)) {
    e.color = 'Formato: #RRGGBB';
  }
  return e;
}

export default function VehicleFormModal({ visible, onDismiss, onSubmit, initialValues, submitting }) {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    if (visible) {
      setSubmitted(false);
      if (initialValues) {
        setForm({
          ...emptyForm,
          ...initialValues,
          year: initialValues.year ? String(initialValues.year) : '',
          seats: initialValues.seats ? String(initialValues.seats) : '',
        });
      } else {
        setForm(emptyForm);
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

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValid) return;

    onSubmit({
      plate: form.plate.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      color: form.color.trim() || null,
      year: form.year ? Number(form.year) : null,
      seats: form.seats ? Number(form.seats) : null,
      vehicle_type: form.vehicle_type.trim() || null,
      active: form.active,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 480, maxHeight: '90%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text className="font-bold text-lg mb-4 text-onSurface dark:text-onSurface-dark">
          {initialValues ? 'Editar vehículo' : 'Nuevo vehículo'}
        </Text>

        <Input
          label="Matrícula"
          value={form.plate}
          onChangeText={set('plate')}
          autoCapitalize="characters"
          error={submitted ? errors.plate : undefined}
        />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <AutocompleteInput
              label="Marca"
              value={form.make}
              onChangeText={(v) => { set('make')(v); set('model')(''); }}
              onSelect={(v) => { set('make')(v); set('model')(''); }}
              suggestions={makes}
              error={submitted ? errors.make : undefined}
            />
          </View>
          <View className="flex-1">
            <AutocompleteInput
              label="Modelo"
              value={form.model}
              onChangeText={set('model')}
              onSelect={set('model')}
              suggestions={models}
              error={submitted ? errors.model : undefined}
            />
          </View>
        </View>

        <ColorPickerField
          label="Color"
          value={form.color}
          onChange={set('color')}
          error={submitted ? errors.color : undefined}
          className="mb-1"
        />

        <Input label="Tipo" value={form.vehicle_type} onChangeText={set('vehicle_type')} />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <Input
              label="Año"
              value={form.year}
              onChangeText={set('year')}
              keyboardType="numeric"
              error={submitted ? errors.year : undefined}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Asientos"
              value={form.seats}
              onChangeText={set('seats')}
              keyboardType="numeric"
              error={submitted ? errors.seats : undefined}
            />
          </View>
        </View>

        {initialValues && (
          <View className="flex-row items-center justify-between my-3">
            <Text className="text-onSurface dark:text-onSurface-dark">Activo</Text>
            <Switch value={!!form.active} onValueChange={set('active')} />
          </View>
        )}

        <Input label="Notas (opcional)" value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || (submitted && !isValid)}
          className="mt-4"
        >
          {initialValues ? 'Guardar cambios' : 'Añadir vehículo'}
        </Button>
        <Button mode="text" onPress={onDismiss} className="mt-1">Cancelar</Button>
      </ScrollView>
    </Dialog>
  );
}
