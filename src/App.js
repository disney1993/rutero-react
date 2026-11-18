import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, IconButton } from 'react-native-paper';
import { NavigationContainer, DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import FlashMessage from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';
import { lightTheme, darkTheme, navLightTheme, navDarkTheme } from './theme';
import { loadPersistedLanguage, changeLanguage } from './i18n';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import MyRutasScreen from './screens/MyRutasScreen';
import MyVehiclesScreen from './screens/MyVehiclesScreen';
import MyJornadasScreen from './screens/MyJornadasScreen';
import DriverModeScreen from './screens/DriverModeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminUserDetailScreen from './screens/AdminUserDetailScreen';
import AppDrawerContent from './components/AppDrawerContent';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { toastInfo } from './utils/toast';
import { api } from './utils/apiClient';

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
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen
        name="AdminDashboardHome"
        component={AdminDashboardScreen}
        options={({ navigation }) => ({
          title: t('nav.dashboard'),
          headerLeft: () => (
            <IconButton icon="menu" onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} />
          ),
        })}
      />
      <AdminStack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'Usuario' }} />
    </AdminStack.Navigator>
  );
}

function AppDrawer() {
  const { isAdmin, isDriverOnly, isOwnerOnly } = useAuth();
  const { t } = useTranslation();

  return (
    <Drawer.Navigator screenOptions={{ headerTitleAlign: 'center' }} drawerContent={(props) => <AppDrawerContent {...props} />}>
      {isAdmin ? (
        <Drawer.Screen name="Dashboard" component={AdminDashboardNavigator} options={{ headerShown: false, title: t('nav.dashboard') }} />
      ) : isDriverOnly ? (
        <Drawer.Screen name="DriverMode" component={DriverModeScreen} options={{ title: t('nav.jornadas') }} />
      ) : (
        <>
          <Drawer.Screen name="MyRutas" component={MyRutasScreen} options={{ title: t('nav.myRutas') }} />
          <Drawer.Screen name="MyVehicles" component={MyVehiclesScreen} options={{ title: t('nav.myVehicles') }} />
          <Drawer.Screen name="MyJornadas" component={MyJornadasScreen} options={{ title: t('nav.myJornadas') }} />
          {!isOwnerOnly && (
            <Drawer.Screen name="DriverMode" component={DriverModeScreen} options={{ title: t('nav.driverMode') }} />
          )}
        </>
      )}
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile') }} />
    </Drawer.Navigator>
  );
}

function accountModeNoticeKey(user) {
  if (user?.is_admin) {
    const mode = user?.account_mode || 'both';
    if (mode === 'driver') return 'nav.modeNoticeDriver';
    if (mode === 'owner') return 'nav.modeNoticeOwner';
    if (mode === 'both') return 'nav.modeNoticeBoth';
    return 'nav.modeNoticeAdmin';
  }
  const mode = user?.account_mode || 'owner';
  if (mode === 'driver') return 'nav.modeNoticeDriver';
  return 'nav.modeNoticeOwner';
}

// Avisa una vez por sesión al restaurar sesión o tras login/registro.
// Si un usuario normal aún tiene "both" en sesión local (legado), lo corrige a owner.
function AccountModeNotice() {
  const { user, bootstrapping, updateUser, isAdmin } = useAuth();
  const { t } = useTranslation();
  const shownForUserId = useRef(null);

  useEffect(() => {
    if (bootstrapping || !user?.id) {
      if (!user) shownForUserId.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      let current = user;
      if (!isAdmin && user.account_mode === 'both') {
        try {
          const resp = await api.patch('/user/preferences', { account_mode: 'owner' });
          if (cancelled) return;
          await updateUser(resp.data);
          current = resp.data;
        } catch (err) {
          current = { ...user, account_mode: 'owner' };
          await updateUser({ account_mode: 'owner' });
        }
      }

      if (cancelled) return;
      if (shownForUserId.current === current.id) return;
      shownForUserId.current = current.id;
      toastInfo(t(accountModeNoticeKey(current)));
    })();

    return () => { cancelled = true; };
  }, [bootstrapping, user, t, isAdmin, updateUser]);

  return null;
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

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <AppDrawer /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function ThemedApp() {
  const { resolvedScheme } = useThemeMode();
  const isDark = resolvedScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  const navTheme = isDark ? navDarkTheme : navLightTheme;

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <PreferencesSync />
        <AccountModeNotice />
        <ConfirmProvider>
          <RootNavigator navTheme={navTheme} />
        </ConfirmProvider>
      </AuthProvider>
      <FlashMessage position="top" />
    </PaperProvider>
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
