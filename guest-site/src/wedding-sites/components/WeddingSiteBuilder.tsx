import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { MonogramGenerator } from './MonogramGenerator';
import { RSVPBuilder } from '@guest/rsvp/RSVPBuilder';
import { RSVPPreview } from '@guest/rsvp/RSVPPreview';
import { createDefaultRSVPForm, newEvent, type RSVPEvent, type RSVPForm } from '@guest/rsvp/types';
import { FONT_OPTIONS, STYLE_PRESETS } from '../data/weddingThemes';
import { createWeddingSite, updateWeddingSite, setAuthToken, getWeddingSiteBySlug } from '../services/weddingSiteService';
import type {
  AccommodationItem,
  CardStyle,
  FAQItem,
  GiftRegistry,
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
import { mergeDateAndTimeToIso } from '../utils/date';
import { generateSlugFromDisplayName, slugify } from '../utils/slug';
import { applyThemePreset } from '../templates/themePresets';

import { WeddingSitePreview } from './WeddingSitePreview';

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
  { id: 'grid',               label: 'Grille' },
  { id: 'thick-grid',         label: 'Grille épais' },
  { id: 'hexagonal',          label: 'Hexagone' },
  { id: 'small-squares',      label: 'Carreaux' },
  { id: 'deco-geo',           label: 'Géo déco' },
  { id: 'horizontal-stripes', label: 'Rayures H' },
  { id: 'linen',              label: 'Lin' },
  { id: 'canvas-texture',     label: 'Toile' },
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
  { type: 'mairie', label: 'Mairie (cérémonie civile)', emoji: '🏛️' },
  { type: 'chabbat-hatan', label: 'Chabbat Hatan', emoji: '🕌' },
  { type: 'houppa', label: 'Houppa & Cérémonie', emoji: '💍' },
  { type: 'brunch', label: 'Brunch', emoji: '☕', optional: true },
  { type: 'sheva-berakhot', label: 'Sheva Berakhot', emoji: '🥂', optional: true },
  { type: 'pool-party', label: 'Pool Party', emoji: '🏊', optional: true },
  { type: 'depart', label: 'Au revoir des invités', emoji: '👋', optional: true },
];

function defaultGiftRegistry(): GiftRegistry {
  return { introText: '', externalUrl: '', cagnotteUrl: '', cagnotteLabel: '', bankTransferInfo: '' };
}

const initialDate = (): { date: string; time: string } => ({ date: '', time: '' });

export function WeddingSiteBuilder() {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [namesLocked, setNamesLocked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [slugCustom, setSlugCustom] = useState('');
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  const [{ date, time }, setDt] = useState(initialDate);

  const [groomName, setGroomName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [mainText, setMainText] = useState('');
  const [language, setLanguage] = useState<SiteLanguage>('fr');
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
      venue,
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
      venue,
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
      setVenue(site.venue || '');
      setWelcomeText(site.welcomeText || '');
      setMainText(site.mainText || '');
      setLanguage((site.language as SiteLanguage) || 'fr');
      if (site.theme && typeof site.theme === 'object') setTheme(applyThemePreset({ ...defaultWeddingTheme(), ...(site.theme as WeddingTheme) }));
      if (site.sections && typeof site.sections === 'object') setSections(site.sections as WeddingSections);
      if (site.content && typeof site.content === 'object') setContent((prev) => ({ ...prev, ...(site.content as WeddingSiteContent) }));
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
      setLoadError('Impossible de charger le site. Vérifiez votre connexion et réessayez.');
    });
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
        venue,
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
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erreur à la création.');
    } finally {
      setSaving(false);
    }
  }

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
          <Link to="/" style={{ fontSize: '0.92rem' }}>
            ← Retour
          </Link>
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
            <label style={lab}>
              Lieu précis
              <input style={inp} value={venue} onChange={(e) => setVenue(e.target.value)} />
            </label>
            <label style={lab}>
              Phrase d'accueil
              <input style={inp} value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} />
            </label>
            <label style={lab}>
              Texte principal
              <textarea style={{ ...inp, minHeight: 88, resize: 'vertical' }} value={mainText} onChange={(e) => setMainText(e.target.value)} />
            </label>
            <label style={lab}>
              Langue du site
              <select style={inp} value={language} onChange={(e) => setLanguage(e.target.value as SiteLanguage)}>
                <option value="fr">Français</option>
                <option value="he">Hébreu (RTL)</option>
                <option value="en">English</option>
              </select>
            </label>

            {/* ── Verset hébraïque en arc ── */}
            <div style={{ marginTop: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', letterSpacing: '0.04em' }}>
                  ✡️ פסוק — Verset hébraïque (affiché en arc en haut du site)
                </span>
              </div>
              <select
                style={{ ...inp, marginBottom: '0.5rem', fontFamily: "'Frank Ruhl Libre', serif", direction: 'rtl' }}
                value={
                  [
                    'נעלה את ירושלים על ראש שמחתנו',
                    'קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה קוֹל חָתָן וְקוֹל כַּלָּה',
                    'אֲנִי לְדוֹדִי וְדוֹדִי לִי',
                    'זֶה הַיּוֹם עָשָׂה ה׳ נָגִילָה וְנִשְׂמְחָה בוֹ',
                    'שִׂמְחוּ אֶת יְרוּשָׁלִַם וְגִילוּ בָהּ',
                    'בְּרוּךְ הַבָּא בְּשֵׁם ה׳',
                    'שִׂישׂ אָשִׂישׂ בַּה׳ תָּגֵל נַפְשִׁי בֵּאלֹהַי',
                    'מַה יָּפוּ פְעָמַיִךְ בַּנְּעָלִים',
                    'כִּי טוֹב כִּי לְעוֹלָם חַסְדּוֹ',
                  ].includes(content.hebrewQuote ?? '')
                    ? (content.hebrewQuote ?? '')
                    : content.hebrewQuote
                    ? '__custom__'
                    : ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || v !== '__custom__') {
                    setContent((c) => ({ ...c, hebrewQuote: v === '' ? undefined : v }));
                  }
                }}
              >
                <option value="">— Aucun —</option>
                <option value="נעלה את ירושלים על ראש שמחתנו">נעלה את ירושלים על ראש שמחתנו (תהלים קלז:ו)</option>
                <option value="קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה קוֹל חָתָן וְקוֹל כַּלָּה">קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה (ירמיהו לג:יא)</option>
                <option value="אֲנִי לְדוֹדִי וְדוֹדִי לִי">אֲנִי לְדוֹדִי וְדוֹדִי לִי (שיה״ש ו:ג)</option>
                <option value="זֶה הַיּוֹם עָשָׂה ה׳ נָגִילָה וְנִשְׂמְחָה בוֹ">זֶה הַיּוֹם עָשָׂה ה׳ (תהלים קיח:כד)</option>
                <option value="שִׂמְחוּ אֶת יְרוּשָׁלִַם וְגִילוּ בָהּ">שִׂמְחוּ אֶת יְרוּשָׁלִַם (ישעיהו סו:י)</option>
                <option value="בְּרוּךְ הַבָּא בְּשֵׁם ה׳">בְּרוּךְ הַבָּא בְּשֵׁם ה׳ (תהלים קיח:כו)</option>
                <option value="שִׂישׂ אָשִׂישׂ בַּה׳ תָּגֵל נַפְשִׁי בֵּאלֹהַי">שִׂישׂ אָשִׂישׂ בַּה׳ (ישעיהו סא:י)</option>
                <option value="מַה יָּפוּ פְעָמַיִךְ בַּנְּעָלִים">מַה יָּפוּ פְעָמַיִךְ בַּנְּעָלִים (שיה״ש ז:ב)</option>
                <option value="כִּי טוֹב כִּי לְעוֹלָם חַסְדּוֹ">כִּי טוֹב כִּי לְעוֹלָם חַסְדּוֹ (תהלים קלו)</option>
                {content.hebrewQuote && ![
                  'נעלה את ירושלים על ראש שמחתנו',
                  'קוֹל שָׂשׂוֹן וְקוֹל שִׂמְחָה קוֹל חָתָן וְקוֹל כַּלָּה',
                  'אֲנִי לְדוֹדִי וְדוֹדִי לִי',
                  'זֶה הַיּוֹם עָשָׂה ה׳ נָגִילָה וְנִשְׂמְחָה בוֹ',
                  'שִׂמְחוּ אֶת יְרוּשָׁלִַם וְגִילוּ בָהּ',
                  'בְּרוּךְ הַבָּא בְּשֵׁם ה׳',
                  'שִׂישׂ אָשִׂישׂ בַּה׳ תָּגֵל נַפְשִׁי בֵּאלֹהַי',
                  'מַה יָּפוּ פְעָמַיִךְ בַּנְּעָלִים',
                  'כִּי טוֹב כִּי לְעוֹלָם חַסְדּוֹ',
                ].includes(content.hebrewQuote) ? (
                  <option value="__custom__">✏️ Personnalisé</option>
                ) : null}
              </select>
              <input
                style={{ ...inp, fontFamily: "'Frank Ruhl Libre', serif", direction: 'rtl', fontSize: '1rem' }}
                placeholder="כתוב פסוק בחופשיות..."
                value={content.hebrewQuote ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, hebrewQuote: e.target.value || undefined }))}
              />
            </div>
          </section>

          {/* ── Parents du couple ──────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>👨‍👩‍👧 Familles (affiché sur le site)</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Ces noms apparaissent dans la section d'honneur sur le site.
            </p>
            <div style={grid2}>
              <label style={lab}>
                Nom de famille de la mariée
                <input style={inp} placeholder="ex. Benitah"
                  value={content.brideFamilyName ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, brideFamilyName: e.target.value }))} />
              </label>
              <label style={lab}>
                Nom de famille du marié
                <input style={inp} placeholder="ex. Cohen"
                  value={content.groomFamilyName ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, groomFamilyName: e.target.value }))} />
              </label>
            </div>

            {/* Côté mariée */}
            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '1rem 0 0.5rem', fontWeight: 600 }}>Côté mariée</p>
            <div style={grid2}>
              <label style={lab}>
                Père de la mariée
                <input style={inp} placeholder="ex. Michel Benitah"
                  value={content.parentsBride?.father ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, parentsBride: { ...(c.parentsBride ?? {}), father: e.target.value } }))} />
              </label>
              <label style={lab}>
                Mère de la mariée
                <input style={inp} placeholder="ex. Véronique Benitah"
                  value={content.parentsBride?.mother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, parentsBride: { ...(c.parentsBride ?? {}), mother: e.target.value } }))} />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={content.parentsBride?.isDivorced ?? false}
                onChange={(e) => setContent((c) => ({ ...c, parentsBride: { ...(c.parentsBride ?? {}), isDivorced: e.target.checked } }))}
              />
              Parents divorcés (affichés séparément sur le site)
            </label>
            <div style={grid2}>
              <label style={lab}>
                Grand-père de la mariée
                <input style={inp} placeholder="ex. Albert Benitah"
                  value={content.grandparentsBride?.grandfather ?? content.grandparentsBride?.paternalGrandfather ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsBride: { ...(c.grandparentsBride ?? {}), grandfather: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-mère de la mariée
                <input style={inp} placeholder="ex. Simone Benitah"
                  value={content.grandparentsBride?.grandmother ?? content.grandparentsBride?.paternalGrandmother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsBride: { ...(c.grandparentsBride ?? {}), grandmother: e.target.value } }))} />
              </label>
            </div>

            {/* Côté marié */}
            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0.75rem 0 0.5rem', fontWeight: 600 }}>Côté marié</p>
            <div style={grid2}>
              <label style={lab}>
                Père du marié
                <input style={inp} placeholder="ex. Patrick Cohen"
                  value={content.parentsGroom?.father ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, parentsGroom: { ...(c.parentsGroom ?? {}), father: e.target.value } }))} />
              </label>
              <label style={lab}>
                Mère du marié
                <input style={inp} placeholder="ex. Isabelle Cohen"
                  value={content.parentsGroom?.mother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, parentsGroom: { ...(c.parentsGroom ?? {}), mother: e.target.value } }))} />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={content.parentsGroom?.isDivorced ?? false}
                onChange={(e) => setContent((c) => ({ ...c, parentsGroom: { ...(c.parentsGroom ?? {}), isDivorced: e.target.checked } }))}
              />
              Parents divorcés (affichés séparément sur le site)
            </label>
            <div style={grid2}>
              <label style={lab}>
                Grand-père du marié
                <input style={inp} placeholder="ex. Roger Cohen"
                  value={content.grandparentsGroom?.grandfather ?? content.grandparentsGroom?.paternalGrandfather ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsGroom: { ...(c.grandparentsGroom ?? {}), grandfather: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-mère du marié
                <input style={inp} placeholder="ex. Rachel Cohen"
                  value={content.grandparentsGroom?.grandmother ?? content.grandparentsGroom?.paternalGrandmother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsGroom: { ...(c.grandparentsGroom ?? {}), grandmother: e.target.value } }))} />
              </label>
            </div>
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
              onSelect={(svg, style) => setContent((c) => ({ ...c, monogramSvg: svg, monogramStyle: style }))}
            />
            {content.monogramSvg ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac', fontSize: '0.83rem', color: '#166534' }}>
                ✅ Monogramme enregistré — il sera affiché dans le Hero du site
                <button
                  type="button"
                  onClick={() => setContent((c) => ({ ...c, monogramSvg: undefined, monogramStyle: undefined }))}
                  style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  Supprimer
                </button>
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

            {/* ── Studio de Design ─────────────────────────────────────────── */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'linear-gradient(135deg, #F6F4EF 0%, #EDE8E0 100%)', borderRadius: 12, border: '1px solid #C7B7A5' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: 800, color: '#8F947F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Studio de design
              </p>

              {/* Hero Style */}
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
                          background: theme.backgroundColor || '#faf7f2',
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
              const palettes = [
                { name: 'Noir & Or', colors: ['#0B0B0B', '#D4AF37', '#EBFD2', '#FFFFFF'], primary: '#D4AF37', secondary: '#0B0B0B', bg: '#FDFBF5', text: '#0B0B0B' },
                { name: 'Émeraude & Champagne', colors: ['#0F5132', '#D4AF37', '#E9DFC9', '#FFFFFF'], primary: '#0F5132', secondary: '#D4AF37', bg: '#F5F2EA', text: '#0F5132' },
                { name: 'Bleu Nuit & Cuivré', colors: ['#0E2248', '#C97C5D', '#B7A69A', '#F5EFE6'], primary: '#0E2248', secondary: '#C97C5D', bg: '#F5EFE6', text: '#0E2248' },
                { name: 'Bordeaux & Or Vieilli', colors: ['#580D1E', '#D4AF37', '#EEC7B7', '#F7F3EE'], primary: '#580D1E', secondary: '#D4AF37', bg: '#FAF6F1', text: '#3D0A14' },
                { name: 'Vert Sauge & Bronze', colors: ['#8BBF7A', '#7A5A3A', '#DCD2BE', '#FAF7F2'], primary: '#8BBF7A', secondary: '#7A5A3A', bg: '#FAF7F2', text: '#3D3020' },
                { name: 'Terracotta & Crème', colors: ['#C65A2E', '#F3EFE6', '#6B6F3C', '#D8BEBC'], primary: '#C65A2E', secondary: '#6B6F3C', bg: '#FAF5EE', text: '#3A2010' },
                { name: 'Lavande & Gris', colors: ['#B9ABC9', '#BFC2C7', '#E8E0D2', '#FFFFFF'], primary: '#9B8BB0', secondary: '#BFC2C7', bg: '#F4F0F8', text: '#3D3550' },
                { name: 'Noir & Blanc Marbre', colors: ['#000000', '#FFFFFF', '#E6E6E6', '#D4AF37'], primary: '#000000', secondary: '#D4AF37', bg: '#FAFAFA', text: '#111111' },
                { name: 'Pétrole & Or', colors: ['#00AF57', '#D4AF37', '#EDED56', '#F6F2EA'], primary: '#005F67', secondary: '#D4AF37', bg: '#F2F8F8', text: '#003840' },
                { name: 'Pêche & Or Rose', colors: ['#F2B9A7', '#F5DBCC', '#EBC9B7', '#E7A98D'], primary: '#D4856A', secondary: '#C9956A', bg: '#FDF5F0', text: '#6B3A2A' },
                { name: 'Olive & Beige', colors: ['#4B5332', '#F4F1E8', '#D4C9B6', '#9B9E1D2'], primary: '#4B5332', secondary: '#C9B87A', bg: '#F4F1E8', text: '#2E3320' },
                { name: 'Chocolat & Doré', colors: ['#4B2E1E', '#E7DFD2', '#B8A97B', '#D4AF37'], primary: '#5A3824', secondary: '#D4AF37', bg: '#FAF5EE', text: '#2E1A0E' },
                { name: 'Bleu Grisé & Argent', colors: ['#8FA1B3', '#C0C6CC', '#FFFFFF', '#E0E3E6'], primary: '#5A7A96', secondary: '#A0A8B0', bg: '#F5F7FA', text: '#2A3A4A' },
                { name: 'Fuchsia & Prune', colors: ['#BF1860', '#6A0038', '#D4AF37', '#F1C6D2'], primary: '#8B1050', secondary: '#D4AF37', bg: '#FDF0F5', text: '#3A0020' },
                { name: 'Sable & Bleu Ciel', colors: ['#E6D8C2', '#B7D6E6', '#FFFFFF', '#E6E8BF0'], primary: '#7AAECC', secondary: '#C9B080', bg: '#F5F8FB', text: '#2A4A5A' },
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

            {/* ── Typographie & réglages ────────────────────────────────────── */}
            <label style={lab}>
              Police
              <select style={inp} value={theme.fontFamily} onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              <label style={lab}>
                Taille du titre
                <select style={inp} value={theme.titleSize} onChange={(e) => setTheme({ ...theme, titleSize: e.target.value as TitleSize })}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="huge">Huge</option>
                </select>
              </label>
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
                  ['giftRegistry', '🎁 Liste de mariage'],
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
              Musique de fond (.mp3 URL)
              <input style={inp} value={content.musicUrl ?? ''} onChange={(e) => setContent((c) => ({ ...c, musicUrl: e.target.value }))} />
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
              URLs de vos photos (une par ligne). Hébergez vos photos sur Cloudinary, Google Photos, Imgur ou tout service public.
            </p>
            <textarea
              style={{ ...inp, minHeight: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem' }}
              placeholder={'https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg'}
              value={(content.galleryPhotos ?? []).join('\n')}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  galleryPhotos: e.target.value.split('\n').map((u) => u.trim()).filter(Boolean),
                }))
              }
            />
          </section>

          {/* ── Liste de mariage ────────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>🎁 Liste de mariage</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Activez la section "Liste de mariage" dans les sections.
            </p>
            <label style={lab}>
              Texte d'introduction
              <textarea
                style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                value={content.giftRegistry?.introText ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, giftRegistry: { ...(c.giftRegistry ?? defaultGiftRegistry()), introText: e.target.value } }))}
              />
            </label>
            <label style={lab}>
              Lien liste de cadeaux (Mariage.net, Amazon, etc.)
              <input style={inp} placeholder="https://..." value={content.giftRegistry?.externalUrl ?? ''} onChange={(e) => setContent((c) => ({ ...c, giftRegistry: { ...(c.giftRegistry ?? defaultGiftRegistry()), externalUrl: e.target.value } }))} />
            </label>
            <label style={lab}>
              Lien cagnotte (Leetchi, Pot Commun, etc.)
              <input style={inp} placeholder="https://..." value={content.giftRegistry?.cagnotteUrl ?? ''} onChange={(e) => setContent((c) => ({ ...c, giftRegistry: { ...(c.giftRegistry ?? defaultGiftRegistry()), cagnotteUrl: e.target.value } }))} />
            </label>
            <label style={lab}>
              Libellé bouton cagnotte
              <input style={inp} placeholder="Participer à la cagnotte" value={content.giftRegistry?.cagnotteLabel ?? ''} onChange={(e) => setContent((c) => ({ ...c, giftRegistry: { ...(c.giftRegistry ?? defaultGiftRegistry()), cagnotteLabel: e.target.value } }))} />
            </label>
            <label style={lab}>
              Informations virement bancaire (optionnel)
              <textarea
                style={{ ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                placeholder={'IBAN : FR76...\nBIC : ...\nNom : ...'}
                value={content.giftRegistry?.bankTransferInfo ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, giftRegistry: { ...(c.giftRegistry ?? defaultGiftRegistry()), bankTransferInfo: e.target.value } }))}
              />
            </label>
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

                    {/* Générer token immédiatement */}
                    {!link.token ? (
                      <button
                        type="button"
                        style={{ ...ghostInlineBtn, fontSize: '0.82rem' }}
                        onClick={() => {
                          const next = [...inviteLinks];
                          next[idx] = { ...next[idx], token: crypto.randomUUID().slice(0, 10) };
                          setInviteLinks(next);
                        }}
                      >
                        🔑 Générer le lien maintenant
                      </button>
                    ) : (
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
        <RSVPPreview site={draft} form={rsvpForm} />

        <p style={footnote}>
          Aperçu mis à jour en direct. Sauvegarde démo dans le navigateur (localStorage) —{' '}
          {/* SUPABASE */}
          remplacez <code>weddingSiteService</code> par votre API lorsque vous branchez le backend.
        </p>
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

const footnote: CSSProperties = { fontSize: '0.8rem', opacity: 0.85, lineHeight: 1.45 };

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
