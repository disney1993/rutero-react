import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Switch, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, SegmentedButtons, PageContainer, Input, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { api, errorMessage } from '../utils/apiClient';
import { AUTO_COMPLETE_DEFAULTS, previewAutoCompleteTime } from '../utils/autoComplete';
import { toastError, toastSuccess } from '../utils/toast';
import { haptics, isHapticsEnabled, setHapticsEnabled } from '../utils/haptics';

const EXAMPLE_DURATION_MIN = 38;

function inRange(value, min, max) {
  return /^\d+$/.test(String(value)) && Number(value) >= min && Number(value) <= max;
}

// Ajustes del cierre automático de viajes (lo ejecuta el cron de rutero-api).
function AutoCompleteSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [enabled, setEnabled] = useState(user?.auto_complete_enabled !== false);
  const [startDelay, setStartDelay] = useState(
    String(user?.auto_complete_start_delay_min ?? AUTO_COMPLETE_DEFAULTS.start_delay_min)
  );
  const [marginMin, setMarginMin] = useState(String(user?.auto_complete_margin_min ?? AUTO_COMPLETE_DEFAULTS.margin_min));
  const [marginPct, setMarginPct] = useState(String(user?.auto_complete_margin_pct ?? AUTO_COMPLETE_DEFAULTS.margin_pct));
  const [defaultDuration, setDefaultDuration] = useState(
    String(user?.auto_complete_default_duration_min ?? AUTO_COMPLETE_DEFAULTS.default_duration_min)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(user?.auto_complete_enabled !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.auto_complete_enabled]);

  const valid = inRange(startDelay, 0, 120) && inRange(marginMin, 0, 240) && inRange(marginPct, 0, 100) && inRange(defaultDuration, 5, 1440);
  const exampleTime = valid
    ? previewAutoCompleteTime(
      { trip_time: '10:00', estimated_duration_min: EXAMPLE_DURATION_MIN },
      {
        auto_complete_start_delay_min: Number(startDelay),
        auto_complete_margin_min: Number(marginMin),
        auto_complete_margin_pct: Number(marginPct),
      }
    )
    : null;

  const save = async (patch) => {
    setSaving(true);
    try {
      const resp = await api.patch('/user/preferences', patch);
      await updateUser(resp.data);
      toastSuccess(t('autoComplete.saved'));
    } catch (err) {
      toastError(errorMessage(err, t('autoComplete.invalid')));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (value) => {
    setEnabled(value);
    save({ auto_complete_enabled: value });
  };

  const saveMargins = () => {
    if (!valid) {
      toastError(t('autoComplete.invalid'));
      return;
    }
    save({
      auto_complete_start_delay_min: Number(startDelay),
      auto_complete_margin_min: Number(marginMin),
      auto_complete_margin_pct: Number(marginPct),
      auto_complete_default_duration_min: Number(defaultDuration),
    });
  };

  return (
    <Card className="mb-4">
      <Card.Content>
        <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">{t('autoComplete.title')}</Text>
        <Text className="mb-3 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('autoComplete.explanation')}</Text>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="flex-1 text-onSurface dark:text-onSurface-dark">{t('autoComplete.enabled')}</Text>
          <Switch value={enabled} onValueChange={toggle} disabled={saving} />
        </View>
        {enabled ? (
          <>
            <Input label={t('autoComplete.startDelay')} value={startDelay} onChangeText={setStartDelay} keyboardType="numeric" />
            <Input label={t('autoComplete.marginMin')} value={marginMin} onChangeText={setMarginMin} keyboardType="numeric" />
            <Input label={t('autoComplete.marginPct')} value={marginPct} onChangeText={setMarginPct} keyboardType="numeric" />
            <Input label={t('autoComplete.defaultDuration')} value={defaultDuration} onChangeText={setDefaultDuration} keyboardType="numeric" />
            {!!exampleTime && (
              <Text className="mt-1 mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('autoComplete.example', { duration: EXAMPLE_DURATION_MIN, time: exampleTime })}
              </Text>
            )}
            <Button mode="contained" onPress={saveMargins} loading={saving} disabled={saving} className="mt-2">
              {t('autoComplete.save')}
            </Button>
          </>
        ) : (
          <Text className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('autoComplete.disabledHint')}</Text>
        )}
      </Card.Content>
    </Card>
  );
}

// Preferencia local del dispositivo (no viaja con la cuenta: depende del móvil).
function HapticsSetting() {
  const { t } = useTranslation();
  const [on, setOn] = useState(isHapticsEnabled());
  const toggle = (value) => {
    setOn(value);
    setHapticsEnabled(value);
    if (value) haptics.success();
  };
  return (
    <Card className="mb-4">
      <Card.Content>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-bold text-onSurface dark:text-onSurface-dark">{t('settings.haptics')}</Text>
            <Text className="mt-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('settings.hapticsHint')}</Text>
          </View>
          <Switch value={on} onValueChange={toggle} />
        </View>
      </Card.Content>
    </Card>
  );
}

// Tema e idioma en su propia pantalla: son los ajustes que alguien quiere
// cambiar rápido, sin bucear en el formulario largo de Mi perfil. Se aplican
// al instante y se guardan en el perfil del servidor para viajar con la cuenta.
export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();

  const changeTheme = async (value) => {
    setThemeMode(value);
    try {
      const resp = await api.patch('/user/preferences', { theme: value });
      await updateUser(resp.data);
    } catch (err) {
      // No crítico: el tema ya cambió localmente aunque no se pudiera guardar en el servidor.
    }
  };

  const changeAppLanguage = async (value) => {
    await changeLanguage(value);
    try {
      const resp = await api.patch('/user/preferences', { language: value });
      await updateUser(resp.data);
    } catch (err) {
      // No crítico: el idioma ya cambió localmente aunque no se pudiera guardar en el servidor.
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="bg-background dark:bg-background-dark">
      <PageContainer className="p-4">
        <AutoCompleteSettings />

        <Card className="mb-4">
          <Card.Content>
            <Text className="font-bold mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.theme')}</Text>
            <SegmentedButtons
              value={themeMode}
              onValueChange={changeTheme}
              buttons={[
                { value: 'system', label: t('profile.themeSystem') },
                { value: 'light', label: t('profile.themeLight') },
                { value: 'dark', label: t('profile.themeDark') },
              ]}
            />
          </Card.Content>
        </Card>

        {Platform.OS !== 'web' && <HapticsSetting />}

        <Card>
          <Card.Content>
            <Text className="font-bold mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.language')}</Text>
            <SegmentedButtons
              value={i18n.language}
              onValueChange={changeAppLanguage}
              buttons={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
            />
          </Card.Content>
        </Card>
      </PageContainer>
    </ScrollView>
  );
}
