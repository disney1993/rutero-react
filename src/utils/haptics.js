import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Respuesta háptica centralizada: un único sitio decide si vibrar, así el
// usuario puede desactivarla desde Ajustes y en web no se llama a nada.
//
// Ojo: el aviso de cierre automático de viajes NO debe vibrar (no invitar a
// tocar el móvil al volante), por eso AutoCompleteNotice no usa este módulo.
const STORAGE_KEY = 'rutero.hapticsEnabled';
const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let enabled = true;
const listeners = new Set();

export async function loadHapticsPreference() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'false') enabled = false;
  } catch {
    // Sin almacenamiento: se queda activada por defecto.
  }
}

export function isHapticsEnabled() {
  return enabled;
}

export function setHapticsEnabled(next) {
  enabled = next;
  listeners.forEach((fn) => fn(next));
  AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
}

export function subscribeHaptics(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function run(fn) {
  if (!SUPPORTED || !enabled) return;
  fn().catch(() => {});
}

export const haptics = {
  // Cambio de pestaña / selección en segmentados y chips.
  selection: () => run(() => Haptics.selectionAsync()),
  // Pulsación de botones normales.
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // Acciones principales (FAB, guardar).
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  // Pulsación larga.
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
