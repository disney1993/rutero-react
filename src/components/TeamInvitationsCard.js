import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input } from './ui';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { toastError, toastSuccess } from '../utils/toast';
import { CODE_REGEX } from '../utils/validators';
import { isOwnerCapable } from '../utils/capabilities';

function ownerName(owner) {
  if (!owner) return '';
  return [owner.first_name, owner.last_name].filter(Boolean).join(' ');
}

// Invitaciones al equipo de un propietario recibidas por email y, para quien
// aún no tiene flota ni equipo (recién registrado), un campo para canjear el
// código que le llegó por WhatsApp, Telegram, etc. No aparece si no aplica.
export default function TeamInvitationsCard({ onChanged, className = 'mb-4' }) {
  const { t } = useTranslation();
  const { user, isAdmin, refreshUser } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);
  // En modo conductor el campo "Código" ya está en Rutas; un propietario puede
  // cambiar a modo conductor. Solo el usuario nuevo no tendría dónde escribirlo.
  const showJoin = !isAdmin && !isOwnerCapable(user, isAdmin) && !user?.has_driver_capability;

  const joinWithCode = async () => {
    const value = code.trim().toUpperCase();
    if (!CODE_REGEX.test(value)) {
      setCodeError(t('driver.codeFormat'));
      return;
    }
    setCodeError('');
    setJoining(true);
    try {
      await api.post('/driver/join-code', { code: value });
      setCode('');
      toastSuccess(t('team.joinedWithCode'));
      await refreshUser();
      onChanged?.();
    } catch (err) {
      setCodeError(errorMessage(err, t('driver.invalidCode')));
    } finally {
      setJoining(false);
    }
  };

  const load = useCallback(() => {
    api.get('/me/invitations')
      .then((resp) => setInvitations(resp.data || []))
      .catch(() => setInvitations([]));
  }, []);

  useFocusEffect(load);

  const respond = async (inv, action) => {
    setBusyId(inv.id);
    try {
      await api.post(`/me/invitations/${inv.id}/${action}`);
      toastSuccess(action === 'accept' ? t('team.accepted', { name: ownerName(inv.owner) }) : t('team.rejected'));
      setInvitations((list) => list.filter((i) => i.id !== inv.id));
      if (action === 'accept') await refreshUser();
      onChanged?.();
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setBusyId(null);
    }
  };

  if (invitations.length === 0 && !showJoin) return null;

  return (
    <Card className={className}>
      <Card.Content>
        {invitations.length > 0 && (
          <Text className="font-bold mb-1 text-onSurface dark:text-onSurface-dark">{t('team.invitationsTitle')}</Text>
        )}
        {invitations.map((inv) => (
          <View key={inv.id} className="py-2 border-b border-border dark:border-border-dark">
            <Text className="text-onSurface dark:text-onSurface-dark">
              {t('team.invitationText', { name: ownerName(inv.owner) })}
            </Text>
            <View className="flex-row gap-2 mt-2">
              <Button compact mode="contained" loading={busyId === inv.id} disabled={!!busyId} onPress={() => respond(inv, 'accept')}>
                {t('team.accept')}
              </Button>
              <Button compact mode="outlined" disabled={!!busyId} onPress={() => respond(inv, 'reject')}>
                {t('team.reject')}
              </Button>
            </View>
          </View>
        ))}
        {showJoin && (
          <View className={invitations.length > 0 ? 'mt-3' : ''}>
            <Text className="font-bold mb-1 text-onSurface dark:text-onSurface-dark">{t('team.haveCodeTitle')}</Text>
            <Text className="text-xs mb-2 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('team.haveCodeHint')}</Text>
            <View className="flex-row gap-2 items-start">
              <Input
                className="flex-1"
                value={code}
                onChangeText={(v) => { setCode(v.toUpperCase()); setCodeError(''); }}
                placeholder="ABCD1234"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                error={codeError}
              />
              <Button mode="contained" loading={joining} disabled={joining} onPress={joinWithCode} className="mt-1">
                {t('team.join')}
              </Button>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}
