import React from 'react';
import { View, Text } from 'react-native';
import { cn } from './cn';

function tintFromHex(hex, alpha = 0.15) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return undefined;
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (full.length !== 6) return undefined;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return undefined;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.color] Accent hex for value text + soft background tint
 * @param {boolean} [props.compact] Denser tile for 3-up phone rows
 */
export default function StatTile({ label, value, color, compact = false }) {
  const bgTint = tintFromHex(color, 0.15);
  const accentStyle = color ? { color } : undefined;

  return (
    <View
      className={cn(
        'flex-1 items-center rounded-2xl',
        compact ? 'min-w-[30%] p-2' : 'min-w-[22%] p-2.5',
        !color && 'bg-primary/15 dark:bg-primary-dark/20',
      )}
      style={bgTint ? { backgroundColor: bgTint } : undefined}
    >
      <Text
        numberOfLines={compact ? 2 : 1}
        adjustsFontSizeToFit={compact}
        minimumFontScale={0.7}
        className={cn(
          'font-bold text-center',
          compact ? 'text-base' : 'text-xl',
          !color && 'text-primary dark:text-primary-dark',
        )}
        style={accentStyle}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
        className={cn(
          'opacity-80 text-center',
          compact ? 'text-[10px] leading-3 mt-0.5' : 'text-xs',
          !color && 'text-primary dark:text-primary-dark',
        )}
        style={accentStyle}
      >
        {label}
      </Text>
    </View>
  );
}
