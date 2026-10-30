import React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from './cn';
import { haptics } from '../../utils/haptics';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors, elevation } from '../../theme';

// Claro: tarjeta blanca sobre fondo gris con sombra muy difusa (iOS).
// Oscuro: superficie violeta profundo con borde fino y un halo violeta tenue.
//
// La sombra (boxShadow) y el recorte del contenido (overflow-hidden) van en
// capas distintas: en Android, juntos en la misma vista, el contenido de la
// tarjeta podía no dibujarse (tarjetas en blanco) y además el recorte se come
// la sombra. Fuera: sombra + fondo + borde. Dentro: recorte con el mismo radio.
function Card({ children, style, className, onPress }) {
  const { resolvedScheme } = useThemeMode();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress && ((e) => { haptics.light(); onPress(e); })}
      style={[elevation(resolvedScheme, { color: colors[resolvedScheme].primary }), style]}
      className={cn('rounded-3xl bg-surface dark:bg-surface-dark dark:border dark:border-border-dark', onPress && 'active:opacity-90', className)}
    >
      {/* shrink: si la tarjeta tiene maxHeight (p. ej. sugerencias de
          dirección), la capa interior se ajusta a ella y recorta lo que sobra. */}
      <View className="shrink rounded-3xl overflow-hidden">
        {children}
      </View>
    </Wrapper>
  );
}

Card.Content = ({ children, style, className }) => (
  <View style={style} className={cn('p-4', className)}>
    {children}
  </View>
);

Card.Actions = ({ children, style, className }) => (
  <View style={style} className={cn('flex-row justify-end p-2 gap-2', className)}>
    {children}
  </View>
);

export default Card;
