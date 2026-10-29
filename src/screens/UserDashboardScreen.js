import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import PageContainer from '../components/ui/PageContainer';
import IconButton from '../components/ui/IconButton';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useSelectedUser } from '../context/SelectedUserContext';
import AdminUserPicker from '../components/AdminUserPicker';
import UserStatsDashboard from '../components/UserStatsDashboard';
import RenderBoundary from '../components/RenderBoundary';
import { resolveWorkMode } from '../utils/capabilities';

// Misma pantalla para ambos roles: un usuario normal ve su propia actividad
// acotada al modo owner/driver; el admin ve el mismo panel con buscador.
export default function UserDashboardScreen() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const [reloadKey, setReloadKey] = useState(0);
  const role = isAdmin ? 'all' : resolveWorkMode(user, isAdmin);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
      className="bg-background dark:bg-background-dark"
    >
      <PageContainer className="p-4">
        {!isAdmin && (
          <Text className="mb-3 text-sm text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
            {role === 'driver' ? t('stats.driverDashboardTitle') : t('stats.ownerDashboardTitle')}
          </Text>
        )}

        {isAdmin && <AdminUserPicker onRefresh={() => setReloadKey((k) => k + 1)} />}

        {isAdmin && !selectedUser ? (
          <View className="items-center justify-center py-12">
            <IconButton icon="account-search-outline" size={40} disabled className="opacity-40" />
            <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
              {t('admin.searchUserActivity')}
            </Text>
          </View>
        ) : (
          <RenderBoundary
            fallback={
              <View className="items-center justify-center py-16">
                <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
                  {t('stats.loadError')}
                </Text>
              </View>
            }
          >
            <UserStatsDashboard
              userId={isAdmin ? selectedUser.id : undefined}
              role={role}
              reloadKey={reloadKey}
            />
          </RenderBoundary>
        )}
      </PageContainer>
    </ScrollView>
  );
}
