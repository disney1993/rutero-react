const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// react-native-gifted-charts intenta primero 'react-native-linear-gradient' y
// cae a 'expo-linear-gradient'; lo apuntamos directamente al paquete de Expo.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
};

module.exports = withNativeWind(config, { input: './global.css' });
