import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from './ui';
import * as Clipboard from 'expo-clipboard';
import { api, errorMessage } from '../utils/apiClient';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Código único del mes para compartir con quien vaya a conducir. Vive en la
// pantalla de rutas (no en ajustes) porque es una acción sobre "mis rutas
// de este mes", no una preferencia de cuenta.
export default function OwnerCodeDialog({ visible, onDismiss }) {
  const { t } = useTranslation();
  const [monthlyCode, setMonthlyCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const resp = await api.get('/owner/codes');
      setMonthlyCode(resp.data.find((c) => c.month === currentMonth()) || null);
    } catch (err) {
      setMonthlyCode(null);
      setMessage(errorMessage(err, t('ownerCode.needVehicle')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const generate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const resp = await api.post('/owner/codes', { month: currentMonth() });
      setMonthlyCode(resp.data);
    } catch (err) {
      setMessage(errorMessage(err, t('ownerCode.needVehicle')));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!monthlyCode) return;
    await Clipboard.setStringAsync(monthlyCode.code);
    setMessage(t('ownerCode.copied'));
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{t('ownerCode.title')}</Dialog.Title>
      <Dialog.Content>
        <Text className="opacity-70 mb-3 text-onSurface dark:text-onSurface-dark">
          {t('ownerCode.explanation')}
        </Text>

        {loading ? (
          <ActivityIndicator className="my-3" />
        ) : monthlyCode ? (
          <Text className="text-center tracking-[4px] font-bold text-2xl my-3 text-onSurface dark:text-onSurface-dark">
            {monthlyCode.code}
          </Text>
        ) : (
          <Text className="opacity-70 text-xs text-onSurface dark:text-onSurface-dark">
            {t('ownerCode.none')}
          </Text>
        )}

        {!!message && (
          <Text className="mt-2 opacity-80 text-xs text-onSurface dark:text-onSurface-dark">{message}</Text>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button mode="text" onPress={onDismiss}>{t('common.close')}</Button>
        {monthlyCode ? (
          <Button mode="contained" onPress={copy}>{t('common.copy')}</Button>
        ) : (
          <Button mode="contained" onPress={generate} loading={generating} disabled={generating}>
            {t('ownerCode.generate')}
          </Button>
        )}
      </Dialog.Actions>
    </Dialog>
  );
}
