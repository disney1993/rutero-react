import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, IconButton, PageContainer, SegmentedButtons, StatusBadge, Dialog, Icon } from '../components/ui';
import NativeSelect from '../components/ui/NativeSelect';
import FieldLabel from '../components/ui/FieldLabel';
import { api, errorMessage } from '../utils/apiClient';
import { formatCurrency } from '../utils/currency';
import { isCif, isDni, isNie, isValidIban, isValidPostalCode, isValidTaxId, normalizeTaxId } from '../utils/taxId';
import { downloadAndSharePdf, reportDownloadError } from '../utils/reportDownload';
import { toastError, toastSuccess } from '../utils/toast';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';

const EMPTY = {
  issuer_type: 'autonomo', legal_name: '', tax_id: '', address_line: '', postal_code: '', city: '', province: '',
  activity: 'passengers', vat_rate: 10, exemption_reason: '', series: '', next_number: 1, licence: '', email: '', phone: '', iban: '',
};

function validate(f, t) {
  const e = {};
  if (f.legal_name.trim().length < 2) e.legal_name = t('billing.errors.required');
  const tax = normalizeTaxId(f.tax_id);
  if (!tax) e.tax_id = t('billing.errors.required');
  else if (!isValidTaxId(tax)) e.tax_id = t('billing.errors.taxId');
  else if (f.issuer_type === 'autonomo' && !(isDni(tax) || isNie(tax))) e.tax_id = t('billing.errors.taxIdPerson');
  else if (f.issuer_type === 'sociedad' && !isCif(tax)) e.tax_id = t('billing.errors.taxIdCompany');
  if (f.address_line.trim().length < 3) e.address_line = t('billing.errors.required');
  if (!isValidPostalCode(f.postal_code)) e.postal_code = t('billing.errors.postalCode');
  if (f.city.trim().length < 2) e.city = t('billing.errors.required');
  if (!f.province) e.province = t('billing.errors.required');
  if (Number(f.vat_rate) === 0 && !f.exemption_reason.trim()) e.exemption_reason = t('billing.errors.exemption');
  if (!/^[A-Za-z0-9\-/]{1,10}$/.test(f.series)) e.series = t('billing.errors.series');
  if (f.iban.trim() && !isValidIban(f.iban)) e.iban = t('billing.errors.iban');
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = t('validation.invalidEmail');
  return e;
}

/**
 * Ajustes → Datos de facturación: datos fiscales del emisor (validados con
 * su dígito de control) y facturas emitidas. Sin estos datos completos, el
 * botón "Factura" de los viajes está deshabilitado.
 */
export default function BillingSettingsScreen() {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState({ ready: false, missing: [], provinces: [], simplified_limit: 3000 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [correcting, setCorrecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [profileResp, invoicesResp] = await Promise.all([api.get('/billing-profile'), api.get('/invoices')]);
      const p = profileResp.data.profile || {};
      setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? EMPTY[k]])),
        vat_rate: Number(p.vat_rate ?? 10),
      });
      setMeta(profileResp.data);
      setInvoices(invoicesResp.data || []);
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const errors = validate(form, t);
  const err = (key) => (submitted ? errors[key] : undefined);
  const lockedNumbering = invoices.some((i) => i.type !== 'corrective' && String(i.full_number).startsWith(form.series));

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      toastError(t('billing.errors.review'));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, tax_id: normalizeTaxId(form.tax_id), iban: form.iban.trim() || null, exemption_reason: form.exemption_reason.trim() || null };
      if (lockedNumbering) delete payload.next_number;
      else payload.next_number = Number(form.next_number) || 1;
      const resp = await api.put('/billing-profile', payload);
      setMeta(resp.data);
      setSubmitted(false);
      toastSuccess(resp.data.ready ? t('billing.savedReady') : t('billing.saved'));
    } catch (e) {
      const validation = e.response?.data?.errors;
      toastError((validation && Object.values(validation).flat()[0]) || errorMessage(e, t('alerts.genericError')));
    } finally {
      setSaving(false);
    }
  };

  const share = async (inv) => {
    setBusyId(inv.id);
    try {
      await downloadAndSharePdf({ url: `/invoices/${inv.id}/pdf`, fallbackName: `factura-${inv.full_number}.pdf` });
    } catch (e) {
      toastError(reportDownloadError(e, t('billing.pdfError')));
    } finally {
      setBusyId(null);
    }
  };

  const rectify = async () => {
    if (reason.trim().length < 3) return;
    try {
      await api.post(`/invoices/${correcting.id}/corrective`, { reason: reason.trim() });
      toastSuccess(t('billing.corrected'));
      setCorrecting(null);
      setReason('');
      load();
    } catch (e) {
      toastError(errorMessage(e, t('alerts.genericError')));
    }
  };

  if (loading) return <ActivityIndicator className="mt-10" />;

  return (
    <ScrollView className="bg-background dark:bg-background-dark" contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <PageContainer className="p-4">
        <View className={`rounded-2xl px-4 py-3 mb-4 ${meta.ready ? 'bg-secondary/10 dark:bg-secondary-dark/20' : 'bg-tertiary/10 dark:bg-tertiary-dark/20'}`}>
          <View className="flex-row items-center">
            <Icon name={meta.ready ? 'check-decagram' : 'alert-circle-outline'} size={18} color={meta.ready ? c.secondary : c.tertiary} />
            <Text className="ml-2 font-bold text-onSurface dark:text-onSurface-dark">{meta.ready ? t('billing.readyTitle') : t('billing.notReadyTitle')}</Text>
          </View>
          <Text className="mt-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{meta.ready ? t('billing.readyText') : t('billing.notReadyText')}</Text>
        </View>

        <Card className="mb-4">
          <Card.Content>
            <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">{t('billing.issuerTitle')}</Text>
            <SegmentedButtons
              value={form.issuer_type}
              onValueChange={set('issuer_type')}
              buttons={[{ value: 'autonomo', label: t('billing.autonomo') }, { value: 'sociedad', label: t('billing.sociedad') }]}
              className="mb-2"
            />
            <Input label={form.issuer_type === 'sociedad' ? t('billing.companyName') : t('billing.personName')} required value={form.legal_name} onChangeText={set('legal_name')} maxLength={120} error={err('legal_name')} />
            <Input label={form.issuer_type === 'sociedad' ? t('billing.cif') : t('billing.nif')} required value={form.tax_id} onChangeText={(v) => set('tax_id')(v.toUpperCase())} autoCapitalize="characters" maxLength={15} placeholder={form.issuer_type === 'sociedad' ? t('billing.examplePrefix', { value: 'B12345674' }) : t('billing.examplePrefix', { value: '12345678Z' })} error={err('tax_id')} />
            <Input label={t('billing.address')} required value={form.address_line} onChangeText={set('address_line')} maxLength={150} placeholder={t('billing.addressPlaceholder')} error={err('address_line')} />
            <View className="flex-row gap-2">
              <View style={{ width: 110 }}>
                <Input label={t('billing.postalCode')} required value={form.postal_code} onChangeText={set('postal_code')} keyboardType="number-pad" maxLength={5} error={err('postal_code')} />
              </View>
              <View className="flex-1">
                <Input label={t('billing.city')} required value={form.city} onChangeText={set('city')} maxLength={80} error={err('city')} />
              </View>
            </View>
            <NativeSelect label={t('billing.province')} required value={form.province} options={meta.provinces || []} onChange={set('province')} sort error={err('province')} />
            <Input label={t('billing.licence')} value={form.licence} onChangeText={set('licence')} maxLength={40} placeholder={t('billing.licencePlaceholder')} />
            <View className="flex-row gap-2">
              <View className="flex-1"><Input label={t('billing.phone')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={20} /></View>
              <View className="flex-1"><Input label={t('billing.email')} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" maxLength={120} error={err('email')} /></View>
            </View>
            <Input label={t('billing.iban')} value={form.iban} onChangeText={(v) => set('iban')(v.toUpperCase())} autoCapitalize="characters" maxLength={40} placeholder={t('billing.examplePrefix', { value: 'ES91 2100 0418 4502 0005 1332' })} error={err('iban')} />
          </Card.Content>
        </Card>

        <Card className="mb-4">
          <Card.Content>
            <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">{t('billing.taxTitle')}</Text>
            <FieldLabel>{t('billing.activity')}</FieldLabel>
            <SegmentedButtons
              value={form.activity}
              onValueChange={(v) => setForm((f) => ({ ...f, activity: v, vat_rate: v === 'passengers' ? 10 : 21 }))}
              buttons={[{ value: 'passengers', label: t('billing.passengers') }, { value: 'goods', label: t('billing.goods') }]}
              className="mb-2"
            />
            <FieldLabel>{t('billing.vatRate')}</FieldLabel>
            <View className="flex-row gap-2 mb-2">
              {[10, 21, 4, 0].map((r) => {
                const sel = Number(form.vat_rate) === r;
                return (
                  <Pressable key={r} onPress={() => set('vat_rate')(r)} className={sel
                    ? 'rounded-full px-3 py-1 border bg-primary/15 border-primary dark:bg-primary-dark/25 dark:border-primary-dark'
                    : 'rounded-full px-3 py-1 border border-border dark:border-border-dark'}
                  >
                    <Text className="text-xs text-onSurface dark:text-onSurface-dark">{r === 0 ? t('billing.exempt') : `${r} %`}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs mb-2 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('billing.vatHint', { limit: form.activity === 'passengers' ? '3.000' : '400' })}</Text>
            {Number(form.vat_rate) === 0 && (
              <Input label={t('billing.exemptionReason')} required value={form.exemption_reason} onChangeText={set('exemption_reason')} maxLength={200} error={err('exemption_reason')} />
            )}
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input label={t('billing.series')} required value={form.series} onChangeText={set('series')} maxLength={10} error={err('series')} />
              </View>
              <View style={{ width: 130 }}>
                <Input label={t('billing.nextNumber')} value={String(form.next_number ?? 1)} onChangeText={(v) => set('next_number')(v.replace(/\D/g, ''))} keyboardType="number-pad" editable={!lockedNumbering} />
              </View>
            </View>
            <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {lockedNumbering ? t('billing.numberingLocked') : t('billing.numberingHint', { example: `${form.series}${String(form.next_number || 1).padStart(4, '0')}` })}
            </Text>
          </Card.Content>
        </Card>

        <Button mode="contained" icon="content-save-outline" loading={saving} onPress={save} className="mb-6">{t('common.save')}</Button>

        <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">{t('billing.issuedTitle', { count: invoices.length })}</Text>
        {invoices.length === 0 && <Text className="opacity-60 text-onSurface dark:text-onSurface-dark">{t('billing.noInvoices')}</Text>}
        {invoices.map((inv) => {
          const corrected = !!inv.corrected_by;
          return (
            <Card key={inv.id} className="mb-2">
              <Card.Content className="flex-row items-center py-2">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold text-onSurface dark:text-onSurface-dark">{inv.full_number}</Text>
                    {inv.type === 'corrective' && <StatusBadge tone="tertiary">{t('billing.corrective')}</StatusBadge>}
                    {corrected && <StatusBadge tone="tertiary">{t('billing.correctedBy', { number: inv.corrected_by.full_number })}</StatusBadge>}
                  </View>
                  <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                    {String(inv.issue_date).slice(0, 10).split('-').reverse().join('/')}{inv.recipient?.name ? ` · ${inv.recipient.name}` : ''}
                  </Text>
                </View>
                <Text className="font-bold mr-1 text-onSurface dark:text-onSurface-dark">{formatCurrency(inv.total)}</Text>
                <IconButton icon="share-variant" onPress={() => share(inv)} disabled={busyId === inv.id} accessibilityLabel={t('billing.share')} />
                {inv.type !== 'corrective' && !corrected && (
                  <IconButton icon="file-undo-outline" onPress={() => { setCorrecting(inv); setReason(''); }} accessibilityLabel={t('billing.rectify')} />
                )}
              </Card.Content>
            </Card>
          );
        })}
      </PageContainer>

      <Dialog visible={!!correcting} onDismiss={() => setCorrecting(null)}>
        <Dialog.Title>{t('billing.rectifyTitle', { number: correcting?.full_number })}</Dialog.Title>
        <Dialog.Content>
          <Text className="mb-2 text-sm text-onSurface dark:text-onSurface-dark">{t('billing.rectifyText')}</Text>
          <Input label={t('billing.rectifyReason')} value={reason} onChangeText={setReason} maxLength={200} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={() => setCorrecting(null)}>{t('common.cancel')}</Button>
          <Button mode="contained" disabled={reason.trim().length < 3} onPress={rectify}>{t('billing.rectify')}</Button>
        </Dialog.Actions>
      </Dialog>
    </ScrollView>
  );
}
