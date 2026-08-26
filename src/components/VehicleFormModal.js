import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Portal, Modal, Text, TextInput, Button, Switch, HelperText, useTheme } from 'react-native-paper';
import { PLATE_REGEX } from '../utils/validators';
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
  return e;
}

export default function VehicleFormModal({ visible, onDismiss, onSubmit, initialValues, submitting }) {
  const theme = useTheme();
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
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text variant="titleLarge" style={styles.title}>
            {initialValues ? 'Editar vehículo' : 'Nuevo vehículo'}
          </Text>

          <TextInput mode="outlined" label="Matrícula" value={form.plate} onChangeText={set('plate')} autoCapitalize="characters" style={styles.input} error={submitted && !!errors.plate} />
          <HelperText type="error" visible={submitted && !!errors.plate}>{errors.plate}</HelperText>

          <View style={styles.row}>
            <View style={styles.half}>
              <AutocompleteInput
                label="Marca"
                value={form.make}
                onChangeText={(v) => { set('make')(v); set('model')(''); }}
                onSelect={(v) => { set('make')(v); set('model')(''); }}
                suggestions={makes}
                error={submitted && !!errors.make}
              />
              <HelperText type="error" visible={submitted && !!errors.make}>{errors.make}</HelperText>
            </View>
            <View style={styles.half}>
              <AutocompleteInput
                label="Modelo"
                value={form.model}
                onChangeText={set('model')}
                onSelect={set('model')}
                suggestions={models}
                error={submitted && !!errors.model}
              />
              <HelperText type="error" visible={submitted && !!errors.model}>{errors.model}</HelperText>
            </View>
          </View>

          <View style={styles.row}>
            <TextInput mode="outlined" label="Color" value={form.color} onChangeText={set('color')} style={[styles.input, styles.half]} />
            <TextInput mode="outlined" label="Tipo" value={form.vehicle_type} onChangeText={set('vehicle_type')} style={[styles.input, styles.half]} />
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput mode="outlined" label="Año" value={form.year} onChangeText={set('year')} keyboardType="numeric" style={styles.input} error={submitted && !!errors.year} />
              <HelperText type="error" visible={submitted && !!errors.year}>{errors.year}</HelperText>
            </View>
            <View style={styles.half}>
              <TextInput mode="outlined" label="Asientos" value={form.seats} onChangeText={set('seats')} keyboardType="numeric" style={styles.input} error={submitted && !!errors.seats} />
              <HelperText type="error" visible={submitted && !!errors.seats}>{errors.seats}</HelperText>
            </View>
          </View>

          {initialValues && (
            <View style={styles.switchRow}>
              <Text>Activo</Text>
              <Switch value={!!form.active} onValueChange={set('active')} />
            </View>
          )}

          <TextInput mode="outlined" label="Notas (opcional)" value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} style={styles.input} />

          <Button mode="contained" onPress={handleSubmit} loading={submitting} disabled={submitting || (submitted && !isValid)} style={styles.submitButton}>
            {initialValues ? 'Guardar cambios' : 'Añadir vehículo'}
          </Button>
          <Button mode="text" onPress={onDismiss} style={styles.cancelButton}>Cancelar</Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 16, borderRadius: 16, maxHeight: '90%' },
  scrollContent: { padding: 20 },
  title: { fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  submitButton: { marginTop: 16, borderRadius: 10 },
  cancelButton: { marginTop: 4 },
});
