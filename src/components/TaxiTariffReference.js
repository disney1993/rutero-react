import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { api } from '../utils/apiClient';
import { formatCurrency } from '../utils/currency';

function money(value) {
  return formatCurrency(value, 'EUR');
}

// Referencia orientativa para fijar el precio/km: tarifas interurbanas máximas
// de taxi por comunidad autónoma (las fija cada comunidad; las urbanas, cada
// ayuntamiento). Rutero multiplica el precio/km por la distancia del trayecto,
// así que se muestra el "equivalente por km de trayecto": en las comunidades
// que cobran en circuito cerrado (ida y vuelta) es el doble de la tarifa oficial.
export default function TaxiTariffReference({ onUse }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || data) return;
    api.get('/reference/taxi-tariffs')
      .then((resp) => setData(resp.data))
      .catch(() => setError(true));
  }, [expanded, data]);

  return (
    <View className="mt-3 rounded-xl border border-border dark:border-border-dark">
      <Pressable onPress={() => setExpanded((v) => !v)} className="px-3 py-2.5 flex-row justify-between items-center">
        <Text className="flex-1 font-medium text-onSurface dark:text-onSurface-dark">
          {t('tariffs.title')}
        </Text>
        <Text className="text-primary dark:text-primary-dark">{expanded ? t('common.hide') : t('common.show')}</Text>
      </Pressable>

      {expanded && (
        <View className="px-3 pb-3">
          <Text className="text-xs mb-2 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
            {t('tariffs.explanation')}
          </Text>

          {!data && !error && <ActivityIndicator className="my-3" />}
          {error && (
            <Text className="text-xs text-error dark:text-error-dark">{t('tariffs.loadError')}</Text>
          )}

          {data && (
            <>
              <View className="rounded-lg px-3 py-2 mb-2 bg-primary/10 dark:bg-primary-dark/20">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-onSurface dark:text-onSurface-dark">
                    {t('tariffs.defaultPrice')} <Text className="font-bold">{money(data.default_route_km_price)}/km</Text>
                  </Text>
                  <Button compact mode="text" onPress={() => onUse(data.default_route_km_price)}>{t('common.use')}</Button>
                </View>
                <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {t('tariffs.medianExplanation', { median: money(data.median_route_km_price) })}
                </Text>
              </View>

              {data.regions.map((r) => (
                <View key={r.code} className="py-2 border-b border-border dark:border-border-dark">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="font-medium text-onSurface dark:text-onSurface-dark">{r.name}</Text>
                      <Text className="text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                        {t('tariffs.official', { price: money(r.km_price) })}
                        {r.km_basis === 'closed_circuit' ? ` ${t('tariffs.roundTrip')}` : r.km_basis === 'one_way' ? ` ${t('tariffs.oneWay')}` : ''}
                        {' · '}{t('tariffs.nightHolidays', { price: money(r.km_price_special) })} · {r.year}
                      </Text>
                    </View>
                    {r.route_km_price != null ? (
                      <View className="items-end">
                        <Text className="font-bold text-onSurface dark:text-onSurface-dark">{money(r.route_km_price)}/km</Text>
                        <Button compact mode="text" onPress={() => onUse(r.route_km_price)}>{t('common.use')}</Button>
                      </View>
                    ) : (
                      <Text className="text-xs w-28 text-right text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                        {t('tariffs.returnUnknown')}
                      </Text>
                    )}
                  </View>
                  <Text
                    onPress={() => Linking.openURL(r.source_url).catch(() => {})}
                    className="text-[11px] mt-0.5 underline text-onSurfaceVariant dark:text-onSurfaceVariant-dark"
                  >
                    {t('tariffs.source', { source: r.source })}
                  </Text>
                </View>
              ))}

              {data.unverified?.length > 0 && (
                <Text className="text-xs mt-2 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                  {t('tariffs.unverified', { list: data.unverified.join(', ') })}
                </Text>
              )}
              <Text className="text-[11px] mt-1 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
                {t('tariffs.reviewed', { date: data.reviewed_at.split('-').reverse().join('/') })}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}
