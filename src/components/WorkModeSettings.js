import React, { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import SegmentedButtons from './ui/SegmentedButtons';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, errorMessage } from '../utils/apiClient';
import { toastError, toastInfo, toastSuccess } from '../utils/toast';
import {
  WORK_MODE_ICONS,
  canSwitchWorkMode,
  isDriverOnly,
  isOwnerCapable,
  mergeWorkModePreference,
  resolveWorkMode,
} from '../utils/capabilities';

/** Selector de modo propietario/conductor (hub de cuenta). */
export default function WorkModeSettings() {
  const { t } = useTranslation();
  const { user, isAdmin, updateUser } = useAuth();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  if (isAdmin) return null;

  const mode = resolveWorkMode(user, isAdmin);
  const canSwitch = canSwitchWorkMode(user, isAdmin);
  const driverOnly = isDriverOnly(user, isAdmin);
  const needOwner = !isOwnerCapable(user, isAdmin);

  const lockedHint = () => {
    if (driverOnly) return t('mode.driverOnlyHint');
    if (needOwner) return t('mode.needOwnerHint');
    return t('mode.switchHint');
  };

  const setMode = async (value) => {
    if (saving || value === mode) return;
    if (!canSwitch) {
      toastInfo(lockedHint());
      return;
    }

    const nextLabel = t(`mode.${value}`);
    const ok = await confirm({
      title: t('mode.title'),
      message: t('mode.switchConfirm', { mode: nextLabel }),
      confirmLabel: t('mode.switchAction', { mode: nextLabel }),
    });
    if (!ok) return;

    setSaving(true);
    try {
      const resp = await api.patch('/user/preferences', { work_mode: value });
      await updateUser(mergeWorkModePreference(resp.data, value));
      toastSuccess(t('mode.switched', { mode: nextLabel }));
    } catch (err) {
      toastError(errorMessage(err, t('mode.switchError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4 w-full">
      <Card.Content>
        <Text className="mb-2 font-bold text-onSurface dark:text-onSurface-dark">{t('mode.title')}</Text>
        <Text className="mb-3 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          {canSwitch
            ? t('mode.switchHint')
            : driverOnly
              ? t('mode.driverOnlyHint')
              : needOwner
                ? t('mode.needOwnerHint')
                : t('mode.switchHint')}
        </Text>
        <SegmentedButtons
          value={mode}
          onValueChange={setMode}
          buttons={[
            {
              value: 'owner',
              label: t('mode.owner'),
              icon: WORK_MODE_ICONS.owner,
              disabled: saving || (!canSwitch && mode !== 'owner'),
            },
            {
              value: 'driver',
              label: t('mode.driver'),
              icon: WORK_MODE_ICONS.driver,
              disabled: saving || (!canSwitch && mode !== 'driver'),
            },
          ]}
        />
        {saving && (
          <Text className="mt-2 text-xs opacity-60 text-onSurface dark:text-onSurface-dark">
            {t('common.loading')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}
