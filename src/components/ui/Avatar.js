import React from 'react';
import { View, Text, Image } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';
import { useThemeMode } from '../../context/ThemeModeContext';
import { colors } from '../../theme';

function AvatarText({ label, size = 40, color, style, className }) {
  const { resolvedScheme } = useThemeMode();
  const bgColor = color ?? colors[resolvedScheme].primary;
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }, style]}
      className={cn('items-center justify-center', className)}
    >
      <Text style={{ fontSize: size * 0.4 }} className="text-white font-semibold">
        {label}
      </Text>
    </View>
  );
}

function AvatarIcon({ icon, size = 40, color = '#fff', style, className }) {
  const { resolvedScheme } = useThemeMode();
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors[resolvedScheme].primary }, style]}
      className={cn('items-center justify-center', className)}
    >
      <Icon name={icon} size={size * 0.55} color={color} />
    </View>
  );
}

function AvatarImage({ source, size = 40, style, className }) {
  return (
    <Image
      source={source}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      className={className}
    />
  );
}

const Avatar = { Text: AvatarText, Image: AvatarImage, Icon: AvatarIcon };

export default Avatar;
