import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Text, Avatar, Divider, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';

export default function AppDrawerContent(props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <View style={styles.flex}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Avatar.Text size={56} label={getInitials(user?.first_name, user?.last_name)} style={{ backgroundColor: user?.avatar_color || '#78909C' }} />
          <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{user?.first_name} {user?.last_name}</Text>
          <Text variant="bodySmall" style={styles.email} numberOfLines={1} ellipsizeMode="tail">{user?.email}</Text>
        </View>
        <Divider />
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Divider />
      <DrawerItem
        label={t('nav.logout')}
        icon={({ color, size }) => <Avatar.Icon icon="logout" size={size + 8} color={color} style={styles.logoutIcon} />}
        onPress={logout}
        labelStyle={{ color: theme.colors.error }}
        style={styles.logoutItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingTop: 0 },
  header: { padding: 20, alignItems: 'flex-start' },
  name: { marginTop: 10, fontWeight: '700', alignSelf: 'stretch' },
  email: { opacity: 0.6, alignSelf: 'stretch' },
  logoutIcon: { backgroundColor: 'transparent' },
  logoutItem: { marginVertical: 8 },
});
