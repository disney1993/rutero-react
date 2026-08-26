import axios from 'axios';
import Constants from 'expo-constants';

export const API_BASE = Constants.expoConfig?.extra?.apiBase || 'http://127.0.0.1:8000';

export const api = axios.create({ baseURL: `${API_BASE}/api` });

let currentToken = null;

export function setAuthToken(token) {
  currentToken = token;
}

api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

export function errorMessage(err, fallback = 'Ocurrió un error inesperado') {
  return err.response?.data?.message || fallback;
}
