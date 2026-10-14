import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, getPaymentMethod } from './ui';
import { getDriverPermissions } from '../utils/rutas';
import { formatCurrency } from '../utils/currency';

function shortDate(iso) {
  if (!iso) return '';
  const [, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}`;
}

// Lista de viajes que el cron dio por completados (efectivo) y que nadie ha
// revisado todavía. Es el único sitio donde se corrige un cierre automático,
// y está pensado para usarse con el vehículo detenido.
export default function AutoCompleteReviewModal({
  visible,
  rutas,
  user,
  currency,
  busyId,
  onDismiss,
  onConfirm,
  onConfirmAll,
  onEdit,
  onUndo,
}) {
  const { t } = useTranslation();
  const reviewable = rutas.filter((r) => getDriverPermissions(r, user).canChangeStatusPayment);

  return (
    <Dialog visible={visible} onDismiss={onDismiss} contentStyle={{ maxWidth: 520, maxHeight: '90%' }} contentClassName="p-0">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="font-bold text-lg text-onSurface dark:text-onSurface-dark">{t('review.title')}</Text>
        <Text className="mt-1 mb-3 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
          {t('review.explanation')}
        </Text>

        {rutas.length === 0 && (
          <Text className="py-6 text-center opacity-60 text-onSurface dark:text-onSurface-dark">{t('review.empty')}</Text>
        )}

        {rutas.map((r) => {
          const canFix = getDriverPermissions(r, user).canChangeStatusPayment;
          const payment = getPaymentMethod(r.payment_method);
          const price = r.final_price ?? r.estimated_price;
          return (
            <View key={r.id} className="py-3 border-b border-border dark:border-border-dark">
              <View className="flex-row justify-between">
                <Text className="font-medium text-onSurface dark:text-onSurface-dark">
                  {shortDate(r.trip_date)} {r.trip_time || ''} · {r.client_name}
                </Text>
                {price != null && (
                  <Text className="font-bold text-onSurface dark:text-onSurface-dark">{formatCurrency(price, currency)}</Text>
                )}
              </View>
              <Text numberOfLines={1} className="text-xs opacity-70 text-onSurface dark:text-onSurface-dark">
                {r.origin} → {r.destination}
              </Text>
              <Text className="text-xs mt-0.5 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('review.autoCompleted')} · {payment ? payment.label : t('payment.none')}
              </Text>
              {canFix && (
                <View className="flex-row flex-wrap gap-2 mt-2">
                  <Button compact mode="contained" loading={busyId === r.id} disabled={!!busyId} onPress={() => onConfirm(r)}>
                    {t('review.correct')}
                  </Button>
                  <Button compact mode="outlined" disabled={!!busyId} onPress={() => onEdit(r)}>
                    {t('review.fix')}
                  </Button>
                  <Button compact mode="text" disabled={!!busyId} onPress={() => onUndo(r)}>
                    {t('review.undo')}
                  </Button>
                </View>
              )}
            </View>
          );
        })}

        {reviewable.length > 1 && (
          <Button mode="contained" className="mt-4" disabled={!!busyId} onPress={() => onConfirmAll(reviewable)}>
            {t('review.allCorrect')}
          </Button>
        )}
        <Button mode="text" className="mt-1" onPress={onDismiss}>{t('common.close')}</Button>
      </ScrollView>
    </Dialog>
  );
}
