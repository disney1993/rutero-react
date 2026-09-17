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
  const themeColors = colors[resolvedScheme];
  const errorColor = themeColors.error;

  return (
    <View className="flex-1">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <View className="p-5 pb-4 items-start">
          <Avatar.Text size={56} label={getInitials(user?.first_name, user?.last_name)} color={user?.avatar_color || '#78909C'} />
          <Text
            numberOfLines={1}
            className="mt-3 text-base font-bold self-stretch"
            style={{ color: themeColors.onSurface }}
          >
            {user?.first_name} {user?.last_name}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="mt-0.5 self-stretch text-xs"
            style={{ color: themeColors.onSurfaceVariant }}
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
