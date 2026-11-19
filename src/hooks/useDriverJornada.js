import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { CODE_REGEX } from '../utils/validators';

// Propietarios para los que conduce el usuario (su equipo) y el campo para
// canjear a mano el código de una invitación al equipo.
export function useDriverJornada({ enabled = true } = {}) {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);

  const loadEntries = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      setLoaded(true);
      return;
    }
    setLoading(true);
    try {
      const resp = await api.get('/me/owners');
      // Misma forma que tenían las entradas de código, que usan las pantallas.
      const active = (resp.data || []).map((l) => ({
        id: `team-${l.id}`,
        team: true,
        owner_month_code: { owner_id: l.owner_id, owner: l.owner, type: 'team' },
      }));
      setEntries(active);
      setSelectedOwnerId((prev) => {
        if (prev && active.some((e) => e.owner_month_code.owner_id === prev)) return prev;
        return active[0]?.owner_month_code.owner_id ?? null;
      });
    } catch (err) {
      setJoinMessage(errorMessage(err, t('driver.codesLoadError')));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [enabled, t]);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

  const join = async () => {
    setCodeError('');
    const code = codeInput.trim().toUpperCase();
    if (!CODE_REGEX.test(code)) {
      setCodeError(t('driver.codeFormat'));
      return false;
    }
    setJoining(true);
    try {
      await api.post('/driver/join-code', { code });
      setCodeInput('');
      setJoinMessage(t('driver.joined'));
      await refreshUser();
      await loadEntries();
      return true;
    } catch (err) {
      setJoinMessage(errorMessage(err, t('driver.invalidCode')));
      return false;
    } finally {
      setJoining(false);
    }
  };

  return {
    entries,
    loading,
    loaded,
    hasJoined: entries.length > 0,
    codeInput,
    setCodeInput,
    joining,
    codeError,
    joinMessage,
    selectedOwnerId,
    setSelectedOwnerId,
    join,
    reload: loadEntries,
  };
}
