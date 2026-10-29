import React from 'react';
import { Platform, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { canManageVehicles, resolveWorkMode } from '../utils/capabilities';
import InstaTabBar from './InstaTabBar';
import ModeIndicator from '../components/ModeIndicator';
import RenderBoundary from '../components/RenderBoundary';
// Home is the initial tab: static import keeps it on the same AuthContext module
// as AuthProvider. Deferred getComponent + Fast Refresh previously rebound a
// second createContext → useAuth() threw under a mounted Provider (redbox).
import UserDashboardScreen from '../screens/UserDashboardScreen';

// Lazy screens: avoid RutasPlanner (payment SVG), ColorPicker, and big-calendar
// on every AppTabs open. Auth/theme contexts also use globalThis singletons.
const loadMyRutasScreen = () => require('../screens/MyRutasScreen').default;
const loadMyVehiclesScreen = () => require('../screens/MyVehiclesScreen').default;
const loadSettingsScreen = () => require('../screens/SettingsScreen').default;
const loadAdminDashboardScreen = () => require('../screens/AdminDashboardScreen').default;
const loadAdminUserDetailScreen = () => require('../screens/AdminUserDetailScreen').default;
const loadAccountScreen = () => require('../screens/AccountScreen').default;
const loadRutasCalendarScreen = () => require('../screens/RutasCalendarScreen').default;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HeaderModeChip() {
  // ModeIndicator must not take down every stack header if it mis-resolves.
  if (typeof ModeIndicator !== 'function') return null;
  return (
    <RenderBoundary>
      <View className="mr-1">
        <ModeIndicator />
      </View>
    </RenderBoundary>
  );
}

// Opciones comunes de todas las pilas: cabecera plana que se funde con el
// fondo (sin sombra), gesto de volver desde cualquier punto en iOS y la
// transición lateral propia de cada plataforma. ModeIndicator en headerRight
// (null para admin).
function useStackOptions() {
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  return {
    headerTintColor: c.onSurface,
    headerStyle: { backgroundColor: c.background },
    headerTitleStyle: { fontWeight: '700' },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: c.background },
    animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
    fullScreenGestureEnabled: true,
    gestureEnabled: true,
    headerRight: () => <HeaderModeChip />,
  };
}

// Título tipo logotipo para la pestaña de inicio (como el de Instagram).
function BrandTitle() {
  const { resolvedScheme } = useThemeMode();
  return (
    <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.8, color: colors[resolvedScheme].onSurface }}>
      Rutero
    </Text>
  );
}

function HomeStack() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="UserDashboardHome"
        component={UserDashboardScreen}
        options={{
          title: isAdmin ? t('nav.userDashboardAdmin') : t('nav.dashboard'),
          headerTitle: isAdmin ? undefined : () => <BrandTitle />,
          headerTitleAlign: 'left',
        }}
      />
    </Stack.Navigator>
  );
}

function RutasStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="MyRutasHome" getComponent={loadMyRutasScreen} options={{ title: t('nav.myRutas') }} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="RutasCalendarHome"
        getComponent={loadRutasCalendarScreen}
        options={{ title: t('nav.rutasCalendar') }}
      />
    </Stack.Navigator>
  );
}

function VehiclesStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="MyVehiclesHome" getComponent={loadMyVehiclesScreen} options={{ title: t('nav.myVehicles') }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AdminDashboardHome" getComponent={loadAdminDashboardScreen} options={{ title: t('nav.dashboardAdmin') }} />
      <Stack.Screen name="AdminUserDetail" getComponent={loadAdminUserDetailScreen} options={{ title: t('nav.user') }} />
    </Stack.Navigator>
  );
}

// Pestaña de perfil: hub con ajustes (cuenta/viajes/app) y (admin) calendario.
function AccountStack() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="AccountHome"
        getComponent={loadAccountScreen}
        options={{ title: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || t('nav.profile') }}
      />
      <Stack.Screen
        name="SettingsAccount"
        getComponent={loadSettingsScreen}
        initialParams={{ section: 'account' }}
        options={{ title: t('settings.linkAccount') }}
      />
      <Stack.Screen
        name="SettingsTrips"
        getComponent={loadSettingsScreen}
        initialParams={{ section: 'trips' }}
        options={{ title: t('settings.linkTrips') }}
      />
      <Stack.Screen
        name="SettingsApp"
        getComponent={loadSettingsScreen}
        initialParams={{ section: 'app' }}
        options={{ title: t('settings.linkApp') }}
      />
      <Stack.Screen name="AccountCalendar" getComponent={loadRutasCalendarScreen} options={{ title: t('nav.rutasCalendar') }} />
    </Stack.Navigator>
  );
}

export default function AppTabs() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const workMode = resolveWorkMode(user, isAdmin);
  const showVehiclesTab = canManageVehicles(user, isAdmin);

  const tab = (name, component, title, icon, iconFocused, extra = {}) => (
    <Tab.Screen
      key={name}
      name={name}
      component={component}
      options={{ title, icon, iconFocused, tabBarAccessibilityLabel: title, ...extra }}
    />
  );

  const accountTab = tab('Account', AccountStack, t('nav.profile'), null, null, {
    isProfileTab: true,
    // Long-press avatar → shortcut to app settings (Instagram-style account switch pattern).
    onLongPressNavigate: (navigation) => navigation.navigate('Account', { screen: 'SettingsApp', initial: false }),
  });

  const vehiclesTab = showVehiclesTab
    ? tab('MyVehicles', VehiclesStack, t('nav.myVehicles'), 'car-outline', 'car')
    : null;

  // Remount tabs when work_mode changes so Vehicles appears/disappears cleanly.
  const navigatorKey = isAdmin ? 'admin' : `user-${workMode}`;

  return (
    <Tab.Navigator
      key={navigatorKey}
      tabBar={(props) => <InstaTabBar {...props} />}
      // Atrás en Android vuelve a la pestaña anterior antes de salir de la app.
      backBehavior="history"
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, animation: 'fade' }}
    >
      {isAdmin
        ? [
            tab('DashboardAdmin', AdminStack, t('nav.dashboardAdmin'), 'shield-account-outline', 'shield-account'),
            tab('UserDashboard', HomeStack, t('nav.userDashboardAdmin'), 'chart-box-outline', 'chart-box'),
            tab('MyRutas', RutasStack, t('nav.myRutas'), 'map-outline', 'map'),
            vehiclesTab,
            accountTab,
          ].filter(Boolean)
        : [
            tab('UserDashboard', HomeStack, t('nav.dashboard'), 'home-variant-outline', 'home-variant'),
            tab('MyRutas', RutasStack, t('nav.myRutas'), 'map-outline', 'map'),
            tab('RutasCalendar', CalendarStack, t('nav.rutasCalendar'), 'calendar-blank-outline', 'calendar-blank'),
            vehiclesTab,
            accountTab,
          ].filter(Boolean)}
    </Tab.Navigator>
  );
}
