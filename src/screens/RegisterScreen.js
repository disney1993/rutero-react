import React, { useMemo, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Card, Button, Input, Avatar } from '../components/ui';
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
  const { t } = useTranslation();
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
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: '100%' }}
        className="bg-background dark:bg-background-dark"
        keyboardShouldPersistTaps="handled"
      >
        <Card className="w-full max-w-[440px]">
          <Card.Content className="py-6">
            <Text className="text-2xl font-bold text-center text-onSurface dark:text-onSurface-dark">
              {t('auth.registerTitle')}
            </Text>
            <Text className="text-sm text-center mb-5 mt-1 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {t('auth.registerSubtitle')}
            </Text>

            <View className="items-center mb-5">
              <Avatar.Text size={72} label={initials} color={avatarColor} />
              <Text className="mt-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                Así se verá tu avatar
              </Text>
            </View>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Input
                  label={t('profile.firstName')}
                  value={firstName}
                  onChangeText={setFirstName}
                  error={showFieldError('firstName') ? errors.firstName : undefined}
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t('profile.lastName')}
                  value={lastName}
                  onChangeText={setLastName}
                  error={showFieldError('lastName') ? errors.lastName : undefined}
                />
              </View>
            </View>

            <Input
              label={t('profile.secondLastName')}
              value={secondLastName}
              onChangeText={setSecondLastName}
              error={showFieldError('secondLastName') ? errors.secondLastName : undefined}
            />

            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left="email-outline"
              error={showFieldError('email') ? errors.email : undefined}
            />

            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              left="lock-outline"
              right={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightPress={() => setShowPassword((v) => !v)}
              error={showFieldError('password') ? errors.password : undefined}
            />
            {password.length > 0 && !showFieldError('password') && (
              <Text className="text-xs mb-2 -mt-0.5 text-secondary dark:text-secondary-dark">
                Contraseña válida
              </Text>
            )}

            <Button mode="contained" onPress={register} loading={loading} disabled={loading} className="mt-1.5">
              {t('auth.registerAction')}
            </Button>

            <Button mode="text" onPress={() => navigation.navigate('Login')} className="mt-1">
              {t('auth.hasAccount')}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
