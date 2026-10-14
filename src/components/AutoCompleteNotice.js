import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

const VISIBLE_MS = 6000;

// Aviso de cierre automático pensado para leerse con el móvil en un soporte
// mientras se conduce: es SOLO informativo. No tiene botones, no recibe toques
// (pointerEvents="none"), no suena ni vibra, no bloquea la pantalla y se oculta
// solo. Texto grande y de alto contraste para leerlo en una mirada (< 2 s).
// Manipular el móvil al volante se sanciona (Ley 18/2021); cualquier
// corrección se hace después desde "Por revisar", con el vehículo detenido.
export default function AutoCompleteNotice({ message, onHidden }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onHidden, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onHidden]);

  if (!message) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 12, right: 12, bottom: 96, backgroundColor: '#14532D', elevation: 6 }}
      className="rounded-2xl px-4 py-3"
    >
      <Text style={{ color: '#FFFFFF' }} className="text-xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
        ✓ {message.title}
      </Text>
      {!!message.detail && (
        <Text style={{ color: '#DCFCE7' }} className="text-base mt-0.5" numberOfLines={1} adjustsFontSizeToFit>
          {message.detail}
        </Text>
      )}
    </View>
  );
}
