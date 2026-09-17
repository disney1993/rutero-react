import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Input, Card } from './ui';

// Combobox simple: filtra `suggestions` mientras se escribe, se puede
// elegir una o simplemente seguir escribiendo texto libre si no aparece
// en la lista (por eso nunca se bloquea el valor a las sugerencias).
export default function AutocompleteInput({ label, value, onChangeText, suggestions = [], onSelect, error, disabled }) {
  const [focused, setFocused] = useState(false);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    : suggestions;

  const showList = focused && filtered.length > 0 && !disabled;

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        error={error}
        editable={!disabled}
      />
      {showList && (
        <Card
          style={{ position: 'absolute', top: 58, left: 0, right: 0, zIndex: 20, elevation: 6, maxHeight: 220 }}
        >
          {filtered.slice(0, 8).map((item) => (
            <Pressable key={item} onPress={() => { onSelect(item); setFocused(false); }}>
              <Text className="px-4 py-2.5 text-onSurface dark:text-onSurface-dark">{item}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );
}
