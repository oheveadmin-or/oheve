/**
 * Bandeau affiché quand l'admin a ouvert le compte d'un prestataire
 * (Admin → Identifiants → « Ouvrir son compte ») : rappelle dans quel compte
 * on se trouve et permet de revenir à l'admin en un appui.
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';

export function AdminImpersonationBanner() {
  const { user, returnToAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  if (!user?.adminReturn) return null;
  // Comptes créés par l'admin : prénom = nom = nom de l'entreprise → affiché une fois.
  const who = (user.prenom && user.prenom === user.nom ? user.prenom : [user.prenom, user.nom].filter(Boolean).join(' ')) || `compte ${user.id}`;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 4 }]}>
      <Pressable style={styles.pill} onPress={returnToAdmin} accessibilityLabel="Revenir à l'admin">
        <Ionicons name="shield-checkmark" size={14} color="#fff" />
        <ThemedText style={styles.txt} numberOfLines={1}>Admin · {who}</ThemedText>
        <View style={styles.back}>
          <Ionicons name="arrow-undo" size={12} color="#b45309" />
          <ThemedText style={styles.backTxt}>Revenir</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '92%', backgroundColor: '#b45309', borderRadius: 99, paddingLeft: 12, paddingRight: 4, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  txt: { flexShrink: 1, color: '#fff', fontSize: 12, fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  backTxt: { color: '#b45309', fontSize: 12, fontWeight: '700' },
});
