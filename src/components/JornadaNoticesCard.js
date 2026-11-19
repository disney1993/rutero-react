import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Card, Button } from './ui';
import { api, errorMessage } from '../utils/apiClient';
import { toastError } from '../utils/toast';

function dmy(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Jornadas que le han asignado al conductor (de hoy en adelante). Marcar
 * "Visto" queda registrado: el propietario ve que el conductor se enteró.
 */
export default function JornadaNoticesCard({ className = 'mb-4' }) {
  const { t } = useTranslation();
  const [jornadas, setJornadas] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/me/jornadas')
      .then((resp) => setJornadas(resp.data || []))
      .catch(() => setJornadas([]));
  }, []);

  useFocusEffect(load);

  const markSeen = async (j) => {
    setBusyId(j.id);
    try {
      const resp = await api.post(`/me/jornadas/${j.id}/seen`);
      setJornadas((list) => list.map((x) => (x.id === j.id ? { ...x, seen_at: x.seen_at || new Date().toISOString() } : x)));
      return resp;
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
      return null;
    } finally {
      setBusyId(null);
    }
  };

  if (jornadas.length === 0) return null;

  return (
    <Card className={className}>
      <Card.Content>
        <Text className="font-bold mb-1 text-onSurface dark:text-onSurface-dark">{t('jornadas.myTitle')}</Text>
        {jornadas.map((j) => (
          <View key={j.id} className="flex-row items-center py-2 border-b border-border dark:border-border-dark">
            <Text className="flex-1 text-onSurface dark:text-onSurface-dark">
              {t('jornadas.myText', {
                name: [j.owner?.first_name, j.owner?.last_name].filter(Boolean).join(' '),
                label: j.label,
                date: dmy(j.date),
              })}
            </Text>
            {j.seen_at ? (
              <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('jornadas.seen')}</Text>
            ) : (
              <Button compact mode="contained" loading={busyId === j.id} disabled={!!busyId} onPress={() => markSeen(j)}>
                {t('jornadas.markSeen')}
              </Button>
            )}
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}
