import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Dialog, Button } from './ui';
import * as Clipboard from 'expo-clipboard';
import { api, errorMessage } from '../utils/apiClient';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Código único del mes para compartir con quien vaya a conducir. Vive en la
// pantalla de rutas (no en ajustes) porque es una acción sobre "mis rutas
// de este mes", no una preferencia de cuenta.
export default function OwnerCodeDialog({ visible, onDismiss }) {
  const [monthlyCode, setMonthlyCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const resp = await api.get('/owner/codes');
      setMonthlyCode(resp.data.find((c) => c.month === currentMonth()) || null);
    } catch (err) {
      setMonthlyCode(null);
      setMessage(errorMessage(err, 'Necesitas al menos un vehículo para generar un código'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const generate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const resp = await api.post('/owner/codes', { month: currentMonth() });
      setMonthlyCode(resp.data);
    } catch (err) {
      setMessage(errorMessage(err, 'Necesitas al menos un vehículo para generar un código'));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!monthlyCode) return;
    await Clipboard.setStringAsync(monthlyCode.code);
    setMessage('Código copiado al portapapeles');
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Código para conductores</Dialog.Title>
      <Dialog.Content>
        <Text className="opacity-70 mb-3 text-onSurface dark:text-onSurface-dark">
          Comparte este código con quien vaya a conducir para ti este mes. Solo es válido durante el mes actual.
        </Text>

        {loading ? (
          <ActivityIndicator className="my-3" />
        ) : monthlyCode ? (
          <Text className="text-center tracking-[4px] font-bold text-2xl my-3 text-onSurface dark:text-onSurface-dark">
            {monthlyCode.code}
          </Text>
        ) : (
          <Text className="opacity-70 text-xs text-onSurface dark:text-onSurface-dark">
            Aún no tienes un código generado este mes.
          </Text>
        )}

        {!!message && (
          <Text className="mt-2 opacity-80 text-xs text-onSurface dark:text-onSurface-dark">{message}</Text>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button mode="text" onPress={onDismiss}>Cerrar</Button>
        {monthlyCode ? (
          <Button mode="contained" onPress={copy}>Copiar</Button>
        ) : (
          <Button mode="contained" onPress={generate} loading={generating} disabled={generating}>
            Generar
          </Button>
        )}
      </Dialog.Actions>
    </Dialog>
  );
}
