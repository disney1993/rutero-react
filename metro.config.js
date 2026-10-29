const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// react-native-gifted-charts intenta primero 'react-native-linear-gradient' y
// cae a 'expo-linear-gradient'; lo apuntamos directamente al paquete de Expo.
// tslib: react-native-big-calendar lo exige; sin resolución explícita Metro a
// veces falla con los "exports" .mjs y la app entera queda en blanco al entrar.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
  tslib: require.resolve('tslib'),
};

module.exports = withNativeWind(config, { input: './global.css' });
