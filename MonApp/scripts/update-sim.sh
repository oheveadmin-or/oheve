#!/bin/bash
# Met a jour l'app Oheve deja installee sur les simulateurs iOS booted,
# sans rebuild natif (contourne l'exigence Xcode 26 d'expo run:ios).
# Ne fonctionne que pour des changements JS/TSX/assets.
# Un changement natif (nouvelle lib, permissions app.json, plugin) exige une build EAS.
set -e

BUNDLE_ID="com.oheve.wedding"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.sim-bundle"

cd "$ROOT"

echo "==> Bundling JS"
rm -rf "$OUT"
mkdir -p "$OUT"
npx expo export:embed \
  --platform ios \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output "$OUT/main.jsbundle" \
  --assets-dest "$OUT"

FOUND=0
for D in $(xcrun simctl list devices booted -j | grep -o '"udid" : "[^"]*"' | cut -d'"' -f4); do
  APP=$(xcrun simctl get_app_container "$D" "$BUNDLE_ID" 2>/dev/null || true)
  [ -z "$APP" ] && continue
  FOUND=1
  echo "==> Mise a jour sur $D"
  xcrun simctl terminate "$D" "$BUNDLE_ID" 2>/dev/null || true
  cp "$OUT/main.jsbundle" "$APP/main.jsbundle"
  rsync -a "$OUT/assets/" "$APP/assets/" 2>/dev/null || true
  # L'app est configuree avec expo-updates (EAS Update) : si une mise a jour OTA
  # a ete telechargee, elle est chargee EN PRIORITE et le bundle qu'on vient de
  # copier est ignore — on testait alors du vieux code sans s'en rendre compte.
  # On retire les mises a jour telechargees pour repartir du bundle embarque.
  DATA=$(xcrun simctl get_app_container "$D" "$BUNDLE_ID" data 2>/dev/null || true)
  if [ -n "$DATA" ] && [ -d "$DATA/Library/Application Support/.expo-internal" ]; then
    rm -rf "$DATA/Library/Application Support/.expo-internal"
    echo "    (mises a jour OTA telechargees retirees)"
  fi
  codesign --force --sign - --timestamp=none "$APP" >/dev/null 2>&1 || true
  xcrun simctl launch "$D" "$BUNDLE_ID"
done

if [ "$FOUND" = "0" ]; then
  echo "Aucun simulateur booted n'a $BUNDLE_ID installe."
  echo "Demarre un simulateur, ou installe une build EAS :"
  echo "  eas build -p ios --profile development-simulator"
  exit 1
fi

echo "==> Termine"
