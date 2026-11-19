import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import PersonAvatar from './ui/PersonAvatar';
import Icon from './ui/Icon';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { haptics } from '../utils/haptics';
import { teamMemberName } from '../hooks/useTeam';

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Conductores asignados a una jornada (selección múltiple entre el equipo).
 * Cada uno recibe un aviso obligatorio la primera vez: aquí se ve si ya se le
 * avisó y si lo ha visto, o que se le avisará al guardar. El conductor
 * principal siempre está asignado.
 */
export default function JornadaDriversField({ team = [], value = [], onChange, mainDriverId, notices = [] }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];

  const noticeOf = (id) => notices.find((n) => n.id === id)?.pivot;
  const toggle = (id) => {
    haptics.selection();
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  if (team.length === 0) {
    return <Text className="mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('jornadas.noTeam')}</Text>;
  }

  return (
    <View className="mb-2">
      {team.map((link) => {
        const id = link.driver.id;
        const isMain = id === mainDriverId;
        const checked = isMain || value.includes(id);
        const notice = noticeOf(id);
        let status = '';
        if (checked && notice?.notified_at) {
          status = `${t('jornadas.noticeSent', { date: when(notice.notified_at) })} · ${
            notice.seen_at ? t('jornadas.noticeSeen', { date: when(notice.seen_at) }) : t('jornadas.noticeNotSeen')
          }`;
        } else if (checked) {
          status = t('jornadas.noticeWillSend');
        }

        return (
          <Pressable
            key={id}
            onPress={() => !isMain && toggle(id)}
            disabled={isMain}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: isMain }}
            accessibilityLabel={`${teamMemberName(link)}${status ? `, ${status}` : ''}`}
            className="flex-row items-center py-2 min-h-[48px]"
          >
            <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={checked ? c.primary : c.onSurfaceVariant} />
            <View className="ml-2"><PersonAvatar person={link.driver} size={28} /></View>
            <View className="ml-2 flex-1">
              <Text className="text-sm text-onSurface dark:text-onSurface-dark">
                {teamMemberName(link)}{isMain ? ` · ${t('jornadas.mainDriver')}` : ''}
              </Text>
              {!!status && (
                <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {!notice?.notified_at && <Icon name="email-check-outline" size={12} color={c.onSurfaceVariant} />} {status}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
