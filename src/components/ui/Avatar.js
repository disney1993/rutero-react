import React from 'react';
import { View, Text, Image } from 'react-native';
import Icon from './Icon';
import { cn } from './cn';

function AvatarText({ label, size = 40, color = '#4F46E5', style, className }) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
      className={cn('items-center justify-center', className)}
    >
      <Text style={{ fontSize: size * 0.4 }} className="text-white font-semibold">
        {label}
      </Text>
    </View>
  );
}

function AvatarIcon({ icon, size = 40, color = '#fff', style, className }) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#4F46E5' }, style]}
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
