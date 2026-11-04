/**
 * Sur le web, babel-preset-expo réécrit `import { Text } from 'react-native'` en
 * `react-native-web/dist/exports/Text` : metro.config.js redirige ces deux chemins
 * ici pour que la police Oheve s'applique aussi (voir lib/rn-oheve-font.tsx).
 */
// rn-oheve-font exporte en CommonJS (voir l'explication en tête de ce fichier).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Text } = require('./rn-oheve-font') as typeof import('react-native');
export default Text;
