import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, interpolate, Extrapolation, Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';
import { haptics } from '../../utils/haptics';

const ACTION_WIDTH = 96;
const PEEK_DISTANCE = 92;

// Panel que aparece detrás al deslizar. `side` indica en qué lado está: el
// icono crece según se arrastra, como en las apps de correo.
function ActionPanel({ drag, side, blocked, label, icon, color, c, roundedClass }) {
  const sign = side === 'right' ? -1 : 1;
  const iconStyle = useAnimatedStyle(() => {
    const scale = interpolate(sign * drag.value, [0, ACTION_WIDTH * 0.6, ACTION_WIDTH], [0.6, 0.9, 1.1], Extrapolation.CLAMP);
    return { transform: [{ scale }] };
  });
  const fg = blocked ? c.onSurfaceVariant : c.onPrimary;
  return (
    <View
      style={{ backgroundColor: blocked ? c.surfaceDisabled : color }}
      className={cn('flex-1 justify-center', side === 'right' ? 'items-end pr-6 -ml-6' : 'items-start pl-6 -mr-6', roundedClass)}
    >
      <Animated.View style={iconStyle} className="items-center">
        <Icon name={blocked ? 'lock-outline' : icon} size={26} color={fg} />
        <Text style={{ color: fg }} className="text-xs font-semibold mt-0.5">{label}</Text>
      </Animated.View>
    </View>
  );
}

// Envoltorio de filas con gestos de deslizar:
//  - A la izquierda (←): eliminar. onDelete() devuelve una promesa que
//    resuelve a true si se borró; si no, la fila vuelve. deleteLabel/deleteIcon
//    permiten llamarlo de otra forma (p. ej. "Cancelar" en viajes).
//  - A la derecha (→), opcional: `rightSwipe` = { label, icon, color, onTrigger,
//    blockedReason } (p. ej. marcar un viaje como completado).
//  - blockedReason: en vez de actuar enseña un candado y llama a onBlocked.
//  - peek: la fila se asoma sola un instante para enseñar el gesto de borrar.
export default function SwipeToDelete({
  children, onDelete, blockedReason, onBlocked, onSwiped, peek = false, onPeekDone, rounded = true, className,
  enabled = true, deleteLabel, deleteIcon = 'trash-can-outline', rightSwipe,
}) {
  const { t } = useTranslation();
  const { resolvedScheme } = useThemeMode();
  const c = colors[resolvedScheme];
  const swipeRef = useRef(null);
  const roundedClass = rounded ? 'rounded-2xl' : '';
  const deleteText = deleteLabel || t('common.delete');

  const peekX = useSharedValue(0);
  const peekStyle = useAnimatedStyle(() => ({ transform: [{ translateX: peekX.value }] }));
  const peekIconStyle = useAnimatedStyle(() => ({ opacity: interpolate(-peekX.value, [0, PEEK_DISTANCE], [0, 1], Extrapolation.CLAMP) }));

  useEffect(() => {
    if (!peek) return undefined;
    const ease = Easing.out(Easing.cubic);
    peekX.value = withSequence(
      withDelay(600, withTiming(-PEEK_DISTANCE, { duration: 420, easing: ease })),
      withDelay(1000, withTiming(0, { duration: 380, easing: ease })),
    );
    const timer = setTimeout(() => onPeekDone?.(), 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peek]);

  const close = () => swipeRef.current?.close();

  const handleDelete = async () => {
    onSwiped?.();
    if (blockedReason) {
      haptics.warning();
      onBlocked?.(blockedReason);
      close();
      return;
    }
    haptics.medium();
    const deleted = await onDelete();
    if (!deleted) close();
  };

  const handleRight = async () => {
    onSwiped?.();
    close();
    if (rightSwipe.blockedReason) {
      haptics.warning();
      onBlocked?.(rightSwipe.blockedReason);
      return;
    }
    haptics.success();
    await rightSwipe.onTrigger();
  };

  // RIGHT = la fila se movió a la derecha (acción de la izquierda visible).
  const handleOpen = (direction) => {
    if (direction === SwipeDirection.RIGHT) { if (rightSwipe) handleRight(); }
    else handleDelete();
  };

  const blocked = !!blockedReason;

  return (
    <View className={className}>
      {/* Fondo que solo se ve durante la pista animada (el del gesto real lo pintan las acciones). */}
      {peek && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: blocked ? c.surfaceDisabled : c.error }]}
          className={cn('items-end justify-center pr-5', roundedClass)}
        >
          <Animated.View style={peekIconStyle}>
            <Icon name={blocked ? 'lock-outline' : deleteIcon} size={24} color={blocked ? c.onSurfaceVariant : c.onPrimary} />
          </Animated.View>
        </View>
      )}
      <Animated.View style={peekStyle}>
        <ReanimatedSwipeable
          ref={swipeRef}
          enabled={enabled}
          friction={1.6}
          rightThreshold={ACTION_WIDTH * 0.7}
          leftThreshold={ACTION_WIDTH * 0.7}
          overshootRight={false}
          overshootLeft={false}
          onSwipeableOpen={handleOpen}
          renderRightActions={(_progress, drag) => (
            <Pressable onPress={handleDelete} style={{ width: ACTION_WIDTH + 24 }} accessibilityRole="button" accessibilityLabel={deleteText}>
              <ActionPanel
                drag={drag}
                side="right"
                blocked={blocked}
                label={blocked ? t('vehicles.locked') : deleteText}
                icon={deleteIcon}
                color={c.error}
                c={c}
                roundedClass={roundedClass}
              />
            </Pressable>
          )}
          renderLeftActions={rightSwipe ? (_progress, drag) => (
            <Pressable onPress={handleRight} style={{ width: ACTION_WIDTH + 24 }} accessibilityRole="button" accessibilityLabel={rightSwipe.label}>
              <ActionPanel
                drag={drag}
                side="left"
                blocked={!!rightSwipe.blockedReason}
                label={rightSwipe.blockedReason ? t('vehicles.locked') : rightSwipe.label}
                icon={rightSwipe.icon}
                color={rightSwipe.color}
                c={c}
                roundedClass={roundedClass}
              />
            </Pressable>
          ) : undefined}
        >
          {children}
        </ReanimatedSwipeable>
      </Animated.View>
    </View>
  );
}
