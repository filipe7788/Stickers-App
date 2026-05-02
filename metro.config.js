const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // expo's messageSocket tries to open a DevTools WebSocket and throws in
      // bare RN apps where globalThis.expo is set by expo-modules-core but the
      // bundle wasn't loaded via Expo's dev server.
      if (moduleName.includes('async-require/messageSocket')) {
        return { type: 'empty' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
