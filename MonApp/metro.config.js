// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Stripe React Native est un module natif : sur le web (et pour le rendu
// « static » d'Expo Router), on le remplace par un stub pour que Metro ne
// plante plus avec « Importing native-only module … on web ».
const stripeWebStub = path.resolve(__dirname, 'lib/web-stubs/stripe-react-native.tsx');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: stripeWebStub };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
