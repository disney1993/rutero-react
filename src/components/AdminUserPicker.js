import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Card, Input, Avatar, IconButton } from './ui';
import { api, errorMessage } from '../utils/apiClient';
import { getInitials } from '../utils/avatar';
import { toastError } from '../utils/toast';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { useSelectedUser } from '../context/SelectedUserContext';

// Único buscador de "usuario a ver" del admin: escribe en el estado global
// (SelectedUserContext) en vez de guardar la selección localmente, para que
// Dashboard Usuario, Rutas por día, Calendario y Vehículos compartan la
// misma elección sin tener que volver a buscar en cada pantalla.
export default function AdminUserPicker({ onRefresh }) {
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const { selectedUser, setSelectedUser } = useSelectedUser();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  const onSearchChange = async (text) => {
    setSearch(text);
    if (!text.trim()) { setResults([]); return; }
    try {
      const resp = await api.get('/admin/users', { params: { search: text } });
      setResults(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar los usuarios'));
    }
  };

  const pick = (user) => {
    setSelectedUser(user);
    setResults([]);
    setSearch('');
  };

  return (
    <View className="mb-3">
      <Input
        label="Buscar usuario (nombre o email)"
        value={search}
        onChangeText={onSearchChange}
        left="magnify"
        className="mb-2"
      />

      {results.length > 0 && (
        <View className="mb-3 rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark shadow-sm">
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pick(item)}
                className="flex-row items-center gap-3 p-3 border-b border-border dark:border-border-dark"
              >
                <Avatar.Text size={36} label={getInitials(item.first_name, item.last_name)} color={item.avatar_color || themeColors.surfaceDisabled} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-onSurface dark:text-onSurface-dark">
                    {`${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email}
                  </Text>
                  <Text numberOfLines={1} className="text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{item.email}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      )}

      {selectedUser && (
        <Card>
          <Card.Content className="flex-row items-center gap-3">
            <Avatar.Text
              size={44}
              label={getInitials(selectedUser.first_name, selectedUser.last_name)}
              color={selectedUser.avatar_color || themeColors.surfaceDisabled}
            />
            <View className="flex-1">
              <Text className="font-medium text-onSurface dark:text-onSurface-dark">
                {`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email}
              </Text>
              <Text className="text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{selectedUser.email}</Text>
            </View>
            {onRefresh && <IconButton icon="refresh" onPress={onRefresh} accessibilityLabel="Refrescar" />}
          </Card.Content>
        </Card>
      )}
    </View>
  );
}
