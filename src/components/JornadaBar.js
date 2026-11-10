import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Icon, IconButton, Input, cn } from './ui';
import PersonAvatar from './ui/PersonAvatar';
import VehicleSelect from './ui/VehicleSelect';
import FieldLabel from './ui/FieldLabel';
import DriverAvatarPicker from './DriverAvatarPicker';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { useTeam } from '../hooks/useTeam';
import { errorMessage } from '../utils/apiClient';
import { inviteLink } from '../utils/pendingInvite';
import { haptics } from '../utils/haptics';
import { toastError, toastSuccess } from '../utils/toast';

import { ALL_JORNADAS, VIRTUAL_JORNADA } from '../utils/jornadas';

export { ALL_JORNADAS, VIRTUAL_JORNADA };

function dmy(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function Chip({ selected, onPress, children, accessibilityLabel }) {
  return (
    <Pressable
      onPress={() => { haptics.selection(); onPress(); }}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        'flex-row items-center rounded-full pl-1 pr-3 py-1 border active:opacity-70',
        selected
          ? 'bg-primary/15 border-primary dark:bg-primary-dark/25 dark:border-primary-dark'
          : 'bg-surface border-border dark:bg-surface-dark dark:border-border-dark'
      )}
    >
      {children}
    </Pressable>
  );
}

/**
 * Jornadas del día (propietario): una fila de chips con el avatar del
 * conductor de cada jornada, "Todas" cuando hay varias y "+ Nueva jornada".
 * Debajo, el código de la jornada elegida con Copiar / Compartir y el acceso
 * a sus ajustes (nombre, conductor, vehículo, nuevo código, eliminar).
 *
 * `jornadasApi` es el resultado de useJornadas; `selected` es el id de la
 * jornada, ALL_JORNADAS o VIRTUAL_JORNADA (día sin jornadas todavía).
 */
export default function JornadaBar({ date, vehicles = [], jornadasApi, selected, onSelect, onChanged }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const { jornadas } = jornadasApi;
  const team = useTeam();

  const [settingsFor, setSettingsFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const isVirtual = jornadas.length === 0;
  const current = isVirtual ? null : jornadas.find((j) => j.id === selected) || null;
  const ownerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  // La jornada virtual se crea de verdad la primera vez que se usa.
  const withReal = async (fn) => {
    setBusy(true);
    try {
      const jornada = current || (await jornadasApi.ensureFirst());
      if (!current) onSelect(jornada.id);
      await fn(jornada);
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setBusy(false);
    }
  };

  const addJornada = async () => {
    setBusy(true);
    try {
      // Si el día aún no tenía jornadas, primero se crea la Jornada 1 (con los viajes existentes).
      if (isVirtual) await jornadasApi.create();
      const created = await jornadasApi.create();
      onSelect(created.id);
      toastSuccess(t('jornadas.created', { label: created.label }));
      setSettingsFor(created);
    } catch (err) {
      toastError(errorMessage(err, t('alerts.genericError')));
    } finally {
      setBusy(false);
    }
  };

  const copy = () => withReal(async (j) => {
    await Clipboard.setStringAsync(j.code);
    toastSuccess(t('ownerCode.copied'));
  });

  const share = () => withReal(async (j) => {
    const message = t('jornadas.shareMessage', {
      name: ownerName, label: j.label, date: dmy(j.date), link: inviteLink(j.code), code: j.code,
    });
    try {
      await Share.share({ message, title: t('ownerCode.shareSubject') }, { subject: t('ownerCode.shareSubject'), dialogTitle: t('ownerCode.shareSubject') });
    } catch {
      // Hoja cerrada: nada que hacer.
    }
  });

  const openSettings = () => withReal(async (j) => setSettingsFor(j));

  const driverOf = (j) => j?.driver || user;

  return (
    <View className="mt-1 mb-1">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {jornadas.length > 1 && (
          <Chip selected={selected === ALL_JORNADAS} onPress={() => onSelect(ALL_JORNADAS)} accessibilityLabel={t('jornadas.all')}>
            <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="view-list-outline" size={16} color={c.onSurfaceVariant} />
            </View>
            <Text className="ml-1.5 text-xs font-medium text-onSurface dark:text-onSurface-dark">{t('jornadas.all')}</Text>
          </Chip>
        )}
        {isVirtual ? (
          <Chip selected onPress={() => onSelect(VIRTUAL_JORNADA)} accessibilityLabel={t('jornadas.first')}>
            <PersonAvatar person={user} size={22} />
            <Text className="ml-1.5 text-xs font-medium text-onSurface dark:text-onSurface-dark">{t('jornadas.first')}</Text>
          </Chip>
        ) : jornadas.map((j) => (
          <Chip
            key={j.id}
            selected={selected === j.id}
            onPress={() => (selected === j.id ? openSettings() : onSelect(j.id))}
            accessibilityLabel={`${j.label}, ${j.driver ? [j.driver.first_name, j.driver.last_name].join(' ') : t('team.me')}`}
          >
            <PersonAvatar person={driverOf(j)} size={22} />
            <Text className="ml-1.5 text-xs font-medium text-onSurface dark:text-onSurface-dark">{j.label}</Text>
          </Chip>
        ))}
        <Chip selected={false} onPress={addJornada} accessibilityLabel={t('jornadas.add')}>
          <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={16} color={c.primary} />
          </View>
          <Text className="ml-1 text-xs font-medium text-primary dark:text-primary-dark">{t('jornadas.add')}</Text>
        </Chip>
      </ScrollView>

      {selected !== ALL_JORNADAS && (
        <View className="mx-3 mt-1.5 flex-row items-center rounded-xl px-2.5 py-1.5 bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60">
          <View className="flex-1">
            <Text className="text-[11px] text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              {t('jornadas.codeOf', { label: current?.label || t('jornadas.first') })}
            </Text>
            <Text selectable className="text-base font-bold tracking-[2px] text-onSurface dark:text-onSurface-dark">
              {current?.code || '········'}
            </Text>
          </View>
          <IconButton icon="content-copy" size={20} onPress={copy} disabled={busy} accessibilityLabel={t('common.copy')} />
          <Button mode="contained" icon="share-variant" compact onPress={share} disabled={busy} textClassName="text-sm text-onPrimary dark:text-onPrimary-dark">
            {t('ownerCode.share')}
          </Button>
          <IconButton icon="cog-outline" size={20} onPress={openSettings} disabled={busy} accessibilityLabel={t('jornadas.settings')} />
        </View>
      )}

      <JornadaSettingsDialog
        jornada={settingsFor}
        vehicles={vehicles}
        team={team.active}
        owner={user}
        onDismiss={() => setSettingsFor(null)}
        onSave={async (attrs) => {
          try {
            await jornadasApi.update(settingsFor.id, attrs);
            setSettingsFor(null);
            onChanged?.();
          } catch (err) {
            toastError(errorMessage(err, t('alerts.genericError')));
          }
        }}
        onRegenerate={async () => {
          const ok = await confirm({ title: t('jornadas.newCode'), message: t('jornadas.newCodeConfirm'), confirmLabel: t('jornadas.newCode') });
          if (!ok) return;
          try {
            const updated = await jornadasApi.regenerateCode(settingsFor.id);
            setSettingsFor(updated);
          } catch (err) {
            toastError(errorMessage(err, t('alerts.genericError')));
          }
        }}
        onDelete={async () => {
          const ok = await confirm({ title: t('jornadas.delete'), message: t('jornadas.deleteConfirm', { label: settingsFor.label }), confirmLabel: t('common.delete'), destructive: true });
          if (!ok) return;
          try {
            await jornadasApi.remove(settingsFor.id);
            setSettingsFor(null);
            onSelect(null);
          } catch (err) {
            toastError(errorMessage(err, t('alerts.genericError')));
          }
        }}
      />
    </View>
  );
}

function JornadaSettingsDialog({ jornada, vehicles, team, owner, onDismiss, onSave, onRegenerate, onDelete }) {
  const { t } = useTranslation();
  const [label, setLabel] = useState('');
  const [driverId, setDriverId] = useState(null);
  const [vehicleId, setVehicleId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jornada) return;
    setLabel(jornada.label || '');
    setDriverId(jornada.driver_id ?? null);
    setVehicleId(jornada.vehicle_id ?? null);
  }, [jornada?.id, jornada?.code]);

  if (!jornada) return null;
  const labelError = label.trim() ? '' : t('jornadas.labelRequired');

  const save = async () => {
    if (labelError) return;
    setSaving(true);
    await onSave({ label: label.trim(), driver_id: driverId, vehicle_id: vehicleId });
    setSaving(false);
  };

  return (
    <Dialog visible={!!jornada} onDismiss={onDismiss}>
      <Dialog.Title>{t('jornadas.settingsTitle', { date: dmy(jornada.date) })}</Dialog.Title>
      <Dialog.Content>
        <Input label={t('jornadas.label')} value={label} onChangeText={setLabel} maxLength={40} error={labelError} />
        <FieldLabel>{t('team.driver')}</FieldLabel>
        <DriverAvatarPicker owner={owner} team={team} value={driverId} onChange={setDriverId} extra={jornada.driver} />
        <Text className="mb-2 text-xs text-onSurfaceVariant dark:text-onSurfaceVariant-dark">{t('jornadas.driverHint')}</Text>
        {vehicles.length > 0 && (
          <VehicleSelect label={t('rutaForm.vehicle')} value={vehicleId} vehicles={vehicles} onChange={(id) => setVehicleId(id ?? null)} />
        )}
        <View className="flex-row items-center mt-2">
          <Text className="flex-1 text-sm text-onSurface dark:text-onSurface-dark">
            {t('jornadas.code')}: <Text className="font-bold tracking-[2px]">{jornada.code}</Text>
          </Text>
          <Button mode="text" compact icon="refresh" onPress={onRegenerate}>{t('jornadas.newCode')}</Button>
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button mode="text" onPress={onDelete} textClassName="text-error dark:text-error-dark">{t('common.delete')}</Button>
        <View className="flex-1" />
        <Button mode="text" onPress={onDismiss}>{t('common.cancel')}</Button>
        <Button mode="contained" loading={saving} onPress={save}>{t('common.save')}</Button>
      </Dialog.Actions>
    </Dialog>
  );
}
