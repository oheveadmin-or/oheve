import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { ErrorBanner } from '@/components/ui/error-banner';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useAuth } from '@/contexts/auth-context';
import { prestatairesApi, messagingApi, authApi, uploadFile } from '@/services/auth/api';
import { API_ENDPOINTS } from '@/constants/config';
import { getCoupleDisplayName, getCoupleInitials } from '@/lib/couple-utils';

const { width: W } = Dimensions.get('window');
const PHOTO_SIZE = (W - 3) / 3;

const ROLE_COLORS: Record<string, string> = {
  admin: C.error,
  prestataire: C.sauge,
  client: C.saugeDark,
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  prestataire: 'Prestataire',
  client: 'Marié(e)',
};

type Photo = { id: number; url: string; is_cover: boolean; caption?: string | null };

type PrestProfile = {
  business_name?: string;
  category?: string;
  city?: string;
  location_city?: string;
  description?: string;
  cover_url?: string;
  instagram?: string;
  instagram_url?: string;
  website?: string;
  website_url?: string;
  profile_views?: number;
};

// ── Instagram-style prestataire profile ─────────────────────────────────────
function PrestataireInstaProfile() {
  const { user, signOut, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PrestProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [settingsModal, setSettingsModal] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.accessToken) { setLoading(false); return; }
    try {
      const [profRes, photoRes, msgRes] = await Promise.allSettled([
        prestatairesApi.getById(user.accessToken, user.id),
        prestatairesApi.getPhotos(user.accessToken),
        messagingApi.listConversations(user.accessToken),
      ]);
      if (profRes.status === 'fulfilled' && profRes.value?.success) setProfile(profRes.value.data);
      if (photoRes.status === 'fulfilled' && photoRes.value?.success) setPhotos(photoRes.value.data ?? []);
      if (msgRes.status === 'fulfilled' && msgRes.value?.success) setMsgCount(msgRes.value.data?.length ?? 0);
      const allFailed = [profRes, photoRes, msgRes].every(
        (r) => r.status !== 'fulfilled' || !r.value?.success,
      );
      if (allFailed) {
        const msg = profRes.status === 'fulfilled' ? profRes.value?.message : null;
        setLoadError(msg || 'Impossible de charger votre profil. Vérifiez votre connexion.');
      } else {
        setLoadError(null);
      }
    } catch {
      setLoadError('Impossible de charger votre profil. Vérifiez votre connexion.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      // Champ 'avatar' : la route backend attend uploadAvatar.single('avatar').
      // Sans ce nom, uploadFile envoie sous 'photo' → fichier ignoré, avatar jamais enregistré.
      const res = await uploadFile(API_ENDPOINTS.avatar, user!.accessToken!, result.assets[0].uri, 'avatar');
      if (res?.success && res.data?.avatar_url) {
        await updateUser({ avatar_url: res.data.avatar_url as string });
      } else {
        Alert.alert('Photo non enregistrée', res?.message ?? 'Vérifiez votre connexion et réessayez.');
      }
      load();
    } catch {
      Alert.alert('Photo non enregistrée', 'Vérifiez votre connexion et réessayez.');
    }
    setUploadingAvatar(false);
  };

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const pickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadFile(
        `${API_ENDPOINTS.prestataires}/me/photos`,
        user!.accessToken!,
        result.assets[0].uri,
        'photo'
      );
      if (res?.success) {
        load();
      } else {
        Alert.alert('Erreur', res?.message || 'Impossible d\'uploader la photo');
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : String(e));
    }
    setUploadingPhoto(false);
  };

  const confirmLogout = (allDevices = false) => {
    Alert.alert(
      allDevices ? 'Déconnexion partout' : 'Déconnexion',
      allDevices ? 'Vous serez déconnecté de tous vos appareils.' : 'Déconnecter cet appareil ?',
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Déconnecter', style: 'destructive', onPress: () => signOut(allDevices) }]
    );
  };

  const businessName = profile?.business_name ?? `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
  const coverPhoto = photos.find((p) => p.is_cover);
  const avatarLetter = (user?.prenom?.[0] ?? '?').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      {/* Header bar */}
      <View style={instaStyles.headerBar}>
        <ThemedText style={instaStyles.headerName} numberOfLines={1}>{businessName}</ThemedText>
        <View style={instaStyles.headerRight}>
          <Pressable hitSlop={12} onPress={() => router.push('/(app)/(tabs)/messages' as never)}>
            <Ionicons name="chatbubble-outline" size={22} color={C.textDark} />
            {msgCount > 0 && <View style={instaStyles.msgBadge}><ThemedText style={instaStyles.msgBadgeTxt}>{msgCount}</ThemedText></View>}
          </Pressable>
          <Pressable hitSlop={12} onPress={() => setSettingsModal(true)}>
            <Ionicons name="reorder-three-outline" size={26} color={C.textDark} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: loadError ? 12 : 0 }}>
          <ErrorBanner message={loadError} onRetry={load} />
        </View>
        {/* Profile info */}
        <View style={instaStyles.profileBlock}>
          {/* Avatar — photo de profil affichée aussi côté client */}
          <Pressable style={instaStyles.avatarWrap} onPress={pickAvatar}>
            {(user?.avatar_url ?? coverPhoto?.url) ? (
              <Image source={{ uri: user?.avatar_url ?? coverPhoto!.url }} style={instaStyles.avatarImg} contentFit="cover" />
            ) : (
              <View style={instaStyles.avatarFallback}>
                <ThemedText style={instaStyles.avatarLetter}>{avatarLetter}</ThemedText>
              </View>
            )}
            <View style={instaStyles.avatarEditBadge}>
              <Ionicons name="add" size={12} color="#fff" />
            </View>
            {uploadingAvatar && <View style={instaStyles.avatarOverlay} />}
          </Pressable>

          {/* Stats */}
          <View style={instaStyles.statsRow}>
            <View style={instaStyles.stat}>
              <ThemedText style={instaStyles.statNum}>{photos.length}</ThemedText>
              <ThemedText style={instaStyles.statLbl}>publications</ThemedText>
            </View>
            <View style={instaStyles.stat}>
              <ThemedText style={instaStyles.statNum}>{profile?.profile_views ?? 0}</ThemedText>
              <ThemedText style={instaStyles.statLbl}>vues</ThemedText>
            </View>
            <View style={instaStyles.stat}>
              <ThemedText style={instaStyles.statNum}>{msgCount}</ThemedText>
              <ThemedText style={instaStyles.statLbl}>messages</ThemedText>
            </View>
          </View>
        </View>

        {/* Bio block */}
        <View style={instaStyles.bioBlock}>
          <ThemedText style={instaStyles.bioName}>{businessName}</ThemedText>
          {profile?.category && (
            <View style={[instaStyles.catBadge]}>
              <ThemedText style={instaStyles.catBadgeTxt}>{profile.category.charAt(0).toUpperCase() + profile.category.slice(1)}</ThemedText>
            </View>
          )}
          {profile?.description ? (
            <ThemedText style={instaStyles.bioDesc}>{profile.description}</ThemedText>
          ) : (
            <ThemedText style={[instaStyles.bioDesc, { color: C.textLight, fontStyle: 'italic' }]}>Ajoutez une description de votre activité</ThemedText>
          )}
          {(profile?.location_city ?? profile?.city) && (
            <View style={instaStyles.locationRow}>
              <Ionicons name="location-outline" size={13} color={C.textLight} />
              <ThemedText style={instaStyles.locationTxt}>{profile.location_city ?? profile.city}</ThemedText>
            </View>
          )}
          {(profile?.instagram_url ?? profile?.instagram) && (
            <Pressable style={instaStyles.locationRow} onPress={() => Linking.openURL(`https://instagram.com/${profile.instagram_url ?? profile.instagram}`).catch(() => {})}>
              <Ionicons name="logo-instagram" size={13} color="#e1306c" />
              <ThemedText style={[instaStyles.locationTxt, { color: '#e1306c' }]}>@{profile.instagram_url ?? profile.instagram}</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Action buttons */}
        <View style={instaStyles.actionRow}>
          <Pressable style={instaStyles.editBtn} onPress={() => router.push('/(app)/prestataire/profile-edit' as never)}>
            <ThemedText style={instaStyles.editBtnTxt}>Modifier le profil</ThemedText>
          </Pressable>
          <Pressable style={instaStyles.editBtn} onPress={() => router.push(`/(app)/providers/${user?.id}` as never)}>
            <ThemedText style={instaStyles.editBtnTxt}>Voir mon profil</ThemedText>
          </Pressable>
          <Pressable style={instaStyles.addBtn} onPress={() => router.push('/(app)/(tabs)/explore' as never)}>
            <Ionicons name="add" size={18} color={C.textDark} />
          </Pressable>
        </View>

        {/* Photo grid */}
        <View style={instaStyles.gridDivider} />

        {photos.length === 0 ? (
          <Pressable style={instaStyles.emptyGrid} onPress={() => router.push('/(app)/(tabs)/explore' as never)}>
            <Ionicons name="camera-outline" size={48} color={C.taupe} />
            <ThemedText style={instaStyles.emptyGridTitle}>Partagez vos réalisations</ThemedText>
            <ThemedText style={instaStyles.emptyGridSub}>Publiez vos photos dans l'Explore{'\n'}pour être vu par les futurs mariés</ThemedText>
            <View style={instaStyles.emptyGridBtn}>
              <ThemedText style={instaStyles.emptyGridBtnTxt}>+ Ajouter une photo</ThemedText>
            </View>
          </Pressable>
        ) : (
          <FlatList
            data={[{ id: -1, url: '', is_cover: false } as Photo, ...photos]}
            keyExtractor={(p) => String(p.id)}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item }) => {
              if (item.id === -1) {
                return (
                  <Pressable style={[instaStyles.gridPhoto, instaStyles.addPhotoCell]} onPress={pickAndUploadPhoto} disabled={uploadingPhoto}>
                    <Ionicons name={uploadingPhoto ? 'hourglass-outline' : 'add'} size={28} color={C.sauge} />
                    {!uploadingPhoto && <ThemedText style={instaStyles.addPhotoCellTxt}>Ajouter</ThemedText>}
                  </Pressable>
                );
              }
              return (
                <Pressable style={instaStyles.gridPhoto} onPress={() => router.push('/(app)/(tabs)/portfolio' as never)}>
                  <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  {item.is_cover && (
                    <View style={instaStyles.coverBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                    </View>
                  )}
                  {item.caption ? (
                    <View style={instaStyles.gridCaption}>
                      <Ionicons name="text" size={9} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Settings modal */}
      <Modal visible={settingsModal} transparent animationType="slide" onRequestClose={() => setSettingsModal(false)}>
        <Pressable style={instaStyles.modalOverlay} onPress={() => setSettingsModal(false)}>
          <Pressable style={[instaStyles.modalSheet, { paddingBottom: insets.bottom + 24 }]} onPress={(e) => e.stopPropagation()}>
            <View style={instaStyles.modalHandle} />
            <ThemedText style={instaStyles.modalTitle}>Paramètres</ThemedText>

            {[
              { icon: 'person-outline', label: 'Informations personnelles', route: '/(app)/personal-info' },
              { icon: 'star-outline', label: 'Mon abonnement Oheve', route: '/(app)/prestataire/manage-subscription' },
              { icon: 'shield-outline', label: 'Sécurité & mot de passe', route: '/(app)/security' },
              { icon: 'card-outline', label: 'Recevoir des paiements (Stripe)', route: '/(app)/stripe-connect' },
              { icon: 'notifications-outline', label: 'Notifications', route: '/(app)/notifications' },
            ].map((item) => (
              <Pressable
                key={item.label}
                style={instaStyles.modalItem}
                onPress={() => { setSettingsModal(false); if (item.route) router.push(item.route as never); }}
              >
                <Ionicons name={item.icon as 'home'} size={20} color={C.moka} />
                <ThemedText style={instaStyles.modalItemTxt}>{item.label}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={C.textLight} />
              </Pressable>
            ))}

            <View style={instaStyles.modalDivider} />

            <Pressable style={instaStyles.modalItem} onPress={() => { setSettingsModal(false); confirmLogout(false); }}>
              <Ionicons name="log-out-outline" size={20} color={C.error} />
              <ThemedText style={[instaStyles.modalItemTxt, { color: C.error }]}>Déconnexion</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Generic client profile ───────────────────────────────────────────────────
function ClientProfile() {
  const { user, signOut, updateUser } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const role = user?.role ?? 'client';
  const roleColor = ROLE_COLORS[role] ?? C.textLight;
  const coupleName = getCoupleDisplayName(user);
  const coupleInitials = getCoupleInitials(user);
  const displayName = coupleName ?? ((`${user?.prenom ?? ''} ${user?.nom ?? ''}`).trim() || 'Utilisateur');

  const confirmLogout = (allDevices = false) => {
    Alert.alert(
      allDevices ? 'Déconnexion partout' : 'Déconnexion',
      allDevices ? 'Vous serez déconnecté de tous vos appareils.' : 'Déconnecter cet appareil ?',
      [{ text: 'Annuler', style: 'cancel' }, { text: 'Déconnecter', style: 'destructive', onPress: () => signOut(allDevices) }]
    );
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorise l\'accès à la galerie dans les réglages');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      // Champ 'avatar' : la route backend attend uploadAvatar.single('avatar').
      // Sans ce nom, uploadFile envoie sous 'photo' → fichier ignoré, avatar jamais enregistré.
      const res = await uploadFile(API_ENDPOINTS.avatar, user!.accessToken!, result.assets[0].uri, 'avatar');
      if (res?.success && res.data?.avatar_url) {
        await updateUser({ avatar_url: res.data.avatar_url as string });
      } else {
        Alert.alert('Erreur', res?.message ?? 'Impossible de mettre à jour la photo');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    }
    setUploadingAvatar(false);
  };

  return (
    <ScreenLayout edges={['top', 'left', 'right']} style={{ backgroundColor: C.ivoire }}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={styles.headerOverline}>Mon compte</ThemedText>
          <ThemedText style={styles.title}>Profil</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Pressable style={styles.avatarWrap} onPress={pickAvatar} disabled={uploadingAvatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: C.saugePale }]}>
                <ThemedText style={[styles.avatarTxt, { color: C.saugeDark }]}>
                  {coupleInitials}
                </ThemedText>
              </View>
            )}
            <View style={styles.avatarCameraBadge}>
              <Ionicons name={uploadingAvatar ? 'hourglass-outline' : 'camera'} size={12} color="#fff" />
            </View>
          </Pressable>
          <View style={styles.profileInfo}>
            <ThemedText style={styles.name}>{displayName}</ThemedText>
            {coupleName && (
              <ThemedText style={styles.coupleSub}>Votre couple 💍</ThemedText>
            )}
            <ThemedText style={styles.email}>{user?.email ?? '-'}</ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '22' }]}>
              <ThemedText style={[styles.roleBadgeTxt, { color: roleColor }]}>{ROLE_LABELS[role]}</ThemedText>
            </View>
          </View>
        </View>

        {role === 'admin' && (
          <Pressable style={styles.adminCard} onPress={() => router.push('/(app)/admin' as never)}>
            <Ionicons name="shield-checkmark-outline" size={20} color={C.error} />
            <ThemedText style={styles.adminCardTxt}>Panneau administrateur</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={C.error} />
          </Pressable>
        )}


        {/* Oheve Premium */}
        {user?.premium ? (
          <View style={[styles.itemCard, { borderColor: C.sauge, borderWidth: 1.5 }]}>
            <Ionicons name="star" size={18} color={C.sauge} />
            <ThemedText style={[styles.itemText, { color: C.saugeDark, fontWeight: '700' }]}>Oheve Premium · Actif</ThemedText>
            <Ionicons name="checkmark-circle" size={16} color={C.sauge} />
          </View>
        ) : (
          <Pressable style={[styles.itemCard, { backgroundColor: C.saugePale }]} onPress={() => router.push('/(app)/premium' as never)}>
            <Ionicons name="star-outline" size={18} color={C.saugeDark} />
            <ThemedText style={[styles.itemText, { color: C.saugeDark, fontWeight: '700' }]}>Passer à Oheve Premium · 50 €</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={C.saugeDark} />
          </Pressable>
        )}

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
        <Pressable style={styles.itemCard} onPress={() => router.push('/(app)/notifications' as never)}>
          <Ionicons name="notifications-outline" size={18} color={C.moka} />
          <ThemedText style={styles.itemText}>Notifications</ThemedText>
          <Ionicons name="chevron-forward" size={16} color={C.textLight} />
        </Pressable>

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

// ── Main export ──────────────────────────────────────────────────────────────
export default function ProfileTabScreen() {
  const { user } = useAuth();
  if (user?.role === 'prestataire') return <PrestataireInstaProfile />;
  return <ClientProfile />;
}

// ── Styles ───────────────────────────────────────────────────────────────────
const instaStyles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  headerName: { flex: 1, marginRight: 12, fontSize: 18, fontWeight: '800', color: C.textDark },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  msgBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
  },
  msgBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  profileBlock: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 16,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 82, height: 82, borderRadius: 41, borderWidth: 2, borderColor: C.sauge },
  avatarFallback: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.sauge,
  },
  avatarLetter: { fontSize: 30, fontWeight: '800', color: C.saugeDark },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 41 },

  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '800', color: C.textDark },
  statLbl: { fontSize: 11, color: C.textLight },

  bioBlock: { paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  bioName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  catBadge: {
    alignSelf: 'flex-start', backgroundColor: C.saugePale,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill,
  },
  catBadgeTxt: { fontSize: 11, fontWeight: '700', color: C.saugeDark },
  bioDesc: { fontSize: 13, color: C.textMid, lineHeight: 18, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationTxt: { fontSize: 12, color: C.textLight },

  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  editBtn: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingVertical: 7, alignItems: 'center', backgroundColor: C.card,
  },
  editBtnTxt: { fontSize: 13, fontWeight: '600', color: C.textDark },
  addBtn: {
    width: 36, borderWidth: 1, borderColor: C.border, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.card,
  },

  gridDivider: { height: 0.5, backgroundColor: C.border },

  gridPhoto: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRightWidth: 1.5, borderRightColor: '#fff',
    position: 'relative', overflow: 'hidden',
  },
  coverBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: C.sauge, borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  gridCaption: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 9,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  addPhotoCell: {
    backgroundColor: C.saugePale,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoCellTxt: { fontSize: 10, color: C.sauge, fontWeight: '600' },

  emptyGrid: { alignItems: 'center', paddingVertical: 48, gap: 10, paddingHorizontal: 32 },
  emptyGridTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  emptyGridSub: { fontSize: 13, color: C.textLight, textAlign: 'center', lineHeight: 19 },
  emptyGridBtn: {
    marginTop: 6, backgroundColor: C.sauge,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyGridBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingBottom: 32, paddingTop: 10, gap: 4,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.textDark, marginBottom: 8 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border,
  },
  modalItemTxt: { flex: 1, fontSize: 15, fontWeight: '500', color: C.textDark },
  modalDivider: { height: 8 },
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerOverline: { fontSize: 12, color: C.textLight, marginBottom: 2, letterSpacing: 0.5 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '700', color: C.textDark },
  content: { gap: 10, paddingBottom: 120 },
  profileCard: {
    borderWidth: 0, borderColor: C.border, borderRadius: RADIUS.lg,
    padding: 18, backgroundColor: C.card,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  avatarWrap: { width: 60, height: 60, position: 'relative' },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarCameraBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.sauge, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 24, fontWeight: '800' },
  profileInfo: { flex: 1, gap: 3 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textLight,
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 8, marginBottom: 4, paddingHorizontal: 4,
  },
  name: { fontSize: 18, fontWeight: '700', color: C.textDark },
  coupleSub: { fontSize: 12, color: C.saugeDark, fontWeight: '600' },
  email: { fontSize: 13, color: C.textLight },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, marginTop: 4 },
  roleBadgeTxt: { fontSize: 11, fontWeight: '700' },
  adminCard: {
    borderRadius: RADIUS.md, padding: 14, backgroundColor: C.errorPale,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  adminCardTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: C.error },
  itemCard: {
    borderWidth: 0, borderColor: C.border, borderRadius: RADIUS.md,
    paddingVertical: 15, paddingHorizontal: 16, backgroundColor: C.card,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  itemText: { flex: 1, fontSize: 15, fontWeight: '500', color: C.textDark },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  logoutCard: {
    borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.card,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: C.error },
  logoutCardSoft: {
    borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.cardAlt,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  logoutSoftTxt: { fontSize: 14, fontWeight: '500', color: C.textLight },
});
