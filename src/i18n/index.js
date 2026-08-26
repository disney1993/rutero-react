import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import es from './locales/es.json';
import en from './locales/en.json';

const STORAGE_KEY = 'rutero.language';

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// Solo español/inglés por ahora; el resto de la app aún está en español fijo
// y se irá traduciendo por pantallas.
export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export async function loadPersistedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && saved !== i18n.language) await i18n.changeLanguage(saved);
  } catch (e) {
    // Si falla, se queda en el idioma por defecto.
  }
}

export async function changeLanguage(lang) {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    // No crítico: el idioma seguirá aplicado en esta sesión aunque no se persista.
  }
}

export default i18n;
