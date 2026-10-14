import React from 'react';
import { Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import InstaTabBar from './InstaTabBar';

import MyRutasScreen from '../screens/MyRutasScreen';
import MyVehiclesScreen from '../screens/MyVehiclesScreen';
import RutasCalendarScreen from '../screens/RutasCalendarScreen';
import DriverModeScreen from '../screens/DriverModeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserDashboardScreen from '../screens/UserDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUserDetailScreen from '../screens/AdminUserDetailScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Opciones comunes de todas las pilas: cabecera plana que se funde con el
// fondo (sin sombra), gesto de volver desde cualquier punto en iOS y la
// transición lateral propia de cada plataforma.
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
        options={({ navigation }) => ({
          title: isAdmin ? t('nav.userDashboardAdmin') : t('nav.dashboard'),
          headerTitle: isAdmin ? undefined : () => <BrandTitle />,
          headerTitleAlign: 'left',
          headerRight: () => (
            <IconButton icon="cog-outline" onPress={() => navigation.navigate('Account', { screen: 'Settings', initial: false })} />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

function RutasStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="MyRutasHome" component={MyRutasScreen} options={{ title: t('nav.myRutas') }} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="RutasCalendarHome" component={RutasCalendarScreen} options={{ title: t('nav.rutasCalendar') }} />
    </Stack.Navigator>
  );
}

function VehiclesStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="MyVehiclesHome" component={MyVehiclesScreen} options={{ title: t('nav.myVehicles') }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  const { t } = useTranslation();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AdminDashboardHome" component={AdminDashboardScreen} options={{ title: t('nav.dashboardAdmin') }} />
      <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: t('nav.user') }} />
    </Stack.Navigator>
  );
}

// Pestaña de perfil: un "hub" con el resto de secciones que no caben en la
// barra (perfil, ajustes, jornada como conductor, calendario para admin).
function AccountStack() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const stackOptions = useStackOptions();
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="AccountHome"
        component={AccountScreen}
        options={{ title: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || t('nav.profile') }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="DriverMode" component={DriverModeScreen} options={{ title: t('nav.driverMode') }} />
      <Stack.Screen name="AccountCalendar" component={RutasCalendarScreen} options={{ title: t('nav.rutasCalendar') }} />
    </Stack.Navigator>
  );
}

export default function AppTabs() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

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
    // Pulsación larga sobre el avatar → atajo a Ajustes (como el cambio de cuenta de Instagram).
    onLongPressNavigate: (navigation) => navigation.navigate('Account', { screen: 'Settings', initial: false }),
  });

  return (
    <Tab.Navigator
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
            tab('MyVehicles', VehiclesStack, t('nav.myVehicles'), 'car-outline', 'car'),
            accountTab,
          ]
        : [
            tab('UserDashboard', HomeStack, t('nav.dashboard'), 'home-variant-outline', 'home-variant'),
            tab('MyRutas', RutasStack, t('nav.myRutas'), 'map-outline', 'map'),
            tab('RutasCalendar', CalendarStack, t('nav.rutasCalendar'), 'calendar-blank-outline', 'calendar-blank'),
            tab('MyVehicles', VehiclesStack, t('nav.myVehicles'), 'car-outline', 'car'),
            accountTab,
          ]}
    </Tab.Navigator>
  );
}
