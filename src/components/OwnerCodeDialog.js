import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, SegmentedButtons, Input, IconButton } from './ui';
import * as Clipboard from 'expo-clipboard';
import { api, errorMessage } from '../utils/apiClient';
import { todayISO } from '../utils/rutas';
import { toastSuccess } from '../utils/toast';

function monthFromISO(isoDate) {
  return String(isoDate || '').slice(0, 7);
}

function codeDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

// Kept for reuse; primary UX lives in JornadaBanner on Trips / Calendar.
export default function OwnerCodeDialog({ visible, onDismiss, selectedDate }) {
  const { t } = useTranslation();
  const [codeType, setCodeType] = useState('month');
  const [activeCode, setActiveCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [infoVisible, setInfoVisible] = useState(false);

  const visibleDate = selectedDate || todayISO();
  const visibleMonth = monthFromISO(visibleDate);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setActiveCode(null);
    try {
      const resp = await api.get('/owner/codes');
      const codes = resp.data || [];
      if (codeType === 'day') {
        setActiveCode(
          codes.find((c) => c.type === 'day' && codeDate(c.valid_on) === visibleDate) || null
        );
      } else {
        setActiveCode(
          codes.find((c) => (c.type || 'month') === 'month' && c.month === visibleMonth) || null
        );
      }
    } catch (err) {
      setActiveCode(null);
      setMessage(errorMessage(err, t('ownerCode.needVehicle')));
    } finally {
      setLoading(false);
    }
  }, [codeType, visibleDate, visibleMonth, t]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const generate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const payload = codeType === 'day'
        ? { type: 'day', valid_on: visibleDate }
        : { type: 'month', month: visibleMonth };
      const resp = await api.post('/owner/codes', payload);
      setActiveCode(resp.data);
    } catch (err) {
      const validation = err.response?.data?.errors;
      const first = validation && Object.values(validation).flat()[0];
      setMessage(first || errorMessage(err, t('ownerCode.needVehicle')));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!activeCode) return;
    await Clipboard.setStringAsync(activeCode.code);
    toastSuccess(t('ownerCode.copied'));
  };

  return (
    <>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <View className="flex-row items-center gap-1 mb-1">
          <Dialog.Title className="flex-1 mb-0">{t('ownerCode.title')}</Dialog.Title>
          <IconButton
            icon="information-outline"
            size={20}
            onPress={() => setInfoVisible(true)}
            className="p-1"
            accessibilityLabel={t('ownerCode.infoA11y')}
          />
          <SegmentedButtons
            compact
            inline
            value={codeType}
            onValueChange={setCodeType}
            buttons={[
              { value: 'month', label: t('ownerCode.typeMonth') },
              { value: 'day', label: t('ownerCode.typeDay') },
            ]}
          />
        </View>
        <Dialog.Content>
          {loading ? (
            <ActivityIndicator className="my-2" size="small" />
          ) : (
            <Input
              className="mb-0"
              value={activeCode?.code || ''}
              editable={false}
              selectTextOnFocus
              placeholder={
                codeType === 'day' ? t('ownerCode.noneDay') : t('ownerCode.noneMonth')
              }
              inputClassName="tracking-[2px] font-bold text-base text-center"
            />
          )}

          {!!message && (
            <Text className="mt-1.5 opacity-70 text-[11px] text-onSurface dark:text-onSurface-dark">{message}</Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={onDismiss}>{t('common.close')}</Button>
          {activeCode ? (
            <Button mode="contained" onPress={copy}>{t('common.copy')}</Button>
          ) : (
            <Button mode="contained" onPress={generate} loading={generating} disabled={generating}>
              {t('ownerCode.generate')}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={infoVisible} onDismiss={() => setInfoVisible(false)}>
        <Dialog.Title>{t('ownerCode.infoTitle')}</Dialog.Title>
        <Dialog.Content>
          <Text className="mb-2 text-sm text-onSurface dark:text-onSurface-dark">
            {t('ownerCode.infoMonth')}
          </Text>
          <Text className="text-sm text-onSurface dark:text-onSurface-dark">
            {t('ownerCode.infoDay')}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={() => setInfoVisible(false)}>
            {t('common.gotIt')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}
