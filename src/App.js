import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FlashMessage from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';
import { navLightTheme, navDarkTheme, colors } from './theme';
import { loadPersistedLanguage, changeLanguage } from './i18n';
import { loadHapticsPreference } from './utils/haptics';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import AppTabs from './navigation/AppTabs';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { SelectedUserProvider } from './context/SelectedUserContext';

const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false, animation: 'slide_from_right', fullScreenGestureEnabled: true }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
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
  else content = <AppTabs />;

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

  // Color de la ventana nativa (se ve al rotar, al abrir el teclado o en las
  // transiciones): igual al fondo para que no haya destellos blancos.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors[resolvedScheme].background).catch(() => {});
  }, [resolvedScheme]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PreferencesSync />
      <ConfirmProvider>
        <SelectedUserProvider>
          <RootNavigator navTheme={navTheme} />
        </SelectedUserProvider>
      </ConfirmProvider>
      <FlashMessage position="top" />
    </>
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    Promise.all([loadPersistedLanguage(), loadHapticsPreference()]).finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  // AuthProvider wraps the whole themed tree so every tab/stack screen and
  // headerRight (ModeIndicator) share one provider — including lazy getComponent.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeModeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </ThemeModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
