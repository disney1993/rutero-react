import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Card, FAB, Icon, IconButton, PageContainer } from '../components/ui';
import PersonAvatar from '../components/ui/PersonAvatar';
import RenderBoundary from '../components/RenderBoundary';
import ExpenseFormModal from '../components/ExpenseFormModal';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { api, errorMessage } from '../utils/apiClient';
import { formatCurrency } from '../utils/currency';
import { categoryColor, monthRange, shiftMonth, useExpenseCategories } from '../utils/expenses';
import { todayISO } from '../utils/rutas';
import { haptics } from '../utils/haptics';
import { toastError, toastSuccess } from '../utils/toast';

// Gráfico de anillo cargado bajo demanda (como en el panel de Inicio).
let CachedPieChart;
function Donut(props) {
  if (!CachedPieChart) CachedPieChart = require('react-native-gifted-charts').PieChart;
  return <CachedPieChart {...props} />;
}

/**
 * Gastos del negocio (modo propietario): nóminas, combustible, taller,
 * multas... Se restan de los ingresos en los informes para ver el beneficio.
 */
export default function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const { categories, byKey } = useExpenseCategories();
  const currency = user?.currency || 'EUR';

  const [month, setMonth] = useState(() => `${todayISO().slice(0, 7)}-01`);
  const [data, setData] = useState({ data: [], total: 0, by_category: [] });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    const [from, to] = monthRange(month);
    if (!silent) setLoading(true);
    try {
      const resp = await api.get('/expenses', { params: { from, to } });
      setData(resp.data);
    } catch (err) {
      toastError(errorMessage(err, t('expenses.loadError')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => {
    api.get('/vehicles').then((resp) => setVehicles(resp.data)).catch(() => {});
  }, []));

  const sections = useMemo(() => {
    const groups = {};
    for (const e of data.data) {
      const key = String(e.date).slice(0, 10);
      (groups[key] ||= []).push(e);
    }
    return Object.keys(groups).sort().reverse().map((date) => ({
      title: date,
      total: groups[date].reduce((s, e) => s + Number(e.amount), 0),
      data: groups[date],
    }));
  }, [data.data]);

  const pieData = data.by_category.map((row, i) => ({
    value: row.total,
    color: categoryColor(row.category, i),
  }));

  const locale = i18n.language === 'en' ? 'en' : 'es';
  const monthTitle = dayjs(month).locale(locale).format('MMMM YYYY');

  const openCreate = () => { setEditing(null); setFormVisible(true); };
  const openEdit = (e) => { haptics.light(); setEditing(e); setFormVisible(true); };

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/expenses/${editing.id}`, payload);
        toastSuccess(t('expenses.updated'));
      } else {
        await api.post('/expenses', payload);
        toastSuccess(t('expenses.created'));
      }
      setFormVisible(false);
      // Si el gasto es de otro mes, se salta a ese mes para verlo.
      const target = `${payload.date.slice(0, 7)}-01`;
      if (target !== month) setMonth(target); else load({ silent: true });
    } catch (err) {
      const validation = err.response?.data?.errors;
      toastError((validation && Object.values(validation).flat()[0]) || errorMessage(err, t('expenses.saveError')));
    } finally {
      setSubmitting(false);
    }
  };

  // La confirmación se pide dentro del formulario (InlineConfirm).
  const remove = async (expense) => {
    try {
      await api.delete(`/expenses/${expense.id}`);
      setFormVisible(false);
      toastSuccess(t('expenses.deleted'));
      load({ silent: true });
    } catch (err) {
      toastError(errorMessage(err, t('expenses.saveError')));
    }
  };

  const header = (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <IconButton icon="chevron-left" onPress={() => setMonth((m) => shiftMonth(m, -1))} accessibilityLabel={t('expenses.prevMonth')} />
        <Text className="text-base font-semibold capitalize text-onSurface dark:text-onSurface-dark">{monthTitle}</Text>
        <IconButton icon="chevron-right" onPress={() => setMonth((m) => shiftMonth(m, 1))} accessibilityLabel={t('expenses.nextMonth')} />
      </View>

      <Card className="mb-3">
        <Card.Content>
          <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('expenses.monthTotal')}</Text>
          <Text className="text-2xl font-bold mb-2 text-onSurface dark:text-onSurface-dark">{formatCurrency(data.total, currency)}</Text>
          {data.by_category.length > 0 && (
            <View className="flex-row items-center">
              <RenderBoundary fallback={null}>
                <Donut data={pieData} donut radius={52} innerRadius={34} innerCircleColor={c.surface} />
              </RenderBoundary>
              <View className="flex-1 ml-4">
                {data.by_category.map((row, i) => (
                  <View key={row.category} className="flex-row items-center mb-1">
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: categoryColor(row.category, i) }} />
                    <Text numberOfLines={1} className="flex-1 ml-2 text-xs text-onSurface dark:text-onSurface-dark">
                      {byKey[row.category]?.label || row.category}
                    </Text>
                    <Text className="text-xs font-semibold text-onSurface dark:text-onSurface-dark">
                      {Math.round((row.total / (data.total || 1)) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <PageContainer className="flex-1">
        {loading && data.data.length === 0 ? (
          <ActivityIndicator className="mt-10" />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load({ silent: true }); }} tintColor={c.primary} />}
            ListHeaderComponent={header}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View className="items-center py-10">
                <IconButton icon="receipt-text-outline" size={40} disabled className="opacity-40" />
                <Text className="text-center opacity-60 px-6 text-onSurface dark:text-onSurface-dark">{t('expenses.empty')}</Text>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View className="flex-row justify-between mt-3 mb-1 px-1">
                <Text className="text-xs font-semibold capitalize text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {dayjs(section.title).locale(locale).format('dddd, D MMM')}
                </Text>
                <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{formatCurrency(section.total, currency)}</Text>
              </View>
            )}
            renderItem={({ item, index }) => {
              const cat = byKey[item.category];
              const color = categoryColor(item.category, index);
              const detail = [
                item.description,
                item.vehicle?.plate,
              ].filter(Boolean).join(' · ');
              return (
                <Pressable onPress={() => openEdit(item)} className="active:opacity-70">
                  <Card className="mb-1.5">
                    <Card.Content className="flex-row items-center py-2.5">
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={cat?.icon || 'cash'} size={18} color={color} />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text numberOfLines={1} className="font-medium text-onSurface dark:text-onSurface-dark">{cat?.label || item.category}</Text>
                        {(!!detail || !!item.driver) && (
                          <View className="flex-row items-center mt-0.5">
                            {!!item.driver && <PersonAvatar person={item.driver} size={16} />}
                            <Text numberOfLines={1} className={`text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark${item.driver ? ' ml-1' : ''}`}>
                              {[item.driver ? item.driver.first_name : null, detail].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="font-bold text-onSurface dark:text-onSurface-dark">{formatCurrency(item.amount, currency)}</Text>
                    </Card.Content>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}
      </PageContainer>

      <FAB icon="plus" label={t('expenses.newTitle')} onPress={openCreate} />

      <ExpenseFormModal
        visible={formVisible}
        onDismiss={() => setFormVisible(false)}
        onSubmit={submit}
        onDelete={remove}
        initialValues={editing}
        categories={categories}
        vehicles={vehicles}
        defaultDate={month.slice(0, 7) === todayISO().slice(0, 7) ? todayISO() : month}
        submitting={submitting}
      />
    </View>
  );
}
