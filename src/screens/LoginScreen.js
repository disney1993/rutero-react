import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Text, TextInput, Button, Card, Divider, useTheme } from 'react-native-paper';
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
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(440, width - 32);
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={[styles.card, { width: cardWidth }]} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineMedium" style={styles.title}>{t('auth.appName')}</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('auth.loginTitle')}
            </Text>

            <TextInput
              mode="outlined"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((v) => !v)}
                  forceTextInputFocus={false}
                />
              }
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={login}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              {t('auth.enter')}
            </Button>

            <View style={styles.dividerRow}>
              <Divider style={styles.dividerLine} />
              <Text variant="labelMedium" style={[styles.dividerLabel, { color: theme.colors.onSurfaceVariant }]}>
                {t('auth.or')}
              </Text>
              <Divider style={styles.dividerLine} />
            </View>

            <Button
              mode="outlined"
              icon="google"
              onPress={loginWithGoogle}
              loading={googleLoading}
              disabled={googleLoading}
              style={styles.googleButton}
              contentStyle={styles.buttonContent}
            >
              {t('auth.continueWithGoogle')}
            </Button>

            <View style={styles.quickFillRow}>
              <Button compact mode="text" onPress={fillAdmin}>Admin</Button>
              <Button compact mode="text" onPress={fillOwner}>Owner</Button>
              <Button compact mode="text" onPress={fillDriver}>Driver</Button>
            </View>

            <Button mode="text" onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
              {t('auth.noAccount')}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: '100%',
  },
  card: { borderRadius: 20 },
  cardContent: { paddingVertical: 24 },
  title: { textAlign: 'center', fontWeight: '700' },
  subtitle: { textAlign: 'center', marginBottom: 24 },
  input: { marginBottom: 14 },
  primaryButton: { marginTop: 4, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1 },
  dividerLabel: { marginHorizontal: 10 },
  googleButton: { borderRadius: 10 },
  quickFillRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' },
  linkButton: { marginTop: 4 },
});
