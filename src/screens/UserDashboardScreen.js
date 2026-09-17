import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { PageContainer, IconButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import AdminUserPicker from '../components/AdminUserPicker';
import UserStatsDashboard from '../components/UserStatsDashboard';

// Misma pantalla para ambos roles: un usuario normal ve su propia actividad
// (UserStatsDashboard sin userId); el admin ve exactamente el mismo panel,
// solo que antepone el buscador para elegir de quién.
export default function UserDashboardScreen() {
  const { isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="bg-background dark:bg-background-dark">
      <PageContainer className="p-4">
        {isAdmin && <AdminUserPicker onRefresh={() => setReloadKey((k) => k + 1)} />}

        {isAdmin && !selectedUser ? (
          <View className="items-center justify-center py-12">
            <IconButton icon="account-search-outline" size={40} disabled className="opacity-40" />
            <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
              Busca un usuario para ver su actividad
            </Text>
          </View>
        ) : (
          <UserStatsDashboard userId={isAdmin ? selectedUser.id : undefined} reloadKey={reloadKey} />
        )}
      </PageContainer>
    </ScrollView>
  );
}
