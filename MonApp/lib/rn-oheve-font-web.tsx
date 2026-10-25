/**
 * Sur le web, babel-preset-expo réécrit `import { Text } from 'react-native'` en
 * `react-native-web/dist/exports/Text` : metro.config.js redirige ces deux chemins
 * ici pour que la police Oheve s'applique aussi (voir lib/rn-oheve-font.tsx).
 */
export { Text as default } from './rn-oheve-font';
