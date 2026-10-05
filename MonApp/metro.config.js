// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @stripe/stripe-react-native n'existe qu'en natif (iOS/Android) : sur le web,
// son import fait échouer tout le bundle. On le remplace par une version web
// qui affiche « paiement disponible sur l'app mobile ».
const STRIPE_WEB_SHIM = path.resolve(__dirname, 'lib/stripe-web-shim.tsx');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: STRIPE_WEB_SHIM };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
