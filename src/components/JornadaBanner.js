import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import Input from './ui/Input';
import Button from './ui/Button';
import SegmentedButtons from './ui/SegmentedButtons';
import IconButton from './ui/IconButton';
import Dialog from './ui/Dialog';
import { cn } from './ui/cn';
import { api, errorMessage } from '../utils/apiClient';
import { todayISO } from '../utils/rutas';
import { toastSuccess } from '../utils/toast';

function monthFromISO(isoDate) {
  return String(isoDate || '').slice(0, 7);
}

function codeDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

// Top block on Trips / Calendar:
//  - owner: generate / copy month or day code for the visible date
//  - driver: join with a code (no generation UI)
export default function JornadaBanner({
  showOwner = false,
  showDriver = false,
  selectedDate,
  codeInput = '',
  onCodeInputChange,
  onJoin,
  joining = false,
  codeError = '',
  joinMessage = '',
}) {
  const { t } = useTranslation();
  const [codeType, setCodeType] = useState('month');
  const [activeCode, setActiveCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ownerMessage, setOwnerMessage] = useState('');
  const [infoVisible, setInfoVisible] = useState(false);

  const visibleDate = selectedDate || todayISO();
  const visibleMonth = monthFromISO(visibleDate);

  const loadOwnerCode = useCallback(async () => {
    if (!showOwner) return;
    setLoading(true);
    setOwnerMessage('');
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
      setOwnerMessage(errorMessage(err, t('ownerCode.needVehicle')));
    } finally {
      setLoading(false);
    }
  }, [showOwner, codeType, visibleDate, visibleMonth, t]);

  useEffect(() => {
    loadOwnerCode();
  }, [loadOwnerCode]);

  const generate = async () => {
    setGenerating(true);
    setOwnerMessage('');
    try {
      const payload = codeType === 'day'
        ? { type: 'day', valid_on: visibleDate }
        : { type: 'month', month: visibleMonth };
      const resp = await api.post('/owner/codes', payload);
      setActiveCode(resp.data);
    } catch (err) {
      const validation = err.response?.data?.errors;
      const first = validation && Object.values(validation).flat()[0];
      setOwnerMessage(first || errorMessage(err, t('ownerCode.needVehicle')));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!activeCode) return;
    await Clipboard.setStringAsync(activeCode.code);
    toastSuccess(t('ownerCode.copied'));
  };

  if (!showOwner && !showDriver) return null;

  return (
    <View className="mx-3 mt-1 mb-1 rounded-xl px-2.5 py-2 bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60">
      {showOwner && (
        <View>
          <View className="flex-row items-center gap-1 mb-1">
            <Text
              numberOfLines={1}
              className="flex-1 text-xs font-medium text-onSurface dark:text-onSurface-dark"
            >
              {t('ownerCode.title')}
            </Text>
            <IconButton
              icon="information-outline"
              size={18}
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

          {loading ? (
            <ActivityIndicator className="my-1.5" size="small" />
          ) : (
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Input
                  className="mb-0"
                  value={activeCode?.code || ''}
                  editable={false}
                  selectTextOnFocus
                  placeholder={
                    codeType === 'day' ? t('ownerCode.noneDay') : t('ownerCode.noneMonth')
                  }
                  inputClassName="tracking-[2px] font-bold text-base"
                />
              </View>
              {activeCode ? (
                <Button mode="contained" onPress={copy} compact textClassName="text-sm text-white">
                  {t('common.copy')}
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={generate}
                  loading={generating}
                  disabled={generating}
                  compact
                  textClassName="text-sm text-white"
                >
                  {t('ownerCode.generate')}
                </Button>
              )}
            </View>
          )}
          {!!ownerMessage && (
            <Text className="mt-1 opacity-70 text-[11px] text-onSurface dark:text-onSurface-dark">
              {ownerMessage}
            </Text>
          )}

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
        </View>
      )}

      {showDriver && (
        <View>
          <Text className="text-xs font-medium text-onSurface dark:text-onSurface-dark mb-1">
            {t('driver.joinTitle')}
          </Text>
          <View className="flex-row gap-2 items-center">
            <View className="flex-1">
              <Input
                label={t('driver.codeLabel')}
                value={codeInput}
                onChangeText={onCodeInputChange}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>
            <Button mode="contained" onPress={onJoin} loading={joining} disabled={joining} compact>
              {t('driver.join')}
            </Button>
          </View>
          {(!!codeError || !!joinMessage) && (
            <Text className={cn('text-[11px] mt-1', codeError ? 'text-error dark:text-error-dark' : 'opacity-70 text-onSurface dark:text-onSurface-dark')}>
              {codeError || joinMessage}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
