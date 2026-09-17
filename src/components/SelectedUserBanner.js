import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from './ui';
import { getInitials } from '../utils/avatar';
import { useSelectedUser } from '../context/SelectedUserContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';

// Franja de solo-admin para Rutas por día / Calendario / Vehículos: muestra
// a quién está viendo y da un atajo para cambiarlo desde Dashboard Usuario
// (el único lugar con buscador), en vez de repetir el selector aquí.
export default function SelectedUserBanner() {
  const navigation = useNavigation();
  const { selectedUser } = useSelectedUser();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];

  if (!selectedUser) {
    return (
      <Pressable
        onPress={() => navigation.navigate('UserDashboard')}
        className="m-3 mb-0 rounded-xl py-2.5 px-3 bg-tertiary/15 dark:bg-tertiary-dark/20"
      >
        <Text className="text-center text-tertiary dark:text-tertiary-dark">
          Selecciona un usuario en Dashboard Usuario para ver su información aquí
        </Text>
      </Pressable>
    );
  }

  const name = `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email;

  return (
    <Pressable
      onPress={() => navigation.navigate('UserDashboard')}
      className="flex-row items-center gap-2 m-3 mb-0 p-2 rounded-xl bg-primary/10 dark:bg-primary-dark/15"
    >
      <Avatar.Text size={28} label={getInitials(selectedUser.first_name, selectedUser.last_name)} color={selectedUser.avatar_color || themeColors.surfaceDisabled} />
      <Text className="flex-1 text-xs text-onSurface dark:text-onSurface-dark">
        Viendo a: <Text className="font-medium">{name}</Text> · toca para cambiar
      </Text>
    </Pressable>
  );
}
