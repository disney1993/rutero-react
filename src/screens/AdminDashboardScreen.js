import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Card, Input, Avatar, IconButton, PageContainer, cn, StatTile, StatusBadge } from '../components/ui';
import { useFocusEffect } from '@react-navigation/native';
import { api, errorMessage } from '../utils/apiClient';
import { getInitials } from '../utils/avatar';
import { toastError } from '../utils/toast';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { STATUS_COLORS, statusLabel } from '../utils/rutas';
import { formatCurrency } from '../utils/currency';

const TYPE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'owner', label: 'Propietarios' },
  { value: 'driver', label: 'Conductores' },
  { value: 'incomplete', label: 'Perfil incompleto' },
];

export default function AdminDashboardScreen({ navigation }) {
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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

  const loadUsers = useCallback(async (term, type, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const resp = await api.get('/admin/users', {
        params: { ...(term ? { search: term } : {}), ...(type ? { type } : {}) },
      });
      setUsers(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudieron cargar los usuarios'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSummary(); loadUsers(search, typeFilter); }, [loadSummary]));

  const onSearchChange = (text) => { setSearch(text); loadUsers(text, typeFilter); };
  const onTypeChange = (value) => { setTypeFilter(value); loadUsers(search, value); };
  const onRefresh = () => {
    setRefreshing(true);
    loadSummary();
    loadUsers(search, typeFilter, { silent: true });
  };

  const rutasByStatus = summary?.rutas_by_status || {};
  const pieData = Object.entries(rutasByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ value: count, color: STATUS_COLORS[status] || themeColors.surfaceDisabled, text: String(count) }));

  const topOwners = (summary?.top_owners || []).map((o) => ({
    id: o.owner_id,
    label: `${o.owner?.first_name || ''} ${o.owner?.last_name || ''}`.trim() || `#${o.owner_id}`,
    count: o.rutas_count,
  }));
  const topOwnersMax = Math.max(1, ...topOwners.map((o) => o.count));

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <PageContainer className="flex-1">
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[{ padding: 12, paddingBottom: 40 }, users.length === 0 && { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
          ListHeaderComponent={
            <View className="mb-2">
              {summary && (
                <View className="flex-row flex-wrap gap-2 mb-3">
                  <StatTile label="Usuarios" value={summary.users_total} />
                  <StatTile label="Propietarios" value={summary.owners_total} />
                  <StatTile label="Conductores" value={summary.drivers_total} />
                  <StatTile label="Vehículos" value={summary.vehicles_total} />
                  <StatTile label="Ingresos (completadas)" value={formatCurrency(summary.revenue_completed)} />
                </View>
              )}

              {summary && (pieData.length > 0 || topOwners.length > 0) && (
                <View className={cn('gap-3 mb-3', isWide && 'flex-row')}>
                  {pieData.length > 0 && (
                    <Card className={isWide ? 'flex-1' : undefined}>
                      <Card.Content className="items-center">
                        <Text className="self-start font-medium mb-2 text-onSurface dark:text-onSurface-dark">Rutas por estado</Text>
                        <PieChart data={pieData} donut radius={70} innerRadius={44} innerCircleColor={themeColors.surface} />
                        <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
                          {Object.keys(rutasByStatus).filter((s) => rutasByStatus[s] > 0).map((status) => (
                            <View key={status} className="flex-row items-center gap-1.5">
                              <View style={{ backgroundColor: STATUS_COLORS[status] }} className="w-2.5 h-2.5 rounded-full" />
                              <Text className="text-xs text-onSurface dark:text-onSurface-dark">
                                {statusLabel(status)} ({rutasByStatus[status]})
                              </Text>
                            </View>
                          ))}
                        </View>
                      </Card.Content>
                    </Card>
                  )}

                  {topOwners.length > 0 && (
                    <Card className={isWide ? 'flex-1' : undefined}>
                      <Card.Content>
                        <Text className="font-medium mb-3 text-onSurface dark:text-onSurface-dark">Top propietarios (rutas)</Text>
                        {topOwners.map((o) => (
                          <View key={o.id} className="mb-2.5">
                            <View className="flex-row justify-between mb-1">
                              <Text numberOfLines={1} className="flex-1 text-xs mr-2 text-onSurface dark:text-onSurface-dark">{o.label}</Text>
                              <Text className="text-xs font-medium text-onSurface dark:text-onSurface-dark">{o.count}</Text>
                            </View>
                            <View className="h-2 rounded-full overflow-hidden bg-surfaceDisabled dark:bg-surfaceDisabled-dark">
                              <View
                                style={{ width: `${Math.max(4, Math.round((o.count / topOwnersMax) * 100))}%`, backgroundColor: themeColors.primary }}
                                className="h-2 rounded-full"
                              />
                            </View>
                          </View>
                        ))}
                      </Card.Content>
                    </Card>
                  )}
                </View>
              )}

              <Input
                label="Buscar usuario (nombre o email)"
                value={search}
                onChangeText={onSearchChange}
                left="magnify"
                className="mb-2"
              />

              <View className="flex-row flex-wrap gap-2 mb-1">
                {TYPE_FILTERS.map((f) => (
                  <Pressable
                    key={f.value}
                    onPress={() => onTypeChange(f.value)}
                    className={cn(
                      'rounded-full px-3 py-1.5',
                      typeFilter === f.value
                        ? 'bg-primary dark:bg-primary-dark'
                        : 'bg-surfaceDisabled dark:bg-surfaceDisabled-dark'
                    )}
                  >
                    <Text className={cn('text-xs', typeFilter === f.value ? 'text-white' : 'text-onSurface dark:text-onSurface-dark')}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {isWide && users.length > 0 && (
                <View className="flex-row items-center px-3 pt-3 gap-3">
                  <Text className="w-11 text-xs opacity-60"> </Text>
                  <Text className="flex-1 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">Nombre</Text>
                  <Text className="flex-[1.2] text-xs opacity-60 text-onSurface dark:text-onSurface-dark">Email</Text>
                  <Text className="w-40 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">Estado</Text>
                </View>
              )}

              {loading && <ActivityIndicator className="mt-4" />}
            </View>
          }
          ListEmptyComponent={
            !loading && (
              <View className="flex-1 items-center justify-center py-12">
                <IconButton icon="account-search-outline" size={40} disabled className="opacity-40" />
                <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">Sin resultados</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <UserRow item={item} isWide={isWide} themeColors={themeColors} navigation={navigation} />
          )}
        />
      </PageContainer>
    </View>
  );
}

function UserRow({ item, isWide, themeColors, navigation }) {
  const displayName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email;
  const hasActivity = item.has_owner_capability || item.has_driver_capability;

  const badges = (
    <>
      {item.profile_incomplete && <StatusBadge tone="error">Perfil incompleto</StatusBadge>}
      {item.has_owner_capability && <StatusBadge tone="secondary">Propietario</StatusBadge>}
      {item.has_driver_capability && <StatusBadge tone="tertiary">Conductor</StatusBadge>}
      {!item.profile_incomplete && !hasActivity && <StatusBadge tone="neutral">Sin actividad</StatusBadge>}
    </>
  );

  if (isWide) {
    return (
      <Pressable
        onPress={() => navigation.navigate('AdminUserDetail', { user: item })}
        className="flex-row items-center gap-3 px-3 py-2.5 border-b border-border dark:border-border-dark"
      >
        <Avatar.Text size={36} label={getInitials(item.first_name, item.last_name)} color={item.avatar_color || themeColors.surfaceDisabled} />
        <Text numberOfLines={1} className="flex-1 text-onSurface dark:text-onSurface-dark">{displayName}</Text>
        <Text numberOfLines={1} className="flex-[1.2] opacity-70 text-xs text-onSurface dark:text-onSurface-dark">{item.email}</Text>
        <View className="w-40 flex-row flex-wrap gap-1">{badges}</View>
      </Pressable>
    );
  }

  return (
    <Card className="mb-2" onPress={() => navigation.navigate('AdminUserDetail', { user: item })}>
      <Card.Content className="flex-row items-center gap-3">
        <Avatar.Text size={44} label={getInitials(item.first_name, item.last_name)} color={item.avatar_color || themeColors.surfaceDisabled} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-base font-medium text-onSurface dark:text-onSurface-dark">{displayName}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" className="opacity-60 text-xs text-onSurface dark:text-onSurface-dark">{item.email}</Text>
        </View>
        <View className="items-end gap-1">{badges}</View>
      </Card.Content>
    </Card>
  );
}
