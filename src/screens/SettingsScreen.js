import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, Switch, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Card, SegmentedButtons, PageContainer, Input, Button } from '../components/ui';
import ColorPickerField from '../components/ui/ColorPickerField';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { changeLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { api, errorMessage } from '../utils/apiClient';
import { AUTO_COMPLETE_DEFAULTS, previewAutoCompleteTime } from '../utils/autoComplete';
import { toastError, toastSuccess } from '../utils/toast';
import { haptics, isHapticsEnabled, setHapticsEnabled } from '../utils/haptics';
import { DEFAULT_PRICE_PER_KM } from '../utils/currency';
import { getInitials, AVATAR_COLOR_SWATCHES, resolveAvatarColor } from '../utils/avatar';
import { isValidName, isValidEmail, isValidPassword, isValidHexColor } from '../utils/validators';
import TaxiTariffReference from '../components/TaxiTariffReference';

const EXAMPLE_DURATION_MIN = 38;

/** Map stack route names → which settings block to render (only that block). */
const SECTION_BY_ROUTE = {
  SettingsAccount: 'account',
  SettingsTrips: 'trips',
  SettingsApp: 'app',
};

function inRange(value, min, max) {
  return /^\d+$/.test(String(value)) && Number(value) >= min && Number(value) <= max;
}

function AvatarColorSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [avatarColor, setAvatarColor] = useState(() => resolveAvatarColor(user.avatar_color));
  const [savingColor, setSavingColor] = useState(false);
  const initials = getInitials(user.first_name, user.last_name);

  useEffect(() => {
    setAvatarColor(resolveAvatarColor(user.avatar_color));
  }, [user.avatar_color]);

  const changeColor = async (next) => {
    if (!isValidHexColor(next || '') || next.toUpperCase() === avatarColor.toUpperCase()) return;
    const previous = avatarColor;
    setAvatarColor(next);
    setSavingColor(true);
    try {
      const resp = await api.patch('/user/avatar-color', { avatar_color: next });
      await updateUser(resp.data);
      toastSuccess(t('profile.colorUpdated'));
    } catch (err) {
      setAvatarColor(previous);
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSavingColor(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Content className="py-2">
        <View className="items-center mb-3">
          <Avatar.Text size={88} label={initials} color={avatarColor} />
          {savingColor && (
            <Text className="mt-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {t('profile.savingColor')}
            </Text>
          )}
        </View>
        <ColorPickerField
          label={t('profile.avatarSection')}
          value={avatarColor}
          onChange={changeColor}
          palette={AVATAR_COLOR_SWATCHES}
          storeAsHex
          triggerOnly
          triggerLabel={t('profile.changeColor')}
          sheetTitle={t('colorPicker.avatarTitle')}
        />
      </Card.Content>
    </Card>
  );
}

function ProfileDataSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const isGoogleAccount = !!(user?.is_google_account || user?.auth_provider === 'google');
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user.second_last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setSecondLastName(user.second_last_name || '');
    setEmail(user.email || '');
    setCurrentPassword('');
  }, [user.first_name, user.last_name, user.second_last_name, user.email]);

  const emailDirty = !isGoogleAccount && email.trim().toLowerCase() !== (user.email || '').toLowerCase();
  const profileDirty = (
    firstName.trim() !== (user.first_name || '') ||
    lastName.trim() !== (user.last_name || '') ||
    secondLastName.trim() !== (user.second_last_name || '') ||
    emailDirty
  );
  const profileErrors = {};
  if (!isValidName(firstName)) profileErrors.firstName = t('validation.nameFormat');
  if (!isValidName(lastName)) profileErrors.lastName = t('validation.nameFormat');
  if (secondLastName.trim() && !isValidName(secondLastName)) profileErrors.secondLastName = t('validation.nameFormat');
  if (!isGoogleAccount) {
    if (!isValidEmail(email)) profileErrors.email = t('validation.invalidEmail');
    if (emailDirty && !currentPassword) profileErrors.currentPassword = t('validation.passwordRequiredForEmail');
  }
  const profileValid = Object.keys(profileErrors).length === 0;

  const saveProfile = async () => {
    if (!profileValid) return;
    setSavingProfile(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
      };
      if (!isGoogleAccount) {
        payload.email = email.trim();
        if (emailDirty) payload.current_password = currentPassword;
      }
      const resp = await api.patch('/user', payload);
      await updateUser(resp.data);
      setCurrentPassword('');
      toastSuccess(t('profile.profileUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Content>
        <Text className="font-bold mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.myData')}</Text>

        <Input label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} error={profileErrors.firstName} />
        <Input label={t('profile.lastName')} value={lastName} onChangeText={setLastName} error={profileErrors.lastName} />
        <Input label={t('profile.secondLastName')} value={secondLastName} onChangeText={setSecondLastName} error={profileErrors.secondLastName} />
        {isGoogleAccount ? (
          <>
            <Input
              label={t('auth.email')}
              value={user.email || ''}
              editable={false}
              selectTextOnFocus={false}
            />
            <Text className="text-xs mb-2 -mt-0.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {t('profile.googleEmailLocked')}
            </Text>
          </>
        ) : (
          <>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              autoComplete="email"
              textContentType="emailAddress"
              error={profileErrors.email}
            />
            {emailDirty && (
              <>
                <Text className="text-xs mb-1 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {t('profile.passwordRequiredForEmailHint')}
                </Text>
                <Input
                  label={t('profile.currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  maxLength={72}
                  error={profileErrors.currentPassword}
                />
              </>
            )}
          </>
        )}

        <Button mode="contained" onPress={saveProfile} loading={savingProfile} disabled={savingProfile || !profileDirty || !profileValid} className="mt-3">
          {t('profile.saveData')}
        </Button>
      </Card.Content>
    </Card>
  );
}

function PasswordSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isGoogleAccount = !!(user?.is_google_account || user?.auth_provider === 'google');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (isGoogleAccount) return null;

  const passwordTouched = !!(currentPassword || newPassword || confirmPassword);
  const passwordErrors = {};
  if (passwordTouched) {
    if (!currentPassword) passwordErrors.currentPassword = t('validation.required');
    else if (currentPassword.length > 72) passwordErrors.currentPassword = t('validation.passwordMaxLength');
    if (!newPassword) passwordErrors.newPassword = t('validation.required');
    else if (newPassword.length > 72) passwordErrors.newPassword = t('validation.passwordMaxLength');
    else if (!isValidPassword(newPassword)) passwordErrors.newPassword = t('validation.passwordComplexity');
    if (!confirmPassword) passwordErrors.confirmPassword = t('validation.required');
    else if (confirmPassword !== newPassword) passwordErrors.confirmPassword = t('validation.passwordMismatch');
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

  return (
    <Card className="mb-4">
      <Card.Content>
        <Text className="font-bold mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.changePassword')}</Text>

        <Input
          label={t('profile.currentPassword')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          error={passwordErrors.currentPassword}
        />
        <Input
          label={t('profile.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={72}
          error={passwordErrors.newPassword}
        />
        {!passwordErrors.newPassword && (
          <Text className="text-xs mb-1 -mt-0.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
            {t('validation.passwordComplexity')}
          </Text>
        )}
        <Input
          label={t('profile.confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={72}
          error={passwordErrors.confirmPassword}
        />

        <Button mode="contained" onPress={savePassword} loading={savingPassword} disabled={savingPassword || !passwordValid} className="mt-3">
          {t('profile.updatePassword')}
        </Button>
      </Card.Content>
    </Card>
  );
}

function PricingSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [currency, setCurrency] = useState(user?.currency || 'EUR');
  const [pricePerKm, setPricePerKm] = useState(user?.price_per_km != null ? String(user.price_per_km) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrency(user?.currency || 'EUR');
    setPricePerKm(user?.price_per_km != null ? String(user.price_per_km) : '');
  }, [user?.currency, user?.price_per_km]);

  const pricingValid = !pricePerKm || (!Number.isNaN(Number(pricePerKm)) && Number(pricePerKm) >= 0);
  const dirty =
    currency !== (user?.currency || 'EUR')
    || pricePerKm !== (user?.price_per_km != null ? String(user.price_per_km) : '');

  const save = async () => {
    if (!pricingValid) {
      toastError(t('validation.positiveNumber'));
      return;
    }
    setSaving(true);
    try {
      const resp = await api.patch('/user/preferences', {
        currency,
        price_per_km: pricePerKm ? Number(pricePerKm) : null,
      });
      await updateUser(resp.data);
      toastSuccess(t('profile.preferencesUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Content>
        <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">{t('profile.pricingSection')}</Text>
        <Text className="opacity-70 text-xs mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.pricingHint')}</Text>

        <Text className="mb-2 mt-1 font-medium text-onSurface dark:text-onSurface-dark">{t('profile.currency')}</Text>
        <SegmentedButtons
          value={currency}
          onValueChange={setCurrency}
          buttons={[
            { value: 'EUR', label: t('profile.currencyEur') },
            { value: 'USD', label: t('profile.currencyUsd') },
          ]}
          className="mb-2"
        />

        <Input
          label={t('profile.pricePerKm', { currency })}
          value={pricePerKm}
          onChangeText={setPricePerKm}
          keyboardType="numeric"
        />
        {!pricePerKm && (
          <Text className="text-xs mt-1 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
            {t('profile.defaultPriceHint', { price: DEFAULT_PRICE_PER_KM.toFixed(2) })}
          </Text>
        )}
        {currency === 'EUR' && (
          <TaxiTariffReference onUse={(value) => setPricePerKm(String(value))} />
        )}
        <Button mode="contained" onPress={save} loading={saving} disabled={saving || !dirty || !pricingValid} className="mt-3">
          {t('profile.savePreferences')}
        </Button>
      </Card.Content>
    </Card>
  );
}

function AutoCompleteSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [enabled, setEnabled] = useState(user?.auto_complete_enabled !== false);
  const [startDelay, setStartDelay] = useState(
    String(user?.auto_complete_start_delay_min ?? AUTO_COMPLETE_DEFAULTS.start_delay_min)
  );
  const [marginMin, setMarginMin] = useState(String(user?.auto_complete_margin_min ?? AUTO_COMPLETE_DEFAULTS.margin_min));
  const [marginPct, setMarginPct] = useState(String(user?.auto_complete_margin_pct ?? AUTO_COMPLETE_DEFAULTS.margin_pct));
  const [defaultDuration, setDefaultDuration] = useState(
    String(user?.auto_complete_default_duration_min ?? AUTO_COMPLETE_DEFAULTS.default_duration_min)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(user?.auto_complete_enabled !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.auto_complete_enabled]);

  const valid = inRange(startDelay, 0, 120) && inRange(marginMin, 0, 240) && inRange(marginPct, 0, 100) && inRange(defaultDuration, 5, 1440);
  const exampleTime = valid
    ? previewAutoCompleteTime(
      { trip_time: '10:00', estimated_duration_min: EXAMPLE_DURATION_MIN },
      {
        auto_complete_start_delay_min: Number(startDelay),
        auto_complete_margin_min: Number(marginMin),
        auto_complete_margin_pct: Number(marginPct),
      }
    )
    : null;

  const save = async (patch) => {
    setSaving(true);
    try {
      const resp = await api.patch('/user/preferences', patch);
      await updateUser(resp.data);
      toastSuccess(t('autoComplete.saved'));
    } catch (err) {
      toastError(errorMessage(err, t('autoComplete.invalid')));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (value) => {
    setEnabled(value);
    save({ auto_complete_enabled: value });
  };

  const saveMargins = () => {
    if (!valid) {
      toastError(t('autoComplete.invalid'));
      return;
    }
    save({
      auto_complete_start_delay_min: Number(startDelay),
      auto_complete_margin_min: Number(marginMin),
      auto_complete_margin_pct: Number(marginPct),
      auto_complete_default_duration_min: Number(defaultDuration),
    });
  };

  return (
    <Card className="mb-4">
      <Card.Content>
        <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">{t('autoComplete.title')}</Text>
        <Text className="mb-3 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('autoComplete.explanation')}</Text>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="flex-1 text-onSurface dark:text-onSurface-dark">{t('autoComplete.enabled')}</Text>
          <Switch value={enabled} onValueChange={toggle} disabled={saving} />
        </View>
        {enabled ? (
          <>
            <Input label={t('autoComplete.startDelay')} value={startDelay} onChangeText={setStartDelay} keyboardType="numeric" />
            <Input label={t('autoComplete.marginMin')} value={marginMin} onChangeText={setMarginMin} keyboardType="numeric" />
            <Input label={t('autoComplete.marginPct')} value={marginPct} onChangeText={setMarginPct} keyboardType="numeric" />
            <Input label={t('autoComplete.defaultDuration')} value={defaultDuration} onChangeText={setDefaultDuration} keyboardType="numeric" />
            {!!exampleTime && (
              <Text className="mt-1 mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('autoComplete.example', { duration: EXAMPLE_DURATION_MIN, time: exampleTime })}
              </Text>
            )}
            <Button mode="contained" onPress={saveMargins} loading={saving} disabled={saving} className="mt-2">
              {t('autoComplete.save')}
            </Button>
          </>
        ) : (
          <Text className="text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('autoComplete.disabledHint')}</Text>
        )}
      </Card.Content>
    </Card>
  );
}

function HapticsSetting() {
  const { t } = useTranslation();
  const [on, setOn] = useState(isHapticsEnabled());
  const toggle = (value) => {
    setOn(value);
    setHapticsEnabled(value);
    if (value) haptics.success();
  };
  return (
    <Card className="mb-4">
      <Card.Content>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-bold text-onSurface dark:text-onSurface-dark">{t('settings.haptics')}</Text>
            <Text className="mt-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('settings.hapticsHint')}</Text>
          </View>
          <Switch value={on} onValueChange={toggle} />
        </View>
      </Card.Content>
    </Card>
  );
}

function AccountSettingsBlock() {
  return (
    <>
      <AvatarColorSettings />
      <ProfileDataSettings />
      <PasswordSettings />
    </>
  );
}

function TripsSettingsBlock() {
  return (
    <>
      <PricingSettings />
      <AutoCompleteSettings />
    </>
  );
}

function AppSettingsBlock() {
  const { t, i18n } = useTranslation();
  const { updateUser } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();

  const changeTheme = async (value) => {
    setThemeMode(value);
    try {
      const resp = await api.patch('/user/preferences', { theme: value });
      await updateUser(resp.data);
    } catch (err) {
      // Non-critical: theme already applied locally.
    }
  };

  const changeAppLanguage = async (value) => {
    await changeLanguage(value);
    try {
      const resp = await api.patch('/user/preferences', { language: value });
      await updateUser(resp.data);
    } catch (err) {
      // Non-critical: language already applied locally.
    }
  };

  return (
    <>
      <Card className="mb-4">
        <Card.Content>
          <Text className="font-bold mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.theme')}</Text>
          <SegmentedButtons
            value={themeMode}
            onValueChange={changeTheme}
            buttons={[
              { value: 'system', label: t('profile.themeSystem') },
              { value: 'light', label: t('profile.themeLight') },
              { value: 'dark', label: t('profile.themeDark') },
            ]}
          />
        </Card.Content>
      </Card>

      {Platform.OS !== 'web' && <HapticsSetting />}

      <Card className="mb-2">
        <Card.Content>
          <Text className="font-bold mb-3 text-onSurface dark:text-onSurface-dark">{t('profile.language')}</Text>
          <SegmentedButtons
            value={i18n.language}
            onValueChange={changeAppLanguage}
            buttons={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          />
        </Card.Content>
      </Card>
    </>
  );
}

export default function SettingsScreen({ route }) {
  const section = route.params?.section || SECTION_BY_ROUTE[route.name] || 'account';

  let body = null;
  if (section === 'account') body = <AccountSettingsBlock />;
  else if (section === 'trips') body = <TripsSettingsBlock />;
  else if (section === 'app') body = <AppSettingsBlock />;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 48 }}
      className="bg-background dark:bg-background-dark"
    >
      <PageContainer className="p-4">
        {body}
      </PageContainer>
    </ScrollView>
  );
}
