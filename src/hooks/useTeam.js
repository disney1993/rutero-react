import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../utils/apiClient';

/** Nombre visible de un miembro del equipo: alias, nombre o email invitado. */
export function teamMemberName(link) {
  if (!link) return '';
  if (link.alias) return link.alias;
  const d = link.driver;
  if (d) return [d.first_name, d.last_name].filter(Boolean).join(' ');
  return link.invited_email || link.invite_code || '';
}

/**
 * Equipo del propietario (GET /team). `active` son los conductores que ya
 * aceptaron; `pending` las invitaciones (por email o por código) sin usar.
 */
export function useTeam({ enabled = true } = {}) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) {
      setLinks([]);
      return [];
    }
    setLoading(true);
    setError('');
    try {
      const resp = await api.get('/team');
      setLinks(resp.data || []);
      return resp.data || [];
    } catch (err) {
      // 403 = aún sin vehículos: equipo vacío, sin error visible.
      if (err.response?.status !== 403) setError(errorMessage(err));
      setLinks([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { reload(); }, [reload]);

  return {
    links,
    active: links.filter((l) => l.status === 'active'),
    pending: links.filter((l) => l.status === 'pending'),
    loading,
    error,
    reload,
  };
}
