import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { TextInput, Card, Text, Portal, useTheme } from 'react-native-paper';

/**
 * Combobox: filters `suggestions` while typing; free text always allowed.
 * Suggestions render in a Portal so they sit above sibling fields / ScrollView.
 */
export default function AutocompleteInput({
  label,
  value,
  onChangeText,
  suggestions = [],
  onSelect,
  error,
  disabled,
  dense = false,
}) {
  const theme = useTheme();
  const wrapRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState(null);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    : suggestions;

  const showList = focused && filtered.length > 0 && !disabled;

  const measure = useCallback(() => {
    const node = wrapRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, y, width, height) => {
      if (width > 0) setAnchor({ x, y, width, height });
    });
  }, []);

  const open = () => {
    setFocused(true);
    requestAnimationFrame(measure);
  };

  const close = () => {
    setFocused(false);
    setAnchor(null);
  };

  return (
    <View ref={wrapRef} style={styles.wrap} collapsable={false}>
      <TextInput
        mode="outlined"
        dense={dense}
        label={label}
        value={value}
        onChangeText={(t) => {
          onChangeText(t);
          requestAnimationFrame(measure);
        }}
        onFocus={open}
        onBlur={() => setTimeout(close, 180)}
        error={error}
        disabled={disabled}
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
                left: anchor.x,
                width: Math.max(anchor.width, 160),
                backgroundColor: theme.colors.elevation.level3,
                ...Platform.select({
                  web: { boxShadow: '0 8px 24px rgba(0,0,0,0.18)' },
                  default: {},
                }),
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.list}
            >
              {filtered.slice(0, 10).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Text numberOfLines={1}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        </Portal>
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
  list: { maxHeight: 220 },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 12 },
});
