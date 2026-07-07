import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { MonogramGenerator } from './MonogramGenerator';
import { RSVPBuilder } from '@guest/rsvp/RSVPBuilder';
import { RSVPPreview } from '@guest/rsvp/RSVPPreview';
import { ErrorBoundary } from '@guest/components/ErrorBoundary';
import { createDefaultRSVPForm, newEvent, type RSVPEvent, type RSVPForm } from '@guest/rsvp/types';
import { ALL_STYLE_PRESETS, FONT_OPTIONS, STYLE_PRESETS } from '../data/weddingThemes';
import { MUSIC_SUGGESTIONS, DEEZER_SCHEME, musicLabelForUrl, deezerTrackId, resolveDeezerPreview } from '../data/musicSuggestions';
import { createWeddingSite, updateWeddingSite, setAuthToken, getWeddingSiteBySlug, uploadGalleryPhoto, adaptPhotoToTheme } from '../services/weddingSiteService';
import type {
  AccommodationItem,
  CardStyle,
  FamilyColumn,
  FAQItem,
  HeroStyle,
  InviteLink,
  JewishWeddingEvent,
  PatternId,
  SeparatorStyle,
  SiteLanguage,
  ThemeAmbiance,
  ThemeLayout,
  TitleSize,
  WeddingSections,
  WeddingSite,
  WeddingSiteContent,
  WeddingTheme,
} from '../types';
import { defaultWeddingSections, defaultWeddingTheme } from '../types';
import { getPatternStyle } from '../templates/PatternOverlay';
import { getFamilyColumns } from '../templates/templateParts';
import { mergeDateAndTimeToIso } from '../utils/date';
import { generateSlugFromDisplayName, slugify } from '../utils/slug';
import { applyThemePreset } from '../templates/themePresets';

import { WeddingSitePreview } from './WeddingSitePreview';
import { VintageThemePreview } from './VintageThemePreview';
import { ThemePicker } from './ThemePicker';

// ─── Design Studio options ────────────────────────────────────────────────────

const HERO_STYLE_OPTIONS: { id: HeroStyle; label: string; icon: string; desc: string }[] = [
  { id: 'editorial',   label: 'Éditorial',   icon: '📰', desc: 'Deux colonnes structurées' },
  { id: 'faire-part',  label: 'Faire-part',  icon: '💌', desc: 'Style invitation papier' },
  { id: 'art-deco',    label: 'Art Déco',    icon: '◆',  desc: 'Géométrique 1920s' },
  { id: 'magazine',    label: 'Magazine',    icon: '📖', desc: 'Style éditorial bold' },
  { id: 'minimal',     label: 'Minimal',     icon: '⬜', desc: 'Épuré, espace blanc' },
  { id: 'royal',       label: 'Royal',       icon: '👑', desc: 'Héraldique formel' },
  { id: 'garden',      label: 'Botanique',   icon: '🌿', desc: 'Couronne de feuilles' },
  { id: 'cinematic',   label: 'Cinéma',      icon: '🎬', desc: 'Plein écran dramatique' },
  { id: 'letterpress', label: 'Letterpress', icon: '🖋️', desc: 'Carte en relief' },
];

const PATTERN_OPTIONS: { id: PatternId; label: string }[] = [
  { id: 'none',               label: 'Aucun' },
  { id: 'ornament-star',      label: 'Étoile ornement' },
  { id: 'quatrefoil',         label: 'Croix perlée' },
  { id: 'hexagonal',          label: 'Hexagone' },
  { id: 'small-squares',      label: 'Carreaux' },
  { id: 'deco-geo',           label: 'Géo déco' },
  { id: 'horizontal-stripes', label: 'Rayures H' },
  { id: 'marble',             label: 'Marbre' },
  { id: 'olive-branch',       label: 'Olivier' },
  { id: 'art-nouveau',        label: 'Art Nouveau' },
  { id: 'oriental',           label: 'Oriental' },
  { id: 'stars-of-david',     label: 'Étoile David' },
];

const SEPARATOR_OPTIONS: { id: SeparatorStyle; label: string }[] = [
  { id: 'none',        label: 'Aucun' },
  { id: 'thin-line',   label: 'Ligne fine' },
  { id: 'double-line', label: 'Double ligne' },
  { id: 'dots-line',   label: 'Pointillés' },
  { id: 'diamond',     label: 'Losange' },
  { id: 'stars',       label: 'Étoiles' },
  { id: 'floral',      label: 'Floral' },
  { id: 'arabesque',   label: 'Arabesque' },
  { id: 'art-deco-sep', label: 'Art Déco' },
  { id: 'geometric',   label: 'Géométrique' },
];

const CARD_STYLE_OPTIONS: { id: CardStyle; label: string; desc: string }[] = [
  { id: 'solid',         label: 'Solid',         desc: 'Fond teinté discret' },
  { id: 'shadow',        label: 'Shadow',        desc: 'Ombre portée élégante' },
  { id: 'outline',       label: 'Outline',       desc: 'Bordure seule, transparent' },
  { id: 'glass',         label: 'Glass',         desc: 'Verre givré, flou' },
  { id: 'premium',       label: 'Premium',       desc: 'Dégradé luxueux' },
  { id: 'double-border', label: 'Double bordure', desc: 'Cadre intérieur' },
  { id: 'luxe',          label: 'Luxe',          desc: 'Ombre intense' },
];

function SepMini({ id, color }: { id: SeparatorStyle; color: string }) {
  const w = 88;
  const h = 14;
  if (id === 'none') return null;
  switch (id) {
    case 'thin-line':
      return <svg width={w} height={h}><line x1="0" y1="7" x2={w} y2="7" stroke={color} strokeWidth="1" opacity="0.5"/></svg>;
    case 'double-line':
      return <svg width={w} height={h}><line x1="0" y1="5" x2={w} y2="5" stroke={color} strokeWidth="1" opacity="0.5"/><line x1="8" y1="9" x2={w - 8} y2="9" stroke={color} strokeWidth="0.6" opacity="0.28"/></svg>;
    case 'dots-line':
      return <svg width={w} height={h}>{[0,1,2,3,4,5,6].map(i=><circle key={i} cx={i*12+8} cy="7" r={i===3?3:2} fill={color} opacity={i===3?0.8:0.4}/>)}</svg>;
    case 'diamond':
      return <svg width={w} height={h}><line x1="0" y1="7" x2="32" y2="7" stroke={color} strokeWidth="0.8" opacity="0.5"/><polygon points="44,4 49,7 44,10 39,7" fill={color} opacity="0.75"/><line x1="56" y1="7" x2={w} y2="7" stroke={color} strokeWidth="0.8" opacity="0.5"/></svg>;
    case 'stars':
      return <svg width={w} height={h}><line x1="0" y1="7" x2="24" y2="7" stroke={color} strokeWidth="0.8" opacity="0.4"/><polygon points="34,4 35.5,7.5 39,7.5 36.5,9.5 37.5,13 34,11 30.5,13 31.5,9.5 29,7.5 32.5,7.5" fill={color} opacity="0.7"/><line x1="44" y1="7" x2={w} y2="7" stroke={color} strokeWidth="0.8" opacity="0.4"/></svg>;
    case 'floral':
      return <svg width={w} height={h}><line x1="0" y1="7" x2="28" y2="7" stroke={color} strokeWidth="0.6" opacity="0.35"/><circle cx="40" cy="7" r="3.5" fill={color} opacity="0.7"/><circle cx="40" cy="3" r="2" fill={color} opacity="0.45"/><circle cx="40" cy="11" r="2" fill={color} opacity="0.45"/><circle cx="36" cy="7" r="2" fill={color} opacity="0.45"/><circle cx="44" cy="7" r="2" fill={color} opacity="0.45"/><line x1="52" y1="7" x2={w} y2="7" stroke={color} strokeWidth="0.6" opacity="0.35"/></svg>;
    case 'arabesque':
      return <svg width={w} height={h}><line x1="0" y1="7" x2="26" y2="7" stroke={color} strokeWidth="0.7" opacity="0.4"/><path d="M32,5 C36,9 40,10 44,7 C40,4 36,5 32,9 Z" fill={color} opacity="0.45"/><circle cx="44" cy="7" r="2" fill={color} opacity="0.7"/><line x1="52" y1="7" x2={w} y2="7" stroke={color} strokeWidth="0.7" opacity="0.4"/></svg>;
    case 'wave':
      return <svg width={w} height={h}><path d={`M0,7 C11,3 22,11 33,7 C44,3 55,11 66,7 C77,3 88,11 88,7`} fill="none" stroke={color} strokeWidth="1.2" opacity="0.5"/></svg>;
    case 'art-deco-sep':
      return <svg width={w} height={h}><line x1="0" y1="7" x2="22" y2="7" stroke={color} strokeWidth="0.8" opacity="0.45"/><polygon points="28,4 33,7 28,10 23,7" fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"/><rect x="35" y="4.5" width="6" height="6" fill={color} opacity="0.6" transform="rotate(45 38 7)"/><polygon points="54,4 59,7 54,10 49,7" fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"/><line x1="60" y1="7" x2={w} y2="7" stroke={color} strokeWidth="0.8" opacity="0.45"/></svg>;
    case 'geometric':
      return <svg width={w} height={h}><line x1="0" y1="7" x2="28" y2="7" stroke={color} strokeWidth="0.8" opacity="0.4"/><polygon points="44,2 56,7 44,12 32,7" fill="none" stroke={color} strokeWidth="0.9" opacity="0.7"/><circle cx="44" cy="7" r="2.5" fill={color} opacity="0.55"/><line x1="56" y1="7" x2={w} y2="7" stroke={color} strokeWidth="0.8" opacity="0.4"/></svg>;
    case 'ornate':
      return <svg width={w} height={h}><path d={`M0,7 C8,3 16,11 24,7 C30,4 34,10 44,7 C54,4 58,10 64,7 C72,3 80,11 88,7`} fill="none" stroke={color} strokeWidth="1" opacity="0.45"/><circle cx="44" cy="7" r="3" fill={color} opacity="0.65"/></svg>;
    default:
      return null;
  }
}

/** ID stable dans rsvpForm.events pour chaque type d'événement juif */
function jewishRsvpId(type: JewishWeddingEvent['type']) {
  return `jewish-${type}`;
}

const JEWISH_META: Record<JewishWeddingEvent['type'], { emoji: string; label: string }> = {
  'henne':          { emoji: '🌸', label: 'Henné' },
  'mairie':         { emoji: '🏛️', label: 'Mairie' },
  'chabbat-hatan':  { emoji: '🕌', label: 'Chabbat Hatan' },
  'houppa':         { emoji: '💍', label: 'Houppa & Cérémonie' },
  'brunch':         { emoji: '☕', label: 'Brunch' },
  'sheva-berakhot': { emoji: '🥂', label: 'Sheva Berakhot' },
  'depart':         { emoji: '👋', label: 'Au revoir des invités' },
  'pool-party':     { emoji: '🏊', label: 'Pool Party' },
  'custom':         { emoji: '✨', label: 'Événement' },
};

const DEFAULT_JEWISH_EVENTS: { type: JewishWeddingEvent['type']; label: string; emoji: string; optional?: boolean }[] = [
  { type: 'henne', label: 'Henné', emoji: '🌸' },
  { type: 'mairie', label: 'Mairie', emoji: '🏛️' },
  { type: 'chabbat-hatan', label: 'Chabbat Hatan', emoji: '🕌' },
  { type: 'houppa', label: 'Houppa & Cérémonie', emoji: '💍' },
  { type: 'brunch', label: 'Brunch', emoji: '☕', optional: true },
  { type: 'sheva-berakhot', label: 'Sheva Berakhot', emoji: '🥂', optional: true },
  { type: 'pool-party', label: 'Pool Party', emoji: '🏊', optional: true },
  { type: 'depart', label: 'Au revoir des invités', emoji: '👋', optional: true },
];

const initialDate = (): { date: string; time: string } => ({ date: '', time: '' });

export function WeddingSiteBuilder() {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [namesLocked, setNamesLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [slugCustom, setSlugCustom] = useState('');
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  const [step, setStep] = useState<'pick' | 'build'>('pick');

  const [{ date, time }, setDt] = useState(initialDate);

  const [groomName, setGroomName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [city, setCity] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [mainText, setMainText] = useState('');
  // Site uniquement en français — le sélecteur de langue a été retiré.
  const language: SiteLanguage = 'fr';
  const [theme, setTheme] = useState<WeddingTheme>(() => applyThemePreset(defaultWeddingTheme()));
  const [sections, setSections] = useState<WeddingSections>(() => defaultWeddingSections());
  const [content, setContent] = useState<WeddingSiteContent>({
    venue: {
      name: '',
      address: '',
      googleMapsUrl: '',
      wazeUrl: '',
      photoUrl: '',
      description: '',
    },
    accommodationsIntro: '',
    accommodations: [],
    faq: [],
    texts: {
      memorialText: '',
      familyText: '',
    },
    musicUrl: '',
    dressCode: {
      text: '',
      colors: ['#d9c3a5', '#b08d57', '#708d57'],
    },
  });
  const [rsvpForm, setRsvpForm] = useState<RSVPForm>(() => ({
    ...createDefaultRSVPForm('preview-draft'),
    weddingId: 'preview-draft',
  }));

  // ── Galerie : upload depuis l'appareil ──────────────────────────────────────
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(0);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  async function handleGalleryUpload(allFiles: File[]) {
    setGalleryError(null);
    // Rejette d'emblée les formats non-image (PDF, vidéo, HEIC non supporté…)
    const files = allFiles.filter((f) => f.type.startsWith('image/'));
    const invalid = allFiles.filter((f) => !f.type.startsWith('image/'));
    if (invalid.length) {
      setGalleryError(
        `Format invalide — seules les images (JPG, PNG, WebP…) sont acceptées : ${invalid
          .map((f) => f.name)
          .join(', ')}`,
      );
      if (!files.length) return;
    }
    setGalleryUploading(files.length);
    const failed: string[] = [];
    for (const file of files) {
      try {
        const url = await uploadGalleryPhoto(file);
        setContent((c) => ({ ...c, galleryPhotos: [...(c.galleryPhotos ?? []), url] }));
      } catch (err) {
        const reason = err instanceof Error && err.message ? ` — ${err.message}` : '';
        failed.push(`${file.name}${reason}`);
      } finally {
        setGalleryUploading((n) => Math.max(0, n - 1));
      }
    }
    if (failed.length)
      setGalleryError((prev) =>
        [prev, `Échec de l'envoi : ${failed.join(', ')}`].filter(Boolean).join(' · '),
      );
  }

  // ── Galerie : ré-adaptation IA au thème ─────────────────────────────────────
  const [adaptingIdx, setAdaptingIdx] = useState<number | null>(null);

  async function adaptGalleryPhoto(idx: number) {
    const src = (content.galleryPhotos ?? [])[idx];
    if (!src || adaptingIdx !== null) return;
    setGalleryError(null);
    setAdaptingIdx(idx);
    try {
      const adapted = await adaptPhotoToTheme(src, theme.style, {
        background: theme.backgroundColor,
        text: theme.textColor,
        accent: theme.primaryColor,
      });
      setContent((c) => {
        const arr = [...(c.galleryPhotos ?? [])];
        if (arr[idx] === src) arr[idx] = adapted; // ne pas écraser si l'ordre a changé
        return { ...c, galleryPhotos: arr };
      });
    } catch (err) {
      setGalleryError(
        `Adaptation IA impossible${err instanceof Error && err.message ? ` — ${err.message}` : ''}`,
      );
    } finally {
      setAdaptingIdx(null);
    }
  }

  function moveGalleryPhoto(idx: number, dir: -1 | 1) {
    setContent((c) => {
      const arr = [...(c.galleryPhotos ?? [])];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return c;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...c, galleryPhotos: arr };
    });
  }

  function removeGalleryPhoto(idx: number) {
    setContent((c) => ({ ...c, galleryPhotos: (c.galleryPhotos ?? []).filter((_, i) => i !== idx) }));
  }

  const isoDate = useMemo(() => mergeDateAndTimeToIso(date, time), [date, time]);

  const displayCouple =
    coupleName.trim() ||
    (brideName && groomName ? `${brideName} & ${groomName}` : coupleName || 'Votre prénoms');

  const draft = useMemo(
    (): WeddingSite => ({
      id: 'preview-draft',
      slug: slugCustom.trim()
        ? slugify(slugCustom)
        : generateSlugFromDisplayName(displayCouple) || 'apercu',
      coupleName: displayCouple,
      groomName: groomName || '…',
      brideName: brideName || '…',
      date: isoDate,
      time,
      city,
      // Source unique : le lieu vient de « Lieu principal » (content.venue)
      venue: content.venue?.name ?? '',
      welcomeText,
      mainText,
      language,
      theme,
      sections,
      content,
      rsvpForm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      isoDate,
      time,
      displayCouple,
      groomName,
      brideName,
      city,
      welcomeText,
      mainText,
      language,
      theme,
      sections,
      content,
      slugCustom,
      rsvpForm,
    ]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setAuthToken(t);

    if (!routeSlug) return;

    // Jusqu'à 3 tentatives : un échec réseau ponctuel (WebView iPad, 4G…)
    // laissait le builder « vide » avec les prénoms déverrouillés.
    const load = (attempt: number) => {
    getWeddingSiteBySlug(routeSlug).then((site) => {
      if (!site) {
        setLoadError('Site introuvable. Vérifiez que vous avez bien publié votre site depuis l\'application.');
        return;
      }
      setLoadError(null);
      setGroomName(site.groomName || '');
      setBrideName(site.brideName || '');
      setCoupleName(site.coupleName || '');
      setCity(site.city || '');
      setWelcomeText(site.welcomeText || '');
      setMainText(site.mainText || '');
      if (site.theme && typeof site.theme === 'object') setTheme(applyThemePreset({ ...defaultWeddingTheme(), ...(site.theme as WeddingTheme) }));
      if (site.sections && typeof site.sections === 'object') setSections({ ...defaultWeddingSections(), ...(site.sections as WeddingSections) });
      if (site.content && typeof site.content === 'object') setContent((prev) => ({ ...prev, ...(site.content as WeddingSiteContent) }));
      // Source unique du lieu : récupère l'ancien champ « Lieu précis » des
      // sites publiés avant la fusion dans « Lieu principal ».
      if (site.venue) {
        setContent((prev) => prev.venue?.name?.trim()
          ? prev
          : ({
              ...prev,
              venue: {
                ...(prev.venue ?? { name: '', address: '', googleMapsUrl: '', wazeUrl: '', photoUrl: '', description: '' }),
                name: site.venue,
              },
            }));
      }
      if (site.rsvpForm) setRsvpForm(site.rsvpForm);
      if (site.inviteLinks?.length) setInviteLinks(site.inviteLinks);
      if (site.date) {
        try {
          const d = new Date(site.date);
          const dateStr = d.toISOString().slice(0, 10);
          const timeStr = site.time || d.toTimeString().slice(0, 5);
          setDt({ date: dateStr, time: timeStr });
        } catch { /* ignore bad dates */ }
      }
      setPublishedId(site.id);
      setPublishedSlug(site.slug);
      setNamesLocked(true);
    }).catch((err: unknown) => {
      console.error('[WeddingSiteBuilder] Erreur chargement site:', err);
      if (attempt < 2) {
        setTimeout(() => load(attempt + 1), 1200);
        return;
      }
      setLoadError('Impossible de charger le site. Vérifiez votre connexion et réessayez.');
    });
    };
    load(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSlug]);

  useEffect(() => {
    setRsvpForm((f) => (f.weddingId === draft.id ? f : { ...f, weddingId: draft.id }));
  }, [draft.id]);

  // Migration : s'assure que les événements juifs activés ont un RSVPEvent avec ID stable
  useEffect(() => {
    const enabledJewish = (content.jewishEvents ?? []).filter((e) => e.enabled);
    if (!enabledJewish.length) return;
    setRsvpForm((prev) => {
      let events = [...prev.events];
      let changed = false;
      const ORDER: JewishWeddingEvent['type'][] = ['henne', 'mairie', 'chabbat-hatan', 'houppa', 'brunch', 'sheva-berakhot', 'depart', 'custom'];
      for (const jev of enabledJewish) {
        const stableId = jewishRsvpId(jev.type);
        const meta = JEWISH_META[jev.type];
        if (!events.find((e) => e.id === stableId)) {
          const rank = ORDER.indexOf(jev.type);
          const insertBefore = events.findIndex((e) => {
            const eType = DEFAULT_JEWISH_EVENTS.find((d) => jewishRsvpId(d.type) === e.id)?.type;
            return eType !== undefined && ORDER.indexOf(eType) > rank;
          });
          const ev: RSVPEvent = newEvent(stableId, jev.label || meta.label, {
            enabled: true,
            emojiIcon: meta.emoji,
            time: jev.time ?? '',
            place: jev.place ?? '',
            askAttendance: true,
            askGuestCount: true,
          });
          if (insertBefore >= 0) events.splice(insertBefore, 0, ev);
          else events.push(ev);
          changed = true;
        } else {
          // Sync les champs depuis jewish vers rsvp
          const idx = events.findIndex((e) => e.id === stableId);
          const cur = events[idx];
          const next = {
            ...cur,
            label: jev.label || meta.label,
            time: jev.time || cur.time,
            place: jev.place || cur.place,
            emojiIcon: meta.emoji,
          };
          if (JSON.stringify(cur) !== JSON.stringify(next)) {
            events[idx] = next;
            changed = true;
          }
        }
      }
      return changed ? { ...prev, events } : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** URL vide OK (champ optionnel) ; sinon exige http(s)://… */
  function isValidUrl(v?: string) {
    return !v || !v.trim() || /^https?:\/\/\S+\.\S+/.test(v.trim());
  }

  /** Musique : vide OK, schéma `deezer:<id>` OK, sinon URL http(s) valide. */
  function isValidMusicUrl(v?: string) {
    if (!v || !v.trim()) return true;
    if (deezerTrackId(v) != null) return true; // piste Deezer choisie dans la liste
    return isValidUrl(v);
  }

  /** Contrôle du format de tous les champs avant publication. */
  function validateFormats(): string[] {
    const errors: string[] = [];

    if (!date) errors.push('Date du mariage manquante.');
    else if (!isoDate) errors.push('Date ou heure du mariage invalide.');
    if (time && !/^\d{2}:\d{2}$/.test(time)) errors.push('Heure invalide (format attendu : HH:MM).');

    if (slugCustom.trim() && !/^[a-z0-9à-ÿ\s-]+$/i.test(slugCustom.trim()))
      errors.push('Slug personnalisé invalide : lettres, chiffres et tirets uniquement.');

    const urlChecks: Array<[string, string | undefined]> = [
      ['Lien Google Maps du lieu', content.venue?.googleMapsUrl],
      ['Lien Waze du lieu', content.venue?.wazeUrl],
      ['Photo du lieu (URL)', content.venue?.photoUrl],
      ...(content.accommodations ?? []).flatMap((h, i): Array<[string, string | undefined]> => [
        [`Hôtel ${i + 1} — Google Maps`, h.googleMapsUrl],
        [`Hôtel ${i + 1} — Waze`, h.wazeUrl],
        [`Hôtel ${i + 1} — réservation`, h.bookingUrl],
      ]),
      ...(content.jewishEvents ?? []).flatMap((ev): Array<[string, string | undefined]> => [
        [`${ev.label || ev.type} — Google Maps`, ev.googleMapsUrl],
        [`${ev.label || ev.type} — Waze`, ev.wazeUrl],
      ]),
    ];
    for (const [label, value] of urlChecks) {
      if (!isValidUrl(value)) errors.push(`${label} : URL invalide (doit commencer par https://).`);
    }

    // Musique : accepte une piste Deezer (liste) OU une URL .mp3 https://
    if (!isValidMusicUrl(content.musicUrl))
      errors.push('Lien musique : choisissez une chanson dans la liste ou collez une URL .mp3 (https://).');

    (content.galleryPhotos ?? []).forEach((u, i) => {
      if (!/^https?:\/\/\S+/.test(u) && !u.startsWith('data:image/'))
        errors.push(`Galerie — photo ${i + 1} : URL invalide (doit commencer par https://).`);
    });

    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateFormats();
    setSubmitErrors(errors);
    if (errors.length) return;
    setSaving(true);
    try {
      const custom = slugCustom.trim() ? slugify(slugCustom) : undefined;
      const finalInviteLinks: InviteLink[] = inviteLinks.map((l) => ({
        ...l,
        token: l.token || crypto.randomUUID().slice(0, 12),
      }));

      const siteData = {
        coupleName: displayCouple,
        groomName,
        brideName,
        date: isoDate,
        time,
        city,
        venue: content.venue?.name ?? '',
        welcomeText,
        mainText,
        language,
        theme,
        sections,
        content,
        rsvpForm: { ...rsvpForm, updatedAt: new Date().toISOString() },
        inviteLinks: finalInviteLinks,
        ...(custom ? { slug: custom } : {}),
      };

      const row = publishedId
        ? (await updateWeddingSite(publishedId, siteData)) ?? await createWeddingSite(siteData)
        : await createWeddingSite(siteData);

      setPublishedId(row.id);
      setPublishedSlug(row.slug);
      setInviteLinks(row.inviteLinks ?? finalInviteLinks);
      // Comme avant : une fois le site publié, les prénoms sont verrouillés
      // (ils définissent le site et son slug).
      setNamesLocked(true);
    } catch (err) {
      console.error(err);
      // « Load failed » / « Failed to fetch » = erreur réseau Safari/Chrome :
      // afficher un message compréhensible plutôt que le texte brut du navigateur.
      const raw = err instanceof Error ? err.message : '';
      const isNetwork = /load failed|failed to fetch|networkerror|network request failed/i.test(raw);
      alert(isNetwork
        ? 'Connexion au serveur impossible — vérifiez votre connexion internet et réessayez. Vos saisies ne sont pas perdues.'
        : raw || 'Erreur à la création.');
    } finally {
      setSaving(false);
    }
  }

  // ── Familles : colonnes libres (titre + lignes) ─────────────────────────────
  function updateFamilyColumn(idx: number, partial: Partial<FamilyColumn>) {
    setContent((c) => {
      const cols = [...(c.familyColumns ?? [])];
      if (!cols[idx]) return c;
      cols[idx] = { ...cols[idx], ...partial };
      return { ...c, familyColumns: cols };
    });
  }

  function addFamilyColumn() {
    setContent((c) => {
      const cols = [...(c.familyColumns ?? [])];
      if (cols.length >= 4) return c;
      cols.push({ id: crypto.randomUUID(), title: '', lines: [''] });
      return { ...c, familyColumns: cols };
    });
  }

  function removeFamilyColumn(id: string) {
    setContent((c) => ({ ...c, familyColumns: (c.familyColumns ?? []).filter((col) => col.id !== id) }));
  }

  function updateFamilyLine(colIdx: number, lineIdx: number, value: string) {
    setContent((c) => {
      const cols = [...(c.familyColumns ?? [])];
      const col = cols[colIdx];
      if (!col) return c;
      const lines = [...col.lines];
      lines[lineIdx] = value;
      cols[colIdx] = { ...col, lines };
      return { ...c, familyColumns: cols };
    });
  }

  function addFamilyLine(colIdx: number) {
    setContent((c) => {
      const cols = [...(c.familyColumns ?? [])];
      const col = cols[colIdx];
      if (!col) return c;
      cols[colIdx] = { ...col, lines: [...col.lines, ''] };
      return { ...c, familyColumns: cols };
    });
  }

  function removeFamilyLine(colIdx: number, lineIdx: number) {
    setContent((c) => {
      const cols = [...(c.familyColumns ?? [])];
      const col = cols[colIdx];
      if (!col) return c;
      cols[colIdx] = { ...col, lines: col.lines.filter((_, i) => i !== lineIdx) };
      return { ...c, familyColumns: cols };
    });
  }

  // Migration : matérialise les colonnes familles depuis les anciens champs
  // parents/grands-parents (sites déjà publiés), sinon 2 colonnes vides.
  // Pour un site EXISTANT (routeSlug présent) on attend la fin du chargement
  // (publishedId défini) — sinon on créait 2 colonnes vides AVANT que les
  // données legacy arrivent, et les vraies familles n'étaient jamais reprises.
  useEffect(() => {
    if (routeSlug && !publishedId) return;
    setContent((c) => {
      if (c.familyColumns?.length) return c;
      const legacy = getFamilyColumns({ ...draft, content: c });
      const cols: FamilyColumn[] = legacy.length
        ? legacy.map((col) => ({ id: crypto.randomUUID(), title: col.title, lines: col.lines.length ? col.lines : [''] }))
        : [
            { id: crypto.randomUUID(), title: '', lines: [''] },
            { id: crypto.randomUUID(), title: '', lines: [''] },
          ];
      return { ...c, familyColumns: cols };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedId, routeSlug]);

  function updateVenueField(key: keyof NonNullable<WeddingSiteContent['venue']>, value: string) {
    setContent((prev) => ({
      ...prev,
      venue: {
        ...(prev.venue ?? {
          name: '',
          address: '',
          googleMapsUrl: '',
          wazeUrl: '',
          photoUrl: '',
          description: '',
        }),
        [key]: value,
      },
    }));
  }

  function upsertAccommodation(idx: number, partial: Partial<AccommodationItem>) {
    setContent((prev) => {
      const list = [...(prev.accommodations ?? [])];
      const cur = list[idx] ?? {
        id: crypto.randomUUID(),
        name: '',
        address: '',
        distanceOrDuration: '',
        googleMapsUrl: '',
        bookingUrl: '',
      };
      list[idx] = { ...cur, ...partial };
      return { ...prev, accommodations: list.slice(0, 6) };
    });
  }

  function addAccommodation() {
    setContent((prev) => {
      const list = [...(prev.accommodations ?? [])];
      if (list.length >= 6) return prev;
      list.push({
        id: crypto.randomUUID(),
        name: '',
        address: '',
        distanceOrDuration: '',
        googleMapsUrl: '',
        bookingUrl: '',
      });
      return { ...prev, accommodations: list };
    });
  }

  function removeAccommodation(id: string) {
    setContent((prev) => ({ ...prev, accommodations: (prev.accommodations ?? []).filter((h) => h.id !== id) }));
  }

  function upsertFaq(idx: number, partial: Partial<FAQItem>) {
    setContent((prev) => {
      const list = [...(prev.faq ?? [])];
      const cur = list[idx] ?? { id: crypto.randomUUID(), question: '', answer: '' };
      list[idx] = { ...cur, ...partial };
      return { ...prev, faq: list };
    });
  }

  function addFaq() {
    setContent((prev) => ({ ...prev, faq: [...(prev.faq ?? []), { id: crypto.randomUUID(), question: '', answer: '' }] }));
  }

  function moveFaq(from: number, dir: -1 | 1) {
    setContent((prev) => {
      const list = [...(prev.faq ?? [])];
      const to = from + dir;
      if (to < 0 || to >= list.length) return prev;
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...prev, faq: list };
    });
  }

  function removeFaq(id: string) {
    setContent((prev) => ({ ...prev, faq: (prev.faq ?? []).filter((q) => q.id !== id) }));
  }

  function syncJewishEventToRsvp(type: JewishWeddingEvent['type'], partial: { label?: string; time?: string; place?: string; date?: string; enabled?: boolean }) {
    const rsvpId = jewishRsvpId(type);
    const meta = JEWISH_META[type];

    // Extraire le numéro du jour depuis la date texte ("15 juin 2026" → "15")
    const dayLabel = partial.date ? (partial.date.trim().split(' ')[0] ?? '') : undefined;

    setRsvpForm((prev) => {
      const events = [...prev.events];

      // 1. Chercher par ID stable
      let idx = events.findIndex((e) => e.id === rsvpId);

      // 2. Fallback : chercher par emoji ou label similaire (migration données existantes)
      if (idx < 0) {
        idx = events.findIndex(
          (e) => e.emojiIcon === meta.emoji || e.label.toLowerCase().includes(meta.label.toLowerCase().slice(0, 4))
        );
        if (idx >= 0) {
          // Migrer l'ID vers le stable ID
          events[idx] = { ...events[idx], id: rsvpId };
        }
      }

      if (idx >= 0) {
        events[idx] = {
          ...events[idx],
          emojiIcon: meta.emoji,
          ...(partial.label !== undefined && { label: partial.label }),
          ...(partial.time !== undefined && { time: partial.time }),
          ...(partial.place !== undefined && { place: partial.place }),
          ...(dayLabel !== undefined && { dayLabel }),
          ...(partial.enabled !== undefined && { enabled: partial.enabled }),
        };
      } else if (partial.enabled) {
        const ORDER: JewishWeddingEvent['type'][] = ['henne', 'mairie', 'chabbat-hatan', 'houppa', 'brunch', 'sheva-berakhot', 'depart', 'custom'];
        const rank = ORDER.indexOf(type);
        const insertBefore = events.findIndex((e) => {
          const eType = DEFAULT_JEWISH_EVENTS.find((d) => jewishRsvpId(d.type) === e.id)?.type;
          return eType !== undefined && ORDER.indexOf(eType) > rank;
        });
        const newRsvpEvent: RSVPEvent = newEvent(rsvpId, partial.label ?? meta.label, {
          enabled: true,
          emojiIcon: meta.emoji,
          time: partial.time ?? '',
          place: partial.place ?? '',
          dayLabel: dayLabel ?? '',
          askAttendance: true,
          askGuestCount: true,
        });
        if (insertBefore >= 0) events.splice(insertBefore, 0, newRsvpEvent);
        else events.push(newRsvpEvent);
      }
      return { ...prev, events };
    });
  }

  function toggleJewishEvent(def: (typeof DEFAULT_JEWISH_EVENTS)[number], enabled: boolean) {
    setContent((prev) => {
      const list = [...(prev.jewishEvents ?? [])];
      const idx = list.findIndex((e) => e.type === def.type);
      if (enabled && idx < 0) {
        list.push({ id: crypto.randomUUID(), type: def.type, label: def.label, date: '', time: '', place: '', description: '', enabled: true });
      } else if (!enabled && idx >= 0) {
        list[idx] = { ...list[idx], enabled: false };
      } else if (enabled && idx >= 0) {
        list[idx] = { ...list[idx], enabled: true };
      }
      return { ...prev, jewishEvents: list };
    });
    syncJewishEventToRsvp(def.type, { label: def.label, enabled });
    setSections((s) => ({ ...s, jewishSection: true }));
  }

  function upsertJewishEvent(type: JewishWeddingEvent['type'], partial: Partial<JewishWeddingEvent>) {
    setContent((prev) => {
      const list = [...(prev.jewishEvents ?? [])];
      const idx = list.findIndex((e) => e.type === type);
      if (idx >= 0) list[idx] = { ...list[idx], ...partial };
      return { ...prev, jewishEvents: list };
    });
    // Sync les champs pertinents vers le programme/RSVP
    syncJewishEventToRsvp(type, {
      ...(partial.label !== undefined && { label: partial.label }),
      ...(partial.time !== undefined && { time: partial.time }),
      ...(partial.place !== undefined && { place: partial.place }),
      ...(partial.date !== undefined && { date: partial.date }),
    });
  }

  if (step === 'pick') {
    return (
      <ThemePicker
        currentStyleId={theme.style}
        onSelect={(preset) => {
          const { heroStyle: _h, patternId: _p, separatorStyle: _s, cardStyle: _c, cornerDecor: _co, ...rest } = theme;
          setTheme(applyThemePreset({ ...rest, ...preset.theme, style: preset.id } as WeddingTheme));
          setStep('build');
        }}
      />
    );
  }

  return (
    <div className="wedding-builder-layout">
      <div style={formColumn}>
        <header style={{ marginBottom: '1rem' }}>
          <h1 style={h1}>{namesLocked ? `Personnaliser le site · ${groomName} & ${brideName}` : 'Créer le mini-site'}</h1>

          {/* Mobile experience banner */}
          {typeof window !== 'undefined' && window.innerWidth < 768 && (
            <div style={mobileBanner}>
              <span style={{ fontSize: '1.3rem' }}>🖥️</span>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>Meilleure expérience sur ordinateur</strong>
                Pour profiter du studio complet avec aperçu en direct côte à côte, ouvrez cette page sur votre ordinateur ou tablette.
                {"L'application mobile offre un builder simplifié."}
              </div>
            </div>
          )}

          <p style={sub}>
            Remplissez les infos, personnalisez le style, vérifiez l'aperçu puis publiez. URL publique :{' '}
            <strong>www.ohevewedding.com/wedding/votre-slug</strong> — votre domaine est actif.
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/" style={{ fontSize: '0.92rem' }}>← Retour</Link>
            {(
              <button
                type="button"
                onClick={() => setStep('pick')}
                style={{
                  fontSize: '0.92rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#44597B',
                  padding: 0,
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: 3,
                }}
              >
                ✦ Changer de thème
              </button>
            )}
          </div>
        </header>

        {loadError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.88rem', color: '#991b1b', lineHeight: 1.5 }}>
            ⚠️ {loadError}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <section style={block}>
            <h2 style={h2}>Informations</h2>
            <div style={grid2}>
              <label style={lab}>
                Prénom marié
                {namesLocked ? (
                  <div style={lockedNameField}>
                    <span style={{ fontSize: '0.9rem' }}>🔒</span>
                    {groomName}
                  </div>
                ) : (
                  <input style={inp} required value={groomName} onChange={(e) => setGroomName(e.target.value)} />
                )}
              </label>
              <label style={lab}>
                Prénom mariée
                {namesLocked ? (
                  <div style={lockedNameField}>
                    <span style={{ fontSize: '0.9rem' }}>🔒</span>
                    {brideName}
                  </div>
                ) : (
                  <input style={inp} required value={brideName} onChange={(e) => setBrideName(e.target.value)} />
                )}
              </label>
            </div>
            {namesLocked && (
              <p style={{ fontSize: '0.78rem', color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '0.5rem 0.75rem', margin: 0 }}>
                Les prénoms sont verrouillés — ils ont été définis depuis l'application Oheve.
              </p>
            )}
            <label style={lab}>
              Nom affiché du couple
              <input
                style={inp}
                placeholder="Ex. Myriam & Eden"
                value={coupleName}
                onChange={(e) => setCoupleName(e.target.value)}
              />
            </label>
            <div style={grid2}>
              <label style={lab}>
                Date du mariage
                <input
                  style={inp}
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDt({ date: e.target.value, time })}
                />
              </label>
              <label style={lab}>
                Heure
                <input
                  style={inp}
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setDt({ date, time: e.target.value })}
                />
              </label>
            </div>
            <label style={lab}>
              Ville
              <input style={inp} value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <p style={{ fontSize: '0.78rem', color: '#8a8378', margin: '0 0 0.65rem', lineHeight: 1.5 }}>
              📍 Le lieu se renseigne une seule fois dans la section « Lieu principal » ci-dessous —
              il est repris automatiquement en haut du site.
            </p>
            <label style={lab}>
              Phrase d'accueil
              <input style={inp} value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} />
            </label>
            <label style={lab}>
              Texte principal
              <textarea style={{ ...inp, minHeight: 88, resize: 'vertical' }} value={mainText} onChange={(e) => setMainText(e.target.value)} />
            </label>
            {/* ── Verset hébraïque en arc ── */}
            <div style={{ marginTop: '1.2rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', letterSpacing: '0.04em', display: 'block', marginBottom: '0.6rem' }}>
                ✡️ פסוק — Verset hébraïque (affiché en arc)
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem', direction: 'rtl' }}>
                {[
                  { v: '', label: '— Aucun —' },
                  { v: 'אֲנִי לְדוֹדִי וְדוֹדִי לִי', label: 'אֲנִי לְדוֹדִי וְדוֹדִי לִי' },
                  { v: 'קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה קוֹל חָתָן וְקוֹל כַּלָּה', label: 'קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה' },
                  { v: 'נעלה את ירושלים על ראש שמחתנו', label: 'נעלה את ירושלים' },
                  { v: 'זֶה הַיּוֹם עָשָׂה ה׳ נָגִילָה וְנִשְׂמְחָה בוֹ', label: 'זֶה הַיּוֹם עָשָׂה ה׳' },
                  { v: 'שִׂמְחוּ אֶת יְרוּשָׁלִַם וְגִילוּ בָהּ', label: 'שִׂמְחוּ אֶת יְרוּשָׁלִַם' },
                  { v: 'בְּרוּךְ הַבָּא בְּשֵׁם ה׳', label: 'בְּרוּךְ הַבָּא' },
                  { v: 'שִׂישׂ אָשִׂישׂ בַּה׳ תָּגֵל נַפְשִׁי בֵּאלֹהַי', label: 'שִׂישׂ אָשִׂישׂ' },
                  { v: 'כִּי טוֹב כִּי לְעוֹלָם חַסְדּוֹ', label: 'כִּי טוֹב' },
                ].map(({ v, label }) => {
                  const isSelected = (content.hebrewQuote ?? '') === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setContent((c) => ({ ...c, hebrewQuote: v === '' ? undefined : v }))}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 999,
                        border: `1.5px solid ${isSelected ? '#8F947F' : '#D1D5DB'}`,
                        background: isSelected ? '#8F947F' : '#fff',
                        color: isSelected ? '#fff' : '#374151',
                        fontFamily: v ? "'Frank Ruhl Libre', serif" : 'inherit',
                        fontSize: v ? '0.9rem' : '0.78rem',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 700 : 400,
                        direction: v ? 'rtl' : 'ltr',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <input
                style={{ ...inp, fontFamily: "'Frank Ruhl Libre', serif", direction: 'rtl', fontSize: '1rem' }}
                placeholder="כתוב פסוק בחופשיות..."
                value={content.hebrewQuote ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, hebrewQuote: e.target.value || undefined }))}
              />
            </div>
          </section>

          {/* ── Familles : colonnes libres ─────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>👨‍👩‍👧 Familles (affiché sur le site)</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Une colonne par famille, affichée élégamment sur le site. Ajoutez des lignes et
              écrivez-les librement (« M. et Mme Attia », « Mamie Simone »…) — aucun intitulé imposé.
            </p>
            {(content.familyColumns ?? []).map((col, ci) => (
              <div key={col.id} style={{ border: '1px solid #E4E7DC', borderRadius: 12, padding: '0.75rem', marginBottom: 10, background: '#FBFBF9' }}>
                <label style={lab}>
                  Titre de la colonne
                  <input
                    style={inp}
                    placeholder={ci === 0 ? 'ex. Famille Benitah' : 'ex. Famille Cohen'}
                    value={col.title}
                    onChange={(e) => updateFamilyColumn(ci, { title: e.target.value })}
                  />
                </label>
                {col.lines.map((line, li) => (
                  <div key={li} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      style={{ ...inp, marginTop: 0, flex: 1 }}
                      placeholder={li === 0 ? 'ex. M. et Mme Benitah' : 'ligne libre…'}
                      value={line}
                      onChange={(e) => updateFamilyLine(ci, li, e.target.value)}
                    />
                    <button
                      type="button"
                      title="Supprimer la ligne"
                      onClick={() => removeFamilyLine(ci, li)}
                      style={{ ...dangerInlineBtn, padding: '0 0.6rem' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" style={ghostInlineBtn} onClick={() => addFamilyLine(ci)}>
                    + Ajouter une ligne
                  </button>
                  <button type="button" style={dangerInlineBtn} onClick={() => removeFamilyColumn(col.id)}>
                    Supprimer la famille
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              style={ghostInlineBtn}
              onClick={addFamilyColumn}
              disabled={(content.familyColumns ?? []).length >= 4}
            >
              + Ajouter une famille
            </button>
          </section>

          {/* ── Logo monogramme ─────────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>💍 Logo monogramme (IA)</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Générez automatiquement un logo monogramme pour le site et les faire-part. Téléchargez en SVG.
            </p>
            <MonogramGenerator
              groomName={groomName}
              brideName={brideName}
              date={date}
              primaryColor={theme.primaryColor}
              backgroundColor={theme.backgroundColor}
              initialStyle={content.monogramStyle}
              onSelect={(svg, style, sizePx) => setContent((c) => ({ ...c, monogramSvg: svg, monogramStyle: style, monogramSizePx: sizePx }))}
            />
            {content.monogramSvg ? (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', fontSize: '0.83rem', color: '#166534' }}>
                  ✅ Monogramme enregistré
                  <button
                    type="button"
                    onClick={() => setContent((c) => ({ ...c, monogramSvg: undefined, monogramStyle: undefined }))}
                    style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem' }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section style={block}>
            <h2 style={h2}>🎨 Style & thème</h2>

            {/* ── Preset ───────────────────────────────────────────────────── */}
            <label style={lab}>
              Preset visuel
              <select
                style={inp}
                value={theme.style}
                onChange={(e) => {
                  const id = e.target.value as WeddingTheme['style'];
                  const preset = STYLE_PRESETS.find((s) => s.id === id);
                  const { heroStyle: _h, patternId: _p, separatorStyle: _s, cardStyle: _c, cornerDecor: _co, ...rest } = theme;
                  if (preset) setTheme(applyThemePreset({ ...rest, ...preset.theme, style: id } as WeddingTheme));
                  else setTheme(applyThemePreset({ ...rest, style: id } as WeddingTheme));
                }}
              >
                {STYLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>

            {/* Aperçu visuel immédiat du thème sélectionné (avant la mise en page) */}
            {theme.style === 'vintage-blue' ? (
              <div style={{ marginTop: '1rem' }}>
                <p style={studioSectionLabel}>Aperçu du thème</p>
                <VintageThemePreview
                  groomName={groomName || 'David'}
                  brideName={brideName || 'Sarah'}
                  targetDate={date ? mergeDateAndTimeToIso(date, time) : undefined}
                  title={coupleName || 'Notre Mariage'}
                />
              </div>
            ) : null}

            {/* ── Studio de Design ─────────────────────────────────────────── */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'linear-gradient(135deg, #F6F4EF 0%, #EDE8E0 100%)', borderRadius: 12, border: '1px solid #C7B7A5' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: 800, color: '#8F947F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Studio de design
              </p>

              {/* Réglages exclusifs à l'Éditorial Rayures : largeur & opacité des rayures du hero */}
              {theme.style === 'stripes-editorial' && (
                <div style={{ margin: '0 0 1.25rem', padding: '0.85rem', background: '#fff', border: '1px solid #e2e0da', borderRadius: 10 }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', fontWeight: 800, color: '#555', letterSpacing: '0.04em' }}>▚ Rayures du hero</p>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#555', fontWeight: 600, marginBottom: 12 }}>
                    Largeur des rayures — {Math.round(theme.stripeWidth ?? 8)} px
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={1}
                      value={theme.stripeWidth ?? 8}
                      onChange={(e) => setTheme((t) => ({ ...t, stripeWidth: Number(e.target.value) }))}
                      style={{ width: '100%', marginTop: 6, accentColor: '#8F947F' }}
                    />
                  </label>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: '#555', fontWeight: 600 }}>
                    Opacité des rayures — {Math.round((theme.stripeOpacity ?? 1) * 100)} %
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={Math.round((theme.stripeOpacity ?? 1) * 100)}
                      onChange={(e) => setTheme((t) => ({ ...t, stripeOpacity: Number(e.target.value) / 100 }))}
                      style={{ width: '100%', marginTop: 6, accentColor: '#8F947F' }}
                    />
                  </label>
                </div>
              )}

              {/* Hero Style — sans effet sur les templates autonomes (hero sur-mesure) */}
              {['stripes-editorial', 'editorial-cards'].includes(theme.style) ? (
                <p style={{ margin: '0 0 1.25rem', padding: '0.6rem 0.75rem', background: '#fffdf5', border: '1px solid #e7dfc9', borderRadius: 10, fontSize: '0.74rem', color: '#8a8060', lineHeight: 1.5 }}>
                  ℹ️ Ce thème a un haut de page sur-mesure : le « style du hero » ne s'applique pas.
                  Les motifs, séparateurs, cartes et couleurs ci-dessous restent actifs.
                </p>
              ) : (
              <>
              <p style={studioSectionLabel}>Style du hero (haut de page)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: '1.25rem' }}>
                {HERO_STYLE_OPTIONS.map((h) => {
                  const active = (theme.heroStyle ?? 'editorial') === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, heroStyle: h.id })}
                      style={{
                        padding: '0.6rem 0.25rem 0.45rem',
                        border: `2px solid ${active ? '#8F947F' : '#C7B7A5'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: active ? '#E4E7DC' : '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{h.icon}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: active ? '#8F947F' : '#333', lineHeight: 1.2 }}>{h.label}</span>
                      <span style={{ fontSize: '0.52rem', color: '#666', lineHeight: 1.2 }}>{h.desc}</span>
                    </button>
                  );
                })}
              </div>
              </>
              )}

              {/* Pattern de fond */}
              <p style={studioSectionLabel}>Motif de fond</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: '0.75rem' }}>
                {PATTERN_OPTIONS.map((p) => {
                  const active = (theme.patternId ?? 'none') === p.id;
                  const patBg = p.id !== 'none' ? getPatternStyle(p.id, theme.primaryColor) : {};
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, patternId: p.id })}
                      style={{
                        padding: '0.3rem 0.15rem',
                        border: `2px solid ${active ? '#8F947F' : '#C7B7A5'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 26,
                          borderRadius: 5,
                          // backgroundColor (longhand) : ne pas mélanger le
                          // shorthand `background` avec backgroundImage/Repeat
                          // (React warning « conflicting style properties »)
                          backgroundColor: theme.backgroundColor || '#faf7f2',
                          ...patBg,
                          backgroundRepeat: 'repeat',
                          border: `1px solid ${active ? '#a5b4fc' : '#e8e4f5'}`,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '0.5rem', fontWeight: 600, color: active ? '#8F947F' : '#444', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {(theme.patternId ?? 'none') !== 'none' && (
                <label style={{ ...lab, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Opacité : {Math.round((theme.patternOpacity ?? 0.07) * 100)}%</span>
                  <input
                    type="range"
                    style={{ flex: 1, marginTop: 0 }}
                    min={2}
                    max={30}
                    value={Math.round((theme.patternOpacity ?? 0.07) * 100)}
                    onChange={(e) => setTheme({ ...theme, patternOpacity: Number(e.target.value) / 100 })}
                  />
                </label>
              )}

              {/* Séparateurs */}
              <p style={studioSectionLabel}>Séparateurs de sections</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: '1.25rem' }}>
                {SEPARATOR_OPTIONS.map((s) => {
                  const active = (theme.separatorStyle ?? 'none') === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, separatorStyle: s.id })}
                      style={{
                        padding: '0.42rem 0.6rem',
                        border: `2px solid ${active ? '#8F947F' : '#C7B7A5'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        background: active ? '#E4E7DC' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: active ? '#8F947F' : '#333', minWidth: 58, textAlign: 'left' }}>
                        {s.label}
                      </span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden', height: 14 }}>
                        <SepMini id={s.id} color={theme.primaryColor} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Style des cartes */}
              <p style={studioSectionLabel}>Style des cartes</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: '1.25rem' }}>
                {CARD_STYLE_OPTIONS.map((c) => {
                  const active = theme.cardStyle === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTheme({ ...theme, cardStyle: c.id })}
                      style={{
                        padding: '0.55rem 0.25rem',
                        border: `2px solid ${active ? '#8F947F' : '#C7B7A5'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: active ? '#E4E7DC' : '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: active ? '#8F947F' : '#333' }}>{c.label}</span>
                      <span style={{ fontSize: '0.52rem', color: '#666', lineHeight: 1.3 }}>{c.desc}</span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* ── Couleurs ─────────────────────────────────────────────────── */}
            <p style={{ ...studioSectionLabel, marginTop: '1.25rem' }}>Combinaisons de couleurs</p>
            {(() => {
              // Couleurs de base du MODÈLE sélectionné — toujours proposées en premier
              const presetTheme = ALL_STYLE_PRESETS.find((s) => s.id === theme.style)?.theme;
              const modelPalette = presetTheme?.primaryColor
                ? [{
                    name: '✦ Couleurs du modèle',
                    colors: [presetTheme.primaryColor, presetTheme.secondaryColor ?? presetTheme.primaryColor, presetTheme.backgroundColor ?? '#FFFFFF', presetTheme.textColor ?? '#111111'],
                    primary: presetTheme.primaryColor,
                    secondary: presetTheme.secondaryColor ?? presetTheme.primaryColor,
                    bg: presetTheme.backgroundColor ?? '#FFFFFF',
                    text: presetTheme.textColor ?? '#111111',
                  }]
                : [];
              const palettes = [
                ...modelPalette,
                { name: 'Noir & Or', colors: ['#0B0B0B', '#D4AF37', '#F7F1DE', '#FFFFFF'], primary: '#D4AF37', secondary: '#0B0B0B', bg: '#F7F1DE', text: '#1A1206' },
                { name: 'Émeraude & Champagne', colors: ['#0F5132', '#D4AF37', '#E3EDE4', '#FFFFFF'], primary: '#0F5132', secondary: '#D4AF37', bg: '#E6F0E7', text: '#0F3D2A' },
                { name: 'Bleu Nuit & Cuivré', colors: ['#0E2248', '#C97C5D', '#DEE7F2', '#F5EFE6'], primary: '#0E2248', secondary: '#C97C5D', bg: '#E4EBF5', text: '#0E2248' },
                { name: 'Bordeaux & Or Vieilli', colors: ['#580D1E', '#D4AF37', '#EEC7B7', '#F7F3EE'], primary: '#580D1E', secondary: '#D4AF37', bg: '#F4E4E1', text: '#3D0A14' },
                { name: 'Vert Sauge & Bronze', colors: ['#8BBF7A', '#7A5A3A', '#DCD2BE', '#FAF7F2'], primary: '#8BBF7A', secondary: '#7A5A3A', bg: '#E7EEE1', text: '#2E3D24' },
                { name: 'Terracotta & Crème', colors: ['#C65A2E', '#6B6F3C', '#F8E4D8', '#D8BEBC'], primary: '#C65A2E', secondary: '#6B6F3C', bg: '#FAE6DA', text: '#3A2010' },
                { name: 'Lavande & Gris', colors: ['#9B8BB0', '#BFC2C7', '#EBE5F4', '#FFFFFF'], primary: '#9B8BB0', secondary: '#BFC2C7', bg: '#ECE6F5', text: '#3D3550' },
                { name: 'Noir & Blanc Marbre', colors: ['#000000', '#D4AF37', '#ECECEC', '#FFFFFF'], primary: '#000000', secondary: '#D4AF37', bg: '#EFEFEF', text: '#111111' },
                { name: 'Pétrole & Or', colors: ['#005F67', '#D4AF37', '#DFEDED', '#F6F2EA'], primary: '#005F67', secondary: '#D4AF37', bg: '#E0EEEE', text: '#003840' },
                { name: 'Pêche & Or Rose', colors: ['#D4856A', '#C9956A', '#FBE7DC', '#E7A98D'], primary: '#D4856A', secondary: '#C9956A', bg: '#FCE8DE', text: '#6B3A2A' },
                { name: 'Olive & Beige', colors: ['#4B5332', '#C9B87A', '#ECEDDF', '#D4C9B6'], primary: '#4B5332', secondary: '#C9B87A', bg: '#EDEEE0', text: '#2E3320' },
                { name: 'Chocolat & Doré', colors: ['#5A3824', '#D4AF37', '#F0E7DA', '#B8A97B'], primary: '#5A3824', secondary: '#D4AF37', bg: '#F1E8DB', text: '#2E1A0E' },
                { name: 'Bleu Grisé & Argent', colors: ['#5A7A96', '#A0A8B0', '#E4EBF2', '#FFFFFF'], primary: '#5A7A96', secondary: '#A0A8B0', bg: '#E6EDF4', text: '#2A3A4A' },
                { name: 'Fuchsia & Prune', colors: ['#8B1050', '#6A0038', '#FADCEA', '#F1C6D2'], primary: '#8B1050', secondary: '#D4AF37', bg: '#FBE1EC', text: '#3A0020' },
                { name: 'Sable & Bleu Ciel', colors: ['#7AAECC', '#C9B080', '#E4EFF6', '#FFFFFF'], primary: '#7AAECC', secondary: '#C9B080', bg: '#E5F0F7', text: '#2A4A5A' },
              ];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {palettes.map((p) => {
                    const isActive = theme.primaryColor === p.primary && theme.secondaryColor === p.secondary;
                    return (
                      <button
                        key={p.name}
                        onClick={() => setTheme({ ...theme, primaryColor: p.primary, secondaryColor: p.secondary, backgroundColor: p.bg, textColor: p.text })}
                        style={{ border: isActive ? '2px solid #8F947F' : '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.3rem', background: isActive ? '#f5f3ee' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                      >
                        <div style={{ display: 'flex', gap: 2 }}>
                          {p.colors.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />)}
                        </div>
                        <span style={{ fontSize: '0.48rem', fontWeight: 600, color: '#444', textAlign: 'center', lineHeight: 1.2 }}>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            <p style={{ ...studioSectionLabel, marginTop: '0.5rem', fontSize: '0.68rem' }}>Couleurs personnalisées</p>
            <div style={grid2}>
              <label style={lab}>
                Couleur principale
                <input style={{ ...inp, padding: 4, height: 40 }} type="color" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} />
              </label>
              <label style={lab}>
                Couleur secondaire
                <input style={{ ...inp, padding: 4, height: 40 }} type="color" value={theme.secondaryColor} onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })} />
              </label>
              <label style={lab}>
                Fond
                <input style={{ ...inp, padding: 4, height: 40 }} type="color" value={theme.backgroundColor} onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })} />
              </label>
              <label style={lab}>
                Texte
                <input style={{ ...inp, padding: 4, height: 40 }} type="color" value={theme.textColor} onChange={(e) => setTheme({ ...theme, textColor: e.target.value })} />
              </label>
            </div>

            {/* ── Typographie : trois rôles (Titres / Prénoms / Texte) ───────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <FontRoleSelect
                label="Police des titres"
                value={theme.titleFontFamily ?? ''}
                onChange={(v) => setTheme({ ...theme, titleFontFamily: v || undefined })}
                allowAuto
                sample="Le Programme"
                sampleSize="1.2rem"
              />
              <FontRoleSelect
                label="Police des prénoms (calligraphie)"
                value={theme.scriptFontFamily ?? ''}
                onChange={(v) => setTheme({ ...theme, scriptFontFamily: v || undefined })}
                allowAuto
                sample={`${brideName || 'Myriam'} & ${groomName || 'Eden'}`}
                sampleSize="1.5rem"
              />
            </div>
            <FontRoleSelect
              label="Police du texte"
              value={theme.fontFamily}
              onChange={(v) => setTheme({ ...theme, fontFamily: v })}
              sample="Nous serons heureux de vous compter parmi nous."
              sampleSize="0.98rem"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <label style={lab}>
                Taille du titre
                <select style={inp} value={theme.titleSize} onChange={(e) => setTheme({ ...theme, titleSize: e.target.value as TitleSize })}>
                  <option value="small">Petit</option>
                  <option value="medium">Moyen</option>
                  <option value="large">Grand</option>
                  <option value="huge">Très grand</option>
                </select>
              </label>
              <label style={lab}>
                Taille des prénoms
                <select style={inp} value={theme.nameSize ?? 'medium'} onChange={(e) => setTheme({ ...theme, nameSize: e.target.value as TitleSize })}>
                  <option value="small">Petit</option>
                  <option value="medium">Moyen</option>
                  <option value="large">Grand</option>
                  <option value="huge">Très grand</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <label style={lab}>
                Ambiance
                <select style={inp} value={theme.ambiance} onChange={(e) => setTheme({ ...theme, ambiance: e.target.value as ThemeAmbiance })}>
                  <option value="sobre">Sobre</option>
                  <option value="chic">Chic</option>
                  <option value="festif">Festif</option>
                  <option value="religieux">Religieux</option>
                  <option value="moderne">Moderne</option>
                </select>
              </label>
              <label style={lab}>
                Mise en page
                <select style={inp} value={theme.layout} onChange={(e) => setTheme({ ...theme, layout: e.target.value as ThemeLayout })}>
                  <option value="centered">Centered</option>
                  <option value="split">Split</option>
                  <option value="hero">Hero</option>
                  <option value="magazine">Magazine</option>
                </select>
              </label>
            </div>

            <label style={lab}>
              Rayon des angles
              <input
                style={inp}
                type="range"
                min={0}
                max={40}
                value={theme.borderRadius}
                onChange={(e) => setTheme({ ...theme, borderRadius: Number(e.target.value) })}
              />
            </label>

          </section>

          <section style={block}>
            <h2 style={h2}>Sections affichées</h2>
            <div style={checks}>
              {(
                [
                  ['hero', 'Accueil'],
                  ['program', 'Programme'],
                  ['jewishSection', '✡️ Événements mariage juif'],
                  ['location', 'Lieux'],
                  ['accommodations', 'Hébergements'],
                  ['rsvp', 'RSVP'],
                  ['faq', 'FAQ'],
                  ['gallery', '🖼️ Galerie'],
                  ['practicalInfo', 'Infos pratiques'],
                  ['guestMessage', 'Message aux invités'],
                  ['qrCode', 'QR Code'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} style={chk}>
                  <input
                    type="checkbox"
                    checked={sections[key]}
                    onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* ── Style de navigation ── */}
            <div style={{ marginTop: '1.2rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.6rem' }}>
                Navigation des invités
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { v: 'horizontal', label: 'Horizontale', desc: 'Liens en haut' },
                  { v: 'hamburger', label: 'Menu', desc: 'Tiroir latéral' },
                  { v: 'minimal', label: 'Minimale', desc: 'Prénom seul' },
                ] as const).map(({ v, label, desc }) => {
                  const cur = (theme.navStyle ?? 'horizontal') as string;
                  const sel = cur === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTheme((t) => ({ ...t, navStyle: v }))}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.4rem',
                        borderRadius: 10,
                        border: `2px solid ${sel ? '#8F947F' : '#E4E7DC'}`,
                        background: sel ? '#8F947F14' : '#fff',
                        color: sel ? '#4a5240' : '#6b7280',
                        fontWeight: sel ? 700 : 400,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section style={block}>
            <h2 style={h2}>Lieu principal</h2>
            <label style={lab}>
              Nom du lieu
              <input style={inp} value={content.venue?.name ?? ''} onChange={(e) => updateVenueField('name', e.target.value)} />
            </label>
            <label style={lab}>
              Adresse complète
              <input style={inp} value={content.venue?.address ?? ''} onChange={(e) => updateVenueField('address', e.target.value)} />
            </label>
            <div style={grid2}>
              <label style={lab}>
                Lien Google Maps
                <input style={inp} value={content.venue?.googleMapsUrl ?? ''} onChange={(e) => updateVenueField('googleMapsUrl', e.target.value)} />
              </label>
              <label style={lab}>
                Lien Waze
                <input style={inp} value={content.venue?.wazeUrl ?? ''} onChange={(e) => updateVenueField('wazeUrl', e.target.value)} />
              </label>
            </div>
            <label style={lab}>
              Photo du lieu (URL)
              <input style={inp} value={content.venue?.photoUrl ?? ''} onChange={(e) => updateVenueField('photoUrl', e.target.value)} />
            </label>
            <label style={lab}>
              Description courte
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={content.venue?.description ?? ''} onChange={(e) => updateVenueField('description', e.target.value)} />
            </label>
          </section>

          <section style={block}>
            <h2 style={h2}>Hébergements recommandés (max 6)</h2>
            <label style={lab}>
              Texte d'intro
              <textarea
                style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                value={content.accommodationsIntro ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, accommodationsIntro: e.target.value }))}
              />
            </label>
            <div style={{ display: 'grid', gap: 10 }}>
              {(content.accommodations ?? []).map((hotel, idx) => (
                <div key={hotel.id} style={{ border: '1px solid #E4E7DC', borderRadius: 12, padding: '0.75rem' }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input style={inp} placeholder="Nom de l'hôtel" value={hotel.name} onChange={(e) => upsertAccommodation(idx, { name: e.target.value })} />
                    <input style={inp} placeholder="Adresse" value={hotel.address} onChange={(e) => upsertAccommodation(idx, { address: e.target.value })} />
                    <input style={inp} placeholder="Description courte (optionnel)" value={hotel.description ?? ''} onChange={(e) => upsertAccommodation(idx, { description: e.target.value })} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input style={inp} placeholder="Distance / durée" value={hotel.distanceOrDuration} onChange={(e) => upsertAccommodation(idx, { distanceOrDuration: e.target.value })} />
                      <input style={inp} placeholder="Téléphone" value={hotel.phone ?? ''} onChange={(e) => upsertAccommodation(idx, { phone: e.target.value })} />
                    </div>
                    <input style={inp} placeholder="Google Maps URL" value={hotel.googleMapsUrl} onChange={(e) => upsertAccommodation(idx, { googleMapsUrl: e.target.value })} />
                    <input style={inp} placeholder="Waze URL" value={hotel.wazeUrl ?? ''} onChange={(e) => upsertAccommodation(idx, { wazeUrl: e.target.value })} />
                    <input style={inp} placeholder="URL de réservation" value={hotel.bookingUrl} onChange={(e) => upsertAccommodation(idx, { bookingUrl: e.target.value })} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={hotel.isShabbatHatan ?? false} onChange={(e) => upsertAccommodation(idx, { isShabbatHatan: e.target.checked })} />
                      Hébergement Chabbat Hatan (section séparée)
                    </label>
                    <button type="button" style={dangerInlineBtn} onClick={() => removeAccommodation(hotel.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" style={ghostInlineBtn} onClick={addAccommodation} disabled={(content.accommodations ?? []).length >= 6}>
              + Ajouter un hôtel
            </button>
          </section>

          <section style={block}>
            <h2 style={h2}>FAQ</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {(content.faq ?? []).map((q, idx) => (
                <div key={q.id} style={{ border: '1px solid #E4E7DC', borderRadius: 12, padding: '0.75rem' }}>
                  <input style={inp} placeholder="Question" value={q.question} onChange={(e) => upsertFaq(idx, { question: e.target.value })} />
                  <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="Réponse" value={q.answer} onChange={(e) => upsertFaq(idx, { answer: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={ghostInlineBtn} onClick={() => moveFaq(idx, -1)}>
                      ↑
                    </button>
                    <button type="button" style={ghostInlineBtn} onClick={() => moveFaq(idx, 1)}>
                      ↓
                    </button>
                    <button type="button" style={dangerInlineBtn} onClick={() => removeFaq(q.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" style={ghostInlineBtn} onClick={addFaq}>
              + Ajouter une question
            </button>
          </section>

          <section style={block}>
            <h2 style={h2}>Textes du site</h2>
            <label style={lab}>
              À la mémoire de... (optionnel)
              <textarea
                style={{ ...inp, minHeight: 64, resize: 'vertical' }}
                value={content.texts?.memorialText ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, texts: { ...(c.texts ?? {}), memorialText: e.target.value } }))}
              />
            </label>
            <label style={lab}>
              Texte famille (optionnel)
              <textarea
                style={{ ...inp, minHeight: 80, resize: 'vertical' }}
                value={content.texts?.familyText ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, texts: { ...(c.texts ?? {}), familyText: e.target.value } }))}
              />
            </label>
            <label style={lab}>
              Musique de fond — playlist mariage
              <select
                style={inp}
                value={deezerTrackId(content.musicUrl) != null ? content.musicUrl : ''}
                onChange={(e) => setContent((c) => ({ ...c, musicUrl: e.target.value }))}
              >
                <option value="">— Choisir une chanson —</option>
                {MUSIC_SUGGESTIONS.map((m) => (
                  <option key={m.id} value={`${DEEZER_SCHEME}${m.id}`}>
                    {m.title} — {m.artist}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.72rem', color: '#8a8378', fontWeight: 400, marginTop: 2 }}>
                Extrait 30 s joué en boucle sur le site. {musicLabelForUrl(content.musicUrl)
                  ? `Sélection : ${musicLabelForUrl(content.musicUrl)}.`
                  : ''}
              </span>
            </label>
            <MusicPreviewButton url={content.musicUrl} />
            <label style={lab}>
              …ou votre propre URL .mp3
              <input
                style={inp}
                placeholder="https://…/musique.mp3"
                value={deezerTrackId(content.musicUrl) != null ? '' : (content.musicUrl ?? '')}
                onChange={(e) => setContent((c) => ({ ...c, musicUrl: e.target.value }))}
              />
            </label>
          </section>

          {/* ── Section mariage juif ────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>✡️ Événements du mariage juif</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Activez la section "Événements" dans les sections, puis configurez les événements de votre mariage.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {DEFAULT_JEWISH_EVENTS.map((def) => {
                const existing = (content.jewishEvents ?? []).find((e) => e.type === def.type);
                const enabled = existing?.enabled ?? false;
                return (
                  <div key={def.type} style={{ border: `1px solid ${enabled ? '#8F947F' : '#E4E7DC'}`, borderRadius: 12, padding: '0.75rem', background: enabled ? '#E4E7DC' : '#fff' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, marginBottom: enabled ? 10 : 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => toggleJewishEvent(def, e.target.checked)}
                      />
                      {def.emoji} {def.label}
                    </label>
                    {enabled && existing ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <input style={inp} placeholder="Date (ex. 14 juin 2026)" value={existing.date} onChange={(e) => upsertJewishEvent(def.type, { date: e.target.value })} />
                          <input style={inp} placeholder="Heure (ex. 19h00)" value={existing.time} onChange={(e) => upsertJewishEvent(def.type, { time: e.target.value })} />
                        </div>
                        <input style={inp} placeholder="Lieu" value={existing.place} onChange={(e) => upsertJewishEvent(def.type, { place: e.target.value })} />
                        <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} placeholder="Description (optionnel)" value={existing.description} onChange={(e) => upsertJewishEvent(def.type, { description: e.target.value })} />
                        <input style={inp} placeholder="Google Maps URL (optionnel)" value={existing.googleMapsUrl ?? ''} onChange={(e) => upsertJewishEvent(def.type, { googleMapsUrl: e.target.value })} />
                        <input style={inp} placeholder="Waze URL (optionnel)" value={existing.wazeUrl ?? ''} onChange={(e) => upsertJewishEvent(def.type, { wazeUrl: e.target.value })} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Galerie ─────────────────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>🖼️ Galerie photos</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Ajoutez vos photos directement depuis votre appareil — elles sont optimisées et hébergées automatiquement.
              La première photo sert d'image vedette sur le site. Touchez <strong>✨ IA</strong> sur une photo pour la
              ré-adapter à l'ambiance du thème choisi.
            </p>

            {/* Vignettes avec réordonnancement et suppression */}
            {(content.galleryPhotos ?? []).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, marginBottom: '0.85rem' }}>
                {(content.galleryPhotos ?? []).map((url, idx) => (
                  <div key={`${url.slice(-24)}-${idx}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: idx === 0 ? '2px solid #8F947F' : '1px solid #E4E7DC', background: '#f4f2ed' }}>
                    <img src={url} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {idx === 0 && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#8F947F', color: '#fff', fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>★ Vedette</span>
                    )}
                    <button
                      type="button"
                      title={`Adapter au thème « ${theme.style} » avec l'IA`}
                      disabled={adaptingIdx !== null}
                      onClick={() => void adaptGalleryPhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: 'rgba(143,148,127,0.92)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: 7,
                        cursor: adaptingIdx !== null ? 'wait' : 'pointer',
                      }}
                    >
                      ✨ IA
                    </button>
                    {adaptingIdx === idx && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(61,50,41,0.62)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.66rem', fontWeight: 700, textAlign: 'center', padding: 6, lineHeight: 1.4 }}>
                        ✨ Adaptation<br />au thème…
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', padding: '10px 4px 4px' }}>
                      <button type="button" title="Reculer" disabled={idx === 0} onClick={() => moveGalleryPhoto(idx, -1)} style={galleryMiniBtn(idx === 0)}>←</button>
                      <button type="button" title="Supprimer" onClick={() => removeGalleryPhoto(idx)} style={{ ...galleryMiniBtn(false), color: '#fca5a5' }}>✕</button>
                      <button type="button" title="Avancer" disabled={idx === (content.galleryPhotos ?? []).length - 1} onClick={() => moveGalleryPhoto(idx, 1)} style={galleryMiniBtn(idx === (content.galleryPhotos ?? []).length - 1)}>→</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length) void handleGalleryUpload(files);
              }}
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading > 0}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 12,
                border: '2px dashed #8F947F',
                background: galleryUploading > 0 ? '#f0efe9' : '#FAFAF7',
                color: '#5a6150',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: galleryUploading > 0 ? 'wait' : 'pointer',
              }}
            >
              {galleryUploading > 0 ? `⏳ Envoi de ${galleryUploading} photo${galleryUploading > 1 ? 's' : ''}…` : '📤 Ajouter des photos depuis mon appareil'}
            </button>
            {galleryError && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#dc2626' }}>{galleryError}</p>
            )}

            <details style={{ marginTop: '0.85rem' }}>
              <summary style={{ fontSize: '0.78rem', color: '#64748b', cursor: 'pointer' }}>Ou coller des URLs manuellement (Cloudinary, Imgur…)</summary>
              <textarea
                style={{ ...inp, minHeight: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem', marginTop: '0.5rem' }}
                placeholder={'https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg'}
                value={(content.galleryPhotos ?? []).join('\n')}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    galleryPhotos: e.target.value.split('\n').map((u) => u.trim()).filter(Boolean),
                  }))
                }
              />
              {(content.galleryPhotos ?? []).some(
                (u) => !/^https?:\/\/\S+/.test(u) && !u.startsWith('data:image/'),
              ) && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#dc2626' }}>
                  ⚠️ Format invalide — chaque ligne doit être une URL complète commençant par https://
                </p>
              )}
            </details>
          </section>

          <RSVPBuilder form={rsvpForm} onChange={setRsvpForm} />

          {/* ── Liens d'invitation ─────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>🔗 Liens d'invitation par groupe d'invités</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              Créez un lien différent par groupe. Chaque lien affiche uniquement les événements sélectionnés dans le formulaire RSVP — les invités "Mariage seul" ne voient pas le Chabbat Hatan ni le Henné.
            </p>

            {/* Modèles rapides */}
            {inviteLinks.length === 0 && rsvpForm.events.filter((e) => e.enabled).length > 0 ? (
              <div style={{ display: 'grid', gap: 8, marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8F947F', margin: 0 }}>⚡ Modèles rapides</p>
                {[
                  { label: '💍 Mariage uniquement', filter: (ev: RSVPEvent) => ['jewish-mairie', 'jewish-houppa'].includes(ev.id) },
                  { label: '💍 + 🕌 Mariage & Chabbat Hatan', filter: (ev: RSVPEvent) => ['jewish-mairie', 'jewish-houppa', 'jewish-chabbat-hatan'].includes(ev.id) },
                  { label: '🌸 + 💍 Henné & Mariage', filter: (ev: RSVPEvent) => ['jewish-henne', 'jewish-mairie', 'jewish-houppa'].includes(ev.id) },
                  { label: '🌟 Tous les événements', filter: () => true },
                ].map((tpl) => {
                  const enabled = rsvpForm.events.filter((e) => e.enabled);
                  const ids = enabled.filter(tpl.filter).map((e) => e.id);
                  if (!ids.length) return null;
                  return (
                    <button
                      key={tpl.label}
                      type="button"
                      style={{ ...ghostInlineBtn, textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.83rem' }}
                      onClick={() =>
                        setInviteLinks((l) => [
                          ...l,
                          { id: crypto.randomUUID(), label: tpl.label, eventIds: ids, token: crypto.randomUUID().slice(0, 10) },
                        ])
                      }
                    >
                      + {tpl.label}
                    </button>
                  );
                })}
                <div style={{ borderTop: '1px solid #E4E7DC', marginTop: 4, paddingTop: 4 }} />
              </div>
            ) : null}

            {inviteLinks.map((link, idx) => {
              const previewSlug = draft.slug || 'votre-site';
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/wedding/${previewSlug}/invite/${link.token}`;
              return (
                <div key={link.id} style={{ border: `1px solid ${link.token ? '#a3e635' : '#E4E7DC'}`, borderRadius: 12, padding: '0.85rem', marginBottom: 10 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input
                      style={inp}
                      placeholder="Nom du groupe (ex. Invités Mariage uniquement)"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...inviteLinks];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setInviteLinks(next);
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                      Événements visibles pour ce groupe :
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {rsvpForm.events.filter((e) => e.enabled).map((ev) => (
                        <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={link.eventIds.includes(ev.id)}
                            onChange={(e) => {
                              const next = [...inviteLinks];
                              const ids = next[idx].eventIds;
                              next[idx] = {
                                ...next[idx],
                                eventIds: e.target.checked
                                  ? [...ids, ev.id]
                                  : ids.filter((id) => id !== ev.id),
                              };
                              setInviteLinks(next);
                            }}
                          />
                          {ev.emojiIcon} {ev.label}
                          {ev.time ? ` · ${ev.time}` : ''}
                        </label>
                      ))}
                    </div>

                    {/* Identifiant de segment (slug lisible ou UUID) */}
                    <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'block' }}>
                      Identifiant du lien
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input
                          style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: '0.82rem', marginBottom: 0 }}
                          placeholder="ex: mariage, tout, famille, vip…"
                          value={link.token}
                          onChange={(e) => {
                            const next = [...inviteLinks];
                            next[idx] = { ...next[idx], token: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') };
                            setInviteLinks(next);
                          }}
                        />
                        <button
                          type="button"
                          style={{ ...ghostInlineBtn, fontSize: '0.75rem', whiteSpace: 'nowrap', padding: '0 0.6rem' }}
                          onClick={() => {
                            const next = [...inviteLinks];
                            next[idx] = { ...next[idx], token: crypto.randomUUID().slice(0, 8) };
                            setInviteLinks(next);
                          }}
                        >
                          Auto
                        </button>
                      </div>
                    </label>
                    {link.token ? (
                      <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.78rem', wordBreak: 'break-all', color: '#166534', border: '1px solid #86efac' }}>
                        🔗 <strong>{link.label || 'Lien'} :</strong>
                        <br />
                        <span style={{ fontFamily: 'monospace' }}>{url}</span>
                        <button
                          type="button"
                          style={{ marginLeft: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#8F947F', fontWeight: 700, fontSize: '0.8rem' }}
                          onClick={() => navigator.clipboard.writeText(url)}
                        >
                          📋 Copier
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                        Tapez un identifiant ci-dessus pour générer le lien.
                      </p>
                    )}

                    <button
                      type="button"
                      style={dangerInlineBtn}
                      onClick={() => setInviteLinks((l) => l.filter((_, i) => i !== idx))}
                    >
                      Supprimer ce lien
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              style={ghostInlineBtn}
              onClick={() =>
                setInviteLinks((l) => [
                  ...l,
                  { id: crypto.randomUUID(), label: '', eventIds: [], token: '' },
                ])
              }
            >
              + Ajouter un lien personnalisé
            </button>
          </section>

          <section style={block}>
            <h2 style={h2}>URL (optionnel)</h2>
            <label style={lab}>
              Slug personnalisé (sinon dérivé du nom du couple). Lettres/chiffres et tirets.
              <input
                style={inp}
                placeholder="ex. padua-attia"
                value={slugCustom}
                onChange={(e) => setSlugCustom(e.target.value)}
              />
            </label>
          </section>

          {submitErrors.length > 0 && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                marginBottom: '0.85rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#b91c1c' }}>
                ⚠️ Formats invalides — corrigez avant de publier :
              </p>
              <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#dc2626' }}>
                {submitErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" style={submitBtn} disabled={saving}>
            {saving ? 'Enregistrement…' : namesLocked ? 'Sauvegarder les modifications' : 'Publier le mini-site'}
          </button>
        </form>

        {/* ── Liens publiés ────────────────────────────────────────────────── */}
        {publishedSlug && (
          <div style={{ ...block, background: '#f0fdf4', border: '1px solid #bbf7d0', marginTop: '1.5rem' }}>
            <h2 style={{ ...h2, color: '#166534' }}>✅ Site publié — vos liens</h2>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: 6 }}>Site principal</p>
              <a
                href={`/wedding/${publishedSlug}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.9rem', color: '#15803d', wordBreak: 'break-all' }}
              >
                {window.location.origin}/wedding/{publishedSlug}
              </a>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: 6 }}>RSVP général</p>
              <a
                href={`/wedding/${publishedSlug}/rsvp`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.9rem', color: '#15803d', wordBreak: 'break-all' }}
              >
                {window.location.origin}/wedding/{publishedSlug}/rsvp
              </a>
            </div>

            {inviteLinks.filter((l) => l.token).map((link) => (
              <div key={link.id} style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fff', borderRadius: 10, border: '1px solid #d1fae5' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  🔗 {link.label || 'Lien sans titre'}
                </p>
                <a
                  href={`/wedding/${publishedSlug}/invite/${link.token}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.85rem', color: '#15803d', wordBreak: 'break-all' }}
                >
                  {window.location.origin}/wedding/{publishedSlug}/invite/{link.token}
                </a>
                <button
                  type="button"
                  style={{ ...ghostInlineBtn, marginTop: 8, display: 'block' }}
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${window.location.origin}/wedding/${publishedSlug}/invite/${link.token}`
                    )
                  }
                >
                  📋 Copier le lien
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="wedding-builder-preview">
        <WeddingSitePreview draft={draft} />
        <ErrorBoundary>
          <RSVPPreview site={draft} form={rsvpForm} />
        </ErrorBoundary>
      </aside>
    </div>
  );
}

const mobileBanner: CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'flex-start',
  background: '#fef3c7',
  border: '1px solid #fde68a',
  borderRadius: 12,
  padding: '0.9rem 1rem',
  marginBottom: '1rem',
  fontSize: '0.88rem',
  color: '#92400e',
  lineHeight: 1.5,
};

const formColumn: CSSProperties = { minWidth: 0 };

const h1: CSSProperties = { fontSize: '1.85rem', margin: '0 0 0.5rem', fontWeight: 800 };

const sub: CSSProperties = { opacity: 0.9, lineHeight: 1.5, margin: '0 0 0.65rem', fontSize: '0.95rem' };

const h2: CSSProperties = { fontSize: '1.08rem', margin: '0 0 0.85rem', fontWeight: 700 };

const block: CSSProperties = {
  marginBottom: '1.35rem',
  padding: '1.1rem 1.1rem 1.2rem',
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #E4E7DC',
  boxShadow: '0 8px 28px rgba(143, 148, 127, 0.08)',
};

const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' };

const lab: CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.65rem',
};

const inp: CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '0.55rem 0.65rem',
  borderRadius: 10,
  border: '1px solid #C7B7A5',
  fontSize: '0.95rem',
};

/**
 * Bouton ▶ Écouter : joue l'extrait 30 s de la musique choisie directement
 * dans le builder (résout `deezer:<id>` à la volée, ou lit une URL directe).
 */
function MusicPreviewButton({ url }: { url: string | undefined }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  // URL MP3 pré-résolue dès la sélection : sur iOS, `play()` doit être appelé
  // DANS le geste utilisateur — résoudre le JSONP au moment du clic faisait
  // rejeter la lecture par Safari (bouton qui « ne marche pas »).
  const [src, setSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    const trimmed = url?.trim();
    if (!trimmed) { setSrc(null); return; }
    const id = deezerTrackId(trimmed);
    if (id == null) { setSrc(trimmed); return; }
    let cancelled = false;
    setLoading(true);
    resolveDeezerPreview(id).then((resolved) => {
      if (cancelled) return;
      setSrc(resolved);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [url]);

  const trimmed = url?.trim();
  if (!trimmed) return null;

  const toggle = () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    if (!src) return;
    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.onended = () => setPlaying(false);
      audioRef.current = audio;
    }
    audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    setPlaying(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        marginTop: 6,
        padding: '0.45rem 0.9rem',
        borderRadius: 999,
        border: '1px solid #C7B7A5',
        background: playing ? '#8F947F' : '#F6F2EA',
        color: playing ? '#fff' : '#4C463C',
        fontWeight: 700,
        fontSize: '0.82rem',
        cursor: 'pointer',
      }}
    >
      {loading ? '… chargement' : playing ? '■ Arrêter' : '▶ Écouter l\'extrait'}
    </button>
  );
}

/**
 * Sélecteur de police par rôle (Titres / Prénoms / Texte), façon planche de
 * papeterie : chaque option est rendue dans SA police et un aperçu « Aa »
 * en direct s'affiche sous le menu dans la police choisie.
 */
function FontRoleSelect({
  label,
  value,
  onChange,
  allowAuto,
  sample,
  sampleSize = '1.35rem',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Ajoute l'option « Auto » (police par défaut du thème) */
  allowAuto?: boolean;
  /** Texte d'aperçu rendu dans la police choisie */
  sample: string;
  sampleSize?: string;
}) {
  const groups = Array.from(new Set(FONT_OPTIONS.map((f) => f.group)));
  return (
    <label style={lab}>
      {label}
      <select style={inp} value={value} onChange={(e) => onChange(e.target.value)}>
        {allowAuto ? <option value="">Auto (police du thème)</option> : null}
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {FONT_OPTIONS.filter((f) => f.group === group).map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {value ? (
        <span
          aria-hidden
          style={{
            display: 'block',
            marginTop: 4,
            fontFamily: value,
            fontSize: sampleSize,
            fontWeight: 400,
            lineHeight: 1.25,
            color: '#4C463C',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sample}
        </span>
      ) : null}
    </label>
  );
}

const checks: CSSProperties = { display: 'grid', gap: '0.45rem' };

const chk: CSSProperties = { display: 'flex', gap: '0.55rem', alignItems: 'center', fontWeight: 500, fontSize: '0.92rem' };

const submitBtn: CSSProperties = {
  width: '100%',
  marginTop: 8,
  padding: '0.85rem 1rem',
  borderRadius: 12,
  border: 'none',
  fontWeight: 800,
  fontSize: '1rem',
  cursor: 'pointer',
  color: '#fff',
  background: 'linear-gradient(120deg, #8F947F, #757B68)',
};

const ghostInlineBtn: CSSProperties = {
  padding: '0.42rem 0.66rem',
  borderRadius: 9,
  border: '1px solid #C7B7A5',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.82rem',
};

const dangerInlineBtn: CSSProperties = {
  padding: '0.42rem 0.66rem',
  borderRadius: 9,
  border: '1px solid #fecaca',
  background: '#fff1f2',
  cursor: 'pointer',
  color: '#9f1239',
  fontWeight: 700,
  fontSize: '0.82rem',
};

const studioSectionLabel: CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#757B68',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

function galleryMiniBtn(disabled: boolean): CSSProperties {
  return {
    border: 'none',
    background: 'transparent',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.8rem',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    padding: '0 6px',
    lineHeight: 1.4,
  };
}

const lockedNameField: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  marginTop: 6,
  padding: '0.55rem 0.75rem',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  fontSize: '0.95rem',
  fontWeight: 600,
  background: '#f9fafb',
  color: '#6b7280',
  userSelect: 'none',
};
