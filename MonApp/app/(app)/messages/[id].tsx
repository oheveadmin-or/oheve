import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, FlatList,
  KeyboardAvoidingView, Linking, Modal, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingModal, ProposeAppointmentModal } from '@/components/booking-modal';
import { ThemedText } from '@/components/themed-text';
import { KeyboardDoneBar, keyboardDoneProps } from '@/components/ui/keyboard-done-bar';
import { C, RADIUS } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';
import { useAuth } from '@/contexts/auth-context';
import { messagingApi } from '@/services/auth/api';

type Message = {
  id: number;
  sender_id: number;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  is_read: boolean;
  created_at: string;
  sender_nom: string;
  sender_prenom: string;
  message_type?: string;
  devis_id?: number | null;
};

type DevisService = { description: string; quantite: number; prix_unitaire: number };

function DevisModal({
  visible,
  convId,
  token,
  onClose,
  onSent,
}: {
  visible: boolean;
  convId: number;
  token: string;
  onClose: () => void;
  onSent: (msg: Message) => void;
}) {
  const [titre, setTitre] = useState('');
  const [services, setServices] = useState<DevisService[]>([
    { description: '', quantite: 1, prix_unitaire: 0 },
  ]);
  const [tva, setTva] = useState('20');
  const [validite, setValidite] = useState('30');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const montantHT = services.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
  const montantTTC = +(montantHT * (1 + parseFloat(tva || '0') / 100)).toFixed(2);

  const addLine = () => setServices((p) => [...p, { description: '', quantite: 1, prix_unitaire: 0 }]);
  const removeLine = (i: number) => setServices((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof DevisService, val: string) => {
    setServices((p) => p.map((l, idx) =>
      idx === i ? { ...l, [field]: field === 'description' ? val : parseFloat(val) || 0 } : l
    ));
  };

  const handleSend = async () => {
    if (!titre.trim()) { Alert.alert('Titre requis'); return; }
    if (services.some((s) => !s.description.trim())) { Alert.alert('Remplissez toutes les descriptions'); return; }
    setSending(true);
    try {
      const res = await fetch(API_ENDPOINTS.conversationDevis(convId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titre, services, tva_percent: parseFloat(tva), validite_jours: parseInt(validite), notes }),
      });
      const json = await res.json();
      if (json.success) {
        onSent(json.data.message);
        setTitre(''); setServices([{ description: '', quantite: 1, prix_unitaire: 0 }]);
        setNotes(''); onClose();
      } else {
        Alert.alert('Erreur', json.message);
      }
    } catch {
      Alert.alert('Erreur réseau');
    }
    setSending(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={dStyles.overlay} onPress={onClose} />
        <View style={dStyles.sheet}>
          <View style={dStyles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ThemedText style={dStyles.title}>Générer un devis</ThemedText>

            <ThemedText style={dStyles.lbl}>Titre du devis *</ThemedText>
            <TextInput style={dStyles.input} value={titre} onChangeText={setTitre} placeholder="Ex : Prestation photo mariage" placeholderTextColor={C.textLight} />

            <ThemedText style={dStyles.lbl}>Lignes de services *</ThemedText>
            {services.map((s, i) => (
              <View key={i} style={dStyles.serviceRow}>
                <TextInput
                  style={[dStyles.input, { flex: 3 }]}
                  value={s.description}
                  onChangeText={(v) => updateLine(i, 'description', v)}
                  placeholder="Description"
                  placeholderTextColor={C.textLight}
                />
                <TextInput
                  style={[dStyles.inputSm]}
                  value={s.quantite ? String(s.quantite) : ''}
                  onChangeText={(v) => updateLine(i, 'quantite', v)}
                  keyboardType="numeric"
                  {...keyboardDoneProps}
                  placeholder="Qté"
                  placeholderTextColor={C.textLight}
                />
                <TextInput
                  style={[dStyles.inputSm]}
                  value={s.prix_unitaire ? String(s.prix_unitaire) : ''}
                  onChangeText={(v) => updateLine(i, 'prix_unitaire', v)}
                  keyboardType="decimal-pad"
                  {...keyboardDoneProps}
                  placeholder="PU €"
                  placeholderTextColor={C.textLight}
                />
                {services.length > 1 && (
                  <Pressable onPress={() => removeLine(i)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={C.textLight} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable style={dStyles.addLineBtn} onPress={addLine}>
              <Ionicons name="add-circle-outline" size={18} color={C.sauge} />
              <ThemedText style={dStyles.addLineTxt}>Ajouter une ligne</ThemedText>
            </Pressable>

            <View style={dStyles.row2}>
              <View style={{ flex: 1 }}>
                <ThemedText style={dStyles.lbl}>TVA (%)</ThemedText>
                <TextInput style={dStyles.input} value={tva} onChangeText={setTva} keyboardType="numeric" placeholder="20" placeholderTextColor={C.textLight} {...keyboardDoneProps} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={dStyles.lbl}>Validité (jours)</ThemedText>
                <TextInput style={dStyles.input} value={validite} onChangeText={setValidite} keyboardType="numeric" placeholder="30" placeholderTextColor={C.textLight} {...keyboardDoneProps} />
              </View>
            </View>

            <ThemedText style={dStyles.lbl}>Notes (optionnel)</ThemedText>
            <TextInput style={[dStyles.input, { height: 64, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Conditions, délais…" placeholderTextColor={C.textLight} multiline />

            <View style={dStyles.totalCard}>
              <ThemedText style={dStyles.totalLbl}>Montant HT</ThemedText>
              <ThemedText style={dStyles.totalVal}>{montantHT.toFixed(2)} €</ThemedText>
              <ThemedText style={dStyles.totalLbl}>TVA ({tva}%)</ThemedText>
              <ThemedText style={dStyles.totalVal}>{(montantTTC - montantHT).toFixed(2)} €</ThemedText>
              <ThemedText style={[dStyles.totalLbl, { fontWeight: '700', color: C.textDark }]}>Total TTC</ThemedText>
              <ThemedText style={[dStyles.totalVal, { fontWeight: '700', fontSize: 18, color: C.saugeDark }]}>{montantTTC} €</ThemedText>
            </View>

            <Pressable style={[dStyles.sendBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <ThemedText style={dStyles.sendBtnTxt}>Envoyer le devis</ThemedText>
                </>
              )}
            </Pressable>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <KeyboardDoneBar />
    </Modal>
  );
}

const dStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingHorizontal: 18, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', color: C.textDark, marginBottom: 14 },
  lbl: { fontSize: 12, fontWeight: '600', color: C.textLight, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: C.saugePale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: C.textDark, backgroundColor: '#fafaf8' },
  inputSm: { flex: 1, borderWidth: 1.5, borderColor: C.saugePale, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 9, fontSize: 13, color: C.textDark, backgroundColor: '#fafaf8', textAlign: 'center' },
  serviceRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  addLineTxt: { fontSize: 13, color: C.sauge, fontWeight: '600' },
  row2: { flexDirection: 'row', gap: 12 },
  totalCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between', alignItems: 'center' },
  totalLbl: { fontSize: 13, color: C.textMid, width: '48%' },
  totalVal: { fontSize: 14, color: C.textDark, textAlign: 'right', width: '48%' },
  sendBtn: { backgroundColor: C.sauge, borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  sendBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Devis bubble avec téléchargement PDF ────────────────────────────────────
function DevisBubble({ content, devisId, convId, token, clientName }: { content: string; devisId?: number | null; convId: number; token: string; clientName?: string }) {
  const [generating, setGenerating] = useState(false);

  const downloadPdf = async () => {
    setGenerating(true);
    try {
      let devis: {
        titre?: string;
        sender_prenom?: string;
        sender_nom?: string;
        services?: { description: string; quantite: number; prix_unitaire: number }[];
        montant_ht?: number;
        tva_percent?: number;
        montant_ttc?: number;
        validite_jours?: number;
        notes?: string;
        created_at?: string;
        numero?: string;
      } | null = null;

      if (devisId) {
        const res = await fetch(API_ENDPOINTS.devisById(convId, devisId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) devis = json.data;
      }

      const titre = devis?.titre ?? content.replace('📄 Devis : ', '').split(' — ')[0];
      const dateStr = devis?.created_at
        ? new Date(devis.created_at).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR');
      const prestataireName = devis?.sender_prenom
        ? `${devis.sender_prenom} ${devis.sender_nom ?? ''}`.trim()
        : '';
      const validiteDate = devis?.validite_jours && devis?.created_at
        ? new Date(new Date(devis.created_at).getTime() + devis.validite_jours * 86400000).toLocaleDateString('fr-FR')
        : '';
      const numeroDevis = devis?.numero ?? `DEV-${devisId ?? Date.now()}`;
      const montantHT = Number(devis?.montant_ht ?? 0);
      const tva = Number(devis?.tva_percent ?? 0);
      const montantTTC = Number(devis?.montant_ttc ?? 0);
      const tvaAmt = +(montantTTC - montantHT).toFixed(2);
      const acompte = +(montantTTC * 0.3).toFixed(2);

      const lignesRows = (devis?.services ?? [])
        .map((s: { description: string; quantite: number | string; prix_unitaire: number | string }) => {
          const qty = Number(s.quantite) || 0;
          const pu = Number(s.prix_unitaire) || 0;
          return `<tr>
            <td class="td-desc">${s.description}</td>
            <td class="td-c">${qty}</td>
            <td class="td-r">${pu.toFixed(2)} €</td>
            <td class="td-r td-bold">${(qty * pu).toFixed(2)} €</td>
          </tr>`;
        })
        .join('');

      const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;color:#2C2417;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── PAGE LAYOUT ── */
  .page{width:210mm;min-height:297mm;margin:0 auto;position:relative;overflow:hidden;page-break-after:always}
  .page:last-child{page-break-after:auto}
  @media print{.page{margin:0;box-shadow:none}}
  @media screen{.page{box-shadow:0 4px 40px rgba(0,0,0,.08);margin-bottom:24px}}

  /* ── COVER ── */
  .cover{background:linear-gradient(160deg,#f9f6f1 0%,#f0ebe3 55%,#e8e1d7 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 48px;text-align:center}
  .cover-ornament{width:48px;height:2px;background:#A7AD9A;margin:0 auto 32px}
  .cover-logo{font-family:'Playfair Display',serif;font-size:42px;font-weight:700;color:#2C2417;letter-spacing:6px;margin-bottom:6px}
  .cover-tagline{font-size:10px;color:#9c9080;letter-spacing:4px;text-transform:uppercase;margin-bottom:56px}
  .cover-label{font-size:10px;color:#A7AD9A;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px}
  .cover-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:600;color:#2C2417;line-height:1.3;margin-bottom:40px;max-width:320px}
  .cover-divider{width:1px;height:64px;background:#cec5b8;margin:0 auto 40px}
  .cover-couple{font-family:'Playfair Display',serif;font-size:22px;color:#5c4f43;margin-bottom:8px}
  .cover-amp{font-family:'Playfair Display',serif;font-size:13px;color:#A7AD9A;letter-spacing:2px;margin-bottom:8px}
  .cover-meta{font-size:11px;color:#9c9080;letter-spacing:2px;text-transform:uppercase;line-height:2}
  .cover-footer{position:absolute;bottom:36px;left:0;right:0;text-align:center;font-size:10px;color:#b8b0a5;letter-spacing:2px;text-transform:uppercase}
  .cover-no{position:absolute;top:40px;right:48px;font-size:10px;color:#b8b0a5;letter-spacing:1px}
  .cover-corner{position:absolute;width:80px;height:80px;border-color:#cec5b8;border-style:solid}
  .cover-corner.tl{top:28px;left:28px;border-width:1px 0 0 1px}
  .cover-corner.tr{top:28px;right:28px;border-width:1px 1px 0 0}
  .cover-corner.bl{bottom:28px;left:28px;border-width:0 0 1px 1px}
  .cover-corner.br{bottom:28px;right:28px;border-width:0 1px 1px 0}

  /* ── DETAIL PAGE ── */
  .detail{padding:52px 48px 48px}
  .det-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:44px;padding-bottom:24px;border-bottom:1px solid #ede8e1}
  .det-logo{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#2C2417;letter-spacing:4px}
  .det-logo-sub{font-size:9px;color:#A7AD9A;letter-spacing:3px;text-transform:uppercase;margin-top:3px}
  .det-no{text-align:right}
  .det-no-label{font-size:9px;color:#9c9080;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .det-no-val{font-size:13px;font-weight:600;color:#2C2417}
  .det-no-date{font-size:11px;color:#9c9080;margin-top:2px}

  /* cards */
  .cards{display:flex;gap:16px;margin-bottom:36px}
  .card{flex:1;background:#faf7f3;border-radius:12px;padding:18px 20px;border:1px solid #ede8e1}
  .card-title{font-size:9px;color:#A7AD9A;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px}
  .card-name{font-family:'Playfair Display',serif;font-size:15px;color:#2C2417;margin-bottom:4px}
  .card-sub{font-size:11px;color:#7a6e64;line-height:1.6}

  /* prestations summary */
  .section-title{font-size:9px;color:#A7AD9A;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px}
  .services-box{background:#faf7f3;border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #ede8e1}
  .service-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
  .service-item:last-child{margin-bottom:0}
  .service-check{color:#A7AD9A;font-size:14px;flex-shrink:0;margin-top:1px}
  .service-text{font-size:13px;color:#2C2417;font-weight:500}

  /* table */
  .tbl{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px}
  .tbl thead tr{background:#2C2417}
  .tbl thead th{padding:11px 14px;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#f0ebe3;font-weight:500;text-align:left}
  .tbl thead th:nth-child(2),.tbl thead th:nth-child(3),.tbl thead th:nth-child(4){text-align:right}
  .tbl thead th:nth-child(2){text-align:center}
  .td-desc{padding:11px 14px;border-bottom:1px solid #f0ebe4;color:#2C2417}
  .td-c{padding:11px 14px;border-bottom:1px solid #f0ebe4;text-align:center;color:#7a6e64}
  .td-r{padding:11px 14px;border-bottom:1px solid #f0ebe4;text-align:right;color:#7a6e64}
  .td-bold{color:#2C2417!important;font-weight:600}
  .tbl tbody tr:nth-child(even){background:#fdf9f5}

  /* totals */
  .totals-wrap{display:flex;justify-content:flex-end;margin-bottom:32px}
  .totals-box{width:260px;background:#faf7f3;border-radius:12px;padding:20px 24px;border:1px solid #ede8e1}
  .tot-row{display:flex;justify-content:space-between;font-size:12px;color:#7a6e64;padding:5px 0;border-bottom:1px solid #ede8e1}
  .tot-row:last-child{border-bottom:none;padding-top:14px;margin-top:4px}
  .tot-label-main{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;color:#2C2417}
  .tot-val-main{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#A7AD9A}

  /* notes */
  .notes-box{background:#faf7f3;border-radius:12px;padding:18px 22px;border-left:3px solid #A7AD9A;margin-bottom:28px}
  .notes-label{font-size:9px;color:#A7AD9A;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
  .notes-text{font-size:12px;color:#5c4f43;line-height:1.7}

  /* ── CONDITIONS PAGE ── */
  .conditions{padding:52px 48px 48px}
  .cond-title{font-family:'Playfair Display',serif;font-size:22px;color:#2C2417;margin-bottom:32px}
  .cond-section{margin-bottom:28px}
  .cond-section-title{font-size:9px;color:#A7AD9A;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #ede8e1}
  .cond-text{font-size:12px;color:#5c4f43;line-height:1.8}
  .acompte-box{background:linear-gradient(135deg,#f9f6f1,#f0ebe3);border-radius:12px;padding:22px 26px;margin-bottom:32px;border:1px solid #ede8e1;display:flex;justify-content:space-between;align-items:center}
  .acompte-label{font-size:10px;color:#9c9080;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
  .acompte-val{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#2C2417}
  .acompte-sub{font-size:11px;color:#A7AD9A;margin-top:4px}
  .acompte-pct{font-family:'Playfair Display',serif;font-size:42px;color:#ede8e1;font-weight:700}

  /* signatures */
  .sig-section{display:flex;gap:32px;margin-top:32px}
  .sig-box{flex:1;border:1px solid #ede8e1;border-radius:12px;padding:24px 20px}
  .sig-label{font-size:9px;color:#A7AD9A;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
  .sig-name{font-size:13px;font-weight:600;color:#2C2417;margin-bottom:16px}
  .sig-line{height:1px;background:#ede8e1;margin-bottom:8px;margin-top:48px}
  .sig-date-label{font-size:10px;color:#b0a898}

  /* shared footer */
  .page-footer{position:absolute;bottom:32px;left:48px;right:48px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #ede8e1;padding-top:12px}
  .pf-left{font-size:9px;color:#b0a898;letter-spacing:1px}
  .pf-right{font-size:9px;color:#b0a898;letter-spacing:1px}
</style>
</head>
<body>

<!-- ═══════════════ PAGE 1 : COUVERTURE ═══════════════ -->
<div class="page cover">
  <div class="cover-corner tl"></div>
  <div class="cover-corner tr"></div>
  <div class="cover-corner bl"></div>
  <div class="cover-corner br"></div>
  <div class="cover-no">${numeroDevis}</div>

  <div class="cover-ornament"></div>
  <div class="cover-logo">OHEVE</div>
  <div class="cover-tagline">L'application de mariage juif</div>

  <div class="cover-label">Devis personnalisé</div>
  <div class="cover-title">${titre}</div>

  <div class="cover-divider"></div>

  ${clientName ? `<div class="cover-couple">${clientName}</div><div class="cover-amp">✦</div>` : ''}
  ${prestataireName ? `<div class="cover-couple">${prestataireName}</div>` : ''}

  <div class="cover-meta" style="margin-top:28px">
    Émis le ${dateStr}${validiteDate ? `<br>Valable jusqu'au ${validiteDate}` : (devis?.validite_jours ? `<br>Valable ${devis.validite_jours} jours` : '')}
  </div>

  <div class="cover-footer">Généré via Oheve · oheve.app</div>
</div>

<!-- ═══════════════ PAGE 2 : DÉTAIL ═══════════════ -->
<div class="page detail">

  <div class="det-header">
    <div>
      <div class="det-logo">OHEVE</div>
      <div class="det-logo-sub">L'application de mariage</div>
    </div>
    <div class="det-no">
      <div class="det-no-label">Référence</div>
      <div class="det-no-val">${numeroDevis}</div>
      <div class="det-no-date">Émis le ${dateStr}</div>
    </div>
  </div>

  <div class="cards">
    ${clientName ? `<div class="card">
      <div class="card-title">Client</div>
      <div class="card-name">${clientName}</div>
    </div>` : ''}
    ${prestataireName ? `<div class="card">
      <div class="card-title">Prestataire</div>
      <div class="card-name">${prestataireName}</div>
    </div>` : ''}
  </div>

  ${lignesRows ? `
  <div class="section-title">Détail des prestations</div>
  <table class="tbl">
    <thead><tr>
      <th>Prestation</th>
      <th style="text-align:center">Qté</th>
      <th style="text-align:right">Prix unitaire</th>
      <th style="text-align:right">Total HT</th>
    </tr></thead>
    <tbody>${lignesRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="tot-row"><span>Sous-total HT</span><span>${montantHT.toFixed(2)} €</span></div>
      <div class="tot-row"><span>TVA (${tva}%)</span><span>${tvaAmt.toFixed(2)} €</span></div>
      <div class="tot-row">
        <span class="tot-label-main">Total TTC</span>
        <span class="tot-val-main">${montantTTC.toFixed(2)} €</span>
      </div>
    </div>
  </div>` : `<p style="font-size:15px;font-weight:600;font-family:'Playfair Display',serif;margin-bottom:32px">${content}</p>`}

  ${devis?.notes ? `<div class="notes-box">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${devis.notes}</div>
  </div>` : ''}

  <div class="page-footer">
    <div class="pf-left">OHEVE · oheve.app</div>
    <div class="pf-right">${numeroDevis} · Page 2 / 3</div>
  </div>
</div>

<!-- ═══════════════ PAGE 3 : CONDITIONS & SIGNATURE ═══════════════ -->
<div class="page conditions">

  <div class="det-header">
    <div>
      <div class="det-logo">OHEVE</div>
      <div class="det-logo-sub">Conditions & Signature</div>
    </div>
    <div class="det-no">
      <div class="det-no-label">Référence</div>
      <div class="det-no-val">${numeroDevis}</div>
    </div>
  </div>

  <div class="cond-title">Conditions du devis</div>

  <div class="acompte-box">
    <div>
      <div class="acompte-label">Acompte à la signature</div>
      <div class="acompte-val">${acompte.toFixed(2)} €</div>
      <div class="acompte-sub">30% du montant total TTC</div>
    </div>
    <div class="acompte-pct">30%</div>
  </div>

  <div class="cond-section">
    <div class="cond-section-title">Validité & Paiement</div>
    <div class="cond-text">
      Ce devis est valable ${devis?.validite_jours ?? 30} jours à compter de sa date d'émission${validiteDate ? `, soit jusqu'au ${validiteDate}` : ''}.
      Le règlement s'effectue en deux fois : un acompte de 30 % à la signature, le solde le jour de la prestation.
    </div>
  </div>

  <div class="cond-section">
    <div class="cond-section-title">Annulation</div>
    <div class="cond-text">
      En cas d'annulation plus de 60 jours avant la date, l'acompte est intégralement remboursé.
      Entre 30 et 60 jours : 50 % de l'acompte retenu.
      Moins de 30 jours : l'acompte reste acquis au prestataire.
    </div>
  </div>

  <div class="cond-section">
    <div class="cond-section-title">Acceptation</div>
    <div class="cond-text">
      La signature de ce document vaut acceptation des présentes conditions et formation du contrat entre les parties.
    </div>
  </div>

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Prestataire</div>
      <div class="sig-name">${prestataireName || '—'}</div>
      <div class="sig-line"></div>
      <div class="sig-date-label">Signature &amp; date</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Client</div>
      <div class="sig-name">${clientName || '—'}</div>
      <div class="sig-line"></div>
      <div class="sig-date-label">Signature &amp; date · « Lu et approuvé »</div>
    </div>
  </div>

  <div class="page-footer">
    <div class="pf-left">OHEVE · oheve.app</div>
    <div class="pf-right">${numeroDevis} · Page 3 / 3</div>
  </div>
</div>

</body></html>`;

      const fileUri = `${FileSystem.cacheDirectory}devis-${Date.now()}.html`;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Partager le devis' });
      } else {
        Alert.alert('Devis prêt', 'Fichier HTML généré. Ouvrez-le dans Safari pour exporter en PDF.');
      }
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.devisBubbleWrap}>
      <View style={styles.devisBubbleRow}>
        <View style={styles.devisIconBox}>
          <Ionicons name="document-text" size={22} color={C.sauge} />
        </View>
        <View style={styles.devisInfo}>
          <ThemedText style={styles.devisLabel}>Devis</ThemedText>
          <ThemedText style={styles.devisTitle} numberOfLines={2}>
            {content.replace('📄 Devis : ', '')}
          </ThemedText>
        </View>
      </View>
      <Pressable style={[styles.devisPdfBtn, generating && { opacity: 0.5 }]} onPress={downloadPdf} disabled={generating}>
        {generating
          ? <ActivityIndicator size="small" color={C.sauge} />
          : <><Ionicons name="download-outline" size={14} color={C.sauge} /><ThemedText style={styles.devisPdfTxt}>Télécharger PDF</ThemedText></>
        }
      </Pressable>
    </View>
  );
}

function isImage(mimeType?: string | null) {
  return !!mimeType?.startsWith('image/');
}

function isPdf(mimeType?: string | null) {
  return mimeType === 'application/pdf';
}

function FileIcon({ mimeType }: { mimeType?: string | null }) {
  if (isImage(mimeType)) return <Ionicons name="image-outline" size={20} color="#A7AD9A" />;
  if (isPdf(mimeType)) return <Ionicons name="document-text-outline" size={20} color="#ef4444" />;
  return <Ionicons name="attach-outline" size={20} color="#6b7280" />;
}

function AttachmentBubble({ url, name, mimeType, isMe }: {
  url: string; name: string; mimeType?: string | null; isMe: boolean;
}) {
  const [imgVisible, setImgVisible] = useState(false);

  const openFile = () => {
    if (Platform.OS === 'web') {
      Linking.openURL(url);
    } else {
      WebBrowser.openBrowserAsync(url);
    }
  };

  if (isImage(mimeType)) {
    return (
      <>
        <Pressable onPress={() => setImgVisible(true)} style={styles.imgThumbWrap}>
          <Image source={{ uri: url }} style={styles.imgThumb} contentFit="cover" />
          <View style={styles.imgOverlay}>
            <Ionicons name="expand-outline" size={18} color="#fff" />
          </View>
        </Pressable>
        {/* Fullscreen */}
        <Modal visible={imgVisible} animationType="fade" transparent onRequestClose={() => setImgVisible(false)}>
          <Pressable style={styles.imgModal} onPress={() => setImgVisible(false)}>
            <Image source={{ uri: url }} style={styles.imgFull} contentFit="contain" />
            <Pressable style={styles.closeBtn} onPress={() => setImgVisible(false)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <Pressable
      style={[styles.fileBubble, isMe ? styles.fileBubbleMe : styles.fileBubbleThem]}
      onPress={openFile}
    >
      <View style={[styles.fileIconBox, { backgroundColor: isPdf(mimeType) ? '#fee2e2' : '#e0f2fe' }]}>
        <FileIcon mimeType={mimeType} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.fileName, isMe && styles.fileNameMe]} numberOfLines={2}>{name}</ThemedText>
        <ThemedText style={[styles.fileType, isMe && styles.fileTypeMe]}>
          {isPdf(mimeType) ? 'PDF' : 'Fichier'} · Appuyer pour ouvrir
        </ThemedText>
      </View>
      <Ionicons name="open-outline" size={16} color={isMe ? 'rgba(255,255,255,0.7)' : '#9ca3af'} />
    </Pressable>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState('Conversation');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [devisModal, setDevisModal] = useState(false);
  // Prise de RDV depuis la discussion : besoin des deux participants de la
  // conversation (client_id / prestataire_id) récupérés via la liste.
  const [rdvModal, setRdvModal] = useState(false);
  const [conv, setConv] = useState<{ client_id: number; prestataire_id: number } | null>(null);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const convId = parseInt(id, 10);

  useEffect(() => {
    if (!user?.accessToken) return;
    messagingApi.listConversations(user.accessToken)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          const c = res.data.find((x: { id: number }) => x.id === convId);
          if (c) {
            setConv({ client_id: c.client_id, prestataire_id: c.prestataire_id });
            if (c.other_prenom) setOtherName(`${c.other_prenom} ${c.other_nom ?? ''}`.trim());
          }
        }
      })
      .catch(() => {});
  }, [user?.accessToken, convId]);

  const load = useCallback(async (silent = false) => {
    if (!user?.accessToken) return;
    try {
      const json = await messagingApi.getMessages(user.accessToken, convId);
      if (json.success) {
        setMessages(json.data);
        if (!silent) setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
      }
    } catch {}
    setLoading(false);
  }, [user?.accessToken, convId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  useEffect(() => {
    if (!messages.length || otherName !== 'Conversation') return;
    const other = messages.find((m) => m.sender_id !== user?.id);
    if (other) setOtherName(`${other.sender_prenom} ${other.sender_nom}`);
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user?.accessToken || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const json = await messagingApi.sendMessage(user.accessToken, convId, content);
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      } else {
        // Ne jamais perdre le message tapé : on le remet dans le champ.
        setText(content);
        Alert.alert('Message non envoyé', json?.message ?? 'Vérifiez votre connexion et réessayez.');
      }
    } catch {
      setText(content);
      Alert.alert('Message non envoyé', 'Vérifiez votre connexion et réessayez.');
    }
    setSending(false);
  };

  const sendAttachment = async (
    uri: string,
    name: string,
    type: string,
  ) => {
    if (!user?.accessToken) return;
    setUploading(true);
    try {
      const json = await messagingApi.uploadAttachment(user.accessToken, convId, { uri, name, type });
      if (json.success && json.data) {
        setMessages((prev) => [...prev, json.data as unknown as Message]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      } else {
        Alert.alert('Erreur', json.message ?? 'Upload échoué');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer le fichier');
    }
    setUploading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorise l\'accès à ta galerie dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    await sendAttachment(asset.uri, name, type);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendAttachment(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
  };

  const isPrestataire = user?.role === 'prestataire';

  // Message récap envoyé dans la conversation après la prise d'un RDV,
  // pour que les deux parties gardent une trace écrite du créneau.
  const sendRdvRecap = async (info: { title: string; date: string; time: string }) => {
    if (!user?.accessToken) return;
    const dateFr = new Date(`${info.date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    try {
      const json = await messagingApi.sendMessage(
        user.accessToken,
        convId,
        `📅 Rendez-vous confirmé : ${info.title} — ${dateFr} à ${info.time}`,
      );
      if (json?.success) {
        setMessages((prev) => [...prev, json.data]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      }
    } catch { /* le RDV est déjà créé — le récap chat est un bonus */ }
  };

  const showAttachmentPicker = () => {
    if (Platform.OS === 'ios') {
      const options = ['Annuler', 'Photo depuis la galerie', 'Document (PDF, Word)', ...(isPrestataire ? ['Générer un devis'] : [])];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) pickImage();
          if (idx === 2) pickDocument();
          if (idx === 3 && isPrestataire) setDevisModal(true);
        },
      );
    } else {
      Alert.alert('Joindre ou créer', '', [
        { text: 'Photo depuis la galerie', onPress: pickImage },
        { text: 'Document (PDF, Word)', onPress: pickDocument },
        ...(isPrestataire ? [{ text: 'Générer un devis', onPress: () => setDevisModal(true) }] : []),
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const isMe = (m: Message) => m.sender_id === user?.id;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {user?.accessToken && (
        <DevisModal
          visible={devisModal}
          convId={convId}
          token={user.accessToken}
          onClose={() => setDevisModal(false)}
          onSent={(msg) => {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
          }}
        />
      )}
      {/* Prise de RDV depuis la discussion : le client réserve dans les
          créneaux du prestataire ; le prestataire fixe librement un créneau. */}
      {conv && (isPrestataire ? (
        <ProposeAppointmentModal
          visible={rdvModal}
          onClose={() => setRdvModal(false)}
          clientId={conv.client_id}
          clientName={otherName}
          accessToken={user?.accessToken}
          onProposed={sendRdvRecap}
        />
      ) : (
        <BookingModal
          visible={rdvModal}
          onClose={() => setRdvModal(false)}
          prestataireId={conv.prestataire_id}
          prestataireName={otherName}
          accessToken={user?.accessToken}
          onBooked={sendRdvRecap}
        />
      ))}
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#A7AD9A" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <ThemedText style={styles.headerAvatarTxt}>{otherName[0] ?? '?'}</ThemedText>
          </View>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>{otherName}</ThemedText>
        </View>
        {/* Prendre / fixer un rendez-vous directement depuis la discussion */}
        {conv && (
          <Pressable style={styles.rdvBtn} onPress={() => setRdvModal(true)} hitSlop={8}>
            <Ionicons name="calendar-outline" size={16} color={C.saugeDark} />
            <ThemedText style={styles.rdvBtnTxt}>RDV</ThemedText>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#A7AD9A" size="large" /></View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top + 64}
        >
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.msgList}
            renderItem={({ item: m }) => {
              const me = isMe(m);
              const hasFile = !!m.file_url;
              const hasText = !!m.content;
              return (
                <View style={[styles.msgRow, me && styles.msgRowMe]}>
                  {!me && (
                    <View style={styles.msgAvatar}>
                      <ThemedText style={styles.msgAvatarTxt}>{m.sender_prenom?.[0]}</ThemedText>
                    </View>
                  )}
                  <View style={[styles.bubble, me ? styles.bubbleMe : styles.bubbleThem, hasFile && !hasText && styles.bubbleFile, m.message_type === 'devis' && styles.bubbleDevis]}>
                    {!me && hasText && (
                      <ThemedText style={styles.bubbleSender}>{m.sender_prenom} {m.sender_nom}</ThemedText>
                    )}
                    {hasFile && (
                      <AttachmentBubble
                        url={m.file_url!}
                        name={m.file_name ?? 'fichier'}
                        mimeType={m.file_type}
                        isMe={me}
                      />
                    )}
                    {m.message_type === 'devis' ? (
                      <DevisBubble
                        content={m.content}
                        devisId={m.devis_id}
                        convId={convId}
                        token={user!.accessToken}
                        clientName={otherName !== 'Conversation' ? otherName : undefined}
                      />
                    ) : hasText && (
                      <ThemedText style={[styles.bubbleText, me && styles.bubbleTextMe]}>{m.content}</ThemedText>
                    )}
                    <View style={styles.bubbleFooter}>
                      <ThemedText style={[styles.bubbleTime, me && styles.bubbleTimeMe]}>{formatTime(m.created_at)}</ThemedText>
                      {me && (
                        <Ionicons
                          name={m.is_read ? 'checkmark-done' : 'checkmark'}
                          size={12}
                          color={m.is_read ? '#a5b4fc' : 'rgba(255,255,255,0.5)'}
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.center}>
                <ThemedText style={styles.emptyTxt}>Aucun message — sois le premier à écrire 👋</ThemedText>
              </View>
            }
          />

          {/* Input */}
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              style={[styles.attachBtn, uploading && { opacity: 0.5 }]}
              onPress={showAttachmentPicker}
              disabled={uploading}
              hitSlop={8}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#A7AD9A" />
                : <Ionicons name="attach" size={24} color="#A7AD9A" />}
            </Pressable>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Écrire un message…"
              placeholderTextColor="#9ca3af"
              multiline
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
              onPress={send}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerAvatarTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rdvBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 99, backgroundColor: '#EDF0E5', flexShrink: 0,
  },
  rdvBtnTxt: { fontSize: 12, fontWeight: '700', color: C.saugeDark },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  msgList: { padding: 16, gap: 8, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 10, gap: 4 },
  bubbleMe: { backgroundColor: '#A7AD9A', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleFile: { padding: 8 },
  bubbleSender: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginBottom: 2 },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 },
  bubbleTime: { fontSize: 10, color: '#9ca3af', textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  // Image attachment
  imgThumbWrap: { width: 200, height: 160, borderRadius: 10, overflow: 'hidden' },
  imgThumb: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 4 },
  imgModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  imgFull: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 52, right: 20 },
  // File attachment
  fileBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: 10, maxWidth: 260 },
  fileBubbleMe: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileBubbleThem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  fileIconBox: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  fileNameMe: { color: '#fff' },
  fileType: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  fileTypeMe: { color: 'rgba(255,255,255,0.6)' },
  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingTop: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fff' },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100, backgroundColor: '#fafafa' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#A7AD9A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnOff: { opacity: 0.4 },
  bubbleDevis: { backgroundColor: '#F6F2EA', borderWidth: 1.5, borderColor: '#A7AD9A', minWidth: 220 },
  devisBubbleWrap: { gap: 10 },
  devisBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  devisIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  devisInfo: { flex: 1 },
  devisLabel: { fontSize: 10, fontWeight: '700', color: C.sauge, textTransform: 'uppercase', letterSpacing: 0.5 },
  devisTitle: { fontSize: 13, fontWeight: '600', color: '#3C352F', marginTop: 2 },
  devisPdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.saugePale, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  devisPdfTxt: { fontSize: 12, fontWeight: '700', color: C.sauge },
});
