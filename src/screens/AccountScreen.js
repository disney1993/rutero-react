import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Avatar, Icon, PageContainer, cn } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { getInitials } from '../utils/avatar';
import { haptics } from '../utils/haptics';

const RING_COLORS = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'];

function MenuRow({ icon, label, hint, onPress, destructive, last }) {
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      android_ripple={{ color: c.border }}
      className={cn(
        'flex-row items-center px-4 py-3.5 active:bg-black/5 dark:active:bg-white/5',
        !last && 'border-b border-border/60 dark:border-border-dark/60'
      )}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: destructive ? `${c.error}22` : `${c.primary}1F` }}
      >
        <Icon name={icon} size={20} color={destructive ? c.error : c.primary} />
      </View>
      <View className="flex-1">
        <Text className={cn('text-base font-medium', destructive ? 'text-error dark:text-error-dark' : 'text-onSurface dark:text-onSurface-dark')}>
          {label}
        </Text>
        {!!hint && <Text className="text-xs mt-0.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{hint}</Text>}
      </View>
      {!destructive && <Icon name="chevron-right" size={22} color={c.onSurfaceVariant} />}
    </Pressable>
  );
}

function MenuGroup({ children }) {
  return <View className="rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark mb-5">{children}</View>;
}

export default function AccountScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const confirm = useConfirm();
  const ref = React.useRef(null);
  // Tocar la pestaña activa otra vez vuelve arriba, como en cualquier app nativa.
  useScrollToTop(ref);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  const onLogout = async () => {
    const ok = await confirm({
      title: t('nav.logout'),
      message: t('account.logoutConfirm'),
      confirmLabel: t('nav.logout'),
      destructive: true,
    });
    if (ok) logout();
  };

  return (
    <ScrollView ref={ref} className="bg-background dark:bg-background-dark" contentContainerStyle={{ paddingBottom: 32 }}>
      <PageContainer className="pt-4">
        <View className="items-center mb-6">
          <LinearGradient
            colors={RING_COLORS}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' }}
          >
            <View className="w-[92px] h-[92px] rounded-full items-center justify-center bg-background dark:bg-background-dark">
              <Avatar.Text size={84} label={getInitials(user?.first_name, user?.last_name)} color={user?.avatar_color || '#78909C'} />
            </View>
          </LinearGradient>
          <Text className="mt-3 text-xl font-bold text-onSurface dark:text-onSurface-dark">{fullName || user?.email}</Text>
          <Text className="mt-0.5 text-sm text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{user?.email}</Text>
          {isAdmin && (
            <View className="mt-2 px-3 py-1 rounded-full bg-primary/15 dark:bg-primary-dark/25">
              <Text className="text-xs font-semibold text-primary dark:text-primary-dark">{t('roles.admin')}</Text>
            </View>
          )}
          <Pressable
            onPress={() => { haptics.light(); navigation.navigate('Profile'); }}
            className="mt-4 px-6 py-2 rounded-lg bg-surface dark:bg-surface-dark active:opacity-70"
          >
            <Text className="font-semibold text-onSurface dark:text-onSurface-dark">{t('account.editProfile')}</Text>
          </Pressable>
        </View>

        <MenuGroup>
          {!isAdmin && (
            <MenuRow icon="steering" label={t('nav.driverMode')} hint={t('account.driverModeHint')} onPress={() => navigation.navigate('DriverMode')} />
          )}
          {isAdmin && (
            <MenuRow icon="calendar-month-outline" label={t('nav.rutasCalendar')} onPress={() => navigation.navigate('AccountCalendar')} />
          )}
          <MenuRow icon="cog-outline" label={t('nav.settings')} hint={t('account.settingsHint')} onPress={() => navigation.navigate('Settings')} last />
        </MenuGroup>

        <MenuGroup>
          <MenuRow icon="logout" label={t('nav.logout')} onPress={onLogout} destructive last />
        </MenuGroup>

        <Text className="text-center text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          Rutero v{Constants.expoConfig?.version}
        </Text>
      </PageContainer>
    </ScrollView>
  );
}
