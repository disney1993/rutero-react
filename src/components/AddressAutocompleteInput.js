import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Dimensions } from 'react-native';
import { TextInput, Card, Text, ActivityIndicator, Portal, HelperText, useTheme } from 'react-native-paper';
import { api } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';

const DEBOUNCE_MS = 400;

function minCharsForQuery(value) {
  const trimmed = value.trim();
  if (/^\d{4,5}$/.test(trimmed)) return 4;
  return 3;
}

/**
 * Address / postcode search via backend. Suggestions use Portal so they
 * overlay the form instead of sitting under the next fields.
 */
export default function AddressAutocompleteInput({
  label,
  value,
  onChangeText,
  onSelectPlace,
  error,
  dense = true,
}) {
  const theme = useTheme();
  const { isAdmin } = useAuth();
  const wrapRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const [lastProvider, setLastProvider] = useState(null);
  const timeoutRef = useRef(null);
  const requestIdRef = useRef(0);

  const measure = useCallback(() => {
    const node = wrapRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, y, width, height) => {
      if (width > 0) setAnchor({ x, y, width, height });
    });
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmed = (value || '').trim();
    const minChars = minCharsForQuery(trimmed);

    if (!trimmed || trimmed.length < minChars) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const resp = await api.get('/geocode/search', { params: { q: trimmed } });
        if (requestId === requestIdRef.current) {
          setSuggestions(Array.isArray(resp.data) ? resp.data : []);
          const fromBody = Array.isArray(resp.data) && resp.data[0]?.provider;
          const fromHeader = resp.headers?.['x-geocode-provider'] || resp.headers?.['X-Geocode-Provider'];
          setLastProvider(fromBody || fromHeader || null);
          requestAnimationFrame(measure);
        }
      } catch (err) {
        if (requestId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [value, measure]);

  const open = () => {
    setFocused(true);
    requestAnimationFrame(measure);
  };

  const close = () => {
    setFocused(false);
    setAnchor(null);
  };

  const handleSelect = (place) => {
    onSelectPlace(place);
    setSuggestions([]);
    close();
  };

  const showList = focused && (suggestions.length > 0 || loading);

  return (
    <View ref={wrapRef} style={styles.wrap} collapsable={false}>
      <TextInput
        mode="outlined"
        dense={dense}
        label={label}
        value={value ?? ''}
        onChangeText={(t) => {
          onChangeText(t);
          requestAnimationFrame(measure);
        }}
        onFocus={open}
        onBlur={() => setTimeout(close, 180)}
        error={error}
        placeholder="Calle, ciudad o CP"
        right={loading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : <TextInput.Icon icon="map-marker-outline" />}
        style={styles.input}
      />

      {showList && anchor ? (
        <Portal>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Cerrar sugerencias" />
          <Card
            style={[
              styles.suggestions,
              {
                top: anchor.y + anchor.height + 2,
                left: Math.min(
                  anchor.x,
                  Dimensions.get('window').width - Math.max(anchor.width, 240) - 8
                ),
                width: Math.max(anchor.width, 240),
                backgroundColor: theme.colors.elevation.level3,
                ...Platform.select({
                  web: { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
                  default: {},
                }),
              },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.list}>
              {suggestions.length === 0 ? (
                <Text style={styles.emptyItem}>
                  {loading ? 'Buscando en España...' : 'Sin resultados. Puedes escribirla igual.'}
                </Text>
              ) : (
                suggestions.map((place, idx) => (
                  <Pressable
                    key={`${place.lat}-${place.lon}-${idx}`}
                    onPress={() => handleSelect(place)}
                    style={({ pressed }) => [
                      styles.suggestionItem,
                      pressed && { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Text numberOfLines={2}>{place.display_name}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Card>
        </Portal>
      ) : null}

      {isAdmin && lastProvider ? (
        <HelperText type="info" visible style={styles.providerHint}>
          Proveedor: {lastProvider === 'google' ? 'Google Places' : lastProvider === 'nominatim' ? 'Nominatim (OSM)' : lastProvider}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 1 },
  input: { marginBottom: 4 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  suggestions: {
    position: 'absolute',
    zIndex: 1001,
    elevation: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  list: { maxHeight: 260 },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12 },
  emptyItem: { paddingHorizontal: 14, paddingVertical: 12, opacity: 0.6 },
  providerHint: { marginTop: -2, marginBottom: 2, paddingHorizontal: 0 },
});
