import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { C, RADIUS } from '@/constants/OheveTheme';
import { generateSeatingPlanHtml } from '@/lib/seating-plan/pdf-html';
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

export function SeatingPlanExportModal({ visible, onClose, data }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PdfExportType>('panneaux');
  const [cardStyle, setCardStyle] = useState<PdfCardStyle>('elegant');
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const previewHtml = useMemo(
    () => generateSeatingPlanHtml(data, selected, { cardStyle }),
    [data, selected, cardStyle],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = generateSeatingPlanHtml(data, selected, { cardStyle });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
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
            <Pressable onPress={handleExport} disabled={exporting} hitSlop={12}>
              {exporting
                ? <ActivityIndicator color={C.sauge} size="small" />
                : <Ionicons name="share-outline" size={22} color={C.saugeDark} />}
            </Pressable>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: previewHtml }}
            style={styles.webview}
            scalesPageToFit
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <ThemedText style={styles.sheetTitle}>Exporter le plan de table</ThemedText>
        <ThemedText style={styles.sheetSub}>Choisissez un format, prévisualisez puis exportez en PDF.</ThemedText>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
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

          {/* Sélecteur de style affiché pour panneaux, cartes et marque-places */}
          {(selected === 'panneaux' || selected === 'cartes' || selected === 'marque-places') && (
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

        <View style={styles.actions}>
          <Pressable style={styles.previewBtn} onPress={() => setPreviewing(true)}>
            <Ionicons name="eye-outline" size={18} color={C.saugeDark} />
            <ThemedText style={styles.previewBtnTxt}>Prévisualiser</ThemedText>
          </Pressable>
          <Pressable style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <ThemedText style={styles.exportBtnTxt}>Exporter PDF</ThemedText>
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
    paddingHorizontal: 20, paddingTop: 10, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.saugePale, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: C.textDark },
  sheetSub: { fontSize: 13, color: C.textMid, marginTop: 4, marginBottom: 14, lineHeight: 19 },
  list: { maxHeight: 420 },
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

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  previewBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: C.sauge,
  },
  previewBtnTxt: { fontSize: 14, fontWeight: '600', color: C.saugeDark },
  exportBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: C.sauge,
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
