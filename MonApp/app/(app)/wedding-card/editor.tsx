import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { analyzeWeddingCardWithClaude, applyClientDataToOverlays } from '../../../src/services/claudeWeddingCard';
import type { WeddingClientData, WeddingFieldId, WeddingOverlay } from '@/src/types/weddingCard';
import { generateWeddingCardCanvasHTML } from '../../../src/utils/weddingCardCanvas';
import { sanitizeFinalWeddingLayout } from '../../../src/utils/weddingCardSanitizer';

type Step = 'import' | 'loading' | 'edit';

type FieldDef = { id: WeddingFieldId; label: string; placeholder: string };
type FieldGroup = { title: string; fields: FieldDef[] };

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Mariée',
    fields: [
      { id: 'bride_first_name', label: 'Prénom mariée', placeholder: 'Odaya' },
      { id: 'bride_last_name', label: 'Nom mariée', placeholder: 'Attia' },
      { id: 'bride_full_name', label: 'Prénom + nom complet mariée', placeholder: 'Odaya Attia' },
    ],
  },
  {
    title: 'Marié',
    fields: [
      { id: 'groom_first_name', label: 'Prénom marié', placeholder: 'Yoseph' },
      { id: 'groom_last_name', label: 'Nom marié', placeholder: 'Layani' },
      { id: 'groom_full_name', label: 'Prénom + nom complet marié', placeholder: 'Yoseph Layani' },
    ],
  },
  {
    title: 'Parents',
    fields: [
      { id: 'bride_parents', label: 'Parents mariée', placeholder: 'Famille Attia' },
      { id: 'groom_parents', label: 'Parents marié', placeholder: 'Famille Layani' },
    ],
  },
  {
    title: 'Texte religieux & invitation',
    fields: [
      { id: 'religious_text', label: 'Texte hébreu haut / bénédiction', placeholder: 'בס״ד' },
      { id: 'main_invitation', label: 'Phrase principale', placeholder: 'Vous êtes cordialement invités...' },
      { id: 'subtitle', label: 'Sous-phrase', placeholder: 'Venez célébrer notre union' },
    ],
  },
  {
    title: 'Date et horaires',
    fields: [
      { id: 'weekday', label: 'Jour de la semaine', placeholder: 'Mardi' },
      { id: 'date_full', label: 'Date complète', placeholder: '12 octobre 2026' },
      { id: 'date_short', label: 'Date courte', placeholder: '12/10/2026' },
      { id: 'ceremony_time', label: 'Heure cérémonie', placeholder: '18:00' },
      { id: 'reception_time', label: 'Heure réception', placeholder: '20:00' },
    ],
  },
  {
    title: 'Lieu',
    fields: [
      { id: 'venue_name', label: 'Nom du lieu', placeholder: 'Salle Eden' },
      { id: 'address_line_1', label: 'Adresse ligne 1', placeholder: '12 rue des Fleurs' },
      { id: 'address_line_2', label: 'Adresse ligne 2', placeholder: 'Bâtiment B' },
      { id: 'city', label: 'Ville', placeholder: 'Paris' },
      { id: 'country', label: 'Pays', placeholder: 'France' },
    ],
  },
  {
    title: 'Infos supplémentaires',
    fields: [
      { id: 'rsvp', label: 'RSVP', placeholder: 'Réponse souhaitée avant le 20/09' },
      { id: 'rsvp_phone', label: 'Téléphone RSVP', placeholder: '+33 6 12 34 56 78' },
      { id: 'dress_code', label: 'Dress code', placeholder: 'Élégant chic' },
      { id: 'custom_note', label: 'Note personnalisée', placeholder: 'Votre présence est notre joie' },
      { id: 'website', label: 'Hashtag / site web', placeholder: '#OdayaYoseph / wedding.com' },
    ],
  },
];

export default function WeddingCardEditorScreen() {
  const [step, setStep] = useState<Step>('import');
  const [claudeApiKey, setClaudeApiKey] = useState(process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '');
  const [openAiApiKey, setOpenAiApiKey] = useState(process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '');
  const [imageUri, setImageUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [cleanedImageBase64, setCleanedImageBase64] = useState('');
  const [isCleanedImage, setIsCleanedImage] = useState(false);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [overlays, setOverlays] = useState<WeddingOverlay[]>([]);
  const [clientData, setClientData] = useState<WeddingClientData>({});
  const [textLanguage, setTextLanguage] = useState<'français' | 'anglais' | 'hébreu'>('français');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOverlays, setExportOverlays] = useState<WeddingOverlay[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const webViewRef = useRef<WebView>(null);

  const detectedIds = useMemo(() => new Set(overlays.map((ov) => ov.id)), [overlays]);

  const resolvedClientData = useMemo<WeddingClientData>(() => {
    const next: WeddingClientData = { ...clientData };

    const fillFullName = (full: WeddingFieldId, first: WeddingFieldId, last: WeddingFieldId) => {
      const currentFull = String(next[full] || '').trim();
      const firstName = String(next[first] || '').trim();
      const lastName = String(next[last] || '').trim();
      if (!currentFull && (firstName || lastName)) {
        next[full] = `${firstName} ${lastName}`.trim();
      }
    };

    const splitFullName = (full: WeddingFieldId, first: WeddingFieldId, last: WeddingFieldId) => {
      const currentFull = String(next[full] || '').trim();
      if (!currentFull) return;
      const parts = currentFull.split(/\s+/).filter(Boolean);
      if (!parts.length) return;
      if (!String(next[first] || '').trim()) next[first] = parts[0];
      if (!String(next[last] || '').trim() && parts.length > 1) next[last] = parts.slice(1).join(' ');
    };

    fillFullName('bride_full_name', 'bride_first_name', 'bride_last_name');
    fillFullName('groom_full_name', 'groom_first_name', 'groom_last_name');
    splitFullName('bride_full_name', 'bride_first_name', 'bride_last_name');
    splitFullName('groom_full_name', 'groom_first_name', 'groom_last_name');

    return next;
  }, [clientData]);

  const pickImage = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      base64: true,
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    if (!asset.uri || !asset.base64) return;
    setImageUri(asset.uri);
    setImageBase64(asset.base64);
    setImageMimeType(asset.mimeType || 'image/jpeg');
    setImageAspectRatio(asset.width && asset.height ? Math.max(0.4, asset.width / asset.height) : 1);
    setOverlays([]);
    setClientData({});
    setCleanedImageBase64('');
    setIsCleanedImage(false);
    setActiveId(null);
  };

  const updateField = (id: WeddingFieldId, text: string) => {
    setClientData((prev) => ({ ...prev, [id]: text }));
    setOverlays((prev) =>
      prev.map((ov) =>
        ov.id === id
          ? {
              ...ov,
              new_text: text.trim() || undefined,
              text: text.trim() || ov.original_text || '',
            }
          : ov,
      ),
    );
  };

  const analyze = async () => {
    if (!imageBase64) return setError('Choisis une image avant analyse.');
    if (!claudeApiKey.trim()) return setError('Renseigne ta clé API Claude.');
    setError('');
    setLoadingMessage('🔍 Claude analyse votre carton...');
    setStep('loading');

    try {
      const analysis = await analyzeWeddingCardWithClaude(claudeApiKey, imageBase64, imageMimeType);
      const finalLayout = {
        ...analysis,
        overlays: applyClientDataToOverlays(analysis.overlays, resolvedClientData),
      };
      if (!finalLayout.overlays.length) throw new Error('Aucune zone de texte détectée. Réessaie avec une carte plus nette.');

      // Rendu stable: on force le nettoyage local canvas, plus fiable sur mobile.
      setCleanedImageBase64('');
      setIsCleanedImage(false);

      setLoadingMessage('✅ Prêt !');
      setOverlays(finalLayout.overlays);
      setActiveId(finalLayout.overlays[0]?.id ?? null);
      setStep('edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('import');
    }
  };

  const onExport = async () => {
    if (!imageBase64 || !overlays.length) return setError('Rien à exporter.');
    setError('');

    try {
      const analysis = await analyzeWeddingCardWithClaude(claudeApiKey, imageBase64, imageMimeType);
      const exportLayout = {
        ...analysis,
        overlays: applyClientDataToOverlays(analysis.overlays, resolvedClientData),
      };
      const finalExport = sanitizeFinalWeddingLayout(exportLayout.overlays);
      // Forcer l'image source d'origine + nettoyage local canvas.
      setCleanedImageBase64('');
      setIsCleanedImage(false);
      setExportOverlays(finalExport.length ? finalExport : overlaysForExport);
      setIsExporting(true);
    } catch (e) {
      setExportOverlays(overlaysForExport);
      setIsCleanedImage(Boolean(cleanedImageBase64));
      setIsExporting(true);
      setError(e instanceof Error ? e.message : 'Reconstruction IA impossible, export local utilisé');
    }
  };

  const onWebMessage = async (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        data?: string;
        message?: string;
      };
      if (msg.type === 'EXPORT_ERROR') throw new Error(msg.message || 'Erreur canvas');
      if (msg.type !== 'EXPORT_READY' || !msg.data) return;

      const payload = msg.data.replace('data:image/png;base64,', '');
      const fileUri = `${LegacyFileSystem.documentDirectory}invitation_${Date.now()}.png`;
      await LegacyFileSystem.writeAsStringAsync(fileUri, payload, {
        encoding: LegacyFileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Enregistrer votre carton',
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setIsExporting(false);
    }
  };

  const overlaysForExport = useMemo(() => {
    const merged = applyClientDataToOverlays(overlays, resolvedClientData);
    return sanitizeFinalWeddingLayout(merged);
  }, [overlays, resolvedClientData]);

  return (
    <ScreenLayout>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.steps}>
            {(['import', 'loading', 'edit'] as Step[]).map((s) => (
              <View key={s} style={[styles.dot, step === s ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>

          {step === 'import' && (
            <View style={styles.card}>
              <ThemedText style={styles.title}>✉️ Wedding Card Editor</ThemedText>
              <ThemedText style={styles.subtitle}>Importe ta carte de mariage, modifie les textes, exporte.</ThemedText>

              <ThemedText style={styles.label}>Clé API Claude</ThemedText>
              <TextInput
                style={styles.input}
                value={claudeApiKey}
                onChangeText={setClaudeApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="sk-ant-..."
                placeholderTextColor="#9ca3af"
              />
              <ThemedText style={styles.label}>Clé API OpenAI</ThemedText>
              <TextInput
                style={styles.input}
                value={openAiApiKey}
                onChangeText={setOpenAiApiKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="sk-..."
                placeholderTextColor="#9ca3af"
              />

              <View style={styles.row}>
                <Pressable style={styles.btnSecondary} onPress={pickImage}>
                  <Text style={styles.btnSecondaryText}>{imageUri ? '✅ Image chargée' : '📁 Choisir image'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnPrimary, (!claudeApiKey.trim() || !imageBase64) && styles.disabled]}
                  onPress={analyze}
                  disabled={!claudeApiKey.trim() || !imageBase64}
                >
                  <Text style={styles.btnPrimaryText}>Analyser →</Text>
                </Pressable>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          )}

          {step === 'loading' && (
            <View style={[styles.card, styles.center]}>
              <ActivityIndicator size="large" color="#6c47ff" />
              <Text style={styles.loadingTitle}>{loadingMessage || 'Analyse en cours...'}</Text>
              <Text style={styles.loadingSubtitle}>
                {loadingMessage.includes('Claude') && 'Détection des zones de texte'}
                {loadingMessage.includes('OpenAI') && 'Suppression des anciens textes'}
                {loadingMessage.includes('Prêt') && 'Tu peux modifier tes infos'}
              </Text>
            </View>
          )}

          {step === 'edit' && (
            <>
              <View style={styles.editHeader}>
                <Pressable
                  onPress={() => {
                    setStep('import');
                    setOverlays([]);
                    setClientData({});
                    setCleanedImageBase64('');
                    setIsCleanedImage(false);
                    setImageUri('');
                    setImageBase64('');
                  }}
                >
                  <Text style={styles.backBtn}>← Nouvelle carte</Text>
                </Pressable>
                <Text style={styles.editCount}>{overlays.length} zones détectées</Text>
              </View>

              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Aperçu</ThemedText>
                <Text style={styles.note}>Rendu anti-rectangles : effacement minimal mesuré puis texte redessiné proprement.</Text>
                <View style={[styles.preview, { aspectRatio: imageAspectRatio }]}>
                  <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                  {overlays.map((ov) => (
                    <Pressable
                      key={ov.id}
                      onPress={() => setActiveId(ov.id)}
                      style={[
                        styles.overlayZone,
                        {
                          left: `${ov.x_pct}%`,
                          top: `${ov.y_pct}%`,
                          width: `${ov.width_pct}%`,
                          height: `${ov.height_pct}%`,
                          borderColor: activeId === ov.id ? '#6c47ff' : 'rgba(108,71,255,0.25)',
                          borderWidth: activeId === ov.id ? 2 : 1,
                          backgroundColor: 'transparent',
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Modifier les textes</ThemedText>
                <Text style={styles.note}>Les champs sont reliés aux overlays détectés quand une zone correspondante existe.</Text>

                <View style={styles.languageRow}>
                  <Text style={styles.languageLabel}>Langue du texte</Text>
                  <View style={styles.languageOptions}>
                    {(['français', 'anglais', 'hébreu'] as const).map((lang) => (
                      <Pressable
                        key={lang}
                        onPress={() => setTextLanguage(lang)}
                        style={[styles.langChip, textLanguage === lang && styles.langChipActive]}
                      >
                        <Text style={[styles.langChipText, textLanguage === lang && styles.langChipTextActive]}>{lang}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {FIELD_GROUPS.map((group) => (
                  <View key={group.title} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {group.fields.map((field) => {
                      const linked = overlays.find((ov) => ov.id === field.id);
                      const value =
                        String(resolvedClientData[field.id] ?? '').trim() ||
                        linked?.new_text ||
                        linked?.text ||
                        '';
                      const isDetected = detectedIds.has(field.id);
                      const linkedOverlay = overlays.find((ov) => ov.id === field.id);
                      return (
                        <Pressable
                          key={field.id}
                          style={[styles.fieldCard, isDetected && styles.fieldCardDetected]}
                          onPress={() => setActiveId(linkedOverlay?.id ?? null)}
                        >
                          <View style={styles.fieldHeader}>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <Text style={[styles.badge, isDetected ? styles.badgeDetected : styles.badgePending]}>
                              {isDetected ? 'Overlay lié' : 'Zone non détectée'}
                            </Text>
                          </View>
                          <TextInput
                            style={[styles.fieldInput, field.id === 'religious_text' && styles.rtl]}
                            value={value}
                            onChangeText={(text) => updateField(field.id, text)}
                            multiline
                            textAlign={field.id === 'religious_text' ? 'right' : 'left'}
                            placeholder={field.placeholder}
                            placeholderTextColor="#9ca3af"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ))}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable style={[styles.btnExport, isExporting && styles.disabled]} onPress={onExport} disabled={isExporting}>
                  <Text style={styles.btnExportText}>{isExporting ? '⏳ Export en cours...' : '💾 Exporter & Partager'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {isExporting && (
        <>
          <View style={styles.exportOverlay}>
            <View style={styles.exportCard}>
              <ActivityIndicator size="large" color="#6c47ff" />
              <Text style={styles.exportTitle}>Génération en cours...</Text>
              <Text style={styles.exportSubtitle}>Le design original est conservé, seuls les textes sont remplacés</Text>
            </View>
          </View>
          <WebView
            ref={webViewRef}
            style={styles.hidden}
            originWhitelist={['*']}
            source={{
              html: generateWeddingCardCanvasHTML(
                cleanedImageBase64 || imageBase64,
                imageMimeType,
                exportOverlays,
                resolvedClientData,
                isCleanedImage,
              ),
            }}
            onMessage={onWebMessage}
            javaScriptEnabled
          />
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 120, paddingHorizontal: 14 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 8 },
  dot: { borderRadius: 99 },
  dotActive: { width: 10, height: 10, backgroundColor: '#6c47ff' },
  dotInactive: { width: 7, height: 7, backgroundColor: '#ddd6fe' },
  card: { borderRadius: 18, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e6f0', gap: 10 },
  center: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#8b8b9e' },
  label: { fontSize: 12, fontWeight: '600', color: '#8b8b9e' },
  input: {
    borderWidth: 1,
    borderColor: '#e8e6f0',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#f7f6fb',
    fontSize: 15,
    color: '#1a1a2e',
  },
  row: { flexDirection: 'row', gap: 10 },
  btnPrimary: { flex: 1, borderRadius: 12, backgroundColor: '#6c47ff', alignItems: 'center', paddingVertical: 13 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6c47ff',
    backgroundColor: '#ede9ff',
    alignItems: 'center',
    paddingVertical: 13,
  },
  btnSecondaryText: { color: '#6c47ff', fontWeight: '700', fontSize: 14 },
  btnExport: { borderRadius: 14, backgroundColor: '#6c47ff', alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  btnExportText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.45 },
  error: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  loadingSubtitle: { fontSize: 13, color: '#8b8b9e', textAlign: 'center' },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  backBtn: { color: '#6c47ff', fontWeight: '700', fontSize: 14 },
  editCount: { fontSize: 12, color: '#8b8b9e', fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
  note: { fontSize: 12, color: '#8b8b9e' },
  preview: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e6f0',
    position: 'relative',
    backgroundColor: '#f7f6fb',
  },
  overlayZone: { position: 'absolute', borderStyle: 'dashed' },
  group: { gap: 8, marginBottom: 4 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: '#3f3f56', marginTop: 4 },
  languageRow: { gap: 8, marginBottom: 8 },
  languageLabel: { fontSize: 13, color: '#6b7280', fontWeight: '700' },
  languageOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  langChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  langChipActive: { borderColor: '#6c47ff', backgroundColor: '#ede9ff' },
  langChipText: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  langChipTextActive: { color: '#6c47ff' },
  fieldCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e6f0',
    backgroundColor: '#fff',
    gap: 6,
  },
  fieldCardDetected: { borderColor: '#c4b5fd', backgroundColor: '#faf8ff' },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeDetected: { color: '#6c47ff', backgroundColor: '#ede9ff' },
  badgePending: { color: '#6b7280', backgroundColor: '#f3f4f6' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e8e6f0',
    borderRadius: 10,
    backgroundColor: '#f7f6fb',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1a1a2e',
    minHeight: 44,
  },
  rtl: { textAlign: 'right' },
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  exportCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10, marginHorizontal: 40 },
  exportTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  exportSubtitle: { fontSize: 13, color: '#8b8b9e', textAlign: 'center' },
  hidden: { width: 1, height: 1, opacity: 0, position: 'absolute' },
});
