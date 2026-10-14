module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 54+) ya incluye el plugin de react-native-worklets
    // que necesita Reanimated 4, así que no hay que declararlo aquí.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
