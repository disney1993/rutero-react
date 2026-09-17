import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, SegmentedButtons, PageContainer } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { api } from '../utils/apiClient';

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
