import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, TextInput, Avatar, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api, errorMessage } from '../utils/apiClient';
import { getInitials } from '../utils/avatar';
import { toastError } from '../utils/toast';

export default function AdminDashboardScreen({ navigation }) {
  const theme = useTheme();
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const resp = await api.get('/admin/reports/summary');
      setSummary(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo cargar el resumen'));
    }
  }, []);

  const loadUsers = useCallback(async (term, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const resp = await api.get('/admin/users', { params: term ? { search: term } : {} });
      setUsers(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSummary(); loadUsers(search); }, [loadSummary]));

  const onSearchChange = (text) => {
    setSearch(text);
    loadUsers(text);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSummary();
    loadUsers(search, { silent: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {summary && (
        <View style={styles.statsRow}>
          <StatTile label="Usuarios" value={summary.users_total} theme={theme} />
          <StatTile label="Propietarios" value={summary.owners_total} theme={theme} />
          <StatTile label="Conductores" value={summary.drivers_total} theme={theme} />
          <StatTile label="Vehículos" value={summary.vehicles_total} theme={theme} />
        </View>
      )}

      <TextInput
        mode="outlined"
        label="Buscar usuario (nombre o email)"
        value={search}
        onChangeText={onSearchChange}
        left={<TextInput.Icon icon="magnify" />}
        style={styles.search}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, users.length === 0 && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconButton icon="account-search-outline" size={40} style={styles.emptyIcon} disabled />
              <Text style={styles.emptyText}>Sin resultados</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => navigation.navigate('AdminUserDetail', { user: item })}>
              <Card.Content style={styles.userRow}>
                <Avatar.Text size={44} label={getInitials(item.first_name, item.last_name)} style={{ backgroundColor: item.avatar_color || theme.colors.surfaceDisabled }} />
                <View style={styles.userInfo}>
                  <Text variant="titleMedium" numberOfLines={1}>{item.first_name} {item.last_name}</Text>
                  <Text variant="bodySmall" style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
                </View>
                <View style={styles.badgeColumn}>
                  {item.has_owner_capability && (
                    <Text style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer, color: theme.colors.onSecondaryContainer }]}>
                      Propietario
                    </Text>
                  )}
                  {item.has_driver_capability && (
                    <Text style={[styles.badge, { backgroundColor: theme.colors.tertiaryContainer, color: theme.colors.onTertiaryContainer }]}>
                      Conductor
                    </Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
}

function StatTile({ label, value, theme }) {
  return (
    <View style={[styles.statTile, { backgroundColor: theme.colors.primaryContainer }]}>
      <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onPrimaryContainer }]}>{value}</Text>
      <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onPrimaryContainer }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statTile: { flex: 1, minWidth: '22%', borderRadius: 14, padding: 10, alignItems: 'center' },
  statValue: { fontWeight: '700', textAlign: 'center' },
  statLabel: { opacity: 0.8, textAlign: 'center' },
  search: { marginHorizontal: 16, marginBottom: 8 },
  loader: { marginTop: 24 },
  listContent: { padding: 12, paddingBottom: 40 },
  listContentEmpty: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyIcon: { opacity: 0.4 },
  emptyText: { textAlign: 'center', opacity: 0.6 },
  card: { marginBottom: 8, borderRadius: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userInfo: { flex: 1 },
  userEmail: { opacity: 0.6 },
  badgeColumn: { alignItems: 'flex-end', gap: 4 },
  badge: { fontSize: 10, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
});
