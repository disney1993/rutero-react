import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, errorMessage } from '../utils/apiClient';
import { toastError, toastSuccess } from '../utils/toast';
import {
  clearPendingInvite,
  extractInviteCode,
  getPendingInvite,
  onPendingInviteChange,
  savePendingInvite,
} from '../utils/pendingInvite';

// Una cuenta se considera "recién creada" durante este tiempo: si se registró
// desde un enlace de invitación, se une al equipo sin preguntar.
const NEW_ACCOUNT_MS = 30 * 60 * 1000;

function isNewAccount(user) {
  if (!user || user.has_owner_capability || user.has_driver_capability) return false;
  const created = Date.parse(user.created_at);
  return Number.isFinite(created) && Date.now() - created < NEW_ACCOUNT_MS;
}

function fullName(owner) {
  return [owner?.first_name, owner?.last_name].filter(Boolean).join(' ');
}

/** "16/11/2026" para un día o "11/2026" para un mes (jornadas). */
export function invitePeriod(info) {
  if ((info?.type === 'day' || info?.type === 'jornada') && info.valid_on) {
    const [y, m, d] = info.valid_on.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  if (info?.type === 'month' && info.month) {
    const [y, m] = info.month.split('-');
    return `${m}/${y}`;
  }
  return '';
}

/**
 * Enlaces de invitación (https://<api>/i/CODIGO o rutero://invite/CODIGO):
 * - Se guardan al abrir la app con ellos, haya sesión o no.
 * - Con sesión iniciada se canjean: si la cuenta se acaba de crear, el usuario
 *   pasa a ser conductor del que invitó automáticamente; si ya existía, se le
 *   pide confirmación con un toque (unirse a un equipo debe ser voluntario).
 */
export default function PendingInviteHandler() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const confirm = useConfirm();
  const [pendingCode, setPendingCode] = useState(null);
  const processing = useRef(false);

  // Captura del enlace: al arrancar la app y mientras está abierta.
  useEffect(() => {
    const capture = (url) => {
      const code = extractInviteCode(url);
      if (code) savePendingInvite(code);
    };
    Linking.getInitialURL().then(capture).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => capture(url));
    getPendingInvite().then(setPendingCode);
    const off = onPendingInviteChange(setPendingCode);
    return () => {
      sub.remove();
      off();
    };
  }, []);

  const redeem = useCallback(async (code) => {
    processing.current = true;
    try {
      let owner = null;
      let info = null;
      try {
        const resp = await api.get(`/invitations/${code}`);
        info = resp.data;
        owner = info.owner;
      } catch {
        toastError(t('invite.invalid'));
        await clearPendingInvite();
        return;
      }
      // Abrir tu propio enlace no hace nada.
      if (owner.id === user.id) {
        await clearPendingInvite();
        return;
      }

      const name = fullName(owner);
      if (!isNewAccount(user)) {
        const ok = await confirm({
          title: t('invite.confirmTitle'),
          message: t(`invite.confirmMessage_${info.type}`, { name, period: invitePeriod(info) }),
          confirmLabel: t('invite.confirmAction'),
        });
        if (!ok) {
          await clearPendingInvite();
          return;
        }
      }

      await api.post('/driver/join-code', { code });
      await clearPendingInvite();
      await refreshUser();
      toastSuccess(t('invite.joined', { name }));
    } catch (err) {
      await clearPendingInvite();
      toastError(errorMessage(err, t('invite.invalid')));
    } finally {
      processing.current = false;
    }
  }, [user, confirm, refreshUser, t]);

  // Se canjea en cuanto hay sesión y el perfil está completo (en el alta con
  // Google se piden antes el nombre y los apellidos).
  useEffect(() => {
    if (pendingCode && user && !user.profile_incomplete && !processing.current) {
      redeem(pendingCode);
    }
  }, [pendingCode, user?.id, user?.profile_incomplete, redeem]);

  return null;
}
