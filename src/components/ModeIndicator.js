import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from './ui/Icon';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
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

/** Chip compacto owner/driver para cabeceras y dashboard. Táctil para cambiar modo. */
export default function ModeIndicator({ compact = false }) {
  const { t } = useTranslation();
  const { user, isAdmin, updateUser } = useAuth();
  const confirm = useConfirm();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const [saving, setSaving] = useState(false);

  if (isAdmin) return null;

  const mode = resolveWorkMode(user, isAdmin);
  const canSwitch = canSwitchWorkMode(user, isAdmin);
  const isOwner = mode === 'owner';
  const nextMode = isOwner ? 'driver' : 'owner';
  const label = isOwner ? t('mode.owner') : t('mode.driver');
  const icon = isOwner ? WORK_MODE_ICONS.owner : WORK_MODE_ICONS.driver;
  const tone = isOwner ? c.secondary : c.tertiary;

  const lockedHint = () => {
    if (isDriverOnly(user, isAdmin)) return t('mode.driverOnlyHint');
    if (!isOwnerCapable(user, isAdmin)) return t('mode.needOwnerHint');
    return t('mode.switchHint');
  };

  const onPress = async () => {
    if (saving) return;
    if (!canSwitch) {
      toastInfo(lockedHint());
      return;
    }

    const nextLabel = t(`mode.${nextMode}`);
    const ok = await confirm({
      title: t('mode.title'),
      message: t('mode.switchConfirm', { mode: nextLabel }),
      confirmLabel: t('mode.switchAction', { mode: nextLabel }),
    });
    if (!ok) return;

    setSaving(true);
    try {
      const resp = await api.patch('/user/preferences', { work_mode: nextMode });
      await updateUser(mergeWorkModePreference(resp.data, nextMode));
      toastSuccess(t('mode.switched', { mode: nextLabel }));
    } catch (err) {
      toastError(errorMessage(err, t('mode.switchError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={t('mode.indicatorA11y', { mode: label })}
      accessibilityHint={canSwitch ? t('mode.tapToSwitch') : t('mode.tapLockedHint')}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: saving ? 0.5 : pressed ? 0.75 : 1 })}
    >
      <View
        className="flex-row items-center rounded-full px-2.5 py-1"
        style={{ backgroundColor: `${tone}22` }}
      >
        <Icon name={icon} size={compact ? 14 : 16} color={tone} />
        <Text style={{ color: tone }} className="ml-1 text-xs font-semibold">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
