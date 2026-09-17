import React, { useRef, useState } from 'react';
import { View, Modal, Pressable, Text } from 'react-native';
import { cn } from './cn';

// Menu de un único nivel, anclado a `anchor`. Pensado para el único uso que
// tiene la app (acciones por fila en el panel admin): mide la posición del
// anchor y dibuja el desplegable en un Modal para no quedar recortado por el
// overflow de una lista/ScrollView.
export default function Menu({ visible, onDismiss, anchor, children }) {
  const anchorRef = useRef(null);
  const [position, setPosition] = useState(null);

  const openAt = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setPosition({ x, y: y + height });
    });
  };

  return (
    <>
      <View
        ref={anchorRef}
        onLayout={() => {
          if (visible) openAt();
        }}
      >
        {React.cloneElement(anchor, {
          onPress: (...args) => {
            anchor.props.onPress?.(...args);
            openAt();
          },
        })}
      </View>
      <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onDismiss}>
        <Pressable className="flex-1" onPress={onDismiss}>
          {position && (
            <View
              style={{ position: 'absolute', top: position.y, left: Math.max(8, position.x - 160) }}
              className="min-w-[180px] rounded-xl bg-surface dark:bg-surface-dark shadow-lg py-1"
            >
              {children}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

Menu.Item = ({ title, onPress, dotColor, selected, className }) => (
  <Pressable onPress={onPress} className={cn('flex-row items-center px-4 py-3', className)}>
    {!!dotColor && <View style={{ backgroundColor: dotColor }} className="w-2.5 h-2.5 rounded-full mr-2.5" />}
    <Text className={cn('flex-1 text-onSurface dark:text-onSurface-dark', selected && 'font-bold')}>{title}</Text>
  </Pressable>
);
