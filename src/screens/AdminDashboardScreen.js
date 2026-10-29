import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import { Card, Input, Avatar, IconButton, PageContainer, cn, StatTile, StatusBadge } from '../components/ui';
import { useFocusEffect } from '@react-navigation/native';
import { api, errorMessage } from '../utils/apiClient';
import { getInitials } from '../utils/avatar';
import { toastError } from '../utils/toast';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { useTranslation } from 'react-i18next';

const TYPE_FILTERS = [
  { value: '', key: 'admin.filters.all' },
  { value: 'owner', key: 'admin.filters.owners' },
  { value: 'driver', key: 'admin.filters.drivers' },
  { value: 'incomplete', key: 'admin.filters.incomplete' },
];

export default function AdminDashboardScreen({ navigation }) {
  const { t } = useTranslation();
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
      toastError(errorMessage(err, t('stats.loadError')));
    }
  }, [t]);

  const loadUsers = useCallback(async (term, type, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const resp = await api.get('/admin/users', {
        params: { ...(term ? { search: term } : {}), ...(type ? { type } : {}) },
      });
      setUsers(resp.data);
    } catch (err) {
      toastError(errorMessage(err, t('admin.usersLoadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { loadSummary(); loadUsers(search, typeFilter); }, [loadSummary]));

  const onSearchChange = (text) => { setSearch(text); loadUsers(text, typeFilter); };
  const onTypeChange = (value) => { setTypeFilter(value); loadUsers(search, value); };
  const onRefresh = () => {
    setRefreshing(true);
    loadSummary();
    loadUsers(search, typeFilter, { silent: true });
  };

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
                  <StatTile label={t('admin.users')} value={summary.users_total} />
                  <StatTile label={t('admin.filters.owners')} value={summary.owners_total} />
                  <StatTile label={t('admin.filters.drivers')} value={summary.drivers_total} />
                </View>
              )}

              <Input
                label={t('admin.searchUser')}
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
                      {t(f.key)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {isWide && users.length > 0 && (
                <View className="flex-row items-center px-3 pt-3 gap-3">
                  <Text className="w-11 text-xs opacity-60"> </Text>
                  <Text className="flex-1 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{t('admin.colName')}</Text>
                  <Text className="flex-[1.2] text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{t('auth.email')}</Text>
                  <Text className="w-40 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">{t('rutaForm.status')}</Text>
                </View>
              )}

              {loading && <ActivityIndicator className="mt-4" />}
            </View>
          }
          ListEmptyComponent={
            !loading && (
              <View className="flex-1 items-center justify-center py-12">
                <IconButton icon="account-search-outline" size={40} disabled className="opacity-40" />
                <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">{t('admin.noResults')}</Text>
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
  const { t } = useTranslation();
  const displayName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email;
  const hasActivity = item.has_owner_capability || item.has_driver_capability;

  const badges = (
    <>
      {item.profile_incomplete && <StatusBadge tone="error">{t('admin.filters.incomplete')}</StatusBadge>}
      {item.has_owner_capability && <StatusBadge tone="secondary">{t('roles.owner')}</StatusBadge>}
      {item.has_driver_capability && <StatusBadge tone="tertiary">{t('roles.driver')}</StatusBadge>}
      {!item.profile_incomplete && !hasActivity && <StatusBadge tone="neutral">{t('stats.noActivity')}</StatusBadge>}
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
