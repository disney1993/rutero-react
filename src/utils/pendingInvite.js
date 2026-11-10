import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './apiClient';

// Invitación al equipo recibida por enlace (https://<api>/i/CODIGO o
// rutero://invite/CODIGO). Se guarda hasta que el usuario inicia sesión o se
// registra, y entonces se canjea (ver PendingInviteHandler).

const KEY = 'rutero.pendingInvite';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const listeners = new Set();

/** Enlace que se comparte en las invitaciones. */
export function inviteLink(code) {
  return `${API_BASE}/i/${code}`;
}

/** Extrae el código de 8 caracteres de un enlace de invitación, o null. */
export function extractInviteCode(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:\/i\/|invite\/)([A-Za-z0-9]{8})(?=$|[/?#])/);
  return m ? m[1].toUpperCase() : null;
}

function emit(code) {
  listeners.forEach((fn) => fn(code));
}

/** Suscripción a cambios (guardar/borrar); devuelve la función para anularla. */
export function onPendingInviteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function savePendingInvite(code) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ code, savedAt: Date.now() }));
  emit(code);
}

export async function getPendingInvite() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const { code, savedAt } = JSON.parse(raw);
    if (!code || Date.now() - savedAt > MAX_AGE_MS) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export async function clearPendingInvite() {
  await AsyncStorage.removeItem(KEY);
  emit(null);
}
