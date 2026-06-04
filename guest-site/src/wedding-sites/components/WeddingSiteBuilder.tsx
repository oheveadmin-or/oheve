import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { RSVPBuilder } from '@guest/rsvp/RSVPBuilder';
import { RSVPPreview } from '@guest/rsvp/RSVPPreview';
import { createDefaultRSVPForm, type RSVPForm } from '@guest/rsvp/types';
import { FONT_OPTIONS, STYLE_PRESETS } from '../data/weddingThemes';
import { createWeddingSite } from '../services/weddingSiteService';
import type {
  AccommodationItem,
  FAQItem,
  InviteLink,
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
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);

  const [{ date, time }, setDt] = useState(initialDate);

  const [groomName, setGroomName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [welcomeText, setWelcomeText] = useState('Nous avons hâte de célébrer ce jour avec vous.');
  const [mainText, setMainText] = useState('Merci de réserver cette date.');
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

  function applyQuiz(answers: StyleQuizAnswers) {
    const { theme: nt, sections: ns, languageHint } = buildThemeFromQuizAnswers(answers);
    setTheme(nt);
    setSections(ns);
    setLanguage(languageHint);
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
            <strong>/wedding/votre-slug</strong> (après déploiement ce sera votre domaine + ce chemin).
          </p>
          <Link to="/" style={{ fontSize: '0.92rem' }}>
            ← Retour
          </Link>
        </header>

        <form onSubmit={handleSubmit}>
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

            <WeddingStyleQuiz
              value={quiz ?? {}}
              onChange={setQuiz}
              onApply={applyQuiz}
            />
          </section>

          <section style={block}>
            <h2 style={h2}>Sections affichées</h2>
            <div style={checks}>
              {(
                [
                  ['hero', 'Accueil'],
                  ['program', 'Programme'],
                  ['location', 'Lieux'],
                  ['accommodations', 'Hébergements'],
                  ['rsvp', 'RSVP'],
                  ['faq', 'FAQ'],
                  ['gallery', 'Galerie'],
                  ['practicalInfo', 'Infos pratiques'],
                  ['guestMessage', 'Message aux invités'],
                  ['dressCode', 'Dress code'],
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
                    <input style={inp} placeholder="Nom" value={hotel.name} onChange={(e) => upsertAccommodation(idx, { name: e.target.value })} />
                    <input style={inp} placeholder="Adresse" value={hotel.address} onChange={(e) => upsertAccommodation(idx, { address: e.target.value })} />
                    <input style={inp} placeholder="Distance / durée" value={hotel.distanceOrDuration} onChange={(e) => upsertAccommodation(idx, { distanceOrDuration: e.target.value })} />
                    <input style={inp} placeholder="Google Maps URL" value={hotel.googleMapsUrl} onChange={(e) => upsertAccommodation(idx, { googleMapsUrl: e.target.value })} />
                    <input style={inp} placeholder="Booking URL" value={hotel.bookingUrl} onChange={(e) => upsertAccommodation(idx, { bookingUrl: e.target.value })} />
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
            <h2 style={h2}>🔗 Liens d'invitation par événement</h2>
            <p style={{ fontSize: '0.83rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
              Créez des liens personnalisés pour chaque groupe d'invités (ex. Mariage seul, Mariage + Chabbat Hatan, Henné seul…). Chaque lien filtre automatiquement les événements du formulaire RSVP.
            </p>

            {inviteLinks.map((link, idx) => (
              <div key={link.id} style={{ border: '1px solid #ece8ff', borderRadius: 12, padding: '0.75rem', marginBottom: 8 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    style={inp}
                    placeholder="Label (ex. Invités mariage uniquement)"
                    value={link.label}
                    onChange={(e) => {
                      const next = [...inviteLinks];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setInviteLinks(next);
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginBottom: 4 }}>
                    Événements inclus dans ce lien :
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
                        {ev.dayLabel ? ` — ${ev.dayLabel}` : ''}
                        {ev.time ? ` ${ev.time}` : ''}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    style={dangerInlineBtn}
                    onClick={() => setInviteLinks((l) => l.filter((_, i) => i !== idx))}
                  >
                    Supprimer ce lien
                  </button>
                </div>
              </div>
            ))}

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
              + Ajouter un lien d'invitation
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
