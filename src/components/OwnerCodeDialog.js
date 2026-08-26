import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Dialog, Text, Button, ActivityIndicator } from 'react-native-paper';
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
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Código para conductores</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.hint}>
            Comparte este código con quien vaya a conducir para ti este mes. Solo es válido durante el mes actual.
          </Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : monthlyCode ? (
            <Text variant="displaySmall" style={styles.codeText}>{monthlyCode.code}</Text>
          ) : (
            <Text variant="bodySmall" style={styles.hint}>Aún no tienes un código generado este mes.</Text>
          )}

          {!!message && <Text variant="bodySmall" style={styles.message}>{message}</Text>}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cerrar</Button>
          {monthlyCode ? (
            <Button mode="contained" onPress={copy}>Copiar</Button>
          ) : (
            <Button mode="contained" onPress={generate} loading={generating} disabled={generating}>
              Generar
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  hint: { opacity: 0.7, marginBottom: 12 },
  loader: { marginVertical: 12 },
  codeText: { textAlign: 'center', letterSpacing: 4, fontWeight: '700', marginVertical: 12 },
  message: { marginTop: 8, opacity: 0.8 },
});
