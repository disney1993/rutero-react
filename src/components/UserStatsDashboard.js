import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, useWindowDimensions, Pressable } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en-gb';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import Card from './ui/Card';
import StatTile from './ui/StatTile';
import StatusBadge from './ui/StatusBadge';
import SegmentedButtons from './ui/SegmentedButtons';
import IconButton from './ui/IconButton';
import Button from './ui/Button';
import RenderBoundary from './RenderBoundary';
import { api, errorMessage } from '../utils/apiClient';
import { toastError, toastSuccess } from '../utils/toast';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { todayISO, STATUS_COLORS } from '../utils/rutas';
import { formatCurrency } from '../utils/currency';
import { haptics } from '../utils/haptics';

// Lazy: gifted-charts must not evaluate with AppTabs/Home module graph.
let CachedBarChart;
function RevenueBarChart(props) {
  if (!CachedBarChart) {
    CachedBarChart = require('react-native-gifted-charts').BarChart;
  }
  return <CachedBarChart {...props} />;
}

const EMPTY_COUNTERS = {
  trips_total: 0,
  trips_completed: 0,
  trips_cancelled: 0,
  trips_pending: 0,
  revenue: 0,
  avg_ticket: 0,
  completion_rate: 0,
  delta_revenue: 0,
  delta_trips: 0,
};

function SectionHeading({ children }) {
  return (
    <Text className="text-sm font-semibold mb-2 text-onSurface dark:text-onSurface-dark">
      {children}
    </Text>
  );
}

// API chart points expose `revenue`; gifted-charts needs `value`.
function toChartData(series, accent) {
  return (series || []).map((point) => ({
    value: Number(point?.revenue ?? point?.value) || 0,
    label: String(point?.label ?? ''),
    frontColor: accent,
  }));
}

// Prefer API delta_* when present; fall back to current − previous.
function formatDelta(diffOrCurrent, previous, { asCurrency = false, isDiff = false } = {}) {
  const prev = Number(previous) || 0;
  const diff = isDiff
    ? Number(diffOrCurrent) || 0
    : (Number(diffOrCurrent) || 0) - prev;
  if (diff === 0) return { text: asCurrency ? formatCurrency(0) : '0', tone: 'neutral' };
  const sign = diff > 0 ? '+' : '-';
  const magnitude = asCurrency ? formatCurrency(Math.abs(diff)) : String(Math.abs(diff));
  let pctPart = '';
  if (prev !== 0) {
    const pct = Math.round((diff / Math.abs(prev)) * 100);
    pctPart = ` (${pct > 0 ? '+' : ''}${pct}%)`;
  }
  return {
    text: `${sign}${magnitude}${pctPart}`,
    tone: diff > 0 ? 'up' : 'down',
  };
}

function formatPeriodTitle(period, isoDate, locale) {
  const d = dayjs(isoDate).locale(locale);
  if (period === 'day') return d.format('dddd, D MMMM YYYY');
  if (period === 'month') return d.format('MMMM YYYY');
  return d.format('YYYY');
}

function shiftAnchor(isoDate, period, dir) {
  const unit = period === 'day' ? 'day' : period === 'month' ? 'month' : 'year';
  return dayjs(isoDate).add(dir, unit).format('YYYY-MM-DD');
}

function deltaAccent(tone, themeColors) {
  if (tone === 'up') return themeColors.secondary;
  if (tone === 'down') return themeColors.error;
  return undefined;
}

// Dashboard de analytics por día/mes/año. role=owner|driver|all acota el
// alcance (propietario vs viajes hechos como conductor). Admin pasa userId.
export default function UserStatsDashboard({ userId, role, reloadKey = 0 }) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(280, Math.min(width - 48, 520));
  const isDriverView = role === 'driver';

  const [period, setPeriod] = useState('month');
  const [date, setDate] = useState(() => todayISO());
  const [data, setData] = useState(null);
  // Start true so the first paint shows a spinner, not the load-error empty state
  // (loading=false + data=null used to flash "failed to load" for owners).
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  const locale = i18n.language === 'en' ? 'en-gb' : 'es';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/reports/user-analytics', {
        params: {
          period,
          date,
          ...(role ? { role } : {}),
          ...(userId != null ? { user_id: userId } : {}),
        },
      });
      setData(resp.data);
    } catch (err) {
      toastError(errorMessage(err, t('stats.loadError')));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, role, period, date, t]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const counters = data?.counters || EMPTY_COUNTERS;
  const previous = data?.previous_counters || EMPTY_COUNTERS;
  const charts = data?.charts || {};

  const tripsDelta = useMemo(
    () => formatDelta(counters.delta_trips, previous.trips_total, { isDiff: true }),
    [counters.delta_trips, previous.trips_total],
  );
  const revenueDelta = useMemo(
    () => formatDelta(counters.delta_revenue, previous.revenue, {
      asCurrency: true,
      isDiff: true,
    }),
    [counters.delta_revenue, previous.revenue],
  );

  const dailyData = useMemo(
    () => toChartData(charts.daily, themeColors.primary),
    [charts.daily, themeColors.primary],
  );
  const monthlyData = useMemo(
    () => toChartData(charts.monthly, themeColors.secondary),
    [charts.monthly, themeColors.secondary],
  );

  const periodTitle = formatPeriodTitle(period, date, locale);
  // day + month → daily revenue chart; year → monthly breakdown
  const showDailyChart = !isDriverView && (period === 'day' || period === 'month');
  const showMonthlyChart = !isDriverView && period === 'year';
  // gifted-charts divides by maxValue; all-zero series → Infinity/NaN crash.
  const chartHasSignal = (series) => (series || []).some((p) => Number(p?.value) > 0);
  const chartMaxValue = (series) => {
    const peak = Math.max(0, ...(series || []).map((p) => Number(p?.value) || 0));
    return Math.max(peak, 1);
  };

  const onExport = async (format) => {
    setExporting(format);
    // Lazy: expo-file-system / sharing must not load with Home analytics.
    const reportDownload = require('../utils/reportDownload');
    try {
      await reportDownload.downloadUserReport({ period, date, format, userId, role });
      toastSuccess(t('stats.exportDone'));
    } catch (err) {
      toastError(reportDownload.reportDownloadError(err, t('stats.exportError')));
    } finally {
      setExporting(null);
    }
  };

  const shift = (dir) => {
    haptics.selection();
    setDate((d) => shiftAnchor(d, period, dir));
  };

  const goToday = () => {
    haptics.selection();
    setDate(todayISO());
  };

  if (loading && !data) {
    return (
      <View className="items-center justify-center py-16">
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="items-center justify-center py-16 gap-3">
        <Text className="text-center opacity-60 text-onSurface dark:text-onSurface-dark">
          {t('stats.loadError')}
        </Text>
        <Button mode="outlined" compact onPress={load}>
          {t('common.refresh')}
        </Button>
      </View>
    );
  }

  const barProps = {
    width: chartWidth - 24,
    height: 180,
    barWidth: period === 'year' ? 18 : 12,
    spacing: period === 'day' ? 6 : 10,
    roundedTop: true,
    xAxisThickness: 0,
    yAxisThickness: 0,
    yAxisTextStyle: { color: themeColors.onSurfaceVariant, fontSize: 10 },
    xAxisLabelTextStyle: { color: themeColors.onSurfaceVariant, fontSize: 9 },
    noOfSections: 4,
    isAnimated: true,
    // Parent UserDashboardScreen is already a ScrollView; nested VirtualizedLists
    // warn/break on Android when the chart scrolls horizontally by default.
    disableScroll: true,
  };

  return (
    <View>
      <SegmentedButtons
        value={period}
        onValueChange={setPeriod}
        className="mb-2"
        buttons={[
          { value: 'day', label: t('calendar.day') },
          { value: 'month', label: t('calendar.month') },
          { value: 'year', label: t('stats.year') },
        ]}
      />

      <View className="flex-row items-center mb-3">
        <IconButton icon="chevron-left" onPress={() => shift(-1)} accessibilityLabel={t('calendar.previous')} />
        <Text numberOfLines={1} className="flex-1 text-center font-semibold capitalize text-onSurface dark:text-onSurface-dark">
          {periodTitle}
        </Text>
        {loading && <ActivityIndicator size="small" color={themeColors.primary} className="mr-1" />}
        <Pressable
          onPress={goToday}
          className="px-3 py-1 rounded-full border border-primary dark:border-primary-dark active:opacity-70"
        >
          <Text className="text-xs font-semibold text-primary dark:text-primary-dark">{t('common.today')}</Text>
        </Pressable>
        <IconButton icon="chevron-right" onPress={() => shift(1)} accessibilityLabel={t('calendar.next')} />
      </View>

      <View className="flex-row flex-wrap gap-1.5 mb-3">
        {isDriverView ? (
          <StatusBadge tone="tertiary">{t('mode.driver')}</StatusBadge>
        ) : (
          <StatusBadge tone="secondary">{t('mode.owner')}</StatusBadge>
        )}
        {isDriverView && (
          <Text className="text-xs opacity-70 self-center text-onSurface dark:text-onSurface-dark">
            {t('stats.driverScopeHint')}
          </Text>
        )}
      </View>

      {/* Viajes: row1 totals/rate/delta · row2 status counters */}
      <View className="mb-4">
        <SectionHeading>{t('stats.sectionTrips')}</SectionHeading>
        <View className="flex-row gap-1.5 mb-1.5">
          <StatTile compact label={t('stats.trips')} value={counters.trips_total} />
          <StatTile
            compact
            label={t('stats.completionRate')}
            value={`${Math.round(Number(counters.completion_rate) || 0)}%`}
          />
          <StatTile
            compact
            label={t('stats.vsPrevious')}
            value={tripsDelta.text}
            color={deltaAccent(tripsDelta.tone, themeColors)}
          />
        </View>
        <View className="flex-row gap-1.5">
          <StatTile
            compact
            label={t('stats.completed')}
            value={counters.trips_completed}
            color={STATUS_COLORS.completed}
          />
          <StatTile
            compact
            label={t('stats.pending')}
            value={counters.trips_pending}
            color={STATUS_COLORS.pending}
          />
          <StatTile
            compact
            label={t('stats.cancelled')}
            value={counters.trips_cancelled}
            color={STATUS_COLORS.cancelled}
          />
        </View>
      </View>

      {/* Ingresos — owner only: one dense 3-col row */}
      {!isDriverView && (
        <View className="mb-4">
          <SectionHeading>{t('stats.sectionRevenue')}</SectionHeading>
          <View className="flex-row gap-1.5 mb-3">
            <StatTile compact label={t('stats.revenue')} value={formatCurrency(counters.revenue)} />
            <StatTile compact label={t('stats.avgTicket')} value={formatCurrency(counters.avg_ticket)} />
            <StatTile
              compact
              label={t('stats.vsPrevious')}
              value={revenueDelta.text}
              color={deltaAccent(revenueDelta.tone, themeColors)}
            />
          </View>

          {showDailyChart && chartHasSignal(dailyData) && (
            <RenderBoundary
              fallback={
                <Text className="mb-3 text-center text-xs opacity-60 text-onSurface dark:text-onSurface-dark">
                  {t('stats.chartUnavailable')}
                </Text>
              }
            >
              <Card className="mb-1">
                <Card.Content>
                  <Text className="font-medium mb-2 text-onSurface dark:text-onSurface-dark">{t('stats.chartDaily')}</Text>
                  <RevenueBarChart
                    data={dailyData}
                    {...barProps}
                    barWidth={8}
                    spacing={4}
                    maxValue={chartMaxValue(dailyData)}
                  />
                </Card.Content>
              </Card>
            </RenderBoundary>
          )}

          {showMonthlyChart && chartHasSignal(monthlyData) && (
            <RenderBoundary
              fallback={
                <Text className="mb-3 text-center text-xs opacity-60 text-onSurface dark:text-onSurface-dark">
                  {t('stats.chartUnavailable')}
                </Text>
              }
            >
              <Card className="mb-1">
                <Card.Content>
                  <Text className="font-medium mb-2 text-onSurface dark:text-onSurface-dark">{t('stats.chartMonthly')}</Text>
                  <RevenueBarChart
                    data={monthlyData}
                    {...barProps}
                    maxValue={chartMaxValue(monthlyData)}
                  />
                </Card.Content>
              </Card>
            </RenderBoundary>
          )}
        </View>
      )}

      {/* Reportes */}
      <View className="mb-2">
        <SectionHeading>{t('stats.sectionReports')}</SectionHeading>
        <View className="flex-row flex-wrap gap-2">
          <Button
            mode="outlined"
            icon="file-excel"
            compact
            loading={exporting === 'xlsx'}
            disabled={!!exporting}
            onPress={() => onExport('xlsx')}
            className="flex-1 min-w-[140px]"
          >
            {t('stats.exportExcel')}
          </Button>
          <Button
            mode="outlined"
            icon="file-pdf-box"
            compact
            loading={exporting === 'pdf'}
            disabled={!!exporting}
            onPress={() => onExport('pdf')}
            className="flex-1 min-w-[140px]"
          >
            {t('stats.exportPdf')}
          </Button>
        </View>
      </View>
    </View>
  );
}
