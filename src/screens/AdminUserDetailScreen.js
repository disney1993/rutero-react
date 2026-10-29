import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Input, Button, SegmentedButtons, PageContainer } from '../components/ui';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { isValidName, isValidEmail } from '../utils/validators';
import { useConfirm } from '../context/ConfirmContext';
import { toastSuccess, toastError } from '../utils/toast';
import { formatDateDMY } from '../utils/rutas';

export default function AdminUserDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const initialUser = route.params.user;

  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    navigation.setOptions({ title: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email });
  }, [user, navigation]);

  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user.second_last_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole] = useState(user.role || 'user');
  const [plan, setPlan] = useState(user.plan || 'free');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profileDirty = (
    firstName.trim() !== (user.first_name || '') ||
    lastName.trim() !== (user.last_name || '') ||
    secondLastName.trim() !== (user.second_last_name || '') ||
    email.trim() !== (user.email || '') ||
    role !== (user.role || 'user') ||
    plan !== (user.plan || 'free')
  );
  const profileErrors = {};
  if (!isValidName(firstName)) profileErrors.firstName = t('validation.nameFormat');
  if (!isValidName(lastName)) profileErrors.lastName = t('validation.nameFormat');
  if (secondLastName.trim() && !isValidName(secondLastName)) profileErrors.secondLastName = t('validation.nameFormat');
  if (!isValidEmail(email)) profileErrors.email = t('validation.invalidEmail');
  const profileValid = Object.keys(profileErrors).length === 0;

  const registeredAt = user.created_at ? formatDateDMY(user.created_at) : null;

  const saveProfile = async () => {
    if (!profileValid) return;
    setSavingProfile(true);
    try {
      const resp = await api.patch(`/admin/users/${user.id}`, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
        email: email.trim(),
        // Never promote to admin from this screen (choice is disabled in UI).
        role: role === 'admin' ? (user.role || 'user') : role,
        plan,
      });
      setUser(resp.data);
      setRole(resp.data.role || 'user');
      toastSuccess(t('admin.userUpdated'));
    } catch (err) {
      toastError(errorMessage(err, t('admin.userUpdateError')));
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmDeleteUser = async () => {
    const ok = await confirm({
      title: t('alerts.confirmDeleteTitle'),
      message: t('alerts.confirmDeleteUserMessage', { name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email }),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await api.delete(`/admin/users/${user.id}`);
      navigation.goBack();
    } catch (err) {
      toastError(errorMessage(err, t('admin.userDeleteError')));
      setDeleting(false);
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView contentContainerStyle={{ paddingTop: 4 }}>
        <PageContainer className="p-4 pt-4">
          {user.profile_incomplete && (
            <View className="rounded-xl px-3 py-2.5 mb-3 bg-error/15 dark:bg-error-dark/20">
              <Text className="text-error dark:text-error-dark text-sm">
                {t('admin.incompleteProfileHint')}
              </Text>
            </View>
          )}

          <Text className="mb-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('admin.userType')}</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-4">
            {user.has_owner_capability && (
              <Text className="text-xs rounded px-2 py-1 bg-secondary/20 dark:bg-secondary-dark/20 text-secondary dark:text-secondary-dark">
                {t('roles.owner')}
              </Text>
            )}
            {user.has_driver_capability && (
              <Text className="text-xs rounded px-2 py-1 bg-tertiary/20 dark:bg-tertiary-dark/20 text-tertiary dark:text-tertiary-dark">
                {t('roles.driver')}
              </Text>
            )}
            {!user.has_owner_capability && !user.has_driver_capability && (
              <Text className="text-xs rounded px-2 py-1 bg-surfaceDisabled dark:bg-surfaceDisabled-dark text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('admin.noActivityYet')}
              </Text>
            )}
          </View>

          {registeredAt ? (
            <View className="mb-4">
              <Text className="mb-1 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('admin.registeredAt')}
              </Text>
              <Text className="text-sm text-onSurface dark:text-onSurface-dark">{registeredAt}</Text>
            </View>
          ) : null}

          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Input label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} error={profileErrors.firstName} />
            </View>
            <View className="flex-1">
              <Input label={t('profile.lastName')} value={lastName} onChangeText={setLastName} error={profileErrors.lastName} />
            </View>
          </View>

          <Input label={t('admin.secondLastName')} value={secondLastName} onChangeText={setSecondLastName} error={profileErrors.secondLastName} />
          <Input label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" error={profileErrors.email} />

          <Text className="mt-2 mb-2 font-medium text-onSurface dark:text-onSurface-dark">{t('admin.role')}</Text>
          <SegmentedButtons
            value={role === 'admin' ? 'admin' : 'user'}
            onValueChange={(value) => {
              if (value === 'admin') return;
              setRole(value);
            }}
            buttons={[
              { value: 'user', label: t('nav.user') },
              {
                value: 'admin',
                label: t('roles.admin'),
                disabled: true,
                accessibilityLabel: t('admin.roleAdminDisabledHint'),
              },
            ]}
            className="mb-1"
          />
          <Text className="mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
            {t('admin.roleAdminDisabledHint')}
          </Text>

          <Text className="mt-2 mb-2 font-medium text-onSurface dark:text-onSurface-dark">{t('admin.plan')}</Text>
          <SegmentedButtons value={plan} onValueChange={setPlan} buttons={[{ value: 'free', label: t('admin.planFree') }, { value: 'premium', label: t('admin.planPremium') }]} className="mb-1" />

          <Button mode="contained" onPress={saveProfile} loading={savingProfile} disabled={savingProfile || !profileDirty || !profileValid} className="mt-4">
            {t('form.saveChanges')}
          </Button>
          <Button
            mode="outlined"
            onPress={confirmDeleteUser}
            loading={deleting}
            disabled={deleting}
            className="mt-3 border-error dark:border-error-dark"
            textClassName="text-error dark:text-error-dark"
          >
            {t('admin.deleteUser')}
          </Button>
        </PageContainer>
      </ScrollView>
    </View>
  );
}
