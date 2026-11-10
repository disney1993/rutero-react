import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Button, Icon } from './ui';
import FieldLabel from './ui/FieldLabel';
import VehicleSelect from './ui/VehicleSelect';
import DatePickerField from './DatePickerField';
import DriverAvatarPicker from './DriverAvatarPicker';
import InlineConfirm from './ui/InlineConfirm';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../hooks/useTeam';
import { categoryColor, EXPENSE_PAYMENT_METHODS, parseAmount } from '../utils/expenses';
import { todayISO } from '../utils/rutas';

const empty = {
  date: '', category: '', description: '', amount: '', vat_amount: '',
  vehicle_id: null, driver_id: null, payment_method: '', notes: '',
};

function validate(form, category, t) {
  const e = {};
  if (!form.category) e.category = t('expenses.errors.category');
  const amount = parseAmount(form.amount);
  if (!(amount > 0)) e.amount = t('expenses.errors.amount');
  else if (amount > 1000000) e.amount = t('expenses.errors.amountMax');
  if (form.vat_amount !== '') {
    const vat = parseAmount(form.vat_amount);
    if (Number.isNaN(vat)) e.vat_amount = t('expenses.errors.amount');
    else if (amount > 0 && vat > amount) e.vat_amount = t('expenses.errors.vatTooHigh');
  }
  if (!form.date) e.date = t('expenses.errors.date');
  if (category?.description_required && !form.description.trim()) e.description = t('expenses.errors.description');
  if (category?.driver_required && !form.driver_id) e.driver_id = t('expenses.errors.driver');
  return e;
}

/**
 * Alta y edición de un gasto. Pide solo los datos que tienen sentido para la
 * categoría: vehículo (combustible, taller...), conductor (nóminas, multas) y
 * descripción obligatoria en "Otro".
 */
export default function ExpenseFormModal({ visible, onDismiss, onSubmit, onDelete, initialValues, categories, vehicles = [], defaultDate, submitting }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const team = useTeam({ enabled: visible });
  const [form, setForm] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isEditing = !!initialValues;

  useEffect(() => {
    if (!visible) return;
    setSubmitted(false);
    setConfirmingDelete(false);
    if (initialValues) {
      setForm({
        ...empty,
        ...initialValues,
        date: String(initialValues.date || '').slice(0, 10),
        description: initialValues.description || '',
        amount: initialValues.amount != null ? String(initialValues.amount).replace('.', ',') : '',
        vat_amount: initialValues.vat_amount != null ? String(initialValues.vat_amount).replace('.', ',') : '',
        payment_method: initialValues.payment_method || '',
        notes: initialValues.notes || '',
      });
    } else {
      const defaultVehicle = vehicles.find((v) => v.is_default) || vehicles[0];
      setForm({ ...empty, date: defaultDate || todayISO(), vehicle_id: defaultVehicle?.id ?? null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialValues]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const category = categories.find((c) => c.key === form.category);
  const links = category?.links || [];
  const errors = validate(form, category, t);
  const isValid = Object.keys(errors).length === 0;

  const submit = () => {
    setSubmitted(true);
    if (!isValid) return;
    onSubmit({
      date: form.date,
      category: form.category,
      description: form.description.trim() || null,
      amount: parseAmount(form.amount),
      vat_amount: form.vat_amount === '' ? null : parseAmount(form.vat_amount),
      vehicle_id: links.includes('vehicle') ? form.vehicle_id : null,
      driver_id: links.includes('driver') ? form.driver_id : null,
      payment_method: form.payment_method || null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 560, maxHeight: '92%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text className="font-bold text-lg mb-3 text-onSurface dark:text-onSurface-dark">
          {isEditing ? t('expenses.editTitle') : t('expenses.newTitle')}
        </Text>

        <FieldLabel required>{t('expenses.category')}</FieldLabel>
        <View className="flex-row flex-wrap gap-2 mb-1">
          {categories.map((c, i) => {
            const selected = form.category === c.key;
            const color = categoryColor(c.key, i);
            return (
              <Pressable
                key={c.key}
                onPress={() => set('category')(c.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={selected ? { backgroundColor: `${color}22`, borderColor: color } : undefined}
                className={selected
                  ? 'flex-row items-center rounded-full px-3 py-1.5 border'
                  : 'flex-row items-center rounded-full px-3 py-1.5 border border-border dark:border-border-dark'}
              >
                <Icon name={c.icon} size={16} color={color} />
                <Text className="ml-1.5 text-xs text-onSurface dark:text-onSurface-dark">{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {submitted && !!errors.category && <Text className="text-xs mb-2 text-error dark:text-error-dark">{errors.category}</Text>}

        <View className="mt-2">
          <Input
            label={t('expenses.amount')}
            required
            value={form.amount}
            onChangeText={set('amount')}
            keyboardType="decimal-pad"
            placeholder="0,00"
            right="currency-eur"
            error={submitted ? errors.amount : undefined}
          />
          <DatePickerField
            label={t('expenses.date')}
            required
            value={form.date}
            onChange={set('date')}
            error={submitted ? errors.date : undefined}
          />
        </View>

        <Input
          label={category?.description_required ? t('expenses.descriptionRequired') : t('expenses.description')}
          required={!!category?.description_required}
          value={form.description}
          onChangeText={set('description')}
          maxLength={120}
          placeholder={t('expenses.descriptionPlaceholder')}
          error={submitted ? errors.description : undefined}
        />

        {links.includes('driver') && (
          <View className="mb-2">
            <FieldLabel required={!!category?.driver_required}>{t('team.driver')}</FieldLabel>
            {team.active.length === 0 && !form.driver_id ? (
              <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('expenses.noTeam')}</Text>
            ) : (
              <DriverAvatarPicker
                owner={user}
                team={team.active}
                value={form.driver_id}
                onChange={set('driver_id')}
                extra={initialValues?.driver}
                includeOwner={!category?.driver_required}
                showDefault={false}
              />
            )}
            {submitted && !!errors.driver_id && <Text className="text-xs text-error dark:text-error-dark">{errors.driver_id}</Text>}
          </View>
        )}

        {links.includes('vehicle') && vehicles.length > 0 && (
          <VehicleSelect
            label={t('expenses.vehicle')}
            value={form.vehicle_id}
            vehicles={vehicles}
            onChange={(id) => set('vehicle_id')(id ?? null)}
            placeholder={t('expenses.vehicleNone')}
          />
        )}

        <FieldLabel>{t('expenses.paymentMethod')}</FieldLabel>
        <View className="flex-row flex-wrap gap-2 mb-2">
          {EXPENSE_PAYMENT_METHODS.map((m) => {
            const selected = form.payment_method === m;
            return (
              <Pressable
                key={m}
                onPress={() => set('payment_method')(selected ? '' : m)}
                className={selected
                  ? 'rounded-full px-3 py-1 border bg-primary/15 border-primary dark:bg-primary-dark/25 dark:border-primary-dark'
                  : 'rounded-full px-3 py-1 border border-border dark:border-border-dark'}
              >
                <Text className="text-xs text-onSurface dark:text-onSurface-dark">{t(`expenses.payment.${m}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label={t('expenses.vat')}
          value={form.vat_amount}
          onChangeText={set('vat_amount')}
          keyboardType="decimal-pad"
          placeholder={t('expenses.vatPlaceholder')}
          error={submitted ? errors.vat_amount : undefined}
        />
        <Input label={t('expenses.notes')} value={form.notes} onChangeText={set('notes')} multiline maxLength={1000} />

        {confirmingDelete ? (
          <InlineConfirm
            className="mt-4"
            destructive
            title={t('expenses.deleteTitle')}
            message={t('expenses.deleteConfirm', { amount: formatCurrency(initialValues?.amount) })}
            confirmLabel={t('common.delete')}
            onConfirm={() => onDelete(initialValues)}
            onCancel={() => setConfirmingDelete(false)}
          />
        ) : (
          <View className="flex-row items-center mt-4">
            {isEditing && (
              <Button mode="text" icon="delete-outline" onPress={() => setConfirmingDelete(true)} textClassName="text-error dark:text-error-dark">
                {t('common.delete')}
              </Button>
            )}
            <View className="flex-1" />
            <Button mode="text" onPress={onDismiss}>{t('common.cancel')}</Button>
            <Button mode="contained" loading={submitting} disabled={submitting} onPress={submit}>{t('common.save')}</Button>
          </View>
        )}
      </ScrollView>
    </Dialog>
  );
}
