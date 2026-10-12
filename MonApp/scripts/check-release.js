#!/usr/bin/env node
/**
 * Vérification AVANT chaque build / mise à jour : bloque la publication si la
 * configuration Google Sign-In est incohérente (cause du plantage d'oct. 2026 :
 * iosClientId absent/décalé → l'app se fermait à la connexion Google).
 *
 * Lancé automatiquement par EAS Build (script npm « eas-build-pre-install »)
 * et par `npm run release:update` / `npm run release:build`.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];

const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const authSrc = fs.readFileSync(path.join(root, 'hooks', 'use-social-auth.ts'), 'utf8');

const readConst = (name) => {
  const m = authSrc.match(new RegExp(`const ${name}\\s*=\\s*'([^']*)'`));
  return m ? m[1] : null;
};
const CLIENT_ID = /^(\d+)-[a-z0-9]+\.apps\.googleusercontent\.com$/;

const webId = readConst('GOOGLE_WEB_CLIENT_ID');
const iosId = readConst('GOOGLE_IOS_CLIENT_ID');

if (!webId || !CLIENT_ID.test(webId)) errors.push(`GOOGLE_WEB_CLIENT_ID invalide ou absent dans hooks/use-social-auth.ts (${webId})`);
if (!iosId || !CLIENT_ID.test(iosId)) errors.push(`GOOGLE_IOS_CLIENT_ID invalide ou absent dans hooks/use-social-auth.ts (${iosId})`);
if (webId && iosId) {
  if (webId === iosId) errors.push("GOOGLE_WEB_CLIENT_ID et GOOGLE_IOS_CLIENT_ID sont identiques : le Web ID doit être celui du client « Application Web ».");
  const pw = webId.match(CLIENT_ID)?.[1];
  const pi = iosId.match(CLIENT_ID)?.[1];
  if (pw && pi && pw !== pi) errors.push(`Les IDs Google viennent de projets différents (${pw} vs ${pi}).`);
}

const plugin = (appJson.plugins || []).find((p) => Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin');
const scheme = plugin?.[1]?.iosUrlScheme;
if (!scheme) {
  errors.push("app.json : plugin @react-native-google-signin/google-signin sans iosUrlScheme.");
} else if (iosId) {
  const expected = `com.googleusercontent.apps.${iosId.replace('.apps.googleusercontent.com', '')}`;
  if (scheme !== expected) errors.push(`app.json : iosUrlScheme (${scheme}) ne correspond pas à l'iOS Client ID → attendu ${expected}`);
}

if (!appJson.ios?.bundleIdentifier) errors.push('app.json : ios.bundleIdentifier manquant.');

if (errors.length) {
  console.error('\n❌ Publication bloquée — configuration incohérente :\n');
  for (const e of errors) console.error(`  • ${e}`);
  console.error('');
  process.exit(1);
}
console.log('✅ Configuration Google Sign-In cohérente — publication autorisée.');
