import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Input from './ui/Input';
import Button from './ui/Button';
import { cn } from './ui/cn';

// Bloque superior de Rutas / Calendario en modo conductor: unirse con un
// código (de jornada, de mes o de invitación al equipo). Los propietarios
// gestionan sus jornadas y códigos con JornadaBar.
export default function JornadaBanner({
  showDriver = false,
  codeInput = '',
  onCodeInputChange,
  onJoin,
  joining = false,
  codeError = '',
  joinMessage = '',
}) {
  const { t } = useTranslation();

  if (!showDriver) return null;

  return (
    <View className="mx-3 mt-1 mb-1 rounded-xl px-2.5 py-2 bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60">
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
  );
}
