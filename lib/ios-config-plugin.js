const { withPodfileProperties } = require('@expo/config-plugins');

const withIosConfig = (config, { useModularHeaders = true, newArchEnabled = false } = {}) => {
  return withPodfileProperties(config, (config) => {
    if (!config.ios) {
      config.ios = {};
    }
    
    if (!config.ios.podfileProperties) {
      config.ios.podfileProperties = {};
    }
    
    // Configure modular headers for Firebase compatibility
    config.ios.podfileProperties['ios.useModularHeaders'] = useModularHeaders.toString();
    
    // Disable new architecture to avoid Firebase Swift module issues
    config.ios.podfileProperties['newArchEnabled'] = newArchEnabled.toString();
    
    return config;
  });
};

module.exports = withIosConfig;
