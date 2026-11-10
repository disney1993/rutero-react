import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/apiClient';
import { getPendingInvite, onPendingInviteChange } from '../utils/pendingInvite';
import { invitePeriod } from './PendingInviteHandler';

// Aviso en el inicio de sesión y el registro cuando la app se abrió desde un
// enlace de invitación: explica que al entrar se unirá al equipo.
export default function PendingInviteBanner() {
  const { t } = useTranslation();
  const [code, setCode] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getPendingInvite().then(setCode);
    return onPendingInviteChange(setCode);
  }, []);

  useEffect(() => {
    if (!code) {
      setInfo(null);
      return;
    }
    api.get(`/invitations/${code}`)
      .then((resp) => setInfo(resp.data))
      .catch(() => setInfo(null));
  }, [code]);

  if (!code || !info) return null;
  const name = [info.owner.first_name, info.owner.last_name].filter(Boolean).join(' ');

  return (
    <View className="rounded-2xl px-4 py-3 mb-4 bg-primary/10 dark:bg-primary-dark/20">
      <Text className="font-bold text-onSurface dark:text-onSurface-dark">{t(`invite.bannerTitle_${info.type}`, { name, period: invitePeriod(info) })}</Text>
      <Text className="mt-0.5 text-sm text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('invite.bannerText')}</Text>
    </View>
  );
}
