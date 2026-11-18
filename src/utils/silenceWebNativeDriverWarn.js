import { Platform } from 'react-native';

/**
 * react-native-paper (FAB, Drawer, …) calls Animated.timing({ useNativeDriver: true }).
 * On web there is no RCTAnimation module, so RN logs a noisy warning + setNativeProps deprecation.
 * Animations still fall back to JS; we only silence those expected messages.
 */
export function silenceWebNativeDriverWarn() {
  if (Platform.OS !== 'web' || typeof console === 'undefined') return;
  if (globalThis.__ruteroSilencedNativeDriver) return;
  globalThis.__ruteroSilencedNativeDriver = true;

  const match = (arg) => {
    const msg = typeof arg === 'string' ? arg : arg?.message || String(arg ?? '');
    return (
      msg.includes('useNativeDriver')
      || msg.includes('setNativeProps is deprecated')
    );
  };

  ['warn', 'error'].forEach((method) => {
    const original = console[method];
    if (typeof original !== 'function') return;
    console[method] = (...args) => {
      if (args.some(match)) return;
      original.apply(console, args);
    };
  });
}
