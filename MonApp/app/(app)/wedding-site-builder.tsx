/**
 * Wedding Site Builder — wizard natif multi-étapes
 * Étape 1 : Style & design
 * Étape 2 : Informations du mariage
 * Étape 3 : Événements RSVP
 * Étape 4 : Liens d'invitation
 * Étape 5 : Publication & résultat
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { PremiumGate } from '@/components/premium-gate';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { API_ENDPOINTS } from '@/constants/config';
import { C } from '@/constants/OheveTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type StyleId =
  | 'classic' | 'luxury' | 'romantic' | 'floral' | 'oriental' | 'royal'
  | 'provence' | 'sephardic' | 'modern' | 'minimal' | 'mediterranean'
  | 'tel-aviv' | 'marrakech' | 'parisian' | 'art-deco' | 'garden-party'
  | 'desert-sunset' | 'navy-gold' | 'boho' | 'black-tie' | 'rustic-chic'
  | 'celestial' | 'tropical' | 'vintage-rose' | 'emerald-luxury'
  | 'nordic-minimal' | 'gold-leaf' | 'cherry-blossom' | 'dark-romance'
  | 'ivory-lace' | 'midnight-blue' | 'english-garden' | 'minimal-white';

type StylePreset = {
  id: StyleId;
  label: string;
  description: string;
  bg: string;
  accent: string;
  text: string;
};

type RSVPEvent = {
  id: string;
  label: string;
  emoji: string;
  enabled: boolean;
  day: string;
  time: string;
};

type InviteLink = {
  id: string;
  label: string;
  eventIds: string[];
  token: string;
};

// ─── Style presets ────────────────────────────────────────────────────────────

const STYLE_PRESETS: StylePreset[] = [
  { id: 'classic',       label: 'Classique',        description: 'Blanc cassé, serif, élégant',           bg: '#faf7f2', accent: '#5b4636', text: '#2c241c' },
  { id: 'luxury',        label: 'Luxe',              description: 'Fond sombre, or, premium',               bg: '#0c0c0f', accent: '#d4af37', text: '#f2ecdf' },
  { id: 'art-deco',      label: '✦ Art Déco',        description: 'Noir, or, géométrique années 20',        bg: '#0d0d0d', accent: '#d4af37', text: '#f0e8c8' },
  { id: 'romantic',      label: 'Romantique',        description: 'Douceur, rose, courbes',                 bg: '#fff5f8', accent: '#b84b6f', text: '#4a3040' },
  { id: 'boho',          label: '✦ Boho',            description: 'Terracotta, lin, esprit libre',          bg: '#f9f3ec', accent: '#a0522d', text: '#3d2b1f' },
  { id: 'dark-romance',  label: '✦ Dark Romance',    description: 'Bordeaux velours, roses noires',         bg: '#120a0f', accent: '#8b1a4a', text: '#f2e8ee' },
  { id: 'celestial',     label: '✦ Céleste',         description: 'Bleu nuit, étoiles, or',                bg: '#080c1a', accent: '#7986cb', text: '#e8eaf6' },
  { id: 'navy-gold',     label: '✦ Navy & Or',       description: 'Marine profond, or classique',           bg: '#f4f6f9', accent: '#0d1f3c', text: '#0d1f3c' },
  { id: 'parisian',      label: '✦ Parisien',        description: 'Blush, taupé, France',                  bg: '#faf5f2', accent: '#c4967a', text: '#2e2420' },
  { id: 'vintage-rose',  label: '✦ Rose Vintage',    description: 'Rose poudré, dentelle',                 bg: '#fdf2f4', accent: '#c77e8e', text: '#4a2535' },
  { id: 'cherry-blossom',label: '✦ Cerisier',        description: 'Sakura, inspiration japonaise',          bg: '#fff9fb', accent: '#e091b0', text: '#3d1f2d' },
  { id: 'floral',        label: 'Floral',            description: 'Romantique botanique, arrondis',         bg: '#f5f0f5', accent: '#7d5a7d', text: '#3d2c3d' },
  { id: 'garden-party',  label: '✦ Garden Party',    description: 'Verdure luxuriante, fleurs sauvages',   bg: '#eef4ec', accent: '#3a7d44', text: '#1e3a25' },
  { id: 'tropical',      label: '✦ Tropical',        description: 'Verdure tropicale, exotisme',            bg: '#f0fff4', accent: '#2d6a4f', text: '#1a3a2a' },
  { id: 'emerald-luxury',label: '✦ Émeraude',        description: 'Vert émeraude riche, or',               bg: '#f2faf4', accent: '#1a6641', text: '#0a2416' },
  { id: 'marrakech',     label: '✦ Marrakech',       description: 'Terracotta, zellige, riad',              bg: '#f5ede4', accent: '#c4622d', text: '#2d1e15' },
  { id: 'desert-sunset', label: '✦ Desert Sunset',   description: 'Pêche, sable, soleil couchant',         bg: '#fdf0e8', accent: '#e07d54', text: '#3b2416' },
  { id: 'rustic-chic',   label: '✦ Rustic Chic',     description: 'Bois, lin, campagne romantique',        bg: '#f7f0e6', accent: '#7a5c3c', text: '#3b2a1a' },
  { id: 'gold-leaf',     label: '✦ Feuille d\'Or',   description: 'Crème ivoire, feuille d\'or',           bg: '#fdfaf3', accent: '#b8860b', text: '#2c2012' },
  { id: 'ivory-lace',    label: '✦ Ivoire & Dentelle',description: 'Dentelle, romantisme classique',       bg: '#fdfaf6', accent: '#8b6a3c', text: '#2c2018' },
  { id: 'oriental',      label: 'Oriental',          description: 'Chic oriental, motifs discrets',        bg: '#faf6f0', accent: '#b8860b', text: '#3d2914' },
  { id: 'sephardic',     label: 'Sépharade',         description: 'Bordeaux, or, crème, dense',            bg: '#2a1218', accent: '#8b1d3b', text: '#f4ece0' },
  { id: 'royal',         label: 'Royal',             description: 'Présence, contrastes, noblesse',        bg: '#1a1520', accent: '#9b7ed9', text: '#f0e6ff' },
  { id: 'modern',        label: 'Moderne',           description: 'Espace blanc, typographie nette',       bg: '#ffffff', accent: '#111111', text: '#111111' },
  { id: 'minimal',       label: 'Minimal',           description: 'Très épuré, peu d\'ornements',          bg: '#fafafa', accent: '#222222', text: '#222222' },
  { id: 'black-tie',     label: '✦ Black Tie',       description: 'Blanc/noir formel, cérémonie',          bg: '#ffffff', accent: '#000000', text: '#000000' },
  { id: 'nordic-minimal',label: '✦ Nordic',          description: 'Blanc froid, Scandi épuré',             bg: '#f8f8f8', accent: '#4a4a4a', text: '#2a2a2a' },
  { id: 'tel-aviv',      label: '✦ Tel Aviv',        description: 'Blanc, bold, israélien moderne',        bg: '#f9f9f7', accent: '#1a1a1a', text: '#1a1a1a' },
  { id: 'midnight-blue', label: '✦ Minuit Bleu',     description: 'Bleu minuit intense, argent',           bg: '#f0f4f8', accent: '#1e3a5f', text: '#0a1628' },
  { id: 'mediterranean', label: 'Méditerranéen',     description: 'Bleu nuit, blanc, or',                  bg: '#f8fafc', accent: '#0f2b46', text: '#10233c' },
  { id: 'provence',      label: 'Provence',          description: 'Beige, ocre, vert olivier',             bg: '#f7efe3', accent: '#a06a3b', text: '#3b2f25' },
  { id: 'english-garden',label: 'Jardin Anglais',    description: 'Vert sauge, rose poudre',               bg: '#f3f5ef', accent: '#8aa089', text: '#2f3b34' },
  { id: 'minimal-white', label: 'Minimaliste Blanc', description: 'Fond blanc, accents noirs',             bg: '#ffffff', accent: '#111111', text: '#111111' },
];

const DEFAULT_EVENTS: RSVPEvent[] = [
  { id: '1', label: 'Houppa',        emoji: '💍', enabled: true,  day: 'Dimanche', time: '17:00' },
  { id: '2', label: 'Cocktail',      emoji: '🥂', enabled: true,  day: 'Dimanche', time: '19:30' },
  { id: '3', label: 'Soirée',        emoji: '🎉', enabled: true,  day: 'Dimanche', time: '21:30' },
  { id: '4', label: 'Chabbat Hatan', emoji: '🕯️', enabled: false, day: 'Samedi',   time: '' },
  { id: '5', label: 'Henné',         emoji: '🧡', enabled: false, day: 'Lundi',    time: '13:00' },
  { id: '6', label: 'Brunch',        emoji: '🍽️', enabled: false, day: 'Lundi',    time: '11:00' },
  { id: '7', label: 'Mairie',        emoji: '🏛️', enabled: false, day: 'Vendredi', time: '15:00' },
];

// ─── Wizard steps ─────────────────────────────────────────────────────────────

type Step = 'style' | 'info' | 'events' | 'links' | 'publish';
const STEPS: Step[] = ['style', 'info', 'events', 'links', 'publish'];
const STEP_LABELS: Record<Step, string> = {
  style:   'Style',
  info:    'Infos',
  events:  'Événements',
  links:   'Liens',
  publish: 'Publier',
};

// ─── Main component ───────────────────────────────────────────────────────────

function WeddingSiteBuilderContent() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('style');

  // Style
  const [selectedStyle, setSelectedStyle] = useState<StyleId>('classic');

  // Info
  const [brideName, setBrideName] = useState(user?.prenom ? `${user.prenom} ${user.nom ?? ''}`.trim() : '');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState(user?.date_mariage?.slice(0, 10) ?? '');
  const [city, setCity] = useState([user?.wedding_city, user?.wedding_country].filter(Boolean).join(', ') || '');
  const [venue, setVenue] = useState('');
  const [welcomeText, setWelcomeText] = useState('Nous avons hâte de célébrer ce jour avec vous.');

  // Events
  const [events, setEvents] = useState<RSVPEvent[]>(DEFAULT_EVENTS);

  // Invite links
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [finalLinks, setFinalLinks] = useState<InviteLink[]>([]);

  const preset = STYLE_PRESETS.find((s) => s.id === selectedStyle) ?? STYLE_PRESETS[0];
  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function goPrev() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function toggleEvent(id: string) {
    setEvents((ev) => ev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));
  }

  function updateEvent(id: string, field: keyof RSVPEvent, value: string) {
    setEvents((ev) => ev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }

  function addInviteLink() {
    setInviteLinks((l) => [
      ...l,
      { id: String(Date.now()), label: '', eventIds: [], token: '' },
    ]);
  }

  function toggleEventInLink(linkId: string, eventId: string) {
    setInviteLinks((links) =>
      links.map((l) => {
        if (l.id !== linkId) return l;
        const ids = l.eventIds.includes(eventId)
          ? l.eventIds.filter((x) => x !== eventId)
          : [...l.eventIds, eventId];
        return { ...l, eventIds: ids };
      })
    );
  }

  async function handlePublish() {
    if (!brideName.trim() || !groomName.trim()) {
      Alert.alert('Infos manquantes', 'Renseigne les prénoms de la mariée et du marié.');
      setStep('info');
      return;
    }
    if (!weddingDate.trim()) {
      Alert.alert('Date manquante', 'Renseigne la date du mariage (AAAA-MM-JJ).');
      setStep('info');
      return;
    }

    setPublishing(true);
    try {
      const token = user?.accessToken;
      if (!token) throw new Error('Non connecté');

      // 1. Create the public site (basic info)
      const createRes = await fetch(API_ENDPOINTS.publicSites, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          brideName: brideName.trim(),
          groomName: groomName.trim(),
          weddingDate: weddingDate.trim(),
          location: city.trim() || venue.trim(),
          templateId: selectedStyle,
          customText: welcomeText.trim(),
          isPublished: true,
        }),
      });

      const createJson = await createRes.json() as { success: boolean; data?: { slug: string; publicUrl: string }; message?: string };
      if (!createRes.ok || !createJson.success || !createJson.data) {
        throw new Error(createJson.message ?? 'Erreur création site');
      }

      const { slug, publicUrl } = createJson.data;

      // 2. Save full config (theme, events, invite links)
      const generatedLinks = inviteLinks.map((l) => ({
        ...l,
        token: l.token || Math.random().toString(36).slice(2, 10),
      }));

      await fetch(API_ENDPOINTS.siteConfig(slug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          siteConfig: {
            style: selectedStyle,
            brideName: brideName.trim(),
            groomName: groomName.trim(),
            date: weddingDate.trim(),
            city: city.trim(),
            venue: venue.trim(),
            welcomeText: welcomeText.trim(),
            events: events.filter((e) => e.enabled),
          },
          inviteLinks: generatedLinks,
        }),
      });

      setPublishedSlug(slug);
      setPublishedUrl(publicUrl);
      setFinalLinks(generatedLinks);
    } catch (e) {
      Alert.alert('Erreur', (e as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.textDark} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Site du mariage</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {STEPS.map((s, i) => (
          <Pressable key={s} onPress={() => i < stepIndex && setStep(s)} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= stepIndex && styles.stepDotActive]}>
              {i < stepIndex
                ? <Ionicons name="checkmark" size={10} color="#fff" />
                : <ThemedText style={[styles.stepNum, i === stepIndex && styles.stepNumActive]}>{i + 1}</ThemedText>
              }
            </View>
            <ThemedText style={[styles.stepLabel, i === stepIndex && styles.stepLabelActive]}>
              {STEP_LABELS[s]}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── STEP 1 : STYLE ────────────────────────────────────────────── */}
          {step === 'style' && (
            <View>
              <ThemedText style={styles.stepTitle}>Choisissez votre style</ThemedText>
              <ThemedText style={styles.stepSub}>{STYLE_PRESETS.length} designs disponibles — appuyez pour sélectionner</ThemedText>

              {/* Preview card */}
              <View style={[styles.previewCard, { backgroundColor: preset.bg, borderColor: preset.accent }]}>
                <ThemedText style={[styles.previewCouple, { color: preset.accent }]}>
                  {brideName || 'Sarah'} & {groomName || 'David'}
                </ThemedText>
                <ThemedText style={[styles.previewSub, { color: preset.text, opacity: 0.6 }]}>
                  {city || 'Paris'} · {weddingDate || '2026-09-03'}
                </ThemedText>
                <View style={[styles.previewBadge, { backgroundColor: preset.accent }]}>
                  <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{preset.label}</ThemedText>
                </View>
              </View>

              {/* Grid of styles */}
              <View style={styles.styleGrid}>
                {STYLE_PRESETS.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.styleCard,
                      { backgroundColor: p.bg, borderColor: selectedStyle === p.id ? p.accent : 'transparent' },
                    ]}
                    onPress={() => setSelectedStyle(p.id)}
                  >
                    {/* Color swatch */}
                    <View style={styles.swatchRow}>
                      <View style={[styles.swatch, { backgroundColor: p.bg, borderWidth: 1, borderColor: p.accent + '55' }]} />
                      <View style={[styles.swatch, { backgroundColor: p.accent }]} />
                      <View style={[styles.swatch, { backgroundColor: p.text + '44' }]} />
                    </View>
                    <ThemedText style={[styles.styleCardLabel, { color: p.text }]} numberOfLines={1}>{p.label}</ThemedText>
                    <ThemedText style={[styles.styleCardDesc, { color: p.text, opacity: 0.55 }]} numberOfLines={2}>{p.description}</ThemedText>
                    {selectedStyle === p.id && (
                      <View style={[styles.styleCheckmark, { backgroundColor: p.accent }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* ── STEP 2 : INFO ─────────────────────────────────────────────── */}
          {step === 'info' && (
            <View style={styles.formBlock}>
              <ThemedText style={styles.stepTitle}>Informations du mariage</ThemedText>

              <ThemedText style={styles.label}>Prénom & nom de la mariée *</ThemedText>
              <TextInput style={styles.input} value={brideName} onChangeText={setBrideName} placeholder="Sarah Benitah" />

              <ThemedText style={styles.label}>Prénom & nom du marié *</ThemedText>
              <TextInput style={styles.input} value={groomName} onChangeText={setGroomName} placeholder="David Cohen" />

              <ThemedText style={styles.label}>Date du mariage * (AAAA-MM-JJ)</ThemedText>
              <TextInput
                style={styles.input}
                value={weddingDate}
                onChangeText={setWeddingDate}
                placeholder="2026-09-03"
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
              {weddingDate.match(/^\d{4}-\d{2}-\d{2}$/) && (
                <ThemedText style={styles.dateHint}>
                  {new Date(weddingDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </ThemedText>
              )}

              <ThemedText style={styles.label}>Ville</ThemedText>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Paris, France" />

              <ThemedText style={styles.label}>Lieu de réception</ThemedText>
              <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholder="Château de Versailles" />

              <ThemedText style={styles.label}>Message d'accueil</ThemedText>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={welcomeText}
                onChangeText={setWelcomeText}
                multiline
                numberOfLines={3}
              />

              {/* Desktop banner */}
              <View style={styles.desktopBanner}>
                <Ionicons name="desktop-outline" size={18} color={C.sauge} />
                <ThemedText style={styles.desktopBannerText}>
                  Pour personnaliser les couleurs, polices et toutes les sections, ouvrez le studio complet sur ordinateur — l'expérience est optimale sur grand écran.
                </ThemedText>
              </View>
            </View>
          )}

          {/* ── STEP 3 : ÉVÉNEMENTS ───────────────────────────────────────── */}
          {step === 'events' && (
            <View style={styles.formBlock}>
              <ThemedText style={styles.stepTitle}>Événements RSVP</ThemedText>
              <ThemedText style={styles.stepSub}>Activez les événements auxquels vos invités pourront répondre</ThemedText>

              {events.map((ev) => (
                <View key={ev.id} style={styles.eventCard}>
                  <View style={styles.eventRow}>
                    <ThemedText style={styles.eventEmoji}>{ev.emoji}</ThemedText>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.eventInput}
                        value={ev.label}
                        onChangeText={(v) => updateEvent(ev.id, 'label', v)}
                      />
                    </View>
                    <Switch
                      value={ev.enabled}
                      onValueChange={() => toggleEvent(ev.id)}
                      trackColor={{ true: C.sauge, false: C.border }}
                      thumbColor="#fff"
                    />
                  </View>
                  {ev.enabled && (
                    <View style={styles.eventDetails}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.miniLabel}>Jour</ThemedText>
                        <TextInput
                          style={styles.miniInput}
                          value={ev.day}
                          onChangeText={(v) => updateEvent(ev.id, 'day', v)}
                          placeholder="Dimanche"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.miniLabel}>Heure</ThemedText>
                        <TextInput
                          style={styles.miniInput}
                          value={ev.time}
                          onChangeText={(v) => updateEvent(ev.id, 'time', v)}
                          placeholder="17:00"
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── STEP 4 : LIENS D'INVITATION ───────────────────────────────── */}
          {step === 'links' && (
            <View style={styles.formBlock}>
              <ThemedText style={styles.stepTitle}>🔗 Liens d'invitation</ThemedText>
              <ThemedText style={styles.stepSub}>
                Créez des liens séparés par groupe d'invités. Chaque lien affiche uniquement les événements sélectionnés dans le formulaire RSVP.
              </ThemedText>

              {inviteLinks.length === 0 && (
                <View style={styles.emptyLinks}>
                  <Ionicons name="link-outline" size={32} color={C.taupe} />
                  <ThemedText style={styles.emptyLinksText}>Aucun lien créé — tous les invités verront tous les événements actifs</ThemedText>
                </View>
              )}

              {inviteLinks.map((link, idx) => (
                <View key={link.id} style={styles.linkCard}>
                  <View style={styles.linkCardHeader}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      value={link.label}
                      onChangeText={(v) =>
                        setInviteLinks((ls) => ls.map((l) => (l.id === link.id ? { ...l, label: v } : l)))
                      }
                      placeholder={`Ex. Mariage + Chabbat Hatan`}
                    />
                    <Pressable
                      onPress={() => setInviteLinks((ls) => ls.filter((l) => l.id !== link.id))}
                      style={styles.linkDeleteBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </Pressable>
                  </View>

                  <ThemedText style={[styles.miniLabel, { marginTop: 10 }]}>Événements inclus :</ThemedText>
                  {events.filter((e) => e.enabled).map((ev) => {
                    const checked = link.eventIds.includes(ev.id);
                    return (
                      <Pressable
                        key={ev.id}
                        style={styles.eventCheckRow}
                        onPress={() => toggleEventInLink(link.id, ev.id)}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Ionicons name="checkmark" size={10} color="#fff" />}
                        </View>
                        <ThemedText style={styles.eventCheckLabel}>
                          {ev.emoji} {ev.label} — {ev.day} {ev.time}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              <Pressable style={styles.addLinkBtn} onPress={addInviteLink}>
                <Ionicons name="add-circle-outline" size={18} color={C.sauge} />
                <ThemedText style={styles.addLinkBtnText}>Ajouter un lien d'invitation</ThemedText>
              </Pressable>
            </View>
          )}

          {/* ── STEP 5 : PUBLISH ──────────────────────────────────────────── */}
          {step === 'publish' && (
            <View style={styles.formBlock}>
              {!publishedSlug ? (
                <>
                  <ThemedText style={styles.stepTitle}>Prêt à publier !</ThemedText>

                  {/* Summary card */}
                  <View style={[styles.summaryCard, { backgroundColor: preset.bg, borderColor: preset.accent + '55' }]}>
                    <ThemedText style={[styles.summaryCouple, { color: preset.accent }]}>
                      {brideName} & {groomName}
                    </ThemedText>
                    <ThemedText style={[styles.summarySub, { color: preset.text, opacity: 0.7 }]}>
                      {weddingDate} · {city}
                    </ThemedText>
                    <View style={[styles.summaryStyleBadge, { backgroundColor: preset.accent }]}>
                      <ThemedText style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{preset.label}</ThemedText>
                    </View>
                    <ThemedText style={[styles.summarySub, { color: preset.text, opacity: 0.6, marginTop: 6 }]}>
                      {events.filter((e) => e.enabled).map((e) => e.emoji + ' ' + e.label).join(' · ')}
                    </ThemedText>
                    {inviteLinks.length > 0 && (
                      <ThemedText style={[styles.summarySub, { color: preset.text, opacity: 0.6, marginTop: 4 }]}>
                        🔗 {inviteLinks.length} lien{inviteLinks.length > 1 ? 's' : ''} d'invitation
                      </ThemedText>
                    )}
                  </View>

                  <Pressable
                    style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
                    onPress={handlePublish}
                    disabled={publishing}
                  >
                    <Ionicons name={publishing ? 'hourglass-outline' : 'globe-outline'} size={20} color="#fff" />
                    <ThemedText style={styles.publishBtnText}>
                      {publishing ? 'Publication en cours…' : 'Publier le site'}
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                /* ── SUCCESS ── */
                <View>
                  <View style={styles.successHeader}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={40} color={C.sauge} />
                    </View>
                    <ThemedText style={styles.successTitle}>Site publié ! 🎉</ThemedText>
                    <ThemedText style={styles.successSub}>Votre site de mariage est en ligne</ThemedText>
                  </View>

                  <LinkRow label="Site principal" url={publishedUrl ?? ''} />
                  <LinkRow label="RSVP général" url={(publishedUrl ?? '') + '/rsvp'} />

                  {finalLinks.map((link) => (
                    <LinkRow
                      key={link.id}
                      label={`🔗 ${link.label || 'Lien d\'invitation'}`}
                      url={(publishedUrl ?? '') + '/invite/' + link.token}
                    />
                  ))}

                  <Pressable style={styles.doneBtn} onPress={() => router.back()}>
                    <ThemedText style={styles.doneBtnText}>Terminer</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav */}
      {step !== 'publish' || !publishedSlug ? (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {stepIndex > 0 && (
            <Pressable style={styles.prevBtn} onPress={goPrev}>
              <Ionicons name="arrow-back" size={16} color={C.sauge} />
              <ThemedText style={styles.prevBtnText}>Retour</ThemedText>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          {step !== 'publish' ? (
            <Pressable style={styles.nextBtn} onPress={goNext}>
              <ThemedText style={styles.nextBtnText}>Suivant</ThemedText>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.nextBtn, publishing && styles.publishBtnDisabled]}
              onPress={handlePublish}
              disabled={publishing}
            >
              <Ionicons name="globe-outline" size={16} color="#fff" />
              <ThemedText style={styles.nextBtnText}>{publishing ? 'Publication…' : 'Publier'}</ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ─── LinkRow ──────────────────────────────────────────────────────────────────

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Lien', url);
    }
  }

  return (
    <View style={linkStyles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText style={linkStyles.label}>{label}</ThemedText>
        <ThemedText style={linkStyles.url} numberOfLines={2}>{url}</ThemedText>
      </View>
      <Pressable style={linkStyles.copyBtn} onPress={handleCopy}>
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? C.sauge : C.textLight} />
      </Pressable>
    </View>
  );
}

const linkStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.ivoire, borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  label: { fontSize: 11, fontWeight: '700', color: C.sauge, marginBottom: 3 },
  url: { fontSize: 12, color: C.textMid, lineHeight: 16 },
  copyBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    backgroundColor: C.card, gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.textDark, textAlign: 'center' },

  // Step bar
  stepBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: C.sauge },
  stepNum: { fontSize: 10, fontWeight: '700', color: C.textLight },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 9, color: C.textLight, fontWeight: '600' },
  stepLabelActive: { color: C.sauge },

  scroll: { padding: 16, paddingBottom: 32 },

  // Step titles
  stepTitle: { fontSize: 22, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  stepSub: { fontSize: 13, color: C.textLight, marginBottom: 16, lineHeight: 18 },

  // Style step
  previewCard: {
    borderRadius: 16, borderWidth: 2,
    padding: 20, marginBottom: 20, alignItems: 'center',
  },
  previewCouple: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  previewSub: { fontSize: 13, marginBottom: 10 },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  styleCard: {
    width: '47%', borderRadius: 12, padding: 10,
    borderWidth: 2, position: 'relative',
  },
  swatchRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  styleCardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  styleCardDesc: { fontSize: 10, lineHeight: 14 },
  styleCheckmark: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Form
  formBlock: { gap: 0 },
  label: { fontSize: 13, fontWeight: '700', color: C.textDark, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.textDark, marginBottom: 2,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  dateHint: { fontSize: 12, color: C.sauge, fontWeight: '600', marginBottom: 4, marginTop: 2 },

  desktopBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: C.saugePale, borderRadius: 12,
    padding: 12, marginTop: 16,
    borderWidth: 1, borderColor: C.sauge + '44',
  },
  desktopBannerText: { flex: 1, fontSize: 13, color: C.saugeDark, lineHeight: 18 },

  // Events
  eventCard: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 12, marginBottom: 8,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  eventInput: {
    fontSize: 15, fontWeight: '600', color: C.textDark,
    paddingVertical: 4,
  },
  eventDetails: { flexDirection: 'row', gap: 10, marginTop: 10 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: C.textLight, marginBottom: 4 },
  miniInput: {
    backgroundColor: C.ivoire, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, color: C.textDark,
  },

  // Invite links
  emptyLinks: {
    alignItems: 'center', gap: 8, padding: 24,
    backgroundColor: C.ivoire, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  emptyLinksText: { fontSize: 13, color: C.textLight, textAlign: 'center', lineHeight: 18 },
  linkCard: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 12, marginBottom: 10,
  },
  linkCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkDeleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
  eventCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.sauge, borderColor: C.sauge },
  eventCheckLabel: { fontSize: 13, color: C.textDark },
  addLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, borderColor: C.sauge,
    padding: 12, justifyContent: 'center', marginTop: 4,
  },
  addLinkBtnText: { fontSize: 14, fontWeight: '700', color: C.sauge },

  // Summary / publish
  summaryCard: {
    borderRadius: 16, borderWidth: 1.5,
    padding: 20, marginBottom: 20, alignItems: 'center', gap: 4,
  },
  summaryCouple: { fontSize: 24, fontWeight: '800' },
  summarySub: { fontSize: 12, textAlign: 'center' },
  summaryStyleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 6 },

  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.sauge, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 24, marginBottom: 12,
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  successHeader: { alignItems: 'center', gap: 6, marginBottom: 24 },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.saugePale, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: C.textDark },
  successSub: { fontSize: 14, color: C.textLight },

  doneBtn: {
    backgroundColor: C.sauge, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    backgroundColor: C.card, gap: 12,
  },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: C.sauge,
  },
  prevBtnText: { fontSize: 14, fontWeight: '600', color: C.sauge },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, backgroundColor: C.sauge,
  },
  nextBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default function WeddingSiteBuilderScreen() {
  return <PremiumGate feature="Site de mariage" icon="globe-outline"><WeddingSiteBuilderContent /></PremiumGate>;
}
