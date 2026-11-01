/**
 * InvitationTemplate — modèle « Invitation animée ».
 *
 * L'invité arrive par l'ouverture (`InvitationOpening` : carte à son nom →
 * enveloppe → écran d'accueil), puis découvre ici une page par événement,
 * posée sur une grande fleur ivoire immobile :
 *   בס״ד · monogramme doré · TITRE · prénoms calligraphiés · date · lieu,
 *   puis un bandeau « Itinéraire ». Le mariage lui-même est la page du
 *   faire-part (familles, phrases, date hébraïque, lieu, photo du lieu).
 * Suivent les informations pratiques (sections existantes), la réponse
 * (formulaire RSVP existant, intégré) et la signature. Une barre d'onglets en
 * bas mène à chaque page et suit le défilement.
 *
 * Tout le contenu vient de `site` ; couleurs et polices du thème live via
 * `invitationTokens`. Les réglages sont dans l'étape « Invitation » du builder
 * (`theme.invitation`). Animations : CSS uniquement ; `prefers-reduced-motion`
 * les coupe toutes, le contenu reste toujours visible.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { GuestContact, JewishWeddingEvent, WeddingSite, WeddingTemplateProps } from '../types';
import { hebrewDateFromIso } from '../utils/hebrewDate';
import { parseEventDate, parseEventTime, sortEventsChronologically, weddingYear } from '../utils/eventOrder';
import { directionsLinks } from '../utils/directions';
import { frenchAt, placeQuery, weddingPlaces } from '../utils/places';
import { invitationTokens, shade } from '../themes/InvitationTheme';
import type { InvitationTokens } from '../themes/InvitationTheme';
import { HebrewVerseArc } from '../components/HebrewVerseArc';
import { EVENT_ICON_PATHS } from '../components/EventIcon';
import { WeddingRSVPForm } from '@guest/rsvp/WeddingRSVPForm';
import { createDefaultRSVPForm } from '@guest/rsvp/types';
import {
  FamilyColumnsRow,
  getFamilyColumns,
  InvitationDetails,
  InvitationThanks,
  PublicMusicButton,
  renderOptionalSections,
} from './templateParts';
import type { InvitationStyle } from './templateParts';
import { coupleNames, GoldMonogram, INVITATION_PARTS_CSS, IvoryBloom, prefersReducedMotion } from './invitationParts';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Textes de l'interface                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const STRINGS = {
  fr: {
    bsd: 'בס״ד',
    at: 'à',
    directions: 'Itinéraire',
    ceremonyTag: 'Houppa',
    receptionTag: 'Soirée',
    rsvpTitle: 'Merci de confirmer\nvotre présence',
    tabs: "Pages de l'invitation",
    mainTab: 'Mariage',
    answersTab: 'Réponses',
    and: 'et',
    questions: 'Pour toute question, contactez :',
    phrases: {
      mairie: 'Se diront « Oui »',
      henne: 'vous invitent à célébrer le Henné',
      'chabbat-hatan': 'vous invitent au Chabbat Hatan',
      brunch: 'vous convient au brunch du lendemain',
      'sheva-berakhot': 'vous invitent aux Sheva Berakhot',
    } as Partial<Record<JewishWeddingEvent['type'], string>>,
  },
  he: {
    bsd: 'בס״ד',
    at: 'בשעה',
    directions: 'הוראות הגעה',
    ceremonyTag: 'חופה',
    receptionTag: 'סעודה',
    rsvpTitle: 'נשמח לאישור\nהגעתכם',
    tabs: 'עמודי ההזמנה',
    mainTab: 'חתונה',
    answersTab: 'אישור הגעה',
    and: 'ו',
    questions: 'לכל שאלה ניתן לפנות אל:',
    phrases: {} as Partial<Record<JewishWeddingEvent['type'], string>>,
  },
  en: {
    bsd: 'בס״ד',
    at: 'at',
    directions: 'Directions',
    ceremonyTag: 'Ceremony',
    receptionTag: 'Reception',
    rsvpTitle: 'Kindly confirm\nyour attendance',
    tabs: 'Invitation pages',
    mainTab: 'Wedding',
    answersTab: 'Reply',
    and: 'and',
    questions: 'Any question? Contact:',
    phrases: {
      mairie: 'Will say “I do”',
    } as Partial<Record<JewishWeddingEvent['type'], string>>,
  },
};
type Strings = (typeof STRINGS)['fr'];

/* ────────────────────────────────────────────────────────────────────────── */
/*  Utilitaires                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

/** « 19h30 » à partir d'une heure saisie librement (sinon le texte tel quel) */
function prettyTime(raw?: string): string {
  const min = parseEventTime(raw);
  if (min === null) return raw?.trim() ?? '';
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

/** « Mercredi 18 novembre 2026 » si la date est reconnue, sinon le texte saisi */
function prettyDate(raw: string | undefined, lang: string, fallbackYear?: number): string {
  const key = parseEventDate(raw, fallbackYear);
  if (!key || key < 10000000) return raw?.trim() ?? '';
  const d = new Date(Math.floor(key / 10000), Math.floor((key % 10000) / 100) - 1, key % 100);
  const locale = lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-GB' : 'fr-FR';
  const s = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Date hébraïque (« 16 Kislev 5787 ») d'une date d'événement reconnue */
function hebrewDateOf(raw: string | undefined, fallbackYear?: number): { fr: string; he: string } {
  const key = parseEventDate(raw, fallbackYear);
  if (!key || key < 10000000) return { fr: '', he: '' };
  const iso = `${Math.floor(key / 10000)}-${String(Math.floor((key % 10000) / 100)).padStart(2, '0')}-${String(key % 100).padStart(2, '0')}`;
  const d = hebrewDateFromIso(iso);
  return { fr: d?.fr ?? '', he: d?.he ?? '' };
}

/** Numéro WhatsApp international (chiffres seuls) ; un 06… français devient 336… */
function whatsappNumber(raw: string): string {
  let n = raw.replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (/^0\d{9}$/.test(n)) n = `33${n.slice(1)}`;
  return n.replace(/\D/g, '');
}

function usableContacts(site: WeddingSite): GuestContact[] {
  return (site.content?.contacts ?? []).filter((c) => c.name.trim() && whatsappNumber(c.phone).length >= 8);
}

/** « La Mairie » → « Mairie » pour l'onglet */
function tabLabel(label: string): string {
  return label.replace(/^(la|le|les|l['’])\s*/i, '').trim() || label;
}

/** Lieu saisi en une ligne : « Salle, 12 rue …, Ville » → nom + adresse */
function splitPlace(place: string): { name: string; address: string } {
  const i = place.indexOf(',');
  if (i < 0) return { name: place.trim(), address: '' };
  return { name: place.slice(0, i).trim(), address: place.slice(i + 1).trim() };
}

/**
 * Apparition au défilement : les éléments `.ia-reveal` restent visibles tant
 * que le script n'a pas « armé » la racine (pas d'IntersectionObserver,
 * animations réduites, capture d'écran…) — jamais de contenu bloqué invisible.
 */
function useReveal(enabled: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      root?.removeAttribute('data-reveal');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );
    ioRef.current = io;
    root.setAttribute('data-reveal', 'on');
    return () => {
      io.disconnect();
      ioRef.current = null;
      root.removeAttribute('data-reveal');
    };
  }, [enabled]);

  // Les blocs apparus pendant l'édition (aperçu) sont observés à leur tour
  useEffect(() => {
    const io = ioRef.current;
    if (!io) return;
    rootRef.current?.querySelectorAll('.ia-reveal:not(.is-in)').forEach((el) => io.observe(el));
  });

  return rootRef;
}

/** Onglet actif : la page qui occupe le milieu de l'écran */
function useActivePage(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  const key = ids.join('|');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pages                                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

type IconKind = JewishWeddingEvent['type'] | 'main' | 'answers';

type Page = {
  id: string;
  tab: string;
  icon: IconKind;
  /** Événement du programme ; absent pour la page du faire-part */
  ev?: JewishWeddingEvent;
};

const MAIN_ID = 'ia-mariage';

function buildPages(site: WeddingSite, S: Strings): Page[] {
  // Une page par événement : c'est le principe de ce modèle, indépendamment
  // de la section « Programme » des autres thèmes.
  const events = (site.content?.jewishEvents ?? []).filter((e) => e.enabled);
  // La Houppa est le faire-part lui-même : pas de page en double
  const houppa = events.find((e) => e.type === 'houppa');
  const others = events.filter((e) => e !== houppa);
  // La carte du mariage (Houppa + soirée) d'abord, puis les autres
  // événements dans l'ordre chronologique.
  const ordered = sortEventsChronologically<JewishWeddingEvent>(others, (e) => e.date, (e) => e.time, weddingYear(site.date));
  return [
    { id: MAIN_ID, tab: S.mainTab, icon: 'main' as const },
    ...ordered.map((ev) => ({ id: `ia-${ev.id}`, tab: tabLabel(ev.label), icon: ev.type, ev })),
  ];
}

function Bsd({ tk, S }: { tk: InvitationTokens; S: Strings }) {
  if (!tk.effects.bsd) return null;
  return (
    <p className="ia-bsd" lang="he" dir="rtl">
      {S.bsd}
    </p>
  );
}

/** Prénoms empilés : « Léa / & / Noam » */
function StackedNames({ names, tk, as: Tag = 'p', heNames }: { names: string[]; tk: InvitationTokens; as?: 'p' | 'h1'; heNames?: string[] }) {
  if (!names.length) return null;
  const he = (i: number) =>
    heNames?.[i]?.trim() ? (
      <span className="ia-he-name" lang="he" dir="rtl">
        {heNames[i].trim()}
      </span>
    ) : null;
  return (
    <Tag className="ia-names" style={{ fontFamily: tk.fonts.script, fontSize: tk.sizes.names }}>
      <span>{names[0]}</span>
      {he(0)}
      {names[1] ? (
        <>
          <span className="ia-amp">&amp;</span>
          <span>{names[1]}</span>
          {he(1)}
        </>
      ) : null}
    </Tag>
  );
}

/** Prénoms hébreux dans l'ordre de `coupleNames` (mariée puis marié) */
function hebrewNames(site: WeddingSite): string[] {
  const bride = site.content?.brideNameHe?.trim() ?? '';
  const groom = site.content?.groomNameHe?.trim() ?? '';
  return coupleNames(site).length > 1 ? [bride, groom] : [bride || groom];
}

/** Bandeau pleine largeur : « Itinéraire … » puis Waze · Google Maps */
function DirectionsBand({ place, label, googleMapsUrl, wazeUrl, S }: { place: string; label: string; googleMapsUrl?: string; wazeUrl?: string; S: Strings }) {
  const links = directionsLinks(place, googleMapsUrl, wazeUrl);
  const items = [
    { href: links.waze, label: 'Waze' },
    { href: links.google, label: 'Google Maps' },
  ].filter((i): i is { href: string; label: string } => !!i.href);
  if (!items.length) return null;
  return (
    <div className="ia-band">
      <p className="ia-band-title">
        <PinIcon />
        <span>
          {S.directions}
          {label ? ` ${label}` : ''}
        </span>
      </p>
      <div className="ia-band-btns" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => (
          <a key={i.label} className="ia-band-btn" href={i.href} target="_blank" rel="noopener noreferrer">
            {i.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

function PageShell({ id, label, children, band }: { id: string; label: string; children: ReactNode; band?: ReactNode }) {
  return (
    <section id={id} aria-label={label} className="ia-page">
      <div className="ia-page-body ia-reveal">{children}</div>
      {band}
    </section>
  );
}

function EventPage({ page, site, tk, S }: { page: Page; site: WeddingSite; tk: InvitationTokens; S: Strings }) {
  const ev = page.ev!;
  const phrase = ev.description?.trim() || S.phrases[ev.type] || '';
  const date = prettyDate(ev.date, site.language, weddingYear(site.date));
  const hebDate = hebrewDateOf(ev.date, weddingYear(site.date));
  const time = prettyTime(ev.time);
  const place = splitPlace(ev.place ?? '');
  return (
    <PageShell
      id={page.id}
      label={ev.label}
      band={<DirectionsBand place={ev.place ?? ''} label={place.name} googleMapsUrl={ev.googleMapsUrl} wazeUrl={ev.wazeUrl} S={S} />}
    >
      <Bsd tk={tk} S={S} />
      <GoldMonogram site={site} tk={tk} size="min(16cqw, 84px)" />
      <h2 className="ia-title" style={{ fontSize: tk.sizes.title }}>
        {ev.label}
      </h2>
      {phrase ? <p className="ia-phrase">{phrase}</p> : null}
      {date ? <p className="ia-date">{date}</p> : null}
      {hebDate.fr ? <p className="ia-hebdate">{hebDate.fr}</p> : null}
      {hebDate.he ? (
        <p className="ia-hebdate-he" dir="rtl" lang="he">
          {hebDate.he}
        </p>
      ) : null}
      {time ? <p className="ia-time">{/^\d/.test(time) ? `${S.at} ${time}` : time}</p> : null}
      {place.name ? <p className="ia-place">{place.name}</p> : null}
      {place.address ? <p className="ia-address">{place.address}</p> : null}
    </PageShell>
  );
}

function MainPage({ site, tk, S }: { site: WeddingSite; tk: InvitationTokens; S: Strings }) {
  const names = coupleNames(site);
  const columns = getFamilyColumns(site);
  const familyText = site.content?.texts?.familyText?.trim();
  const venue = site.content?.venue;
  const placeName = venue?.name?.trim() || site.venue?.trim() || '';
  const { ceremony, reception } = weddingPlaces(site);
  const fr = site.language === 'fr' || !site.language;
  // « Itinéraire au Domaine des Calanques » ; avec une soirée ailleurs, chaque
  // bandeau dit de quel moment il s'agit (« Itinéraire Houppa · … »).
  const bandLabel = (name: string, tag: string) => {
    const where = name ? (fr ? frenchAt(name) : name) : '';
    return reception ? [tag, name].filter(Boolean).join(' · ') : where;
  };
  const bands = (
    <>
      {ceremony ? (
        <DirectionsBand place={placeQuery(ceremony)} label={bandLabel(ceremony.name, S.ceremonyTag)} googleMapsUrl={ceremony.googleMapsUrl} wazeUrl={ceremony.wazeUrl} S={S} />
      ) : null}
      {reception ? (
        <DirectionsBand place={placeQuery(reception)} label={bandLabel(reception.name, S.receptionTag)} googleMapsUrl={reception.googleMapsUrl} wazeUrl={reception.wazeUrl} S={S} />
      ) : null}
    </>
  );
  const phraseStyle: InvitationStyle = {
    text: tk.colors.ink,
    muted: tk.colors.muted,
    accent: tk.colors.ink,
    body: tk.fonts.body,
    display: tk.fonts.body,
    size: '1.08rem',
    dateSize: '1.55rem',
  };
  return (
    <PageShell id={MAIN_ID} label={S.mainTab} band={bands}>
      <Bsd tk={tk} S={S} />
      {site.content?.hebrewQuote?.trim() ? (
        <div style={{ width: '100%', marginBottom: '-0.4rem' }}>
          <HebrewVerseArc
            text={site.content.hebrewQuote}
            color={tk.colors.ink}
            dotColor={tk.colors.foil}
            font={`'Frank Ruhl Libre', 'Noto Serif Hebrew', ${tk.fonts.body}, serif`}
            width={500}
            rx={226}
            ry={66}
            maxFontSize={30}
            minFontSize={12}
            maxSpread={2.0}
          />
        </div>
      ) : null}
      <GoldMonogram site={site} tk={tk} size="min(20cqw, 104px)" />
      {columns.length ? (
        <div className="ia-families">
          <FamilyColumnsRow columns={columns} accent={tk.colors.foil} textColor={tk.colors.ink} titleFontFamily={tk.fonts.script} bodyFontFamily={tk.fonts.body} titleVariant="script" lineSize="0.98rem" hideTitles />
        </div>
      ) : null}
      {familyText ? <p className="ia-phrase">{familyText}</p> : null}
      <InvitationThanks site={site} s={phraseStyle} style={{ marginTop: '0.4rem' }} />
      {names.length ? (
        <StackedNames names={names} tk={tk} as="h1" heNames={hebrewNames(site)} />
      ) : (
        <h1 className="ia-title" style={{ fontSize: tk.sizes.title }}>
          {S.mainTab}
        </h1>
      )}
      <InvitationDetails site={site} s={phraseStyle} style={{ marginTop: '0.6rem', width: '100%' }} />
      {site.mainText?.trim() ? <p className="ia-phrase">{site.mainText.trim()}</p> : null}
      {venue?.photoUrl ? (
        <div className="ia-photo">
          <img src={venue.photoUrl} alt={placeName} loading="lazy" decoding="async" />
        </div>
      ) : null}
    </PageShell>
  );
}

/** Contacts des mariés : numéros cliquables et boutons WhatsApp */
function Contacts({ contacts, S }: { contacts: GuestContact[]; S: Strings }) {
  if (!contacts.length) return null;
  return (
    <div className="ia-contacts">
      <p className="ia-contacts-lead">{S.questions}</p>
      {contacts.map((c) => (
        <p key={c.id} className="ia-contact-line">
          {c.name.trim()} · <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone.trim()}</a>
        </p>
      ))}
      <div className="ia-wa-list">
        {contacts.map((c) => (
          <a key={c.id} className="ia-wa" href={`https://wa.me/${whatsappNumber(c.phone)}`} target="_blank" rel="noopener noreferrer">
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z" />
            </svg>
            <span>WhatsApp {c.name.trim()}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function RsvpPage({ site, S }: { site: WeddingSite; S: Strings }) {
  const form = site.rsvpForm ?? createDefaultRSVPForm(site.id);
  return (
    <section id="ia-reponses" aria-label={S.answersTab} className="ia-page">
      <Contacts contacts={usableContacts(site)} S={S} />
      <div className="ia-page-body ia-reveal">
        <h2 className="ia-rsvp-title">{S.rsvpTitle}</h2>
        <div className="ia-rsvp">
          <WeddingRSVPForm site={site} form={form} embedded />
        </div>
      </div>
    </section>
  );
}

/* ── Navigation en haut (réglage « Navigation des invités ») ─────────────── */

type NavLink = { id: string; label: string };

function scrollToPage(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/**
 * Barre du haut : prénoms + liens vers chaque page (horizontale), menu
 * déroulant (menu) ou prénoms seuls (minimale). La musique y prend place.
 */
function TopNav({ site, links, mode, tk, S }: { site: WeddingSite; links: NavLink[]; mode: 'horizontal' | 'hamburger' | 'minimal'; tk: InvitationTokens; S: Strings }) {
  const [open, setOpen] = useState(false);
  const names = coupleNames(site).join(' & ');
  const music = <PublicMusicButton site={site} color={tk.colors.foil} background="transparent" />;
  const go = (id: string) => {
    setOpen(false);
    scrollToPage(id);
  };
  return (
    <nav className="ia-top" aria-label={S.tabs}>
      <div className="ia-top-row">
        <a href="#top" className="ia-top-names" style={{ fontFamily: tk.fonts.script }} onClick={(e) => { e.preventDefault(); go('top'); }}>
          {names}
        </a>
        <div className="ia-top-actions">
          {music}
          {mode === 'hamburger' && links.length ? (
            <button type="button" className="ia-top-burger" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((v) => !v)}>
              {open ? '✕' : '☰'}
            </button>
          ) : null}
        </div>
      </div>
      {mode === 'horizontal' && links.length ? (
        <div className="ia-top-links">
          {links.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={(e) => { e.preventDefault(); go(l.id); }}>
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
      {mode === 'hamburger' && open ? (
        <div className="ia-top-drawer">
          {links.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={(e) => { e.preventDefault(); go(l.id); }}>
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

/* ── Onglets ─────────────────────────────────────────────────────────────── */

const ICONS = EVENT_ICON_PATHS;

function TabBar({ tabs, S }: { tabs: { id: string; label: string; icon: IconKind }[]; S: Strings }) {
  const active = useActivePage(tabs.map((t) => t.id));
  const go = scrollToPage;
  return (
    <nav className="ia-tabs" aria-label={S.tabs}>
      <div className="ia-tabs-inner">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className={`ia-tab${active === t.id ? ' is-active' : ''}`}
            aria-current={active === t.id ? 'location' : undefined}
            onClick={(e) => {
              e.preventDefault();
              go(t.id);
            }}
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONS[t.icon]} />
            </svg>
            <span>{t.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Template                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export function InvitationTemplate({ site }: WeddingTemplateProps) {
  const tk = invitationTokens(site.theme);
  const S = STRINGS[site.language] ?? STRINGS.fr;
  const dir = site.language === 'he' ? 'rtl' : 'ltr';
  const rootRef = useReveal(tk.effects.reveal);

  const names = coupleNames(site);
  const pages = buildPages(site, S);
  // Programme, lieu et réponse sont rendus ici ; le reste (hébergements, FAQ,
  // galerie, infos pratiques…) passe par les sections existantes.
  const delegated: WeddingSite = {
    ...site,
    sections: { ...site.sections, program: false, rsvp: false, location: false, jewishSection: false, hero: false, qrCode: false },
  };
  const surface = () => ({
    background: 'rgba(255,255,255,0.72)',
    border: `1px solid ${tk.colors.hairline}`,
    borderRadius: 3,
    boxShadow: `0 18px 40px -30px ${tk.colors.shadow}`,
    padding: '1.6rem 1.25rem',
  });

  const tabs = [
    ...pages.map((p) => ({ id: p.id, label: p.tab, icon: p.icon })),
    ...(site.sections.rsvp ? [{ id: 'ia-reponses', label: S.answersTab, icon: 'answers' as IconKind }] : []),
  ];

  // Pas de réglage = pas de barre en haut (les onglets du bas suffisent)
  const navMode = site.theme.navStyle && site.theme.navStyle !== 'none' ? site.theme.navStyle : null;

  const cssVars = {
    '--ia-paper': tk.colors.paper,
    '--ia-ink': tk.colors.ink,
    '--ia-muted': tk.colors.muted,
    '--ia-foil': tk.colors.foil,
    '--ia-hair': tk.colors.hairline,
    '--ia-shadow': tk.colors.shadow,
    '--ia-band': tk.colors.band,
    '--ia-band-ink': tk.colors.bandInk,
    '--ia-btn': tk.colors.button,
    '--ia-label': tk.fonts.label,
    '--ia-body': tk.fonts.body,
    '--ia-bar': `${tk.colors.paper}eb`,
    '--ia-tabs-h': '64px',
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      id="top"
      dir={dir}
      lang={site.language}
      className={`wedding-template-root ia-root${tk.effects.bottomBar && tabs.length > 1 ? ' has-tabs' : ''}${navMode ? ' has-top' : ''}`}
      style={{ ...cssVars, fontFamily: tk.fonts.body, color: tk.colors.ink, background: tk.colors.paper }}
    >
      <style>{INVITATION_CSS + INVITATION_PARTS_CSS}</style>

      {/* En tête du DOM : dans l'aperçu iPhone, elle est « collée » en bas par
          un sticky top (voir CSS .ia-tabs) */}
      {tk.effects.bottomBar && tabs.length > 1 ? <TabBar tabs={tabs} S={S} /> : null}

      {/* Fleur ivoire immobile derrière toutes les pages */}
      <div className="ia-bloom-layer" aria-hidden>
        <IvoryBloom tint={shade(tk.colors.paper, -0.07)} uid="page" className="ia-bloom" />
      </div>

      {navMode ? (
        <TopNav site={site} links={tabs.map((t) => ({ id: t.id, label: t.label }))} mode={navMode} tk={tk} S={S} />
      ) : (
        <div className="ia-music">
          <PublicMusicButton site={site} color={tk.colors.foil} background={`${tk.colors.paper}e6`} />
        </div>
      )}

      <main className="ia-pages">
        {pages.map((p) =>
          p.ev ? <EventPage key={p.id} page={p} site={site} tk={tk} S={S} /> : <MainPage key={p.id} site={site} tk={tk} S={S} />,
        )}

        {/* Hébergements, FAQ, galerie, infos pratiques… */}
        <div className="ia-page ia-delegated">{renderOptionalSections(delegated, surface as never)}</div>

        {site.sections.rsvp ? <RsvpPage site={site} S={S} /> : null}

        <footer className="ia-sign ia-reveal">
          <GoldMonogram site={site} tk={tk} size="min(14cqw, 72px)" />
          {names.length ? <p className="ia-sign-names">{names.join(` ${S.and} `)}</p> : null}
        </footer>
      </main>
    </div>
  );
}

export default InvitationTemplate;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Styles (préfixe .ia-)                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

const INVITATION_CSS = `
.ia-root {
  position: relative; min-height: 100vh; overflow-x: clip; text-align: center;
  font-variant-numeric: lining-nums;
  text-shadow: 0 0 10px var(--ia-paper), 0 0 3px var(--ia-paper);
}
.ia-bloom-layer {
  /* --ia-vh : hauteur d'écran fournie par l'aperçu iPhone du builder (où 100vh
     serait la fenêtre du navigateur et décentrerait la fleur) */
  position: sticky; top: 0; height: var(--ia-vh, 100svh); margin-bottom: calc(-1 * var(--ia-vh, 100svh)); z-index: 0;
  display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden;
}
.ia-bloom { width: min(112%, calc(0.92 * var(--ia-vh, 100svh)), 760px); aspect-ratio: 1; opacity: 0.55; }
.ia-music { position: sticky; top: 12px; height: 0; z-index: 1002; }
.ia-music > button { position: absolute; inset-inline-start: 14px; top: 0; box-shadow: 0 6px 16px -10px var(--ia-shadow); }

.ia-pages { position: relative; z-index: 1; }

.ia-top {
  position: sticky; top: 0; z-index: 61; text-shadow: none;
  background: var(--ia-bar); border-bottom: 1px solid var(--ia-hair);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.ia-top-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: min(560px, 100%); margin: 0 auto; padding: 8px 14px; min-height: 48px; box-sizing: border-box; }
.ia-top-names { color: var(--ia-ink); text-decoration: none; font-size: 1.45rem; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.ia-top-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.ia-top-actions > button { position: static !important; }
.ia-top-burger {
  border: 1px solid var(--ia-hair); border-radius: 3px; background: transparent; color: var(--ia-ink);
  width: 36px; height: 34px; font-size: 1rem; cursor: pointer;
}
.ia-top-links { display: flex; gap: 18px; justify-content: center; overflow-x: auto; scrollbar-width: none; padding: 0 14px 9px; }
.ia-top-links::-webkit-scrollbar { display: none; }
.ia-top-links a, .ia-top-drawer a {
  color: var(--ia-muted); text-decoration: none; font-family: var(--ia-label); font-weight: 600;
  font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; white-space: nowrap;
}
.ia-top-drawer { display: flex; flex-direction: column; border-top: 1px solid var(--ia-hair); width: min(560px, 100%); margin: 0 auto; }
.ia-top-drawer a { padding: 0.95rem 16px; text-align: center; }
.ia-top-drawer a + a { border-top: 1px solid var(--ia-hair); }
.ia-root.has-top .ia-page, .ia-root.has-top .ia-sign { scroll-margin-top: 64px; }
.ia-page {
  position: relative; width: min(560px, 100%); margin: 0 auto; padding: 3.2rem 0 0;
  container-type: inline-size;
}
.ia-page-body {
  display: flex; flex-direction: column; align-items: center; gap: 0.55rem;
  padding: 0 16px 2.4rem;
}
.ia-bsd { align-self: flex-start; margin: -1.6rem 0 0.2rem; font-family: 'Frank Ruhl Libre', serif; font-size: 0.82rem; color: var(--ia-muted); }
[dir="rtl"] .ia-bsd { align-self: flex-end; }
.ia-title {
  margin: 0.5rem 0 0; font-family: var(--ia-body); font-weight: 400; text-transform: uppercase;
  letter-spacing: 0.22em; padding-inline-start: 0.22em; line-height: 1.3; color: var(--ia-ink); overflow-wrap: anywhere;
}
.ia-names {
  margin: 0.2rem 0 0; display: flex; flex-direction: column; align-items: center; font-weight: 400;
  line-height: 1.12; color: var(--ia-ink); max-width: 100%; overflow-wrap: anywhere;
}
.ia-amp { font-size: 0.62em; line-height: 1; margin: 0.12em 0; color: var(--ia-foil); }
.ia-phrase { margin: 0.3rem 0 0; font-style: italic; font-size: 1.08rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-width: 30em; }
.ia-date { margin: 0.9rem 0 0; font-size: clamp(1.35rem, 6.6cqw, 1.7rem); line-height: 1.25; overflow-wrap: anywhere; }
.ia-time { margin: 0; font-size: clamp(1.2rem, 5.6cqw, 1.45rem); }
.ia-place { margin: 0.9rem 0 0; font-style: italic; font-size: 1.12rem; overflow-wrap: anywhere; }
.ia-address { margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--ia-muted); overflow-wrap: anywhere; }
.ia-families { width: 100%; margin-top: 0.4rem; }

.ia-band + .ia-band { border-top: 1px solid rgba(255,255,255,0.28); }
.ia-band { background: var(--ia-band); text-shadow: none; padding: 0.95rem 16px 1.1rem; color: var(--ia-band-ink); }
.ia-band-title {
  margin: 0 0 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  text-transform: uppercase; font-family: var(--ia-label); font-weight: 600; font-size: 11px; letter-spacing: 0.2em; overflow-wrap: anywhere;
}
.ia-band-btns { display: grid; gap: 8px; max-width: 460px; margin: 0 auto; }
.ia-band-btn {
  display: flex; align-items: center; justify-content: center; min-height: 40px; padding: 0.35rem 0.5rem;
  border: 1px solid rgba(255,255,255,0.75); border-radius: 999px; color: var(--ia-band-ink); text-decoration: none;
  font-family: var(--ia-label); font-weight: 600; font-size: 0.8rem; letter-spacing: 0.06em; transition: background 0.2s ease;
}
.ia-band-btn:hover { background: rgba(255,255,255,0.12); }
.ia-band-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.ia-hebdate-he { margin: 0 0 0.2rem; font-family: 'Frank Ruhl Libre', 'Noto Serif Hebrew', serif; font-size: 1.05rem; color: var(--ia-muted); }
.ia-hebdate { margin: 0.15rem 0 0.2rem; font-family: var(--ia-label); font-size: 0.74rem; letter-spacing: 0.3em; text-transform: uppercase; padding-inline-start: 0.3em; color: var(--ia-muted); }
.ia-he-name { font-family: 'Frank Ruhl Libre', 'Noto Serif Hebrew', serif; font-size: 0.42em; line-height: 1.3; color: var(--ia-muted); margin: 0.05em 0 0.1em; }
.ia-contacts { background: var(--ia-band); color: var(--ia-band-ink); text-align: center; padding: 1rem 16px 1.1rem; text-shadow: none; }
.ia-contacts-lead { margin: 0 0 0.4rem; font-style: italic; font-size: 0.98rem; }
.ia-contact-line { margin: 0.1rem 0; font-size: 0.98rem; }
.ia-contact-line a { color: inherit; }
.ia-wa-list { display: flex; flex-direction: column; margin-top: 0.7rem; border-top: 1px solid rgba(255,255,255,0.28); }
.ia-wa {
  display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.85rem 1rem;
  color: var(--ia-band-ink); text-decoration: none; text-transform: uppercase;
  font-family: var(--ia-label); font-weight: 600; font-size: 11px; letter-spacing: 0.2em;
}
.ia-wa + .ia-wa { border-top: 1px solid rgba(255,255,255,0.28); }
.ia-wa:hover { background: rgba(255,255,255,0.08); }
.ia-band-link {
  display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.95rem 1rem;
  color: var(--ia-band-ink); text-decoration: none; text-transform: uppercase;
  font-family: var(--ia-label); font-weight: 600; font-size: 11px; letter-spacing: 0.2em;
  transition: background 0.2s ease; overflow-wrap: anywhere;
}
.ia-band-link + .ia-band-link { border-top: 1px solid rgba(255,255,255,0.28); }
.ia-band-link:hover { background: rgba(255,255,255,0.08); }
.ia-band-link:focus-visible { outline: 2px solid #fff; outline-offset: -4px; }

.ia-photo { width: calc(100% + 32px); margin: 1.4rem -16px -2.4rem; aspect-ratio: 4 / 3; overflow: hidden; }
.ia-photo img { width: 100%; height: 100%; object-fit: cover; display: block; animation: ia-kenburns 18s ease-in-out infinite alternate; }
@keyframes ia-kenburns { from { transform: scale(1.04); } to { transform: scale(1.16) translate(-2%, -2%); } }

.ia-delegated { padding: 1rem 16px 0; text-align: start; text-shadow: none; }
.ia-delegated:empty { display: none; }

.ia-rsvp-title {
  margin: 0 0 0.6rem; font-family: var(--ia-body); font-weight: 400; text-transform: uppercase;
  font-size: clamp(1.2rem, 6cqw, 1.55rem); letter-spacing: 0.2em; line-height: 1.45; white-space: pre-line;
}
.ia-rsvp { width: 100%; max-width: 460px; text-align: start; text-shadow: none; }
.ia-rsvp form {
  background: transparent !important; border: 0 !important; box-shadow: none !important;
  backdrop-filter: none !important; padding: 0 !important; max-width: none !important;
  font-family: var(--ia-body); color: var(--ia-ink);
}
.ia-rsvp input:not([type="checkbox"]):not([type="radio"]), .ia-rsvp textarea, .ia-rsvp select {
  border-radius: 2px !important; background: rgba(255,255,255,0.85) !important; font-family: var(--ia-body);
}
.ia-rsvp button[type="submit"] {
  background: var(--ia-btn) !important; border-radius: 2px !important; margin-top: 1.2rem !important;
  font-family: var(--ia-label); font-weight: 600 !important; font-size: 0.72rem !important; letter-spacing: 0.25em !important;
  box-shadow: 0 10px 24px -12px var(--ia-shadow), inset 0 1px 0 rgba(255,255,255,0.25) !important;
}

.ia-sign { position: relative; padding: 3rem 16px 3.4rem; container-type: inline-size; }
.ia-sign-names {
  margin: 0.9rem 0 0; font-family: var(--ia-label); font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.3em; padding-inline-start: 0.3em; text-transform: uppercase; color: var(--ia-muted);
}

/* Pas de conteneur de requête sur la racine (chaque page a le sien) : dans
   Safari, un container-type fait de la racine le repère des position: fixed,
   et la barre d'onglets se retrouvait en bas du contenu, pas de l'écran. */
.wedding-template-root.ia-root { container-type: normal; }
.ia-root.has-tabs { padding-bottom: calc(var(--ia-tabs-h) + env(safe-area-inset-bottom)); }
/* Barre d'onglets toujours en bas de l'écran. Sur le site : fixed. Dans
   l'aperçu iPhone du builder (conteneur transformé par scale), fixed suivrait
   le défilement et Safari place mal un sticky bottom (échelle comptée deux
   fois) : on la colle donc par un sticky TOP décalé d'une hauteur d'écran. */
.ia-tabs {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; text-shadow: none;
  height: calc(var(--ia-tabs-h) + env(safe-area-inset-bottom)); box-sizing: border-box;
  background: var(--ia-bar); border-top: 1px solid var(--ia-hair);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 -10px 30px -18px var(--ia-shadow);
  padding-bottom: env(safe-area-inset-bottom);
}
.iphone-scroll .ia-tabs {
  position: sticky; top: calc(var(--ia-vh) - var(--ia-tabs-h)); bottom: auto;
  height: var(--ia-tabs-h); padding-bottom: 0; margin-bottom: calc(-1 * var(--ia-tabs-h));
}
.ia-tabs-inner {
  height: 100%; box-sizing: border-box; align-items: stretch;
  display: flex; gap: 6px; width: min(560px, 100%); margin: 0 auto; padding: 7px 8px;
  overflow-x: auto; scrollbar-width: none;
}
.ia-tabs-inner::-webkit-scrollbar { display: none; }
.ia-tab {
  flex: 1 0 64px; min-width: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  padding: 4px; border: 1px solid transparent; border-radius: 3px;
  color: var(--ia-muted); text-decoration: none; font-family: var(--ia-body); font-size: 0.74rem; line-height: 1.1;
  transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}
.ia-tab span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ia-tab.is-active { background: #fff; border-color: var(--ia-hair); color: var(--ia-ink); box-shadow: 0 4px 12px -8px var(--ia-shadow); }
.ia-tab:focus-visible { outline: 2px solid var(--ia-foil); outline-offset: 1px; }

/* Apparition au défilement — seulement une fois la racine armée par le script */
.ia-root[data-reveal="on"] .ia-reveal {
  opacity: 0; transform: translateY(28px);
  transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.ia-root[data-reveal="on"] .ia-reveal.is-in { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .ia-photo img { animation: none; }
  .ia-tab { transition: none; }
}
`;
