import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { FAB, Icon, Text, useTheme } from 'react-native-paper';

/**
 * Paper FAB always runs Animated.timing({ useNativeDriver: true }) on mount.
 * On web that spams the console; use a static floating button instead.
 * The whole chip (icon + label) must be pressable.
 */
export default function AppFab({ icon, label, style, onPress, disabled, ...rest }) {
  const theme = useTheme();

  if (Platform.OS !== 'web') {
    return <FAB icon={icon} label={label} style={style} onPress={onPress} disabled={disabled} {...rest} />;
  }

  const bg = theme.dark ? theme.colors.primary : theme.colors.primaryContainer;
  const fg = theme.dark ? theme.colors.onPrimary : theme.colors.onPrimaryContainer;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label || rest.accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.webWrap,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          ...(theme.dark
            ? {
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.55,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            }
            : null),
        },
        style,
      ]}
    >
      <View style={styles.webIconWrap}>
        <Icon source={icon} size={24} color={fg} />
      </View>
      {!!label && (
        <Text variant="labelLarge" style={[styles.webLabel, { color: fg }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  webWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    cursor: 'pointer',
  },
  webIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webLabel: { paddingRight: 16, fontWeight: '600' },
});
