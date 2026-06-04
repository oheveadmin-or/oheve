import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Pressable, View } from 'react-native';

import { HeaderMenu } from '@/components/navigation/HeaderMenu';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';

const ROLE_COLORS: Record<string, string> = {
  admin:       C.error,
  prestataire: C.sauge,
  client:      C.saugeDark,
};
const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrateur',
  prestataire: 'Prestataire',
  client:      'Marié(e)',
};

export default function ProfileTabScreen() {
  const { user, signOut } = useAuth();
  const role = user?.role ?? 'client';
  const roleColor = ROLE_COLORS[role] ?? C.textLight;

  const confirmLogout = (allDevices = false) => {
    Alert.alert(
      allDevices ? 'Déconnexion partout' : 'Déconnexion',
      allDevices
        ? 'Vous serez déconnecté de tous vos appareils.'
        : 'Déconnecter cet appareil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: () => signOut(allDevices) },
      ]
    );
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']} style={{ backgroundColor: C.ivoire }}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={styles.headerOverline}>Mon compte</ThemedText>
          <ThemedText style={styles.title}>Profil</ThemedText>
        </View>
        <HeaderMenu />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: C.saugePale }]}>
                <ThemedText style={[styles.avatarTxt, { color: C.saugeDark }]}>
                  {user?.prenom?.[0]?.toUpperCase() ?? '?'}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.name}>
              {`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Utilisateur'}
            </ThemedText>
            <ThemedText style={styles.email}>{user?.email ?? '-'}</ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
              <ThemedText style={[styles.roleBadgeTxt, { color: roleColor }]}>
                {ROLE_LABELS[role]}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Admin shortcut */}
        {role === 'admin' && (
          <Pressable style={styles.adminCard} onPress={() => router.push('/(app)/admin/index' as never)}>
            <Ionicons name="shield-checkmark-outline" size={20} color={C.error} />
            <ThemedText style={styles.adminCardTxt}>Panneau administrateur</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={C.error} />
          </Pressable>
        )}

        {/* Prestataire shortcuts */}
        {role === 'prestataire' && (
          <>
            <ThemedText style={styles.sectionLabel}>Mon activité</ThemedText>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/prestataire/profile-edit' as never)}>
              <Ionicons name="business-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Mon profil prestataire</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/(tabs)/portfolio' as never)}>
              <Ionicons name="images-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Mon portfolio photos</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/(tabs)/messages' as never)}>
              <Ionicons name="chatbubble-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Mes messages</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
          </>
        )}

        {/* Boutique shortcuts */}
        {role === 'boutique' && (
          <>
            <ThemedText style={styles.sectionLabel}>Ma boutique</ThemedText>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/subscription' as never)}>
              <Ionicons name="diamond-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Mon abonnement</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/(tabs)/messages' as never)}>
              <Ionicons name="chatbubble-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Messagerie</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
          </>
        )}

        {/* Client shortcuts */}
        {role === 'client' && (
          <>
            <ThemedText style={styles.sectionLabel}>Mon mariage</ThemedText>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/(tabs)/budget' as never)}>
              <Ionicons name="wallet-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Mon budget</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/(tabs)/guests' as never)}>
              <Ionicons name="people-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Liste des invités</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
            <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/public-site/create' as never)}>
              <Ionicons name="globe-outline" size={18} color={C.sauge} />
              <ThemedText style={styles.itemText}>Site internet du mariage</ThemedText>
              <Ionicons name="chevron-forward" size={16} color={C.textLight} />
            </Pressable>
          </>
        )}

        {/* Menu items */}
        <ThemedText style={styles.sectionLabel}>Mon compte</ThemedText>
        <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/personal-info' as never)}>
          <Ionicons name="person-outline" size={18} color={C.moka} />
          <ThemedText style={styles.itemText}>Informations personnelles</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={C.textLight} />
        </Pressable>

        <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/security' as never)}>
          <Ionicons name="shield-outline" size={18} color={C.moka} />
          <ThemedText style={styles.itemText}>Sécurité & mot de passe</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={C.textLight} />
        </Pressable>

        {role === 'boutique' && (
          <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/subscription' as never)}>
            <Ionicons name="card-outline" size={18} color={C.moka} />
            <ThemedText style={styles.itemText}>Abonnement & paiement</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={C.textLight} />
          </Pressable>
        )}

        <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/payment-methods' as never)}>
          <Ionicons name="wallet-outline" size={18} color={C.moka} />
          <ThemedText style={styles.itemText}>Cartes bancaires</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={C.textLight} />
        </Pressable>

        <View style={styles.itemCard}>
          <Ionicons name="notifications-outline" size={18} color={C.moka} />
          <ThemedText style={styles.itemText}>Notifications</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={C.textLight} />
        </View>

        {/* Mots clés Oheve */}
        <View style={styles.mottosRow}>
          {['Élégance', 'Douceur', 'Authenticité', 'Harmonie', 'Intemporel'].map((m, i, arr) => (
            <View key={m} style={styles.mottosItem}>
              <ThemedText style={styles.motto}>{m}</ThemedText>
              {i < arr.length - 1 && <ThemedText style={styles.mottoDot}> · </ThemedText>}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Pressable style={styles.logoutCard} onPress={() => confirmLogout(false)}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <ThemedText style={styles.logoutTxt}>Déconnexion</ThemedText>
        </Pressable>

        <Pressable style={styles.logoutCardSoft} onPress={() => confirmLogout(true)}>
          <Ionicons name="phone-portrait-outline" size={18} color={C.textLight} />
          <ThemedText style={styles.logoutSoftTxt}>Déconnexion de tous les appareils</ThemedText>
        </Pressable>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  headerOverline: { fontSize: 12, color: C.textLight, marginBottom: 2, letterSpacing: 0.5 },
  title: { fontSize: 32, fontWeight: '700', color: C.textDark },
  content: { gap: 10, paddingBottom: 120 },

  profileCard: {
    borderWidth: 0, borderColor: C.border, borderRadius: RADIUS.lg,
    padding: 18, backgroundColor: C.card,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  avatarWrap: { width: 60, height: 60 },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 24, fontWeight: '800' },
  profileInfo: { flex: 1, gap: 3 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textLight,
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 4, paddingHorizontal: 4,
  },
  name: { fontSize: 18, fontWeight: '700', color: C.textDark },
  email: { fontSize: 13, color: C.textLight },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: RADIUS.pill, marginTop: 4,
  },
  roleBadgeTxt: { fontSize: 11, fontWeight: '700' },

  adminCard: {
    borderWidth: 0, borderColor: C.errorPale, borderRadius: RADIUS.md,
    padding: 14, backgroundColor: C.errorPale,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  adminCardTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: C.error },

  itemCard: {
    borderWidth: 0, borderColor: C.border, borderRadius: RADIUS.md,
    paddingVertical: 15, paddingHorizontal: 16, backgroundColor: C.card,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  itemText: { flex: 1, fontSize: 15, fontWeight: '500', color: C.textDark },

  mottosRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    paddingVertical: 16,
  },
  mottosItem: { flexDirection: 'row', alignItems: 'center' },
  motto: { fontSize: 11, color: C.textLight, letterSpacing: 0.8 },
  mottoDot: { fontSize: 11, color: C.taupe },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },

  logoutCard: {
    borderWidth: 0, borderColor: C.errorPale, borderRadius: RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.card,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: C.error },

  logoutCardSoft: {
    borderWidth: 0, borderColor: C.border, borderRadius: RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.cardAlt,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logoutSoftTxt: { fontSize: 14, fontWeight: '500', color: C.textLight },
});
