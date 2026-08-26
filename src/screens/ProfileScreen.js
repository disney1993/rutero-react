import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Avatar, TextInput, HelperText, Divider, SegmentedButtons, ActivityIndicator, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { getInitials, getRandomAvatarColor, AVATAR_PALETTE } from '../utils/avatar';
import { isValidName, isValidEmail, isValidPassword } from '../utils/validators';
import { toastSuccess, toastError } from '../utils/toast';

export default function ProfileScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();

  // --- Avatar color ---
  // Un único botón: genera un color nuevo y lo guarda al instante. Sin
  // paso previo de "probar" ni botón de guardar aparte — cuantas menos
  // acciones, mejor para alguien usando la app entre ruta y ruta.
  const [avatarColor, setAvatarColor] = useState(user.avatar_color || AVATAR_PALETTE[0]);
  const [savingColor, setSavingColor] = useState(false);
  const initials = getInitials(user.first_name, user.last_name);

  const changeColor = async () => {
    let next = getRandomAvatarColor();
    while (next === avatarColor && AVATAR_PALETTE.length > 1) next = getRandomAvatarColor();
    setAvatarColor(next);

    setSavingColor(true);
    try {
      const resp = await api.patch('/user/avatar-color', { avatar_color: next });
      await updateUser(resp.data);
      toastSuccess(t('profile.colorUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSavingColor(false);
    }
  };

  // --- Datos de perfil ---
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user.second_last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const profileDirty = (
    firstName.trim() !== (user.first_name || '') ||
    lastName.trim() !== (user.last_name || '') ||
    secondLastName.trim() !== (user.second_last_name || '') ||
    email.trim() !== (user.email || '')
  );
  const profileErrors = {};
  if (!isValidName(firstName)) profileErrors.firstName = t('validation.nameFormat');
  if (!isValidName(lastName)) profileErrors.lastName = t('validation.nameFormat');
  if (secondLastName.trim() && !isValidName(secondLastName)) profileErrors.secondLastName = t('validation.nameFormat');
  if (!isValidEmail(email)) profileErrors.email = t('validation.invalidEmail');
  const profileValid = Object.keys(profileErrors).length === 0;

  const saveProfile = async () => {
    if (!profileValid) return;
    setSavingProfile(true);
    try {
      const resp = await api.patch('/user', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
        email: email.trim(),
      });
      await updateUser(resp.data);
      toastSuccess(t('profile.profileUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Cambiar contraseña ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const passwordTouched = !!(currentPassword || newPassword || confirmPassword);
  const passwordErrors = {};
  if (passwordTouched) {
    if (!currentPassword) passwordErrors.currentPassword = t('validation.required');
    if (!newPassword) passwordErrors.newPassword = t('validation.required');
    else if (newPassword.length > 72) passwordErrors.newPassword = t('validation.passwordMaxLength');
    else if (!isValidPassword(newPassword)) passwordErrors.newPassword = t('validation.passwordComplexity');
    if (confirmPassword !== newPassword) passwordErrors.confirmPassword = t('validation.passwordMismatch');
  }
  const passwordValid = passwordTouched && Object.keys(passwordErrors).length === 0;

  const savePassword = async () => {
    if (!passwordValid) return;
    setSavingPassword(true);
    try {
      await api.patch('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toastSuccess(t('profile.passwordUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('validation.wrongCurrentPassword')));
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Precio por km (necesita un botón: es texto libre, hay que validarlo) ---
  const initialPricePerKm = user.price_per_km != null ? String(user.price_per_km) : '';
  const [pricePerKm, setPricePerKm] = useState(initialPricePerKm);
  const [savingPricing, setSavingPricing] = useState(false);

  const pricingDirty = Number(pricePerKm || 0) !== Number(initialPricePerKm || 0);
  const pricingError = pricePerKm && (isNaN(Number(pricePerKm)) || Number(pricePerKm) < 0) ? t('validation.positiveNumber') : '';
  const pricingValid = !pricingError;

  const savePricing = async () => {
    if (!pricingValid) return;
    setSavingPricing(true);
    try {
      const resp = await api.patch('/user/preferences', { price_per_km: pricePerKm ? Number(pricePerKm) : null });
      await updateUser(resp.data);
      toastSuccess(t('profile.preferencesUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSavingPricing(false);
    }
  };

  // --- Moneda: una elección clara, se aplica al instante (sin botón) ---
  const [currency, setCurrency] = useState(user.currency || 'EUR');
  const [savingCurrency, setSavingCurrency] = useState(false);

  const changeCurrency = async (value) => {
    setCurrency(value);
    setSavingCurrency(true);
    try {
      const resp = await api.patch('/user/preferences', { currency: value });
      await updateUser(resp.data);
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSavingCurrency(false);
    }
  };

  // --- Tema e idioma: también se aplican al instante y se guardan en el
  // perfil (además de en este dispositivo) para que viajen con la cuenta. ---
  const changeTheme = async (value) => {
    setThemeMode(value);
    try {
      const resp = await api.patch('/user/preferences', { theme: value });
      await updateUser(resp.data);
    } catch (err) {
      // No crítico: el tema ya cambió localmente aunque no se pudiera guardar en el servidor.
    }
  };

  const changeAppLanguage = async (value) => {
    await changeLanguage(value);
    try {
      const resp = await api.patch('/user/preferences', { language: value });
      await updateUser(resp.data);
    } catch (err) {
      // No crítico: el idioma ya cambió localmente aunque no se pudiera guardar en el servidor.
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.centerContent}>
          <Avatar.Text size={88} label={initials} style={{ backgroundColor: avatarColor }} />
          <Button mode="contained" onPress={changeColor} loading={savingColor} disabled={savingColor} style={styles.smallButton}>
            {t('profile.changeColor')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('profile.myData')}</Text>

          <View style={styles.row}>
            <TextInput mode="outlined" label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} style={[styles.input, styles.half]} error={!!profileErrors.firstName} />
            <TextInput mode="outlined" label={t('profile.lastName')} value={lastName} onChangeText={setLastName} style={[styles.input, styles.half]} error={!!profileErrors.lastName} />
          </View>
          <HelperText type="error" visible={!!profileErrors.firstName || !!profileErrors.lastName}>
            {profileErrors.firstName || profileErrors.lastName}
          </HelperText>

          <TextInput mode="outlined" label={t('profile.secondLastName')} value={secondLastName} onChangeText={setSecondLastName} style={styles.input} error={!!profileErrors.secondLastName} />
          <HelperText type="error" visible={!!profileErrors.secondLastName}>{profileErrors.secondLastName}</HelperText>

          <TextInput mode="outlined" label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} error={!!profileErrors.email} />
          <HelperText type="error" visible={!!profileErrors.email}>{profileErrors.email}</HelperText>

          <Button mode="contained" onPress={saveProfile} loading={savingProfile} disabled={savingProfile || !profileDirty || !profileValid} style={styles.saveButton}>
            {t('profile.saveData')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('profile.changePassword')}</Text>

          <TextInput mode="outlined" label={t('profile.currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry style={styles.input} error={!!passwordErrors.currentPassword} />
          <HelperText type="error" visible={!!passwordErrors.currentPassword}>{passwordErrors.currentPassword}</HelperText>

          <TextInput mode="outlined" label={t('profile.newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} error={!!passwordErrors.newPassword} />
          <HelperText type={passwordErrors.newPassword ? 'error' : 'info'} visible>
            {passwordErrors.newPassword || t('validation.passwordComplexity')}
          </HelperText>

          <TextInput mode="outlined" label={t('profile.confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} error={!!passwordErrors.confirmPassword} />
          <HelperText type="error" visible={!!passwordErrors.confirmPassword}>{passwordErrors.confirmPassword}</HelperText>

          <Button mode="contained" onPress={savePassword} loading={savingPassword} disabled={savingPassword || !passwordValid} style={styles.saveButton}>
            {t('profile.updatePassword')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('profile.pricingSection')}</Text>
          <Text variant="bodySmall" style={styles.hint}>{t('profile.pricingHint')}</Text>

          <Text variant="labelLarge" style={styles.label}>{t('profile.currency')}</Text>
          <SegmentedButtons
            value={currency}
            onValueChange={changeCurrency}
            buttons={[{ value: 'EUR', label: 'Euro (€)' }, { value: 'USD', label: 'Dólar ($)' }]}
            style={styles.input}
          />
          {savingCurrency && <ActivityIndicator size="small" style={styles.inlineLoader} />}

          <TextInput
            mode="outlined"
            label={t('profile.pricePerKm', { currency })}
            value={pricePerKm}
            onChangeText={setPricePerKm}
            keyboardType="numeric"
            style={styles.input}
            error={!!pricingError}
          />
          <HelperText type="error" visible={!!pricingError}>{pricingError}</HelperText>

          <Button mode="contained" onPress={savePricing} loading={savingPricing} disabled={savingPricing || !pricingDirty || !pricingValid} style={styles.saveButton}>
            {t('profile.savePreferences')}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('profile.appearanceSection')}</Text>
          <Text variant="labelLarge" style={styles.label}>{t('profile.theme')}</Text>
          <SegmentedButtons
            value={themeMode}
            onValueChange={changeTheme}
            buttons={[
              { value: 'system', label: t('profile.themeSystem') },
              { value: 'light', label: t('profile.themeLight') },
              { value: 'dark', label: t('profile.themeDark') },
            ]}
            style={styles.input}
          />

          <Text variant="labelLarge" style={styles.label}>{t('profile.language')}</Text>
          <SegmentedButtons
            value={i18n.language}
            onValueChange={changeAppLanguage}
            buttons={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />
      <Button mode="text" onPress={logout} style={styles.logoutButton}>{t('nav.logout')}</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, marginBottom: 16 },
  centerContent: { alignItems: 'center', paddingVertical: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 12 },
  hint: { opacity: 0.7, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  input: { marginBottom: 4 },
  half: { flex: 1 },
  label: { marginBottom: 8, marginTop: 4 },
  smallButton: { marginTop: 10, borderRadius: 10, width: '100%' },
  saveButton: { marginTop: 12, borderRadius: 10 },
  inlineLoader: { marginBottom: 8 },
  divider: { marginTop: 8, marginBottom: 8 },
  logoutButton: { alignSelf: 'center' },
});
