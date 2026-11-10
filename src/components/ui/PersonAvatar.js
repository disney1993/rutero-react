import React, { useState } from 'react';
import { View, Image } from 'react-native';
import Avatar from './Avatar';
import { getInitials, resolveAvatarColor } from '../../utils/avatar';

function photoUrl(person) {
  const url = person?.avatar;
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
}

/**
 * Avatar redondo de una persona: su foto (p. ej. la de Google) o, si no tiene
 * o no carga, sus iniciales sobre su color de avatar.
 * `ringColor` dibuja un aro alrededor (p. ej. para marcar la opción elegida).
 */
export default function PersonAvatar({ person, size = 40, ringColor, style }) {
  const [failed, setFailed] = useState(false);
  const url = !failed ? photoUrl(person) : null;
  const ring = ringColor ? 3 : 0;
  const inner = size - ring * 2 - (ringColor ? 2 : 0);

  const content = url ? (
    <Image
      source={{ uri: url }}
      onError={() => setFailed(true)}
      style={{ width: inner, height: inner, borderRadius: inner / 2 }}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <Avatar.Text
      size={inner}
      label={getInitials(person?.first_name, person?.last_name) || '?'}
      color={resolveAvatarColor(person?.avatar_color)}
    />
  );

  if (!ringColor) return <View style={style}>{content}</View>;

  return (
    <View
      style={[{
        width: size, height: size, borderRadius: size / 2, borderWidth: ring, borderColor: ringColor,
        alignItems: 'center', justifyContent: 'center',
      }, style]}
    >
      {content}
    </View>
  );
}
