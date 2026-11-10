import { useCallback, useEffect, useState } from 'react';
import { ALL_JORNADAS, VIRTUAL_JORNADA } from '../utils/jornadas';
import { api } from '../utils/apiClient';

/**
 * Jornadas del propietario para un día (GET /jornadas?date=). Un día sin
 * jornadas se muestra como una "Jornada 1" virtual: `ensureFirst()` la crea
 * de verdad cuando hace falta (compartirla, asignarle conductor...). La
 * primera jornada adopta en el servidor los viajes del día sin jornada.
 */
export function useJornadas({ date, enabled = true }) {
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled || !date) {
      setJornadas([]);
      return [];
    }
    setLoading(true);
    try {
      const resp = await api.get('/jornadas', { params: { date } });
      setJornadas(resp.data || []);
      return resp.data || [];
    } catch {
      setJornadas([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [date, enabled]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (attrs = {}) => {
    const resp = await api.post('/jornadas', { date, ...attrs });
    await reload();
    return resp.data;
  }, [date, reload]);

  /** Devuelve la primera jornada del día, creándola si el día aún no tiene. */
  const ensureFirst = useCallback(async () => {
    if (jornadas.length > 0) return jornadas[0];
    return create();
  }, [jornadas, create]);

  const update = useCallback(async (id, attrs) => {
    const resp = await api.patch(`/jornadas/${id}`, attrs);
    await reload();
    return resp.data;
  }, [reload]);

  const remove = useCallback(async (id) => {
    await api.delete(`/jornadas/${id}`);
    await reload();
  }, [reload]);

  const regenerateCode = useCallback(async (id) => {
    const resp = await api.post(`/jornadas/${id}/code`);
    await reload();
    return resp.data;
  }, [reload]);

  return { jornadas, loading, reload, create, ensureFirst, update, remove, regenerateCode };
}

/**
 * Jornada elegida en una pantalla (Rutas, Calendario) y lo que se deriva de
 * ella: filtro de viajes, datos extra al crear y valores propuestos al
 * formulario. Con varias jornadas se ven "Todas" por defecto; con una (o la
 * virtual), esa.
 */
export function useJornadaSelection(jornadasApi, date) {
  const { jornadas } = jornadasApi;
  const [selected, setSelected] = useState(null);
  useEffect(() => { setSelected(null); }, [date]);

  const effective = jornadas.length === 0
    ? VIRTUAL_JORNADA
    : (selected === ALL_JORNADAS || jornadas.some((j) => j.id === selected))
      ? selected
      : (jornadas.length > 1 ? ALL_JORNADAS : jornadas[0].id);
  const active = jornadas.find((j) => j.id === effective) || null;
  const firstId = jornadas[0]?.id;

  return {
    selected: effective,
    setSelected,
    active,
    // Los viajes sin jornada pertenecen a la primera del día.
    includes: (ruta) => !active || ruta.jornada_id === active.id || (ruta.jornada_id == null && active.id === firstId),
    createExtra: active ? { jornada_id: active.id } : {},
    formDefaults: active ? { jornada_id: active.id, driver_id: active.driver_id, vehicle_id: active.vehicle_id } : null,
  };
}
