const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Hermes-specific configuration
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Exclude Firebase Functions compiled files from bundling
config.resolver.blockList = [
  /firebase\/functions\/lib\/.*/,
  /firebase\/functions\/src\/.*/,
];

// Add resolver configuration for lucide-react-native
config.resolver.alias = {
  'lucide-react-native': 'lucide-react-native/dist/esm/index.js',
};

config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;