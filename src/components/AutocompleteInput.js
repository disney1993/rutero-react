import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Card, Text, useTheme } from 'react-native-paper';

// Combobox simple: filtra `suggestions` mientras se escribe, se puede
// elegir una o simplemente seguir escribiendo texto libre si no aparece
// en la lista (por eso nunca se bloquea el valor a las sugerencias).
export default function AutocompleteInput({ label, value, onChangeText, suggestions = [], onSelect, error, disabled }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    : suggestions;

  const showList = focused && filtered.length > 0 && !disabled;

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
        disabled={disabled}
        style={styles.input}
      />
      {showList && (
        <Card style={[styles.suggestions, { backgroundColor: theme.colors.elevation.level3 }]}>
          {filtered.slice(0, 8).map((item) => (
            <Text
              key={item}
              style={styles.suggestionItem}
              onPress={() => { onSelect(item); setFocused(false); }}
            >
              {item}
            </Text>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  input: { marginBottom: 4 },
  suggestions: { position: 'absolute', top: 58, left: 0, right: 0, zIndex: 20, elevation: 6, borderRadius: 8, maxHeight: 220 },
  suggestionItem: { paddingHorizontal: 16, paddingVertical: 10 },
});
