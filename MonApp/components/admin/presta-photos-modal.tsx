/**
 * Admin → Identifiants → « Photos, vidéos & PDF » : gérer le portfolio d'un
 * compte prestataire (photos/vidéos par lot, couverture, suppression) et ses
 * PDF (brochure, menu, tarifs). Un fichier déjà présent sur la fiche est
 * refusé par le serveur (empreinte du fichier) et compté comme doublon ignoré.
 */
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { askCoverInFeed } from '@/lib/ask-cover-in-feed';
import { isTooLong, TOO_LONG_MESSAGE, VIDEO_PICK_OPTIONS } from '@/lib/video-pick';
import { adminApi } from '@/services/auth/api';

type Photo = { id: number; url: string; is_cover: boolean; in_feed?: boolean; media_type?: 'image' | 'video'; caption?: string | null };
type Doc = { id: number; title: string; size: number | null; url: string };
type Pending = { key: string; uri: string; isVideo: boolean; duration: number | null; caption: string };

const durLabel = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}` : '');

const sizeLabel = (n: number | null) => (!n ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

function openDoc(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank');
  else Linking.openURL(url).catch(() => Alert.alert('Impossible', "Le PDF n'a pas pu être ouvert."));
}

export function PrestaPhotosModal({ token, userId, name, onClose }: {
  token: string;
  userId: number | null;
  name: string;
  /** `changed` = le nombre de photos a changé (pour rafraîchir la liste). */
  onClose: (changed: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [gridW, setGridW] = useState(0);
  // 3 colonnes, 6 px d'écart ; avant la 1re mesure : largeur écran − marges.
  const tileSize = Math.max(60, Math.floor(((gridW || winW - 32) - 12) / 3));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docBusy, setDocBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [changed, setChanged] = useState(false);
  // Fichiers choisis, pas encore envoyés : l'admin ajoute un commentaire puis confirme.
  const [pending, setPending] = useState<Pending[]>([]);
  const [pendingInFeed, setPendingInFeed] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [res, d] = await Promise.all([
      adminApi.listPrestatairePhotos(token, userId),
      adminApi.listPrestataireDocuments(token, userId),
    ]);
    setPhotos(res.success ? (res.data as Photo[]) : []);
    setDocs(d.success ? (d.data as Doc[]) : []);
    setLoading(false);
  }, [token, userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.all([adminApi.listPrestatairePhotos(token, userId), adminApi.listPrestataireDocuments(token, userId)])
      .then(([res, d]) => {
        if (!alive) return;
        setPhotos(res.success ? (res.data as Photo[]) : []);
        setDocs(d.success ? (d.data as Doc[]) : []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [token, userId]);

  const close = () => {
    if (progress) return; // envoi en cours : on ne ferme pas au milieu
    setPending([]);
    onClose(changed); setChanged(false); setLoading(true);
  };

  /** Étape 1 : choisir les fichiers → écran de vérification (rien n'est encore envoyé). */
  const add = async () => {
    if (!userId || progress) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à votre galerie dans les Réglages.");
      return;
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.85,
        ...VIDEO_PICK_OPTIONS,
        // Limite finie : avec 0 (illimité) iOS masque parfois le bouton « Ajouter ».
        selectionLimit: 30,
      });
    } catch {
      Alert.alert('Photo illisible', "Une des photos n'a pas pu être lue (photo iCloud non téléchargée ?). Réessayez.");
      return;
    }
    if (result.canceled || !result.assets.length) return;

    // Même fichier choisi deux fois dans le même lot → gardé une seule fois.
    const seen = new Set<string>();
    const unique = result.assets.filter((a) => {
      const k = a.assetId || a.uri;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const ok = unique.filter((a) => !isTooLong(a));
    const tooLong = unique.length - ok.length;
    if (tooLong) Alert.alert(tooLong > 1 ? `${tooLong} vidéos ignorées` : 'Vidéo ignorée', TOO_LONG_MESSAGE);
    if (!ok.length) return;
    setPending((prev) => [
      ...prev,
      ...ok.map((a) => ({ key: a.assetId || a.uri, uri: a.uri, isVideo: a.type === 'video', duration: a.duration ?? null, caption: '' })),
    ]);
  };

  /** Étape 2 : l'admin a vérifié et commenté → envoi. */
  const send = async () => {
    if (!userId || progress || !pending.length) return;
    const items = pending;
    let added = 0;
    let dupes = 0;
    const errors: string[] = [];
    const failed: Pending[] = [];
    setProgress({ done: 0, total: items.length });
    // 3 envois en parallèle : bien plus rapide qu'un par un pour un lot.
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < items.length) {
        const it = items[next++];
        const res = await adminApi.uploadPrestatairePhoto(token, userId, it.uri, { caption: it.caption, inFeed: pendingInFeed });
        if (res.success && res.data) { added++; setPhotos((p) => [...p, res.data as unknown as Photo]); }
        else if ((res as { duplicate?: boolean }).duplicate) dupes++;
        else { errors.push(res.message ?? 'Erreur'); failed.push(it); }
        done++;
        setProgress({ done, total: items.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, items.length) }, worker));
    setProgress(null);
    // Les échecs restent dans la liste pour pouvoir réessayer sans tout rechoisir.
    setPending(failed);
    if (added) setChanged(true);
    await load(); // ordre serveur (couverture en premier)
    if (dupes || errors.length) {
      Alert.alert(
        added ? `${added} ajoutée(s)` : 'Rien ajouté',
        [
          dupes ? `${dupes} doublon(s) ignoré(s) : déjà sur la fiche.` : '',
          errors.length ? `${errors.length} échec(s) : ${errors[0]}\nIls restent dans la liste : touchez « Envoyer » pour réessayer.` : '',
        ].filter(Boolean).join('\n'),
      );
    }
  };

  const cancelPending = () => {
    if (progress) return;
    setPending([]);
  };

  const addPdf = async () => {
    if (!userId || docBusy) return;
    let picked: DocumentPicker.DocumentPickerResult;
    try {
      picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true, copyToCacheDirectory: true });
    } catch {
      Alert.alert('Fichier illisible', "Le PDF n'a pas pu être lu. Réessayez.");
      return;
    }
    if (picked.canceled || !picked.assets?.length) return;
    setDocBusy(true);
    let added = 0; let dupes = 0; const errors: string[] = [];
    for (const a of picked.assets) {
      const title = (a.name || '').replace(/\.pdf$/i, '').trim() || undefined;
      const res = await adminApi.uploadPrestataireDocument(token, userId, a.uri, title);
      if (res.success) added++;
      else if ((res as { duplicate?: boolean }).duplicate) dupes++;
      else errors.push(res.message ?? 'Erreur');
    }
    setDocBusy(false);
    if (added) setChanged(true);
    await load();
    if (dupes || errors.length) {
      Alert.alert(
        added ? `${added} PDF ajouté(s)` : 'Aucun PDF ajouté',
        [dupes ? `${dupes} doublon(s) ignoré(s) : déjà sur la fiche.` : '', errors.length ? errors[0] : ''].filter(Boolean).join('\n'),
      );
    }
  };

  const removeDoc = (d: Doc) => {
    if (!userId) return;
    Alert.alert(`Supprimer « ${d.title} » ?`, 'Le PDF disparaîtra de la fiche du prestataire.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const res = await adminApi.deletePrestataireDocument(token, userId, d.id);
          if (!res.success) { Alert.alert('Impossible', res.message ?? 'Réessayez.'); return; }
          setDocs((list) => list.filter((x) => x.id !== d.id));
        },
      },
    ]);
  };

  const makeCover = async (p: Photo) => {
    if (!userId || p.is_cover || p.media_type === 'video') return;
    const inFeed = await askCoverInFeed();
    if (inFeed === null) return;
    const res = await adminApi.setPrestatairePhotoCover(token, userId, p.id, inFeed);
    if (!res.success) { Alert.alert('Impossible', res.message ?? 'Réessayez.'); return; }
    setPhotos((list) => list.map((x) => ({ ...x, is_cover: x.id === p.id, ...(x.id === p.id ? { in_feed: inFeed } : {}) })));
  };

  /** Publier / retirer une photo des reels (elle reste sur la fiche). */
  const toggleFeed = async (p: Photo) => {
    if (!userId) return;
    const next = p.in_feed === false;
    const res = await adminApi.setPrestatairePhotoInFeed(token, userId, p.id, next);
    if (!res.success) { Alert.alert('Impossible', res.message ?? 'Réessayez.'); return; }
    setPhotos((list) => list.map((x) => (x.id === p.id ? { ...x, in_feed: next } : x)));
  };

  const remove = (p: Photo) => {
    if (!userId) return;
    Alert.alert('Supprimer cette photo ?', 'Elle disparaîtra de la fiche du prestataire.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          const res = await adminApi.deletePrestatairePhoto(token, userId, p.id);
          if (!res.success) { Alert.alert('Impossible', res.message ?? 'Réessayez.'); return; }
          setChanged(true);
          load();
        },
      },
    ]);
  };

  return (
    <Modal visible={userId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.root, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title} numberOfLines={1}>Photos, vidéos & PDF</ThemedText>
            <ThemedText style={styles.subtitle} numberOfLines={1}>{name}</ThemedText>
          </View>
          <Pressable hitSlop={10} onPress={close} accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color="#343630" />
          </Pressable>
        </View>

        {pending.length > 0 ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 40}>
            <ThemedText style={styles.sectionTitle}>Vérifier avant l&apos;envoi · {pending.length}</ThemedText>
            <ThemedText style={styles.foot}>Ajoutez un commentaire si vous voulez (il s&apos;affiche sous la photo/vidéo), puis touchez « Envoyer ».</ThemedText>
            <ScrollView style={{ flex: 1, marginTop: 10 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {pending.map((it) => (
                <View key={it.key} style={styles.pRow}>
                  <View style={styles.pThumb}>
                    {it.isVideo ? (
                      <View style={[StyleSheet.absoluteFill, styles.video]}>
                        <Ionicons name="play-circle" size={26} color="#fff" />
                        {it.duration ? <ThemedText style={styles.pDur}>{durLabel(it.duration)}</ThemedText> : null}
                      </View>
                    ) : (
                      <Image source={{ uri: it.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    )}
                  </View>
                  <TextInput
                    style={styles.pInput}
                    value={it.caption}
                    onChangeText={(t) => setPending((l) => l.map((x) => (x.key === it.key ? { ...x, caption: t } : x)))}
                    placeholder="Ajouter un commentaire (facultatif)"
                    placeholderTextColor="#9a9c93"
                    multiline
                    maxLength={500}
                    editable={!progress}
                  />
                  <Pressable hitSlop={8} disabled={!!progress} accessibilityLabel="Retirer de l'envoi"
                    onPress={() => setPending((l) => l.filter((x) => x.key !== it.key))}>
                    <Ionicons name="close-circle" size={22} color="#9a9c93" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.pAddMore} onPress={add} disabled={!!progress}>
                <Ionicons name="add" size={16} color="#4a5240" />
                <ThemedText style={styles.pdfTxt}>Ajouter d&apos;autres fichiers</ThemedText>
              </Pressable>
            </ScrollView>
            <Pressable style={styles.pFeedRow} onPress={() => setPendingInFeed((v) => !v)} disabled={!!progress}>
              <Ionicons name={pendingInFeed ? 'checkbox' : 'square-outline'} size={20} color="#4a5240" />
              <ThemedText style={styles.pFeedTxt}>Publier aussi dans les reels (sinon : fiche seulement)</ThemedText>
            </Pressable>
            <View style={styles.pBtns}>
              <Pressable style={[styles.pCancel, !!progress && { opacity: 0.5 }]} onPress={cancelPending} disabled={!!progress}>
                <ThemedText style={styles.pdfTxt}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.addBtn, { flex: 1 }, !!progress && { opacity: 0.7 }]} onPress={send} disabled={!!progress}>
                {progress ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />}
                <ThemedText style={styles.addTxt}>
                  {progress ? `Envoi ${progress.done}/${progress.total}…` : `Envoyer (${pending.length})`}
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : (
        <>
        <Pressable style={[styles.addBtn, !!progress && { opacity: 0.7 }]} onPress={add} disabled={!!progress}>
          {progress ? <ActivityIndicator color="#fff" /> : <Ionicons name="images-outline" size={18} color="#fff" />}
          <ThemedText style={styles.addTxt}>
            {progress ? `Envoi ${progress.done}/${progress.total}…` : 'Ajouter des photos ou vidéos'}
          </ThemedText>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#929B83" style={{ marginTop: 40 }} />
        ) : (
        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          {photos.length === 0 ? (
            <ThemedText style={styles.empty}>Aucune photo pour l&apos;instant. La 1re image ajoutée devient la couverture.</ThemedText>
          ) : (
          <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
            {photos.map((p) => (
              <View key={p.id} style={[styles.tile, { width: tileSize, height: tileSize }]}>
                {p.media_type === 'video' ? (
                  <View style={[StyleSheet.absoluteFill, styles.video]}>
                    <Ionicons name="play-circle" size={34} color="#fff" />
                  </View>
                ) : (
                  <Image source={{ uri: p.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                )}
                <View style={styles.badges}>
                  {p.is_cover ? (
                    <View style={styles.coverBadge}><ThemedText style={styles.coverTxt}>Couverture</ThemedText></View>
                  ) : null}
                  {p.in_feed === false ? (
                    <View style={styles.hiddenBadge}><Ionicons name="eye-off" size={11} color="#fff" /></View>
                  ) : null}
                </View>
                {p.caption ? (
                  <Pressable style={styles.captionBadge} hitSlop={6} onPress={() => Alert.alert('Commentaire', p.caption ?? '')}
                    accessibilityLabel="Voir le commentaire">
                    <Ionicons name="chatbubble-ellipses" size={12} color="#fff" />
                  </Pressable>
                ) : null}

                <View style={styles.actions}>
                  <Pressable style={styles.action} hitSlop={6} onPress={() => toggleFeed(p)}
                    accessibilityLabel={p.in_feed === false ? 'Publier dans les reels' : 'Retirer des reels'}>
                    <Ionicons name={p.in_feed === false ? 'eye-outline' : 'eye-off-outline'} size={15} color="#fff" />
                  </Pressable>
                  {p.media_type !== 'video' && !p.is_cover ? (
                    <Pressable style={styles.action} hitSlop={6} onPress={() => makeCover(p)} accessibilityLabel="Mettre en couverture">
                      <Ionicons name="star-outline" size={15} color="#fff" />
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.action} hitSlop={6} onPress={() => remove(p)} accessibilityLabel="Supprimer">
                    <Ionicons name="trash-outline" size={15} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          )}
          <ThemedText style={styles.foot}>
            {photos.length} photo(s)/vidéo(s) · étoile = mettre en couverture · œil = publier/retirer des reels (barré = fiche seulement) · un fichier déjà présent n&apos;est pas ajouté deux fois.
          </ThemedText>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Documents PDF · {docs.length}</ThemedText>
            <ThemedText style={styles.foot}>Brochure, menu, tarifs… visibles sur la fiche du prestataire.</ThemedText>
          </View>
          {docs.map((d) => (
            <View key={d.id} style={styles.docRow}>
              <Pressable style={styles.docMain} onPress={() => openDoc(d.url)}>
                <View style={styles.docIcon}><Ionicons name="document-text" size={18} color="#b91c1c" /></View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.docTitle} numberOfLines={2}>{d.title}</ThemedText>
                  <ThemedText style={styles.docSub}>PDF{d.size ? ` · ${sizeLabel(d.size)}` : ''} · toucher pour ouvrir</ThemedText>
                </View>
              </Pressable>
              <Pressable style={styles.docDel} hitSlop={8} onPress={() => removeDoc(d)} accessibilityLabel="Supprimer le PDF">
                <Ionicons name="trash-outline" size={17} color="#b91c1c" />
              </Pressable>
            </View>
          ))}
          <Pressable style={[styles.pdfBtn, docBusy && { opacity: 0.7 }]} onPress={addPdf} disabled={docBusy}>
            {docBusy ? <ActivityIndicator color="#4a5240" /> : <Ionicons name="document-attach-outline" size={18} color="#4a5240" />}
            <ThemedText style={styles.pdfTxt}>{docBusy ? 'Envoi…' : 'Ajouter des PDF'}</ThemedText>
          </Pressable>
        </ScrollView>
        )}
        </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf8f4', paddingHorizontal: 16, paddingTop: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#343630' },
  subtitle: { fontSize: 13, color: '#5c5f57' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4a5240', borderRadius: 14, paddingVertical: 13 },
  addTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  section: { marginTop: 8, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#343630' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', padding: 10 },
  docMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#343630' },
  docSub: { fontSize: 11, color: '#9a9c93' },
  docDel: { padding: 6 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#d9ddd0', borderRadius: 14, paddingVertical: 12, backgroundColor: '#fff' },
  pdfTxt: { color: '#4a5240', fontWeight: '700', fontSize: 14 },
  // Taille en pixels (calculée) : width '32%' + aspectRatio donnait sur iPhone
  // des cases qui prenaient la place mais restaient invisibles.
  tile: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#ece8e0' },
  video: { backgroundColor: '#343630', alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', left: 4, bottom: 4, flexDirection: 'row', gap: 4 },
  coverBadge: { backgroundColor: 'rgba(52,54,48,0.8)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  coverTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  hiddenBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(52,54,48,0.8)', alignItems: 'center', justifyContent: 'center' },
  actions: { position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 4 },
  action: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(52,54,48,0.65)', alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#9a9c93', marginTop: 32, fontSize: 14, paddingHorizontal: 20 },
  foot: { fontSize: 11, color: '#9a9c93' },
  captionBadge: { position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(52,54,48,0.8)', alignItems: 'center', justifyContent: 'center' },
  pRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', padding: 8 },
  pThumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: '#ece8e0' },
  pDur: { position: 'absolute', bottom: 3, right: 5, color: '#fff', fontSize: 10, fontWeight: '700' },
  pInput: { flex: 1, minHeight: 64, maxHeight: 120, fontSize: 14, color: '#343630', textAlignVertical: 'top', paddingTop: 4 },
  pAddMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  pFeedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  pFeedTxt: { flex: 1, fontSize: 13, color: '#343630' },
  pBtns: { flexDirection: 'row', gap: 10 },
  pCancel: { paddingHorizontal: 18, borderRadius: 14, borderWidth: 1.5, borderColor: '#d9ddd0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
