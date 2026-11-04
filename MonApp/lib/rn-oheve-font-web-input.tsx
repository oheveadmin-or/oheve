// Pendant de lib/rn-oheve-font-web.tsx pour TextInput.
// rn-oheve-font exporte en CommonJS (voir l'explication en tête de ce fichier).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TextInput } = require('./rn-oheve-font') as typeof import('react-native');
export default TextInput;
