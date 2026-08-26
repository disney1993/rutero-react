const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Warnings inofensivas conocidas: @react-navigation/drawer trae una vista
  // "legacy" que referencia una API antigua de react-native-reanimated que ya
  // no se exporta (no se usa en tiempo de ejecución), y react-native-paper
  // intenta primero un paquete de iconos que no está instalado antes de caer
  // en el fallback de @expo/vector-icons que sí funciona. Ninguna de las dos
  // afecta al build ni al funcionamiento de la app.
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /export 'default'\.'interpolate' \(imported as 'Animated'\) was not found in 'react-native-reanimated'/,
    /Can't resolve '@react-native-vector-icons\/material-design-icons'/,
  ];

  return config;
};
