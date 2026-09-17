const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // react-native-gifted-charts tries 'react-native-linear-gradient' first and
  // falls back to 'expo-linear-gradient', but webpack still reports the
  // failed resolve as a warning. Alias it directly so the require succeeds
  // on the first try instead of failing into the catch block.
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-native-linear-gradient': 'expo-linear-gradient',
  };

  // Harmless: react-native-reanimated 2.x lacks the legacy 'interpolate'
  // alias that @react-navigation/drawer optionally destructures; it falls
  // back to 'interpolateNode' at runtime.
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /was not found in 'react-native-reanimated'/,
  ];

  return config;
};
