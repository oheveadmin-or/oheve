import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { MonogramGenerator } from './MonogramGenerator';
import { RSVPBuilder } from '@guest/rsvp/RSVPBuilder';
import { RSVPPreview } from '@guest/rsvp/RSVPPreview';
import { createDefaultRSVPForm, newEvent, type RSVPEvent, type RSVPForm } from '@guest/rsvp/types';
import { FONT_OPTIONS, STYLE_PRESETS } from '../data/weddingThemes';
import { createWeddingSite } from '../services/weddingSiteService';
import type {
  AccommodationItem,
  CoupleStoryItem,
  FAQItem,
  GiftRegistry,
  InviteLink,
  JewishWeddingEvent,
  SiteLanguage,
  StyleQuizAnswers,
  ThemeAmbiance,
  ThemeLayout,
  TitleSize,
  WeddingSections,
  WeddingSite,
  WeddingSiteContent,
  WeddingTheme,
} from '../types';
import { defaultWeddingSections, defaultWeddingTheme } from '../types';
import { mergeDateAndTimeToIso, splitIsoToDateAndTime } from '../utils/date';
import { generateSlugFromDisplayName, slugify } from '../utils/slug';
import { buildThemeFromQuizAnswers } from '../utils/theme-generator';

import { WeddingSitePreview } from './WeddingSitePreview';
import { WeddingStyleQuiz } from './WeddingStyleQuiz';

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
  'custom':         { emoji: '✨', label: 'Événement' },
};

const DEFAULT_JEWISH_EVENTS: { type: JewishWeddingEvent['type']; label: string; emoji: string; optional?: boolean }[] = [
  { type: 'henne', label: 'Henné', emoji: '🌸' },
  { type: 'mairie', label: 'Mairie (cérémonie civile)', emoji: '🏛️' },
  { type: 'chabbat-hatan', label: 'Chabbat Hatan', emoji: '🕌' },
  { type: 'houppa', label: 'Houppa & Cérémonie', emoji: '💍' },
  { type: 'brunch', label: 'Brunch', emoji: '☕', optional: true },
  { type: 'sheva-berakhot', label: 'Sheva Berakhot', emoji: '🥂', optional: true },
  { type: 'depart', label: 'Au revoir des invités', emoji: '👋', optional: true },
];

function defaultGiftRegistry(): GiftRegistry {
  return { introText: '', externalUrl: '', cagnotteUrl: '', cagnotteLabel: '', bankTransferInfo: '' };
}

const initialDate = (): { date: string; time: string } => {
  const iso = new Date();
  iso.setMonth(iso.getMonth() + 3);
  return splitIsoToDateAndTime(iso.toISOString());
};

export function WeddingSiteBuilder() {
  const [saving, setSaving] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [slugCustom, setSlugCustom] = useState('');
  const [quiz, setQuiz] = useState<StyleQuizAnswers | undefined>(undefined);
  const [quizApplied, setQuizApplied] = useState(false);
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
  const [theme, setTheme] = useState<WeddingTheme>(() => defaultWeddingTheme());
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

  function applyQuiz(answers: StyleQuizAnswers) {
    const { theme: nt, sections: ns, languageHint } = buildThemeFromQuizAnswers(answers);
    setTheme(nt);
    setSections(ns);
    setLanguage(languageHint);
    setQuizApplied(true);
    setTimeout(() => setQuizApplied(false), 3000);
    // scroll to preview on mobile
    if (window.innerWidth < 960) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const custom = slugCustom.trim() ? slugify(slugCustom) : undefined;
      const finalInviteLinks: InviteLink[] = inviteLinks.map((l) => ({
        ...l,
        token: l.token || crypto.randomUUID().slice(0, 12),
      }));

      const row = await createWeddingSite({
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
      });
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

  function addStoryItem() {
    setContent((prev) => ({
      ...prev,
      coupleStory: [
        ...(prev.coupleStory ?? []),
        { id: crypto.randomUUID(), year: '', title: '', description: '', emoji: '❤️' },
      ],
    }));
  }

  function upsertStoryItem(idx: number, partial: Partial<CoupleStoryItem>) {
    setContent((prev) => {
      const list = [...(prev.coupleStory ?? [])];
      const cur = list[idx] ?? { id: crypto.randomUUID(), year: '', title: '', description: '', emoji: '' };
      list[idx] = { ...cur, ...partial };
      return { ...prev, coupleStory: list };
    });
  }

  function removeStoryItem(id: string) {
    setContent((prev) => ({ ...prev, coupleStory: (prev.coupleStory ?? []).filter((s) => s.id !== id) }));
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
          <h1 style={h1}>Créer le mini-site</h1>

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
            Remplissez les infos, utilisez le quiz pour le style, vérifiez l'aperçu puis publiez. URL publique :{' '}
            <strong>www.ohevewedding.com/wedding/votre-slug</strong> — votre domaine est actif.
          </p>
          <Link to="/" style={{ fontSize: '0.92rem' }}>
            ← Retour
          </Link>
        </header>

        <form onSubmit={handleSubmit}>

          {/* ── ASSISTANT DE STYLE (en premier) ───────────────────────────── */}
          <section style={{ ...block, border: '2px solid #5b4fd6', background: 'linear-gradient(135deg, #faf8ff 0%, #f0ecff 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>✨</span>
              <h2 style={{ ...h2, margin: 0, color: '#5b4fd6' }}>Commencez par l'assistant de style</h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#4c1d95', marginBottom: '1rem', lineHeight: 1.5 }}>
              Répondez aux questions ci-dessous pour générer automatiquement le thème parfait pour votre mariage. Vous pourrez ajuster les détails ensuite.
            </p>

            {quizApplied && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✅</span>
                <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>Thème appliqué ! Regardez l'aperçu à droite (ou faites défiler vers le haut sur mobile).</span>
              </div>
            )}

            <WeddingStyleQuiz
              value={quiz ?? {}}
              onChange={setQuiz}
              onApply={applyQuiz}
            />
          </section>

          <section style={block}>
            <h2 style={h2}>Informations</h2>
            <div style={grid2}>
              <label style={lab}>
                Prénom marié
                <input style={inp} required value={groomName} onChange={(e) => setGroomName(e.target.value)} />
              </label>
              <label style={lab}>
                Prénom mariée
                <input style={inp} required value={brideName} onChange={(e) => setBrideName(e.target.value)} />
              </label>
            </div>
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

            {/* Grands-parents */}
            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '1.25rem 0 0.5rem', fontWeight: 600 }}>
              👴👵 Grands-parents (optionnel)
            </p>
            <div style={grid2}>
              <label style={lab}>
                Grand-père paternel de la mariée
                <input style={inp} placeholder="ex. Albert Benitah"
                  value={content.grandparentsBride?.paternalGrandfather ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsBride: { ...(c.grandparentsBride ?? {}), paternalGrandfather: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-mère paternelle de la mariée
                <input style={inp} placeholder="ex. Simone Benitah"
                  value={content.grandparentsBride?.paternalGrandmother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsBride: { ...(c.grandparentsBride ?? {}), paternalGrandmother: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-père maternel de la mariée
                <input style={inp} placeholder="ex. Maurice Lévy"
                  value={content.grandparentsBride?.maternalGrandfather ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsBride: { ...(c.grandparentsBride ?? {}), maternalGrandfather: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-mère maternelle de la mariée
                <input style={inp} placeholder="ex. Yvette Lévy"
                  value={content.grandparentsBride?.maternalGrandmother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsBride: { ...(c.grandparentsBride ?? {}), maternalGrandmother: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-père paternel du marié
                <input style={inp} placeholder="ex. Roger Cohen"
                  value={content.grandparentsGroom?.paternalGrandfather ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsGroom: { ...(c.grandparentsGroom ?? {}), paternalGrandfather: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-mère paternelle du marié
                <input style={inp} placeholder="ex. Rachel Cohen"
                  value={content.grandparentsGroom?.paternalGrandmother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsGroom: { ...(c.grandparentsGroom ?? {}), paternalGrandmother: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-père maternel du marié
                <input style={inp} placeholder="ex. André Marciano"
                  value={content.grandparentsGroom?.maternalGrandfather ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsGroom: { ...(c.grandparentsGroom ?? {}), maternalGrandfather: e.target.value } }))} />
              </label>
              <label style={lab}>
                Grand-mère maternelle du marié
                <input style={inp} placeholder="ex. Liliane Marciano"
                  value={content.grandparentsGroom?.maternalGrandmother ?? ''}
                  onChange={(e) => setContent((c) => ({ ...c, grandparentsGroom: { ...(c.grandparentsGroom ?? {}), maternalGrandmother: e.target.value } }))} />
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
              groomName={groomName || 'B'}
              brideName={brideName || 'A'}
              primaryColor={theme.primaryColor}
              backgroundColor={theme.backgroundColor}
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
            <h2 style={h2}>Style & thème</h2>
            <label style={lab}>
              Preset visuel
              <select
                style={inp}
                value={theme.style}
                onChange={(e) => {
                  const id = e.target.value as WeddingTheme['style'];
                  const preset = STYLE_PRESETS.find((s) => s.id === id);
                  if (preset) setTheme({ ...theme, ...preset.theme, style: id });
                  else setTheme({ ...theme, style: id });
                }}
              >
                {STYLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={grid2}>
              <label style={lab}>
                Couleur principale
                <input
                  style={{ ...inp, padding: 4, height: 40 }}
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                />
              </label>
              <label style={lab}>
                Couleur secondaire
                <input
                  style={{ ...inp, padding: 4, height: 40 }}
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                />
              </label>
              <label style={lab}>
                Fond
                <input
                  style={{ ...inp, padding: 4, height: 40 }}
                  type="color"
                  value={theme.backgroundColor}
                  onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                />
              </label>
              <label style={lab}>
                Texte
                <input
                  style={{ ...inp, padding: 4, height: 40 }}
                  type="color"
                  value={theme.textColor}
                  onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                />
              </label>
            </div>

            <label style={lab}>
              Police
              <select
                style={inp}
                value={theme.fontFamily}
                onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div style={grid2}>
              <label style={lab}>
                Taille du titre
                <select
                  style={inp}
                  value={theme.titleSize}
                  onChange={(e) => setTheme({ ...theme, titleSize: e.target.value as TitleSize })}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="huge">Huge</option>
                </select>
              </label>
              <label style={lab}>
                Ambiance
                <select
                  style={inp}
                  value={theme.ambiance}
                  onChange={(e) => setTheme({ ...theme, ambiance: e.target.value as ThemeAmbiance })}
                >
                  <option value="sobre">Sobre</option>
                  <option value="chic">Chic</option>
                  <option value="festif">Festif</option>
                  <option value="religieux">Religieux</option>
                  <option value="moderne">Moderne</option>
                </select>
              </label>
              <label style={lab}>
                Cartes
                <select
                  style={inp}
                  value={theme.cardStyle}
                  onChange={(e) => setTheme({ ...theme, cardStyle: e.target.value as WeddingTheme['cardStyle'] })}
                >
                  <option value="glass">Glass</option>
                  <option value="solid">Solid</option>
                  <option value="outline">Outline</option>
                  <option value="shadow">Shadow</option>
                </select>
              </label>
              <label style={lab}>
                Mise en page
                <select
                  style={inp}
                  value={theme.layout}
                  onChange={(e) => setTheme({ ...theme, layout: e.target.value as ThemeLayout })}
                >
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
                min={4}
                max={32}
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
                  ['coupleStory', '💑 Notre histoire'],
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
                  ['dressCode', 'Dress code'],
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
                <div key={hotel.id} style={{ border: '1px solid #ece8ff', borderRadius: 12, padding: '0.75rem' }}>
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
                <div key={q.id} style={{ border: '1px solid #ece8ff', borderRadius: 12, padding: '0.75rem' }}>
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

          {/* ── Histoire du couple ──────────────────────────────────────────── */}
          <section style={block}>
            <h2 style={h2}>💑 Notre histoire (timeline)</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Activez la section "Notre histoire" dans les sections, puis ajoutez les moments clés de votre histoire (rencontre, fiançailles, etc.).
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {(content.coupleStory ?? []).map((item, idx) => (
                <div key={item.id} style={{ border: '1px solid #ece8ff', borderRadius: 12, padding: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input style={inp} placeholder="Année (ex. 2019)" value={item.year} onChange={(e) => upsertStoryItem(idx, { year: e.target.value })} />
                    <input style={inp} placeholder="Emoji (ex. ❤️)" value={item.emoji ?? ''} onChange={(e) => upsertStoryItem(idx, { emoji: e.target.value })} />
                  </div>
                  <input style={{ ...inp, marginBottom: 8 }} placeholder="Titre (ex. Notre rencontre)" value={item.title} onChange={(e) => upsertStoryItem(idx, { title: e.target.value })} />
                  <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} placeholder="Description..." value={item.description} onChange={(e) => upsertStoryItem(idx, { description: e.target.value })} />
                  <button type="button" style={{ ...dangerInlineBtn, marginTop: 6 }} onClick={() => removeStoryItem(item.id)}>Supprimer</button>
                </div>
              ))}
            </div>
            <button type="button" style={ghostInlineBtn} onClick={addStoryItem}>+ Ajouter un moment</button>
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
                  <div key={def.type} style={{ border: `1px solid ${enabled ? '#a78bfa' : '#ece8ff'}`, borderRadius: 12, padding: '0.75rem', background: enabled ? '#faf5ff' : '#fff' }}>
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

          <section style={block}>
            <h2 style={h2}>Dress code</h2>
            <label style={lab}>
              Texte dress code
              <textarea
                style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                value={content.dressCode?.text ?? ''}
                onChange={(e) => setContent((c) => ({ ...c, dressCode: { ...(c.dressCode ?? { text: '', colors: [] }), text: e.target.value } }))}
              />
            </label>
            <label style={lab}>
              Couleurs suggérées (hex séparées par virgules)
              <input
                style={inp}
                value={(content.dressCode?.colors ?? []).join(', ')}
                onChange={(e) =>
                  setContent((c) => ({
                    ...c,
                    dressCode: {
                      ...(c.dressCode ?? { text: '', colors: [] }),
                      colors: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                    },
                  }))
                }
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
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b4fd6', margin: 0 }}>⚡ Modèles rapides</p>
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
                <div style={{ borderTop: '1px solid #ece8ff', marginTop: 4, paddingTop: 4 }} />
              </div>
            ) : null}

            {inviteLinks.map((link, idx) => {
              const previewSlug = draft.slug || 'votre-site';
              const token = link.token || '(sauvegarder pour générer)';
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/wedding/${previewSlug}/invite/${link.token}`;
              return (
                <div key={link.id} style={{ border: `1px solid ${link.token ? '#a3e635' : '#ece8ff'}`, borderRadius: 12, padding: '0.85rem', marginBottom: 10 }}>
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
                          style={{ marginLeft: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b4fd6', fontWeight: 700, fontSize: '0.8rem' }}
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
            {saving ? 'Enregistrement…' : 'Publier le mini-site'}
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
  border: '1px solid #ece8ff',
  boxShadow: '0 8px 28px rgba(91, 79, 214, 0.06)',
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
  border: '1px solid #dcd7f7',
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
  background: 'linear-gradient(120deg, #5b4fd6, #7c3aed)',
};

const footnote: CSSProperties = { fontSize: '0.8rem', opacity: 0.85, lineHeight: 1.45 };

const ghostInlineBtn: CSSProperties = {
  padding: '0.42rem 0.66rem',
  borderRadius: 9,
  border: '1px solid #d8d2f5',
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
