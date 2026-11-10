import { useEffect, useState } from 'react';
import i18n from '../i18n';
import { api } from './apiClient';

// Color fijo por categoría (gráfico, iconos y leyenda). Las categorías nuevas
// que añada la API sin color propio reciben uno de la paleta de reserva.
const CATEGORY_COLORS = {
  payroll: '#5B6CFF',
  fuel: '#F59E0B',
  workshop: '#EF4444',
  fines: '#B91C1C',
  insurance: '#0EA5E9',
  tolls_parking: '#8B5CF6',
  taxes_fees: '#64748B',
  cleaning: '#14B8A6',
  other: '#A3A3A3',
};
const FALLBACK = ['#22C55E', '#EC4899', '#84CC16', '#F97316'];

export function categoryColor(key, index = 0) {
  return CATEGORY_COLORS[key] || FALLBACK[index % FALLBACK.length];
}

export const EXPENSE_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'bizum', 'transferencia', 'domiciliacion'];

const cache = {};

/**
 * Categorías de gasto (GET /reference/expense-categories) en el idioma de la
 * app, con caché en memoria. Devuelve { categories, byKey }.
 */
export function useExpenseCategories() {
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const [categories, setCategories] = useState(cache[lang] || []);

  useEffect(() => {
    if (cache[lang]) {
      setCategories(cache[lang]);
      return;
    }
    api.get('/reference/expense-categories', { params: { lang } })
      .then((resp) => {
        cache[lang] = resp.data.categories || [];
        setCategories(cache[lang]);
      })
      .catch(() => {});
  }, [lang]);

  const byKey = Object.fromEntries(categories.map((c) => [c.key, c]));
  return { categories, byKey };
}

/** Primer y último día del mes de una fecha ISO (YYYY-MM-DD). */
export function monthRange(iso) {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return [`${y}-${mm}-01`, `${y}-${mm}-${String(last).padStart(2, '0')}`];
}

export function shiftMonth(iso, dir) {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Importe escrito por el usuario ("12,5" o "12.50") → número, o NaN. */
export function parseAmount(text) {
  const clean = String(text ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
  return Number(clean);
}
