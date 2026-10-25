// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @stripe/stripe-react-native n'existe qu'en natif (iOS/Android) : sur le web,
// son import fait échouer tout le bundle. On le remplace par une version web
// qui affiche « paiement disponible sur l'app mobile ».
const STRIPE_WEB_SHIM = path.resolve(__dirname, 'lib/stripe-web-shim.tsx');
// Police Oheve partout : le code de l'app (hors node_modules) importe
// 'react-native' via un remplaçant dont Text/TextInput appliquent la police.
const RN_FONT_SHIM = path.resolve(__dirname, 'lib/rn-oheve-font.tsx');
const RN_FONT_WEB_SHIMS = {
  'react-native-web/dist/exports/Text': path.resolve(__dirname, 'lib/rn-oheve-font-web.tsx'),
  'react-native-web/dist/exports/TextInput': path.resolve(__dirname, 'lib/rn-oheve-font-web-input.tsx'),
};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    return { type: 'sourceFile', filePath: STRIPE_WEB_SHIM };
  }
  const origin = context.originModulePath;
  const fromAppCode =
    origin !== RN_FONT_SHIM &&
    origin.startsWith(__dirname) &&
    !origin.includes(`${path.sep}node_modules${path.sep}`);
  if (fromAppCode && moduleName === 'react-native') {
    return { type: 'sourceFile', filePath: RN_FONT_SHIM };
  }
  if (fromAppCode && RN_FONT_WEB_SHIMS[moduleName]) {
    return { type: 'sourceFile', filePath: RN_FONT_WEB_SHIMS[moduleName] };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
