import React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import PersonAvatar from './ui/PersonAvatar';
import Icon from './ui/Icon';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { haptics } from '../utils/haptics';
import { teamMemberName } from '../hooks/useTeam';

const SIZE = 48;

/**
 * Selector del conductor de un viaje en forma de fila de avatares: el
 * propietario ("Yo") y los conductores activos de su equipo. La opción
 * elegida lleva un aro y una marca; value = id del conductor o null (yo).
 * `extra` permite mostrar a un conductor que ya no está en el equipo pero
 * tiene el viaje asignado.
 */
export default function DriverAvatarPicker({ owner, team = [], value, onChange, extra, includeOwner = true, showDefault = true }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];

  // Predeterminado: el conductor marcado con estrella o, si no hay, "Yo".
  const hasDefault = team.some((l) => l.is_default);
  const options = [
    ...(includeOwner ? [{ id: null, person: owner, label: t('team.me'), isDefault: showDefault && !hasDefault }] : []),
    ...team.map((link) => ({ id: link.driver.id, person: link.driver, label: teamMemberName(link), isDefault: showDefault && !!link.is_default })),
  ];
  if (extra && !options.some((o) => o.id === extra.id)) {
    options.push({ id: extra.id, person: extra, label: [extra.first_name, extra.last_name].filter(Boolean).join(' ') });
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 12 }}>
      {options.map((o) => {
        const selected = (value ?? null) === o.id;
        return (
          <Pressable
            key={o.id ?? 'me'}
            onPress={() => { haptics.selection(); onChange(o.id); }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={{ width: 64, alignItems: 'center' }}
          >
            <View>
              <PersonAvatar person={o.person} size={SIZE} ringColor={selected ? c.primary : 'transparent'} />
              {o.isDefault && (
                <View
                  style={{
                    position: 'absolute', left: -2, top: -2, width: 18, height: 18, borderRadius: 9,
                    backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
                  }}
                  accessibilityLabel={t('vehicles.default')}
                >
                  <Icon name="star" size={13} color={c.primary} />
                </View>
              )}
              {selected && (
                <View
                  style={{
                    position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10,
                    backgroundColor: c.primary, borderWidth: 2, borderColor: c.surface,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="check" size={12} color={c.onPrimary} />
                </View>
              )}
            </View>
            <Text
              numberOfLines={1}
              className={selected
                ? 'mt-1 text-xs font-semibold text-primary dark:text-primary-dark'
                : 'mt-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark'}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
