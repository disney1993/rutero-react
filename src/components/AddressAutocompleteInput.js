import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Input, Card } from './ui';
import { api } from '../utils/apiClient';

const DEBOUNCE_MS = 450;
const MIN_CHARS = 3;

// Busca direcciones reales de España vía el backend (que a su vez consulta
// Nominatim/OSM). Si no se encuentra o no se elige ninguna sugerencia, el
// texto se guarda igual como dirección libre — solo que sin coordenadas,
// por lo que no se podrá calcular la distancia automáticamente para ese
// tramo (se puede introducir el km a mano).
export default function AddressAutocompleteInput({ label, value, onChangeText, onSelectPlace, error }) {
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
    <View style={{ position: 'relative', zIndex: 10 }}>
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        error={error}
        right={loading ? undefined : 'map-marker-outline'}
      />
      {loading && (
        <View style={{ position: 'absolute', right: 12, top: 12 }}>
          <ActivityIndicator size={16} />
        </View>
      )}
      {showList && (
        <Card
          style={{ position: 'absolute', top: 58, left: 0, right: 0, zIndex: 20, elevation: 6, maxHeight: 260 }}
        >
          {suggestions.length === 0 ? (
            <Text className="px-4 py-2.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {loading ? 'Buscando...' : 'Sin resultados. Puedes escribirla igual.'}
            </Text>
          ) : (
            suggestions.map((place, idx) => (
              <Pressable key={idx} onPress={() => handleSelect(place)}>
                <Text numberOfLines={2} className="px-4 py-2.5 text-onSurface dark:text-onSurface-dark">
                  {place.display_name}
                </Text>
              </Pressable>
            ))
          )}
        </Card>
      )}
    </View>
  );
}
