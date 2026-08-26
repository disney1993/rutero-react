import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { api } from '../utils/apiClient';

const DEBOUNCE_MS = 450;
const MIN_CHARS = 3;

// Busca direcciones reales de España vía el backend (que a su vez consulta
// Nominatim/OSM). Si no se encuentra o no se elige ninguna sugerencia, el
// texto se guarda igual como dirección libre — solo que sin coordenadas,
// por lo que no se podrá calcular la distancia automáticamente para ese
// tramo (se puede introducir el km a mano).
export default function AddressAutocompleteInput({ label, value, onChangeText, onSelectPlace, error }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const timeoutRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!value || value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const resp = await api.get('/geocode/search', { params: { q: value.trim() } });
        if (requestId === requestIdRef.current) setSuggestions(resp.data);
      } catch (err) {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [value]);

  const handleSelect = (place) => {
    onSelectPlace(place);
    setSuggestions([]);
    setFocused(false);
  };

  const showList = focused && (suggestions.length > 0 || loading);

  return (
    <View style={styles.wrap}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        error={error}
        right={loading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : <TextInput.Icon icon="map-marker-outline" />}
        style={styles.input}
      />
      {showList && (
        <Card style={[styles.suggestions, { backgroundColor: theme.colors.elevation.level3 }]}>
          {suggestions.length === 0 ? (
            <Text style={styles.emptyItem}>{loading ? 'Buscando...' : 'Sin resultados. Puedes escribirla igual.'}</Text>
          ) : (
            suggestions.map((place, idx) => (
              <Text key={idx} style={styles.suggestionItem} onPress={() => handleSelect(place)} numberOfLines={2}>
                {place.display_name}
              </Text>
            ))
          )}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  input: { marginBottom: 4 },
  suggestions: { position: 'absolute', top: 58, left: 0, right: 0, zIndex: 20, elevation: 6, borderRadius: 8, maxHeight: 260 },
  suggestionItem: { paddingHorizontal: 16, paddingVertical: 10 },
  emptyItem: { paddingHorizontal: 16, paddingVertical: 10, opacity: 0.6 },
});
