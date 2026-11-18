import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Linking, Pressable } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/apiClient';

const PROVIDER_COLOR = {
  google: '#1A73E8',
  nominatim: '#7A8794',
  osrm: '#3DAB7E',
};

function providerTint(key) {
  return PROVIDER_COLOR[key] || '#7A8794';
}

/** Admin-only card: which geocode backend is active + Google free-tier hints. */
export default function GeocodeStatusCard() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/geocode/status');
      setData(resp.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !data) {
    return <ActivityIndicator style={styles.loader} />;
  }
  if (!data) return null;

  const searchLabel = data.labels?.[data.active_search] || data.active_search;
  const distanceLabel = data.labels?.[data.active_distance] || data.active_distance;
  const billing = data.billing || {};

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.title}>Geocoding / mapas</Text>
        <Text variant="bodySmall" style={styles.meta}>
          Preferencia: {data.preferred} · Clave Google: {data.google_configured ? 'sí' : 'no'}
        </Text>

        <View style={styles.row}>
          <View style={[styles.pill, { backgroundColor: `${providerTint(data.active_search)}22` }]}>
            <Text variant="labelSmall" style={{ color: providerTint(data.active_search), fontWeight: '700' }}>
              Direcciones: {searchLabel}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: `${providerTint(data.active_distance)}22` }]}>
            <Text variant="labelSmall" style={{ color: providerTint(data.active_distance), fontWeight: '700' }}>
              Distancia: {distanceLabel}
            </Text>
          </View>
        </View>

        {!!billing.summary && (
          <Text variant="bodySmall" style={styles.hint}>{billing.summary}</Text>
        )}
        {!!billing.places_text_search && (
          <Text variant="bodySmall" style={styles.hint}>· {billing.places_text_search}</Text>
        )}
        {!!billing.distance_matrix && (
          <Text variant="bodySmall" style={styles.hint}>· {billing.distance_matrix}</Text>
        )}
        {!!billing.note && (
          <Text variant="bodySmall" style={styles.hint}>· {billing.note}</Text>
        )}

        <View style={styles.links}>
          {!!billing.metrics_url && (
            <Pressable onPress={() => Linking.openURL(billing.metrics_url)}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Ver uso en Google Cloud</Text>
            </Pressable>
          )}
          {!!billing.pricing_url && (
            <Pressable onPress={() => Linking.openURL(billing.pricing_url)}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Tarifas Maps</Text>
            </Pressable>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 8, borderRadius: 14 },
  loader: { marginVertical: 12 },
  title: { fontWeight: '700', marginBottom: 4 },
  meta: { opacity: 0.65, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  hint: { opacity: 0.75, marginBottom: 4, lineHeight: 18 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
});
