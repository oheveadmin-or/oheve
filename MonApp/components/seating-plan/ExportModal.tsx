import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { useSiteStyle, type SiteStyleState } from '@/hooks/use-site-style';
import { generateSeatingPlanHtml } from '@/lib/seating-plan/pdf-html';
import type { SiteStyle } from '@/lib/seating-plan/site-style';
import { PANEL_TEMPLATES, DEFAULT_PANEL_TEMPLATE } from '@/lib/seating-plan/panel-templates';
import type { PanelTemplateId } from '@/lib/seating-plan/panel-templates';
import {
  CARD_STYLES,
  EXPORT_OPTIONS,
  type PdfCardStyle,
  type PdfExportType,
  type SeatingPlanData,
} from '@/lib/seating-plan/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  data: SeatingPlanData;
};

const EXPORT_LABELS: Record<PdfExportType, string> = {
  panneaux: 'Cartes_Panneau',
  complet: 'Plan_Complet',
  mural: 'Plan_Mural',
  cartes: 'Cartes_Table',
  'marque-places': 'Marque_Places',
  traiteur: 'Feuille_Service',
  livre: 'Livre_Tables',
  liste: 'Liste_Invites',
};

// Tous les formats sont mis en page en A4 (595 × 842 pt, @page size:A4 sans
// marge) : on impose ce format à l'imprimante et au PDF, sinon iOS part sur du
// Letter américain et décale les pages.
const A4_PAGE = { width: 595, height: 842, margins: { left: 0, top: 0, right: 0, bottom: 0 } };

/** Web : imprime le HTML dans une iframe cachée (window.print imprimerait l'app). */
function printHtmlOnWeb(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) { iframe.remove(); throw new Error('print-unavailable'); }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  const go = () => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  // Laisse le temps aux polices (Google Fonts) de se charger avant d'imprimer.
  const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (fonts?.ready) fonts.ready.then(() => setTimeout(go, 150), () => go());
  else setTimeout(go, 500);
}

// ── Template thumbnail ─────────────────────────────────────────────────────────

function TemplateThumbnail({
  template, selected, onPress,
}: {
  template: typeof PANEL_TEMPLATES[0];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[th.wrapper, selected && { borderColor: template.primary, borderWidth: 2 }]} onPress={onPress}>
      {/* Mini card preview */}
      <View style={[th.card, { backgroundColor: template.bg, borderColor: template.accent + '88' }]}>
        {/* Top color band */}
        <View style={[th.topBand, { backgroundColor: template.primary }]} />
        {/* Center: table number */}
        <Text style={[th.num, { color: template.primary }]}>1</Text>
        {/* Ornament symbol */}
        <Text style={[th.symbol, { color: template.accent || template.primary }]}>{template.symbol}</Text>
        {/* Guest list lines */}
        <View style={th.lines}>
          {[0.72, 0.55, 0.65, 0.5, 0.60].map((w, i) => (
            <View key={i} style={[th.line, { width: `${w * 100}%`, backgroundColor: template.primary, opacity: 0.18 }]} />
          ))}
        </View>
        {/* Badge */}
        {template.badge && (
          <View style={[th.badge, { backgroundColor: template.primary }]}>
            <Text style={th.badgeTxt}>{template.badge}</Text>
          </View>
        )}
        {/* Selected check */}
        {selected && (
          <View style={[th.check, { backgroundColor: template.primary }]}>
            <Ionicons name="checkmark" size={9} color="#fff" />
          </View>
        )}
      </View>
      {/* Template name */}
      <Text style={[th.label, selected && { color: template.primary, fontWeight: '700' }]} numberOfLines={2}>
        {template.name}
      </Text>
    </Pressable>
  );
}

const th = StyleSheet.create({
  wrapper: {
    width: '48%', marginBottom: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: 'transparent', padding: 3,
  },
  card: {
    height: 150, borderRadius: 8, borderWidth: 1,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    position: 'relative', paddingHorizontal: 10,
  },
  topBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, opacity: 0.7 },
  num: {
    fontSize: 40, fontWeight: '700', lineHeight: 46,
    fontFamily: 'serif',
  },
  symbol: { fontSize: 14, marginTop: 2, opacity: 0.6 },
  lines: { marginTop: 12, width: '86%' },
  line: { height: 2.5, borderRadius: 1.5, marginBottom: 5, alignSelf: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontSize: 7, color: '#fff', fontWeight: '700' },
  check: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 11.5, color: C.textMid, fontWeight: '500',
    textAlign: 'center', marginTop: 6, lineHeight: 15,
  },
});

// ── Choix du style : mon invitation / modèles Oheve ───────────────────────────

function SiteStyleThumb({ style }: { style: SiteStyle }) {
  const img = style.images.top ?? style.images.bg;
  return (
    <View style={[ss.thumb, { backgroundColor: style.c.paper, borderColor: style.c.foil + '88' }]}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {style.decor.kind === 'lines' && (
        <View style={[ss.thumbFrame, { borderColor: style.c.foil }]} />
      )}
      {style.decor.kind === 'stripes' && (
        <View style={ss.stripes}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? 'transparent' : style.c.foil }} />
          ))}
        </View>
      )}
      <Text style={[ss.thumbNum, { color: style.c.foil, marginTop: style.decor.kind === 'frame' ? 38 : 10 }]}>1</Text>
      <View style={{ width: '56%', marginTop: 4 }}>
        {[0.8, 0.6, 0.7].map((w, i) => (
          <View key={i} style={{ height: 2, width: `${w * 100}%`, alignSelf: 'center', marginTop: 4, borderRadius: 1, backgroundColor: style.c.ink, opacity: 0.35 }} />
        ))}
      </View>
    </View>
  );
}

function StyleSourcePicker({
  site, source, onChange,
}: { site: SiteStyleState; source: 'site' | 'oheve'; onChange: (v: 'site' | 'oheve') => void }) {
  const siteOn = source === 'site' && site.status === 'ready';
  const siteDisabled = site.status === 'none' || site.status === 'error';
  return (
    <View style={styles.galleryBox}>
      <ThemedText style={styles.galleryTitle}>Style des affiches</ThemedText>
      <View style={ss.row}>
        <Pressable
          style={[ss.choice, siteOn && ss.choiceOn, siteDisabled && { opacity: 0.55 }]}
          onPress={() => !siteDisabled && onChange('site')}
          disabled={siteDisabled}
          accessibilityLabel="Utiliser le style de mon invitation"
        >
          {site.status === 'ready' ? (
            <SiteStyleThumb style={site.style} />
          ) : (
            <View style={[ss.thumb, ss.thumbEmpty]}>
              {site.status === 'loading'
                ? <ActivityIndicator color={C.sauge} />
                : <Ionicons name="sparkles-outline" size={22} color={C.textLight} />}
            </View>
          )}
          <ThemedText style={[ss.choiceLabel, siteOn && { color: C.saugeDark }]} numberOfLines={1}>
            ✨ Mon invitation
          </ThemedText>
          <ThemedText style={ss.choiceSub} numberOfLines={2}>
            {site.status === 'ready' ? site.style.label
              : site.status === 'loading' ? 'Chargement…'
                : site.status === 'none' ? 'Créez d’abord votre site' : 'Site indisponible'}
          </ThemedText>
        </Pressable>
        <Pressable style={[ss.choice, !siteOn && ss.choiceOn]} onPress={() => onChange('oheve')}>
          <View style={[ss.thumb, ss.thumbEmpty, { backgroundColor: '#FBF7EE' }]}>
            <Ionicons name="albums-outline" size={24} color={C.saugeDark} />
          </View>
          <ThemedText style={[ss.choiceLabel, !siteOn && { color: C.saugeDark }]} numberOfLines={1}>Modèles Oheve</ThemedText>
          <ThemedText style={ss.choiceSub} numberOfLines={2}>6 styles au choix</ThemedText>
        </Pressable>
      </View>
      {siteOn && (
        <ThemedText style={ss.note}>
          Couleurs, polices, monogramme et visuels de votre invitation digitale sont repris sur toutes les affiches.
        </ThemedText>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  choice: { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.saugePale, backgroundColor: '#fff', padding: 8, alignItems: 'center' },
  choiceOn: { borderColor: C.sauge, backgroundColor: C.saugePale + '55' },
  thumb: { width: 78, height: 110, borderRadius: 6, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  thumbEmpty: { borderColor: C.saugePale, justifyContent: 'center', backgroundColor: C.ivoire },
  thumbFrame: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderWidth: 1, opacity: 0.8 },
  stripes: { position: 'absolute', top: 0, left: 0, right: 0, height: 14, flexDirection: 'row' },
  thumbNum: { fontSize: 30, fontWeight: '700', fontFamily: 'serif', lineHeight: 36 },
  choiceLabel: { fontSize: 13, fontWeight: '700', color: C.textDark, marginTop: 8 },
  choiceSub: { fontSize: 11, color: C.textLight, textAlign: 'center', marginTop: 2, lineHeight: 15 },
  note: { fontSize: 11.5, color: C.textMid, marginTop: 10, lineHeight: 16 },
});

// ── Main modal ─────────────────────────────────────────────────────────────────

export function SeatingPlanExportModal({ visible, onClose, data }: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [selected, setSelected] = useState<PdfExportType>('panneaux');
  const [cardStyle, setCardStyle] = useState<PdfCardStyle>('elegant');
  const [panelTemplate, setPanelTemplate] = useState<PanelTemplateId>(DEFAULT_PANEL_TEMPLATE);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  // « Style de mon invitation » : sélectionné d'office dès que le site est chargé.
  const site = useSiteStyle(visible);
  const [styleSource, setStyleSource] = useState<'site' | 'oheve'>('site');
  useEffect(() => { if (site.status === 'ready') setStyleSource('site'); }, [site.status]);
  const siteStyle = styleSource === 'site' && site.status === 'ready' ? site.style : null;

  const previewHtml = useMemo(
    () => generateSeatingPlanHtml(data, selected, { cardStyle, panelTemplate, siteStyle, preview: true }),
    [data, selected, cardStyle, panelTemplate, siteStyle],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = generateSeatingPlanHtml(data, selected, { cardStyle, panelTemplate, siteStyle });
      const { uri } = await Print.printToFileAsync({ html, base64: false, ...A4_PAGE });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Exporter — ${EXPORT_OPTIONS.find((o) => o.type === selected)?.label}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF généré', `Fichier : ${uri}`);
      }
      onClose();
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    }
    setExporting(false);
  };

  // Impression directe : ouvre la fenêtre d'impression du téléphone (AirPrint /
  // Android) ou du navigateur, déjà réglée en A4.
  const handlePrint = async () => {
    setPrinting(true);
    try {
      const html = generateSeatingPlanHtml(data, selected, { cardStyle, panelTemplate, siteStyle });
      if (Platform.OS === 'web') printHtmlOnWeb(html);
      else await Print.printAsync({ html, ...A4_PAGE });
    } catch {
      Alert.alert('Erreur', 'Impossible de lancer l’impression.');
    }
    setPrinting(false);
  };

  if (previewing) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={() => setPreviewing(false)}>
        <View style={[styles.previewRoot, { paddingTop: insets.top }]}>
          <View style={styles.previewHeader}>
            <Pressable onPress={() => setPreviewing(false)} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
            </Pressable>
            <ThemedText style={styles.previewTitle}>
              {EXPORT_OPTIONS.find((o) => o.type === selected)?.label}
            </ThemedText>
            <View style={styles.previewActions}>
              <Pressable onPress={handlePrint} disabled={printing} hitSlop={12} accessibilityLabel="Imprimer en A4">
                {printing
                  ? <ActivityIndicator color={C.sauge} size="small" />
                  : <Ionicons name="print-outline" size={22} color={C.saugeDark} />}
              </Pressable>
              <Pressable onPress={handleExport} disabled={exporting} hitSlop={12} accessibilityLabel="Exporter en PDF">
                {exporting
                  ? <ActivityIndicator color={C.sauge} size="small" />
                  : <Ionicons name="share-outline" size={22} color={C.saugeDark} />}
              </Pressable>
            </View>
          </View>
          {Platform.OS === 'web' ? (
            // react-native-webview n'existe pas sur le web : iframe srcDoc.
            <iframe title="Aperçu" srcDoc={previewHtml.replace('</head>', `<style>body.preview{zoom:${Math.min(1, winW / 623)};}</style></head>`)} style={{ flex: 1, border: 0, width: '100%', backgroundColor: '#DDD9CF' }} />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={styles.webview}
              scalesPageToFit
            />
          )}
        </View>
      </Modal>
    );
  }

  const activeTpl = PANEL_TEMPLATES.find((t) => t.id === panelTemplate) ?? PANEL_TEMPLATES[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <ThemedText style={styles.sheetTitle}>Exporter le plan de table</ThemedText>
        <ThemedText style={styles.sheetSub}>Choisissez un format, prévisualisez, puis imprimez en A4 ou exportez en PDF.</ThemedText>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <StyleSourcePicker site={site} source={styleSource} onChange={setStyleSource} />

          {/* Format selector */}
          {EXPORT_OPTIONS.map((opt) => {
            const active = selected === opt.type;
            return (
              <Pressable
                key={opt.type}
                style={[styles.option, active && styles.optionOn]}
                onPress={() => setSelected(opt.type)}
              >
                <View style={[styles.optionIcon, active && styles.optionIconOn]}>
                  <Ionicons name={opt.icon as 'document-text'} size={18} color={active ? '#fff' : C.sauge} />
                </View>
                <View style={styles.optionBody}>
                  <ThemedText style={[styles.optionLabel, active && styles.optionLabelOn]}>
                    {opt.label}
                  </ThemedText>
                  <ThemedText style={styles.optionDesc}>{opt.desc}</ThemedText>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={C.saugeDark} />}
              </Pressable>
            );
          })}

          {/* ── Panneau template gallery ── */}
          {selected === 'panneaux' && !siteStyle && (
            <View style={styles.galleryBox}>
              <View style={styles.galleryHeader}>
                <ThemedText style={styles.galleryTitle}>Choisir un modèle</ThemedText>
                <View style={[styles.selectedBadge, { backgroundColor: activeTpl.primary + '22', borderColor: activeTpl.primary + '66' }]}>
                  <Text style={[styles.selectedBadgeTxt, { color: activeTpl.primary }]}>{activeTpl.name}</Text>
                </View>
              </View>
              <View style={styles.galleryGrid}>
                {PANEL_TEMPLATES.map((tpl) => (
                  <TemplateThumbnail
                    key={tpl.id}
                    template={tpl}
                    selected={panelTemplate === tpl.id}
                    onPress={() => setPanelTemplate(tpl.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Style selector for cartes & marque-places */}
          {(selected === 'cartes' || selected === 'marque-places') && (
            <View style={styles.styleBox}>
              <ThemedText style={styles.styleTitle}>Style de carte</ThemedText>
              <View style={styles.styleRow}>
                {CARD_STYLES.map((s) => {
                  const on = cardStyle === s.value;
                  return (
                    <Pressable
                      key={s.value}
                      style={[styles.styleBtn, on && styles.styleBtnOn]}
                      onPress={() => setCardStyle(s.value)}
                    >
                      <ThemedText style={[styles.styleBtnLabel, on && styles.styleBtnLabelOn]}>
                        {s.label}
                      </ThemedText>
                      <ThemedText style={[styles.styleBtnDesc, on && { color: C.saugeDark }]}>
                        {s.desc}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <Pressable style={styles.printBtn} onPress={handlePrint} disabled={printing}>
          {printing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="print-outline" size={19} color="#fff" />
              <ThemedText style={styles.exportBtnTxt}>Imprimer en A4</ThemedText>
            </>
          )}
        </Pressable>
        <View style={styles.actions}>
          <Pressable style={styles.previewBtn} onPress={() => setPreviewing(true)}>
            <Ionicons name="eye-outline" size={18} color={C.saugeDark} />
            <ThemedText style={styles.previewBtnTxt}>Prévisualiser</ThemedText>
          </Pressable>
          <Pressable style={styles.previewBtn} onPress={handleExport} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator color={C.saugeDark} size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={C.saugeDark} />
                <ThemedText style={styles.previewBtnTxt}>Exporter PDF</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(60,53,47,0.35)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20, paddingTop: 10, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.saugePale, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.textDark },
  sheetSub: { fontSize: 13, color: C.textMid, marginTop: 4, marginBottom: 14, lineHeight: 19 },
  list: { maxHeight: 480 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.saugePale,
    backgroundColor: C.ivoire, marginBottom: 8,
  },
  optionOn: { borderColor: C.sauge, backgroundColor: C.saugePale + '55' },
  optionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  optionIconOn: { backgroundColor: C.sauge },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: C.textDark },
  optionLabelOn: { color: C.saugeDark },
  optionDesc: { fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 15 },

  // Gallery
  galleryBox: {
    marginBottom: 10, padding: 14, backgroundColor: C.ivoire,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.saugePale,
  },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  galleryTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.textMid },
  selectedBadge: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 99, borderWidth: 1,
  },
  selectedBadgeTxt: { fontSize: 10, fontWeight: '700' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  styleBox: {
    marginBottom: 10, padding: 14, backgroundColor: C.ivoire,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.saugePale,
  },
  styleTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.textMid, marginBottom: 10 },
  styleRow: { flexDirection: 'row', gap: 8 },
  styleBtn: {
    flex: 1, padding: 10, borderRadius: RADIUS.sm,
    borderWidth: 1.5, borderColor: C.saugePale, backgroundColor: '#fff', alignItems: 'center',
  },
  styleBtnOn: { borderColor: C.sauge, backgroundColor: C.saugePale + '66' },
  styleBtnLabel: { fontSize: 12, fontWeight: '700', color: C.textMid },
  styleBtnLabelOn: { color: C.saugeDark },
  styleBtnDesc: { fontSize: 9, color: C.textLight, marginTop: 2, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  previewActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  previewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.sauge,
  },
  previewBtnTxt: { fontSize: 14, fontWeight: '600', color: C.saugeDark },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: RADIUS.md, backgroundColor: C.sauge, marginTop: 12,
  },
  exportBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  previewRoot: { flex: 1, backgroundColor: C.ivoire },
  previewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.saugePale, backgroundColor: '#fff',
  },
  previewTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, flex: 1, textAlign: 'center' },
  webview: { flex: 1, backgroundColor: C.ivoire },
});
