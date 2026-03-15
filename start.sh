#!/bin/bash
# Script pour tout relancer proprement

echo "🛑 Arrêt des processus existants..."
pkill -f "tsx watch" 2>/dev/null
lsof -ti:3003 | xargs kill -9 2>/dev/null
sleep 2

echo "🚀 Démarrage du backend..."
cd "$(dirname "$0")/backend"
npm run dev &
BACKEND_PID=$!

sleep 3
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo "✅ Backend démarré sur http://localhost:3003"
  echo ""
  echo "Pour démarrer l'app Expo dans un autre terminal:"
  echo "  cd MonApp && npx expo start"
  wait $BACKEND_PID
else
  echo "❌ Le backend n'a pas démarré correctement"
  exit 1
fi
