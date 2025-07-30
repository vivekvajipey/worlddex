module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Remove reanimated plugin for tests as it causes issues
      // 'react-native-reanimated/plugin',
    ],
  };
};