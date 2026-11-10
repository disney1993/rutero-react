import React, { useState } from 'react';
import { ScrollView, View, Text, Share, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, IconButton, PageContainer, StatusBadge, Icon, cn } from './ui';
import PersonAvatar from './ui/PersonAvatar';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useTeam, teamMemberName } from '../hooks/useTeam';
import { isValidEmail } from '../utils/validators';
import { toastError, toastSuccess } from '../utils/toast';
import { inviteLink } from '../utils/pendingInvite';

// Enlace opcional para descargar la app (EAS / tienda), configurable por entorno.
const DOWNLOAD_URL = Constants.expoConfig?.extra?.downloadUrl || '';

function shortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Equipo del propietario: conductores vinculados (con su consentimiento) a
// los que puede asignar viajes, e invitaciones pendientes. Se muestra en la
// pestaña "Conductores" de la pantalla Flota.
export default function TeamManager() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const team = useTeam();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];

  // Conductor predeterminado: se propone al crear viajes (como el vehículo).
  // Tocar la estrella del que ya lo es lo desmarca (los viajes vuelven a ser "Yo").
  const toggleDefault = async (link) => {
    try {
      await api.patch(`/team/${link.id}`, { is_default: !link.is_default });
      toastSuccess(link.is_default ? t('team.defaultUnset') : t('team.defaultSet', { name: teamMemberName(link) }));
      team.reload();
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    }
  };

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const emailError = emailTouched && !isValidEmail(email) ? t('validation.invalidEmail') : '';
  const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  const downloadLine = DOWNLOAD_URL ? `\n\n${t('team.downloadLine', { url: DOWNLOAD_URL })}` : '';

  // Abre la hoja de compartir del sistema (WhatsApp, Telegram, SMS, correo...)
  // con el código de una invitación ya creada.
  const shareInvite = async (link) => {
    const message = t('team.shareMessage', {
      name: ownerName,
      code: link.invite_code,
      link: inviteLink(link.invite_code),
      date: shortDate(link.expires_at),
    }) + downloadLine;
    try {
      await Share.share(
        { message, title: t('team.shareSubject') },
        { subject: t('team.shareSubject'), dialogTitle: t('team.shareDialogTitle') }
      );
    } catch {
      // Hoja cerrada o sin apps para compartir: el código sigue en la lista.
    }
  };

  // Cada código sirve a una sola persona: se crea uno nuevo en cada envío.
  const createAndShare = async () => {
    setSharing(true);
    try {
      const resp = await api.post('/team/invitations', { type: 'link' });
      await team.reload();
      await shareInvite(resp.data);
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setSharing(false);
    }
  };

  // Registra la invitación en Rutero (la verá al entrar con ese email) y abre
  // la app de correo del móvil con el mensaje ya redactado.
  const inviteByEmail = async () => {
    setEmailTouched(true);
    if (!isValidEmail(email)) return;
    setInviting(true);
    const to = email.trim();
    try {
      await api.post('/team/invitations', { type: 'email', email: to });
      team.reload();
      setEmail('');
      setEmailTouched(false);
      const subject = encodeURIComponent(t('team.shareSubject'));
      const body = encodeURIComponent(t('team.emailBody', { name: ownerName, email: to }) + downloadLine);
      try {
        await Linking.openURL(`mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`);
        toastSuccess(t('team.invitationSent'));
      } catch {
        toastSuccess(t('team.invitationSentNoMail'));
      }
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setInviting(false);
    }
  };

  const copyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    toastSuccess(t('team.codeCopied'));
  };

  const remove = async (link) => {
    const isPending = link.status === 'pending';
    const ok = await confirm({
      title: isPending ? t('team.cancelInvitation') : t('team.removeTitle'),
      message: isPending ? t('team.cancelInvitationConfirm') : t('team.removeConfirm', { name: teamMemberName(link) }),
      confirmLabel: isPending ? t('team.cancelInvitation') : t('team.remove'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/team/${link.id}`);
      team.reload();
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    }
  };

  return (
    <ScrollView
      className="bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={team.loading && team.links.length > 0} onRefresh={team.reload} />}
    >
      <PageContainer className="px-3 pt-2">
        <Text className="mb-3 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('team.intro')}</Text>

        <Card className="mb-4">
          <Card.Content>
            <Text className="font-bold mb-1 text-onSurface dark:text-onSurface-dark">{t('team.inviteTitle')}</Text>
            <Text className="text-xs mb-3 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('team.shareHint')}</Text>
            <Button mode="contained" icon="share-variant" loading={sharing} onPress={createAndShare}>
              {t('team.shareInvite')}
            </Button>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-border dark:bg-border-dark" />
              <Text className="mx-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('team.orByEmail')}</Text>
              <View className="flex-1 h-px bg-border dark:bg-border-dark" />
            </View>

            <Input
              label={t('team.emailLabel')}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="conductor@ejemplo.com"
              error={emailError}
            />
            <Text className="text-xs mb-2 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('team.emailHint')}</Text>
            <Button mode="outlined" icon="email-outline" loading={inviting} onPress={inviteByEmail}>
              {t('team.sendByEmail')}
            </Button>
          </Card.Content>
        </Card>

        <Text className="font-bold mb-2 text-onSurface dark:text-onSurface-dark">
          {t('team.membersTitle', { count: team.active.length })}
        </Text>
        {team.loading && team.links.length === 0 && <ActivityIndicator className="my-4" />}
        {!team.loading && team.active.length === 0 && (
          <Text className="mb-4 opacity-60 text-onSurface dark:text-onSurface-dark">{t('team.empty')}</Text>
        )}
        {team.active.map((link) => (
          <Card
            key={link.id}
            className={cn('mb-2', link.is_default && 'border border-primary dark:border-primary-dark')}
          >
            <Card.Content className="flex-row items-center">
              <PersonAvatar person={link.driver} size={40} />
              <View className="flex-1 ml-3">
                <View className="flex-row items-center gap-2">
                  <Text numberOfLines={1} className="shrink font-medium text-onSurface dark:text-onSurface-dark">{teamMemberName(link)}</Text>
                  {link.is_default && (
                    <View style={{ backgroundColor: c.primary }} className="flex-row items-center rounded-full pl-1.5 pr-2 py-0.5">
                      <Icon name="star" size={11} color={c.onPrimary} />
                      <Text className="ml-1 text-[10px] font-semibold text-onPrimary dark:text-onPrimary-dark">{t('vehicles.default')}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {t('team.memberSince', { date: shortDate(link.accepted_at) })}
                </Text>
              </View>
              <IconButton
                icon={link.is_default ? 'star' : 'star-outline'}
                iconColor={link.is_default ? c.primary : undefined}
                onPress={() => toggleDefault(link)}
                accessibilityLabel={link.is_default ? t('team.unsetDefault') : t('team.setDefault')}
              />
              <IconButton icon="account-remove-outline" onPress={() => remove(link)} accessibilityLabel={t('team.remove')} />
            </Card.Content>
          </Card>
        ))}
        {team.active.length > 0 && (
          <Text className="mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('team.defaultHint')}</Text>
        )}

        {team.pending.length > 0 && (
          <Text className="font-bold mt-4 mb-2 text-onSurface dark:text-onSurface-dark">{t('team.pendingTitle')}</Text>
        )}
        {team.pending.map((link) => (
          <Card key={link.id} className="mb-2">
            <Card.Content>
              <View className="flex-row items-center">
                <View className="flex-1">
                  {link.invite_code ? (
                    <>
                      <Text selectable className="text-lg font-bold tracking-widest text-onSurface dark:text-onSurface-dark">
                        {link.invite_code}
                      </Text>
                      <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                        {t('team.codeExpires', { date: shortDate(link.expires_at) })}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-onSurface dark:text-onSurface-dark">{link.invited_email}</Text>
                      <View className="mt-1 self-start">
                        <StatusBadge tone="tertiary">{t('team.awaiting')}</StatusBadge>
                      </View>
                    </>
                  )}
                </View>
                {!!link.invite_code && (
                  <>
                    <IconButton icon="content-copy" onPress={() => copyCode(link.invite_code)} accessibilityLabel={t('team.copy')} />
                    <IconButton icon="share-variant" onPress={() => shareInvite(link)} accessibilityLabel={t('team.share')} />
                  </>
                )}
                <IconButton icon="close" onPress={() => remove(link)} accessibilityLabel={t('team.cancelInvitation')} />
              </View>
            </Card.Content>
          </Card>
        ))}
      </PageContainer>
    </ScrollView>
  );
}
