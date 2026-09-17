import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Card, Button, Input, Divider } from '../components/ui';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { isValidEmail } from '../utils/validators';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../utils/toast';

const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId || '';
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId || '';
const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || '';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { login: setSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const fillAdmin = () => { setEmail('admin@example.test'); setPassword('secret123'); };
  const fillOwner = () => { setEmail('owner@example.test'); setPassword('secret123'); };
  const fillDriver = () => { setEmail('driver@example.test'); setPassword('secret123'); };

  const login = async () => {
    if (!email.trim() || !password) {
      toastError(t('auth.fillEmailPassword'));
      return;
    }
    if (!isValidEmail(email)) {
      toastError(t('auth.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/login', { email: email.trim(), password });
      const token = resp.data.access_token;
      const profile = await api.get('/user', { headers: { Authorization: `Bearer ${token}` } });
      await setSession(profile.data, token);
    } catch (err) {
      toastError(errorMessage(err, t('auth.loginFailed')));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const clientId = GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID;
    if (!clientId) {
      toastError('No hay client ID de Google configurado. Añade los client IDs en app.json (expo.extra).');
      return;
    }

    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    const nonce = Math.random().toString(36).slice(2);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;

    setGoogleLoading(true);
    try {
      const result = await AuthSession.startAsync({ authUrl });
      if (result.type === 'success' && result.params?.id_token) {
        const idToken = result.params.id_token;
        const resp = await api.post('/auth/google/mobile', { id_token: idToken });
        await setSession(resp.data.user, resp.data.access_token);
      } else if (result.type !== 'cancel' && result.type !== 'dismiss') {
        toastError('No se pudo completar el inicio con Google');
      }
    } catch (err) {
      toastError('Error en Google Sign-In');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: '100%' }}
        className="bg-background dark:bg-background-dark"
        keyboardShouldPersistTaps="handled"
      >
        <Card className="w-full max-w-[440px]">
          <Card.Content className="py-6">
            <Text className="text-2xl font-bold text-center text-onSurface dark:text-onSurface-dark">
              {t('auth.appName')}
            </Text>
            <Text className="text-sm text-center mb-6 mt-1 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {t('auth.loginTitle')}
            </Text>

            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left="email-outline"
              className="mb-3.5"
            />
            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              left="lock-outline"
              right={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((v) => !v)}
              className="mb-3.5"
            />

            <Button mode="contained" onPress={login} loading={loading} disabled={loading} className="mt-1 py-1">
              {t('auth.enter')}
            </Button>

            <View className="flex-row items-center my-4">
              <Divider className="flex-1" />
              <Text className="mx-2.5 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('auth.or')}
              </Text>
              <Divider className="flex-1" />
            </View>

            <Button mode="outlined" icon="google" onPress={loginWithGoogle} loading={googleLoading} disabled={googleLoading}>
              {t('auth.continueWithGoogle')}
            </Button>

            <View className="flex-row justify-center flex-wrap mt-4">
              <Button compact mode="text" onPress={fillAdmin}>Admin</Button>
              <Button compact mode="text" onPress={fillOwner}>Owner</Button>
              <Button compact mode="text" onPress={fillDriver}>Driver</Button>
            </View>

            <Button mode="text" onPress={() => navigation.navigate('Register')} className="mt-1">
              {t('auth.noAccount')}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
