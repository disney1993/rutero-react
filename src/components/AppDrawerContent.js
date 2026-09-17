import React from 'react';
import { View, Text } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { useTranslation } from 'react-i18next';
import { Avatar, Divider, Icon } from './ui';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { getInitials } from '../utils/avatar';

export default function AppDrawerContent(props) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { resolvedScheme } = useThemeMode();
  const errorColor = colors[resolvedScheme].error;

  return (
    <View className="flex-1">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <View className="p-5 items-start">
          <Avatar.Text size={56} label={getInitials(user?.first_name, user?.last_name)} color={user?.avatar_color || '#78909C'} />
          <Text
            numberOfLines={1}
            className="mt-2.5 font-bold self-stretch text-onSurface dark:text-onSurface-dark"
          >
            {user?.first_name} {user?.last_name}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="opacity-60 self-stretch text-xs text-onSurface dark:text-onSurface-dark"
          >
            {user?.email}
          </Text>
        </View>
        <Divider />
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Divider />
      <DrawerItem
        label={t('nav.logout')}
        icon={({ color, size }) => <Icon name="logout" size={size} color={color} />}
        onPress={logout}
        labelStyle={{ color: errorColor }}
        style={{ marginVertical: 8 }}
      />
    </View>
  );
}
