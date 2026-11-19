import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { api, errorMessage } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { CODE_REGEX } from '../utils/validators';
import { todayISO } from '../utils/rutas';
import { driverOwnerEntries } from '../utils/driverOwners';

function currentMonth() {
  return todayISO().slice(0, 7);
}

// Owners the driver works for: team links (permanent) plus active owner codes
// (current month or today's day code), and the join flow for an 8-character
// code (owner code or team invitation code).
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
      const [codesResp, ownersResp] = await Promise.all([
        api.get('/driver/my-codes'),
        api.get('/me/owners').catch(() => ({ data: [] })),
      ]);
      const active = driverOwnerEntries(codesResp.data || [], ownersResp.data || [], todayISO());
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
      // month se envía por compatibilidad con códigos mensuales; los de día
      // se validan en el servidor por valid_on.
      await api.post('/driver/join-code', { code, month: currentMonth() });
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
