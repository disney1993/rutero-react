import React from 'react';
import { View, Text } from 'react-native';

export default function StatTile({ label, value }) {
  return (
    <View className="flex-1 min-w-[22%] rounded-2xl p-2.5 items-center bg-primary/15 dark:bg-primary-dark/20">
      <Text className="font-bold text-center text-xl text-primary dark:text-primary-dark">{value}</Text>
      <Text className="opacity-80 text-center text-xs text-primary dark:text-primary-dark">{label}</Text>
    </View>
  );
}
