import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Platform, StatusBar } from 'react-native';
import { NativeWindStyleSheet } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import FlashMessage from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';
import { IconButton } from './components/ui';
import { navLightTheme, navDarkTheme, colors } from './theme';
import { loadPersistedLanguage, changeLanguage } from './i18n';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import MyRutasScreen from './screens/MyRutasScreen';
import MyVehiclesScreen from './screens/MyVehiclesScreen';
import RutasCalendarScreen from './screens/RutasCalendarScreen';
import DriverModeScreen from './screens/DriverModeScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import UserDashboardScreen from './screens/UserDashboardScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminUserDetailScreen from './screens/AdminUserDetailScreen';
import AppDrawerContent from './components/AppDrawerContent';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { SelectedUserProvider } from './context/SelectedUserContext';

// NativeWind's web output defaults to generating real CSS classes, which requires a
// PostCSS/Tailwind build step this project doesn't have set up (Expo webpack only).
// Forcing "native" output makes it resolve classNames to inline RN styles instead,
// which react-native-web renders correctly without any extra CSS pipeline.
if (Platform.OS === 'web') {
  NativeWindStyleSheet.setOutput({ default: 'native' });
}

const AuthStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const AdminStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// El dashboard admin necesita su propio stack para poder navegar al detalle
// de un usuario manteniendo el menú lateral disponible.
function AdminDashboardNavigator() {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerTintColor: themeColors.onSurface,
        headerStyle: { backgroundColor: themeColors.surface },
        headerShadowVisible: false,
      }}
    >
      <AdminStack.Screen
        name="AdminDashboardHome"
        component={AdminDashboardScreen}
        options={({ navigation }) => ({
          title: t('nav.dashboardAdmin'),
          headerLeft: () => (
            <IconButton
              icon="menu"
              iconColor={themeColors.onSurface}
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            />
          ),
        })}
      />
      <AdminStack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'Usuario' }} />
    </AdminStack.Navigator>
  );
}

function AppDrawer() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];

  return (
    <Drawer.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: themeColors.onSurface,
        headerStyle: { backgroundColor: themeColors.surface },
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: themeColors.surface },
      }}
      drawerContent={(props) => <AppDrawerContent {...props} />}
    >
      {isAdmin ? (
        <>
          <Drawer.Screen name="DashboardAdmin" component={AdminDashboardNavigator} options={{ headerShown: false, title: t('nav.dashboardAdmin') }} />
          <Drawer.Screen name="UserDashboard" component={UserDashboardScreen} options={{ title: t('nav.userDashboardAdmin') }} />
          <Drawer.Screen name="MyRutas" component={MyRutasScreen} options={{ title: t('nav.myRutas') }} />
          <Drawer.Screen name="RutasCalendar" component={RutasCalendarScreen} options={{ title: t('nav.rutasCalendar') }} />
          <Drawer.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: t('nav.myVehicles') }} />
        </>
      ) : (
        <>
          <Drawer.Screen name="UserDashboard" component={UserDashboardScreen} options={{ title: t('nav.dashboard') }} />
          <Drawer.Screen name="MyRutas" component={MyRutasScreen} options={{ title: t('nav.myRutas') }} />
          <Drawer.Screen name="RutasCalendar" component={RutasCalendarScreen} options={{ title: t('nav.rutasCalendar') }} />
          <Drawer.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: t('nav.myVehicles') }} />
          <Drawer.Screen name="DriverMode" component={DriverModeScreen} options={{ title: t('nav.driverMode') }} />
        </>
      )}
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Drawer.Navigator>
  );
}

// El tema/idioma guardados en el perfil del servidor mandan sobre lo que
// hubiera localmente: así la preferencia viaja con la cuenta a cualquier
// dispositivo. Los cambios hechos en Ajustes ya actualizan ambos sitios a
// la vez, así que esto no entra en bucle: solo actúa cuando de verdad
// difieren (p. ej. justo después de iniciar sesión).
function PreferencesSync() {
  const { user } = useAuth();
  const { mode, setMode } = useThemeMode();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (user?.theme && user.theme !== mode) setMode(user.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.theme]);

  useEffect(() => {
    if (user?.language && user.language !== i18n.language) changeLanguage(user.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language]);

  return null;
}

function RootNavigator({ navTheme }) {
  const { user, bootstrapping } = useAuth();

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  let content;
  if (!user) content = <AuthNavigator />;
  else if (user.profile_incomplete) content = <CompleteProfileScreen />;
  else content = <AppDrawer />;

  return (
    <NavigationContainer theme={navTheme}>
      {content}
    </NavigationContainer>
  );
}

function ThemedApp() {
  const { resolvedScheme } = useThemeMode();
  const isDark = resolvedScheme === 'dark';
  const navTheme = isDark ? navDarkTheme : navLightTheme;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors[resolvedScheme].surface}
      />
      <AuthProvider>
        <PreferencesSync />
        <ConfirmProvider>
          <SelectedUserProvider>
            <RootNavigator navTheme={navTheme} />
          </SelectedUserProvider>
        </ConfirmProvider>
      </AuthProvider>
      <FlashMessage position="top" />
    </>
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    loadPersistedLanguage().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeModeProvider>
        <ThemedApp />
      </ThemeModeProvider>
    </GestureHandlerRootView>
  );
}
