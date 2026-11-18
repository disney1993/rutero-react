const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Paper tries the scoped package first; map it to Expo's icon set on web.
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@react-native-vector-icons/material-design-icons':
      '@expo/vector-icons/MaterialCommunityIcons',
    'react-native-vector-icons': '@expo/vector-icons',
    '@react-native/assets-registry/registry': false,
  };

  // Ensure icon .ttf files from @expo/vector-icons are emitted as assets.
  config.module.rules.push({
    test: /\.ttf$/,
    include: [
      path.resolve(__dirname, 'node_modules/@expo/vector-icons'),
      path.resolve(__dirname, 'node_modules/react-native-vector-icons'),
    ],
    type: 'asset/resource',
  });

  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /export 'default'\.'interpolate' \(imported as 'Animated'\) was not found in 'react-native-reanimated'/,
  ];

  return config;
};
