import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Pista del gesto "deslizar para eliminar": se enseña como mucho MAX_SHOWS
// veces y nunca más en cuanto el usuario ha hecho el gesto por sí mismo.
const MAX_SHOWS = 3;

export function useSwipeHint(storageKey) {
  const state = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => { state.current = raw ? JSON.parse(raw) : { shown: 0, learned: false }; })
      .catch(() => { state.current = { shown: 0, learned: false }; })
      .finally(() => setReady(true));
  }, [storageKey]);

  const save = () => AsyncStorage.setItem(storageKey, JSON.stringify(state.current)).catch(() => {});

  // ¿Toca enseñarla ahora? Si sí, cuenta como una vez mostrada.
  const consume = useCallback(() => {
    const s = state.current;
    if (!s || s.learned || s.shown >= MAX_SHOWS) return false;
    s.shown += 1;
    save();
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markLearned = useCallback(() => {
    const s = state.current;
    if (!s || s.learned) return;
    s.learned = true;
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready, consume, markLearned };
}
