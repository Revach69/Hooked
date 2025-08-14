module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Temporarily commenting out this plugin to test if it's causing the issue
      // ['@babel/plugin-transform-modules-commonjs', {
      //   allowTopLevelThis: true,
      //   loose: true,
      // }],
    ],
  };
}; 