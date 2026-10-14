import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { Card, StatTile, StatusBadge } from './ui';
import { api, errorMessage } from '../utils/apiClient';
import { toastError } from '../utils/toast';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { STATUS_COLORS, statusLabel } from '../utils/rutas';
import { formatCurrency } from '../utils/currency';

// Resumen de actividad de un único usuario (rutas por estado, ingresos,
// vehículos). Lo usa tanto el propio propietario (sin userId, ve lo suyo)
// como el admin (con userId, ve lo de quien elija) — mismo componente,
// mismo endpoint /reports/user-summary, solo cambia el alcance.
export default function UserStatsDashboard({ userId, reloadKey = 0 }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/reports/user-summary', { params: userId ? { user_id: userId } : {} });
      setSummary(resp.data);
    } catch (err) {
      toastError(errorMessage(err, t('stats.loadError')));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load, reloadKey]);

  if (loading && !summary) return <ActivityIndicator className="mt-10" />;
  if (!summary) return null;

  const rutasByStatus = summary.rutas_by_status || {};
  const activeStatuses = Object.keys(rutasByStatus).filter((s) => rutasByStatus[s] > 0);
  const pieData = activeStatuses.map((status) => ({
    value: rutasByStatus[status],
    color: STATUS_COLORS[status] || themeColors.surfaceDisabled,
    text: String(rutasByStatus[status]),
  }));

  return (
    <View>
      <View className="flex-row flex-wrap gap-2 mb-3">
        <StatTile label={t('stats.rutas')} value={summary.rutas_total} />
        <StatTile label={t('stats.vehicles')} value={summary.vehicles_total} />
        <StatTile label={t('stats.revenue')} value={formatCurrency(summary.revenue_completed)} />
      </View>

      <View className="flex-row flex-wrap gap-1.5 mb-3">
        {summary.has_owner_capability && <StatusBadge tone="secondary">{t('roles.owner')}</StatusBadge>}
        {summary.has_driver_capability && <StatusBadge tone="tertiary">{t('roles.driver')}</StatusBadge>}
        {!summary.has_owner_capability && !summary.has_driver_capability && (
          <StatusBadge tone="neutral">{t('stats.noActivity')}</StatusBadge>
        )}
      </View>

      {pieData.length > 0 && (
        <Card>
          <Card.Content className="items-center">
            <Text className="self-start font-medium mb-2 text-onSurface dark:text-onSurface-dark">{t('stats.rutasByStatus')}</Text>
            <PieChart data={pieData} donut radius={70} innerRadius={44} innerCircleColor={themeColors.surface} />
            <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
              {activeStatuses.map((status) => (
                <View key={status} className="flex-row items-center gap-1.5">
                  <View style={{ backgroundColor: STATUS_COLORS[status] }} className="w-2.5 h-2.5 rounded-full" />
                  <Text className="text-xs text-onSurface dark:text-onSurface-dark">
                    {statusLabel(status)} ({rutasByStatus[status]})
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}
