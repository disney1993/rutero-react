import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '../i18n';

const CONFIGURED_BASE = Constants.expoConfig?.extra?.apiBase || 'http://127.0.0.1:8000';

// En un móvil/emulador "127.0.0.1" es el propio dispositivo, no el PC con la
// API. En desarrollo reutilizamos la IP del equipo que sirve Metro (hostUri,
// p. ej. "192.168.1.133:8081") para que funcione igual en emulador Android,
// móvil físico o iPhone sin tocar la configuración.
function resolveApiBase() {
  if (Platform.OS === 'web' || !__DEV__) return CONFIGURED_BASE;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!devHost) return CONFIGURED_BASE;
  return CONFIGURED_BASE.replace(/\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, `//${devHost}`);
}

export const API_BASE = resolveApiBase();

export const api = axios.create({ baseURL: `${API_BASE}/api` });

let currentToken = null;

export function setAuthToken(token) {
  currentToken = token;
}

api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  // La API puede responder sus mensajes en el idioma de la app.
  config.headers['Accept-Language'] = i18n.language;
  return config;
});

let onUnauthorized = null;

/** Lo registra AuthContext: qué hacer cuando la API ya no acepta el token. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Token caducado o revocado: se cierra la sesión en vez de dejar la app con
// "Unauthenticated." en cada pantalla. Solo cuenta si la petición llevaba el
// token actual, para que una respuesta antigua no cierre una sesión nueva.
api.interceptors.response.use(undefined, (err) => {
  const sent = err.config?.headers?.Authorization;
  if (err.response?.status === 401 && currentToken && sent === `Bearer ${currentToken}`) {
    currentToken = null;
    onUnauthorized?.();
  }
  return Promise.reject(err);
});

export function errorMessage(err, fallback) {
  // Mensaje de Laravel para un token no válido; el login fallido trae el suyo.
  if (err.response?.status === 401 && err.response.data?.message === 'Unauthenticated.') {
    return i18n.t('auth.sessionExpired');
  }
  return err.response?.data?.message || fallback || i18n.t('common.unexpectedError');
}
