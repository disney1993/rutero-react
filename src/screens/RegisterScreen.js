import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, Avatar, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { getInitials, getRandomAvatarColor } from '../utils/avatar';
import { isValidName, isValidEmail, isValidPassword } from '../utils/validators';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../utils/toast';

function validate({ firstName, lastName, secondLastName, email, password }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = 'El nombre es obligatorio';
  else if (!isValidName(firstName)) errors.firstName = 'Solo letras, entre 2 y 50 caracteres';

  if (!lastName.trim()) errors.lastName = 'El apellido es obligatorio';
  else if (!isValidName(lastName)) errors.lastName = 'Solo letras, entre 2 y 50 caracteres';

  if (secondLastName.trim() && !isValidName(secondLastName)) {
    errors.secondLastName = 'Solo letras, entre 2 y 50 caracteres';
  }

  if (!email.trim()) errors.email = 'El email es obligatorio';
  else if (!isValidEmail(email)) errors.email = 'Ingresa un email válido';

  if (!password) errors.password = 'La contraseña es obligatoria';
  else if (password.length > 72) errors.password = 'Debe tener como máximo 72 caracteres';
  else if (!isValidPassword(password)) errors.password = 'Mínimo 6 caracteres, con una mayúscula, un número y un símbolo';

  return errors;
}

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(440, width - 32);
  const { login: setSession } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Se genera una sola vez al montar la pantalla y no cambia mientras se
  // escribe; es el color que se guardará junto con la cuenta.
  const [avatarColor] = useState(() => getRandomAvatarColor());

  const errors = useMemo(
    () => validate({ firstName, lastName, secondLastName, email, password }),
    [firstName, lastName, secondLastName, email, password]
  );
  const showFieldError = (field) => {
    if (field === 'password') return password.length > 0 && !!errors.password;
    if (field === 'secondLastName') return secondLastName.length > 0 && !!errors.secondLastName;
    return submitted && !!errors[field];
  };

  const initials = getInitials(firstName, lastName);

  const register = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      toastError('Revisa los datos marcados en rojo');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
        email: email.trim(),
        password,
        avatar_color: avatarColor,
      };

      const resp = await api.post('/register', payload);
      await setSession(resp.data.user, resp.data.access_token);
    } catch (err) {
      toastError(errorMessage(err, t('auth.registerFailed')));
    } finally {
      setLoading(false);
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
            <Text variant="headlineMedium" style={styles.title}>{t('auth.registerTitle')}</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('auth.registerSubtitle')}
            </Text>

            <View style={styles.avatarPreview}>
              <Avatar.Text size={72} label={initials} style={{ backgroundColor: avatarColor }} />
              <Text variant="bodySmall" style={[styles.avatarHint, { color: theme.colors.onSurfaceVariant }]}>
                Así se verá tu avatar
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label={t('profile.firstName')}
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  error={showFieldError('firstName')}
                />
                <HelperText type="error" visible={showFieldError('firstName')}>
                  {errors.firstName}
                </HelperText>
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label={t('profile.lastName')}
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  error={showFieldError('lastName')}
                />
                <HelperText type="error" visible={showFieldError('lastName')}>
                  {errors.lastName}
                </HelperText>
              </View>
            </View>

            <TextInput
              mode="outlined"
              label={t('profile.secondLastName')}
              value={secondLastName}
              onChangeText={setSecondLastName}
              style={styles.input}
              error={showFieldError('secondLastName')}
            />
            <HelperText type="error" visible={showFieldError('secondLastName')}>
              {errors.secondLastName}
            </HelperText>

            <TextInput
              mode="outlined"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              error={showFieldError('email')}
            />
            <HelperText type="error" visible={showFieldError('email')}>
              {errors.email}
            </HelperText>

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
              style={styles.passwordInput}
              error={showFieldError('password')}
            />
            <HelperText type={showFieldError('password') ? 'error' : 'info'} visible={password.length > 0}>
              {errors.password || 'Contraseña válida'}
            </HelperText>

            <Button
              mode="contained"
              onPress={register}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              {t('auth.registerAction')}
            </Button>

            <Button mode="text" onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
              {t('auth.hasAccount')}
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
  subtitle: { textAlign: 'center', marginBottom: 20 },
  avatarPreview: { alignItems: 'center', marginBottom: 20 },
  avatarHint: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  input: { marginBottom: 0 },
  passwordInput: { marginBottom: 2 },
  halfInput: { flex: 1 },
  primaryButton: { marginTop: 6, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
  linkButton: { marginTop: 4 },
});
