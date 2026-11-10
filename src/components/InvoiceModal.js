import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Button, Icon } from './ui';
import FieldLabel from './ui/FieldLabel';
import { api, errorMessage } from '../utils/apiClient';
import InlineConfirm from './ui/InlineConfirm';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { formatCurrency } from '../utils/currency';
import { parseAmount } from '../utils/expenses';
import { isValidPostalCode, isValidTaxId, normalizeTaxId, shortPlace } from '../utils/taxId';
import { downloadAndSharePdf, reportDownloadError } from '../utils/reportDownload';
import { toastError, toastSuccess } from '../utils/toast';

const EMPTY_RECIPIENT = { name: '', tax_id: '', address_line: '', postal_code: '', city: '', province: '', email: '' };

/**
 * Emisión de la factura de un viaje completado. Pide solo lo que falta:
 * - Simplificada (sin datos del cliente) hasta el límite legal (3.000 € en
 *   viajeros, 400 € en mercancías).
 * - Completa si se supera o si el cliente la necesita para deducirse el IVA:
 *   nombre, NIF y domicilio del cliente (se pueden guardar para otra vez).
 * El concepto se propone ("Viaje origen – destino") y siempre es editable.
 */
export default function InvoiceModal({ visible, ruta, onDismiss, onIssued }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];

  const [profile, setProfile] = useState(null);
  const [needFull, setNeedFull] = useState(false);
  const [recipient, setRecipient] = useState(EMPTY_RECIPIENT);
  const [saveClient, setSaveClient] = useState(true);
  const [concept, setConcept] = useState('');
  const [total, setTotal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!visible || !ruta) return;
    setSubmitted(false);
    setConfirming(false);
    setNeedFull(false);
    setRecipient({ ...EMPTY_RECIPIENT, name: ruta.client_name || '' });
    setSaveClient(true);
    setConcept(`${t('invoice.trip')} ${shortPlace(ruta.origin)} – ${shortPlace(ruta.destination)}`);
    const price = ruta.final_price ?? ruta.estimated_price ?? '';
    setTotal(price === '' ? '' : String(price).replace('.', ','));
    api.get('/billing-profile').then((resp) => setProfile(resp.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ruta?.id]);

  // Sugerencias de clientes guardados mientras se escribe el nombre.
  useEffect(() => {
    const q = recipient.name.trim();
    if (!visible || q.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get('/invoice-clients', { params: { search: q } })
        .then((resp) => setSuggestions((resp.data || []).filter((cl) => cl.name !== q || cl.tax_id !== recipient.tax_id)))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, recipient.name, recipient.tax_id]);

  const amount = parseAmount(total);
  const limit = profile?.simplified_limit ?? 400;
  const rate = Number(profile?.profile?.vat_rate ?? 10);
  const type = needFull || amount > limit ? 'full' : 'simplified';
  const base = amount > 0 ? Math.round((amount / (1 + rate / 100)) * 100) / 100 : 0;
  const vat = amount > 0 ? Math.round((amount - base) * 100) / 100 : 0;
  const withRecipient = type === 'full' || !!recipient.tax_id.trim();

  const errors = useMemo(() => {
    const e = {};
    if (concept.trim().length < 3) e.concept = t('invoice.errors.concept');
    if (!(amount > 0)) e.total = t('expenses.errors.amount');
    if (withRecipient) {
      if (!recipient.name.trim()) e.name = t('invoice.errors.required');
      if (!isValidTaxId(recipient.tax_id)) e.tax_id = t('billing.errors.taxId');
      if (!recipient.address_line.trim()) e.address_line = t('invoice.errors.required');
      if (!isValidPostalCode(recipient.postal_code)) e.postal_code = t('billing.errors.postalCode');
      if (!recipient.city.trim()) e.city = t('invoice.errors.required');
    }
    return e;
  }, [concept, amount, withRecipient, recipient, t]);
  const err = (k) => (submitted ? errors[k] : undefined);
  const setR = (key) => (value) => setRecipient((r) => ({ ...r, [key]: value }));

  const payload = () => {
    const r = Object.fromEntries(Object.entries(recipient).map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
    if (r.tax_id) r.tax_id = normalizeTaxId(r.tax_id);
    return {
      type,
      concept: concept.trim(),
      total: amount,
      // En la simplificada sin NIF, el nombre del cliente no se incluye.
      recipient: withRecipient ? r : null,
      save_client: withRecipient && saveClient,
    };
  };

  const preview = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setBusy('preview');
    try {
      await downloadAndSharePdf({ url: `/rutas/${ruta.id}/invoice`, method: 'post', data: { ...payload(), preview: true }, fallbackName: 'factura-borrador.pdf' });
    } catch (e) {
      toastError(reportDownloadError(e, t('billing.pdfError')));
    } finally {
      setBusy(null);
    }
  };

  // Primer toque: valida y pide confirmación dentro del propio diálogo.
  const askIssue = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setConfirming(true);
  };

  const issue = async () => {
    setBusy('issue');
    try {
      const resp = await api.post(`/rutas/${ruta.id}/invoice`, payload());
      toastSuccess(t('invoice.issued', { number: resp.data.full_number }));
      onIssued?.(resp.data);
      await downloadAndSharePdf({ url: `/invoices/${resp.data.id}/pdf`, fallbackName: `factura-${resp.data.full_number}.pdf` }).catch(() => {});
    } catch (e) {
      const validation = e.response?.data?.errors;
      toastError((validation && Object.values(validation).flat()[0]) || errorMessage(e, t('alerts.genericError')));
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  };

  if (!ruta) return null;

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 560, maxHeight: '92%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text className="font-bold text-lg text-onSurface dark:text-onSurface-dark">{t('invoice.title')}</Text>
        <Text className="mb-3 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          {type === 'full' ? t('invoice.typeFull') : t('invoice.typeSimplified', { limit: formatCurrency(limit) })}
        </Text>

        <Input label={t('invoice.concept')} required value={concept} onChangeText={setConcept} multiline maxLength={500} error={err('concept')} />
        <Input label={t('invoice.total')} required value={total} onChangeText={setTotal} keyboardType="decimal-pad" right="currency-eur" error={err('total')} />
        {amount > 0 && (
          <View className="flex-row justify-between rounded-xl px-3 py-2 mb-3 bg-fill dark:bg-fill-dark">
            <Text className="text-xs text-onSurface dark:text-onSurface-dark">{t('invoice.base')}: {formatCurrency(base)}</Text>
            <Text className="text-xs text-onSurface dark:text-onSurface-dark">{rate === 0 ? t('billing.exempt') : `${t('invoice.vat')} ${rate} %: ${formatCurrency(vat)}`}</Text>
          </View>
        )}

        <Pressable onPress={() => setNeedFull((v) => !v)} className="flex-row items-center justify-between mb-2" disabled={amount > limit}>
          <View className="flex-1 pr-3">
            <Text className="text-sm text-onSurface dark:text-onSurface-dark">{t('invoice.needFull')}</Text>
            <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {amount > limit ? t('invoice.overLimit', { limit: formatCurrency(limit) }) : t('invoice.needFullHint')}
            </Text>
          </View>
          <Switch value={type === 'full'} onValueChange={setNeedFull} disabled={amount > limit} />
        </Pressable>

        {type === 'full' && (
          <View>
            <FieldLabel>{t('invoice.client')}</FieldLabel>
            <Input label={t('invoice.clientName')} required value={recipient.name} onChangeText={setR('name')} maxLength={120} error={err('name')} />
            {suggestions.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-2">
                {suggestions.map((cl) => (
                  <Pressable
                    key={cl.id}
                    onPress={() => { setRecipient({ ...EMPTY_RECIPIENT, ...Object.fromEntries(Object.entries(cl).filter(([k]) => k in EMPTY_RECIPIENT).map(([k, v]) => [k, v || ''])) }); setSuggestions([]); }}
                    className="flex-row items-center rounded-full px-3 py-1 border border-primary dark:border-primary-dark"
                  >
                    <Icon name="account-check-outline" size={14} color={c.primary} />
                    <Text className="ml-1 text-xs text-onSurface dark:text-onSurface-dark">{cl.name}{cl.tax_id ? ` · ${cl.tax_id}` : ''}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Input label={t('billing.nif')} required value={recipient.tax_id} onChangeText={(v) => setR('tax_id')(v.toUpperCase())} autoCapitalize="characters" maxLength={15} error={err('tax_id')} />
            <Input label={t('billing.address')} required value={recipient.address_line} onChangeText={setR('address_line')} maxLength={150} error={err('address_line')} />
            <View className="flex-row gap-2">
              <View style={{ width: 110 }}>
                <Input label={t('billing.postalCode')} required value={recipient.postal_code} onChangeText={setR('postal_code')} keyboardType="number-pad" maxLength={5} error={err('postal_code')} />
              </View>
              <View className="flex-1">
                <Input label={t('billing.city')} required value={recipient.city} onChangeText={setR('city')} maxLength={80} error={err('city')} />
              </View>
            </View>
            <Input label={t('billing.email')} value={recipient.email} onChangeText={setR('email')} keyboardType="email-address" autoCapitalize="none" maxLength={120} />
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-onSurface dark:text-onSurface-dark">{t('invoice.saveClient')}</Text>
              <Switch value={saveClient} onValueChange={setSaveClient} />
            </View>
          </View>
        )}

        <Text className="mt-1 mb-3 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('invoice.legalHint')}</Text>

        {confirming ? (
          <InlineConfirm
            title={t('invoice.confirmTitle')}
            message={t('invoice.confirmText', { total: formatCurrency(amount) })}
            confirmLabel={t('invoice.issue')}
            loading={busy === 'issue'}
            onConfirm={issue}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <View className="flex-row flex-wrap items-center gap-2">
            <Button mode="text" onPress={onDismiss}>{t('common.cancel')}</Button>
            <View className="flex-1" />
            <Button mode="outlined" icon="eye-outline" loading={busy === 'preview'} disabled={!!busy} onPress={preview}>{t('invoice.preview')}</Button>
            <Button mode="contained" icon="file-document-check-outline" disabled={!!busy} onPress={askIssue}>{t('invoice.issue')}</Button>
          </View>
        )}
      </ScrollView>
    </Dialog>
  );
}
