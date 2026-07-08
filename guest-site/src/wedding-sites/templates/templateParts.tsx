import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';

import type { WeddingSite } from '../types';

import { formatWeddingDate } from '../utils/date';
import { sectionLabels } from '../i18n';
import { deezerTrackId, resolveDeezerPreview } from '../data/musicSuggestions';

import { cardStyleSurface } from './templateCardStyles';

type GrandparentsData = {
  grandfather?: string;
  grandmother?: string;
  paternalGrandfather?: string;
  paternalGrandmother?: string;
  maternalGrandfather?: string;
  maternalGrandmother?: string;
};

// ─── Familles : colonnes libres, rendu partagé par tous les thèmes ───────────

export type ResolvedFamilyColumn = { title: string; lines: string[] };

const familyLastName = (full?: string) => (full ? full.trim().split(/\s+/).slice(-1)[0] : '');

function legacyFamilyColumn(
  parents: { father?: string; mother?: string; isDivorced?: boolean; titleStyle?: 'couple' | 'mr' | 'mme' } | undefined,
  gp: GrandparentsData | undefined,
  familyName: string | undefined,
  fallbackName: string,
): ResolvedFamilyColumn | null {
  const name = familyName?.trim() || familyLastName(parents?.father) || familyLastName(parents?.mother) || familyLastName(fallbackName);
  const lines: string[] = [];
  if (parents?.isDivorced) {
    if (parents.father) lines.push(`M. ${parents.father}`);
    if (parents.mother) lines.push(`Mme ${parents.mother}`);
  } else if (parents?.father || parents?.mother) {
    const style = parents?.titleStyle ?? 'couple';
    if (style === 'mr') lines.push(`M. ${name}`);
    else if (style === 'mme') lines.push(`Mme ${name}`);
    else if (name) lines.push(`M. et Mme ${name}`);
  }
  const gpNames = [
    gp?.grandfather || gp?.paternalGrandfather,
    gp?.grandmother || gp?.paternalGrandmother,
    gp?.maternalGrandfather,
    gp?.maternalGrandmother,
  ].filter(Boolean) as string[];
  lines.push(...gpNames);
  if (!lines.length) return null;
  return { title: name ? `Famille ${name}` : '', lines };
}

/**
 * Source unique des colonnes familles pour TOUS les templates :
 * `content.familyColumns` (colonnes libres du builder) en priorité, sinon
 * conversion des anciens champs parents/grands-parents des sites existants.
 */
export function getFamilyColumns(site: WeddingSite): ResolvedFamilyColumn[] {
  const c = site.content;
  if (!c) return [];
  const explicit = (c.familyColumns ?? [])
    .map((col) => ({
      title: col.title?.trim() ?? '',
      lines: (col.lines ?? []).map((l) => (l ?? '').trim()).filter(Boolean),
    }))
    .filter((col) => col.title || col.lines.length);
  if (explicit.length) return explicit;

  return [
    legacyFamilyColumn(c.parentsBride, c.grandparentsBride, c.brideFamilyName, site.brideName),
    legacyFamilyColumn(c.parentsGroom, c.grandparentsGroom, c.groomFamilyName, site.groomName),
  ].filter(Boolean) as ResolvedFamilyColumn[];
}

/**
 * Rendu commun : colonnes élégantes côte à côte, filet vertical entre elles.
 * Chaque thème passe ses polices/couleurs — la STRUCTURE est identique partout.
 */
export function FamilyColumnsRow({
  columns,
  accent,
  textColor,
  titleFontFamily,
  bodyFontFamily,
  titleVariant = 'caps',
  titleSize,
  lineSize = '0.95rem',
  hideTitles = false,
}: {
  columns: ResolvedFamilyColumn[];
  accent: string;
  textColor?: string;
  titleFontFamily?: string;
  bodyFontFamily?: string;
  /** caps : petites capitales espacées · script : calligraphie */
  titleVariant?: 'caps' | 'script';
  titleSize?: string;
  lineSize?: string;
  /** Masque les noms de famille (titres) tout en gardant la mise en page en colonnes */
  hideTitles?: boolean;
}) {
  if (!columns.length) return null;
  const titleStyle: CSSProperties =
    titleVariant === 'script'
      ? { fontFamily: titleFontFamily, fontSize: titleSize ?? '1.55rem', lineHeight: 1.15, margin: 0, color: textColor }
      : { fontFamily: titleFontFamily, fontSize: titleSize ?? '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.65, margin: 0, color: textColor };
  // Grille à colonnes fixes (jamais de flex-wrap) : avec 3-4 colonnes, une
  // colonne courte ne doit jamais retomber seule, centrée, sur sa propre
  // ligne — toutes les colonnes restent alignées sur une seule rangée et se
  // partagent l'espace disponible.
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        alignItems: 'stretch',
        gap: 'clamp(0.8rem, 3cqw, 2.5rem)',
      }}
    >
      {columns.map((col, i) => {
        const showTitle = !hideTitles && !!col.title;
        return (
          <div
            key={i}
            style={{
              textAlign: 'center',
              borderInlineStart: i > 0 ? `1px solid ${accent}40` : undefined,
              paddingInlineStart: i > 0 ? 'clamp(0.8rem, 3cqw, 1.25rem)' : undefined,
            }}
          >
            {showTitle ? <p style={titleStyle}>{col.title}</p> : null}
            <div style={{ marginTop: showTitle ? '0.45rem' : 0 }}>
              {col.lines.map((line, j) => (
                <p
                  key={j}
                  style={{ margin: '0.18rem 0', fontFamily: bodyFontFamily, fontSize: lineSize, fontWeight: 500, lineHeight: 1.55, color: textColor, overflowWrap: 'anywhere' }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionBlock({
  site,
  title,
  children,
}: {
  site: WeddingSite;
  title: string;
  children: ReactNode;
}) {
  const t = site.theme;
  return (
    <section
      className="wedding-fade-in"
      style={{ marginTop: '2.5rem', textAlign: site.language === 'he' ? 'right' : 'center' }}
    >
      <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.primaryColor, marginBottom: '1rem' }}>
        {title}
      </h2>
      <div style={cardStyleSurface({ theme: t })}>{children}</div>
    </section>
  );
}

export function HeroMonogram({ site }: { site: WeddingSite }) {
  const svg = site.content?.monogramSvg;
  if (!svg) return null;
  const isDataUrl = svg.startsWith('data:');
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
      {isDataUrl ? (
        <img src={svg} alt="Monogramme" style={{ maxHeight: 120, maxWidth: 240, objectFit: 'contain' }} />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  );
}

export function HeroMeta({ site }: { site: WeddingSite }) {
  const line = [formatWeddingDate(site.date, site.language), site.city, site.venue].filter(Boolean).join(' · ');
  const countdown = useCountdown(site.date);

  const familyColumns = getFamilyColumns(site);
  const hasMemorial = !!site.content?.texts?.memorialText?.trim();
  const hasFamilyText = !!site.content?.texts?.familyText?.trim();

  return (
    <>
      {/* Monogram hero */}
      <HeroMonogram site={site} />

      <p style={{ margin: '0.5rem 0 0', fontSize: '1.05rem', fontWeight: 600, color: site.theme.primaryColor }}>
        {line}
      </p>
      <CountdownRow site={site} countdown={countdown} />
      {site.welcomeText ? (
        <p style={{ marginTop: '1.25rem', fontSize: '1.1rem', maxWidth: 520, marginInline: 'auto', lineHeight: 1.65 }}>
          {site.welcomeText}
        </p>
      ) : null}
      {site.mainText ? (
        <p style={{ marginTop: '1rem', fontSize: '1.05rem', maxWidth: 560, marginInline: 'auto', lineHeight: 1.75, fontStyle: 'italic', opacity: 0.9 }}>
          {site.mainText}
        </p>
      ) : null}
      {hasMemorial ? (
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.82, fontStyle: 'italic' }}>
          {site.content!.texts!.memorialText}
        </p>
      ) : null}
      {hasFamilyText ? (
        <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', opacity: 0.92, lineHeight: 1.6 }}>
          {site.content!.texts!.familyText}
        </p>
      ) : null}
      {familyColumns.length ? (
        <div style={{ marginTop: '1.5rem' }}>
          <FamilyColumnsRow
            columns={familyColumns}
            accent={site.theme.primaryColor}
            textColor={site.theme.textColor}
            titleFontFamily={site.theme.titleFontFamily || site.theme.fontFamily}
            bodyFontFamily={site.theme.fontFamily}
          />
        </div>
      ) : null}
    </>
  );
}

export function renderOptionalSections(site: WeddingSite, useCard: typeof cardStyleSurface) {
  return <OptionalSections site={site} useCard={useCard} />;
}

export function PublicStickyNav({ site }: { site: WeddingSite }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const L = sectionLabels(site.language);
  const navStyle = site.theme.navStyle ?? 'horizontal';
  const t = site.theme;

  const hasAccommodations = site.sections.accommodations && (site.content?.accommodations ?? []).some((h) => !h.isShabbatHatan);
  const hasFaq = site.sections.faq && (site.content?.faq ?? []).length > 0;
  const hasLocation = site.sections.location && !!(site.content?.venue?.name || site.content?.venue?.address || site.venue || site.city);

  const anchors = [
    site.sections.coupleStory && (site.content?.coupleStory?.length ?? 0) > 0 ? { id: 'couple-story', label: L.coupleStory } : null,
    site.sections.program ? { id: 'program', label: L.program } : null,
    site.sections.jewishSection && (site.content?.jewishEvents ?? []).some((e) => e.enabled) ? { id: 'jewish-section', label: L.jewishSection } : null,
    hasLocation ? { id: 'location', label: L.location } : null,
    hasAccommodations ? { id: 'accommodations', label: L.accommodations } : null,
    site.sections.rsvp ? { id: 'rsvp', label: L.rsvp } : null,
    hasFaq ? { id: 'faq', label: L.faq } : null,
    site.sections.giftRegistry && site.content?.giftRegistry ? { id: 'gift-registry', label: L.giftRegistry } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 24) setVisible(true);
      else if (y > lastY.current + 6) setVisible(false);
      else if (y < lastY.current - 6) setVisible(true);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const coupleLabel = site.coupleName || `${site.brideName} & ${site.groomName}`;
  const navBase: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 60,
    transform: visible ? 'translateY(0)' : 'translateY(-105%)',
    transition: 'transform 220ms ease',
    backdropFilter: 'blur(8px)',
    background: `${t.backgroundColor}dd`,
    borderBottom: `1px solid ${t.primaryColor}30`,
  };

  // ── Minimal: couple name only, no links ──────────────────────────────────
  if (navStyle === 'minimal') {
    return (
      <nav style={navBase}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.72rem 1rem', textAlign: 'center' }}>
          <a href="#top" style={{ textDecoration: 'none', color: t.textColor, fontWeight: 700, letterSpacing: '0.08em' }}>
            {coupleLabel}
          </a>
        </div>
      </nav>
    );
  }

  // ── Hamburger: always burger button (desktop + mobile), opens drawer ──────
  if (navStyle === 'hamburger') {
    return (
      <nav style={navBase}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.72rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#top" style={{ textDecoration: 'none', color: t.textColor, fontWeight: 700, letterSpacing: '0.05em' }}>
            {coupleLabel}
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            style={{ border: `1px solid ${t.primaryColor}66`, borderRadius: 10, background: menuOpen ? `${t.primaryColor}18` : 'transparent', padding: '0.35rem 0.65rem', color: t.primaryColor, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen ? (
          <div style={{ borderTop: `1px solid ${t.primaryColor}22`, padding: '0.55rem 1rem 0.8rem', display: 'grid', gap: 4 }}>
            {anchors.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'block', padding: '0.45rem 0.5rem', textDecoration: 'none', color: t.textColor, fontSize: '0.9rem', letterSpacing: '0.06em' }}
              >
                {a.label}
              </a>
            ))}
          </div>
        ) : null}
      </nav>
    );
  }

  // ── Horizontal (default): links bar ──────────────────────────────────────
  if (!anchors.length) return null;

  return (
    <nav style={navBase}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.72rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <a
          href="#top"
          style={{
            textDecoration: 'none',
            color: t.textColor,
            fontWeight: 700,
            letterSpacing: '0.05em',
            // Nom du couple long : tronqué avec … au lieu de passer sous les liens
            flex: '0 1 auto',
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {coupleLabel}
        </a>
        <button
          type="button"
          className="wedding-mobile-nav-btn"
          onClick={() => setMenuOpen((v) => !v)}
          style={{ display: 'none', border: `1px solid ${t.primaryColor}66`, borderRadius: 10, background: 'transparent', padding: '0.35rem 0.55rem', color: t.primaryColor, fontWeight: 700, cursor: 'pointer' }}
        >
          ☰
        </button>
        <div className="wedding-nav-links" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end', flex: '0 0 auto' }}>
          {anchors.map((a) => (
            <a key={a.id} href={`#${a.id}`} style={{ color: t.textColor, textDecoration: 'none', fontSize: '0.87rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {a.label}
            </a>
          ))}
        </div>
      </div>
      {menuOpen ? (
        <div style={{ borderTop: `1px solid ${t.primaryColor}22`, padding: '0.55rem 1rem 0.8rem' }} className="wedding-mobile-nav">
          {anchors.map((a) => (
            <a key={a.id} href={`#${a.id}`} onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: 8, textDecoration: 'none', color: t.textColor }}>
              {a.label}
            </a>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

/**
 * Hook lecteur musique partagé. L'URL MP3 est pré-résolue au chargement :
 * iOS n'autorise `play()` que DANS le geste utilisateur — résoudre Deezer au
 * moment du clic faisait échouer la lecture en silence sur iPhone/iPad.
 */
function useMusicPlayer(url: string | undefined) {
  const trimmed = url?.trim() || '';
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);
  // `src` en RÉF (et pas seulement en state) : les écouteurs de geste capturent
  // une closure figée au montage (src encore nul). En lisant `srcRef.current`,
  // `startPlayback` voit TOUJOURS l'extrait à jour → la lecture démarre même si
  // l'extrait Deezer a été résolu APRÈS l'attache de l'écouteur (c'est le bug
  // « je sélectionne la musique mais je n'entends rien »).
  const srcRef = useRef<string | null>(null);
  // Intention d'autoplay : posée au 1er geste de l'invité. Si l'extrait n'est pas
  // encore résolu, on la retient et la lecture démarre dès qu'il l'est.
  const wantPlayRef = useRef(false);

  const startPlayback = () => {
    const s = srcRef.current;
    if (!s) return;
    if (!ref.current) {
      const audio = new Audio(s);
      audio.loop = true;
      ref.current = audio;
    }
    ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  useEffect(() => {
    ref.current?.pause();
    ref.current = null;
    setPlaying(false);
    wantPlayRef.current = false;
    srcRef.current = null;
    if (!trimmed) { setLoading(false); return; }
    const id = deezerTrackId(trimmed);
    if (id == null) { srcRef.current = trimmed; return; }
    let cancelled = false;
    setLoading(true);
    resolveDeezerPreview(id).then((resolved) => {
      if (cancelled) return;
      srcRef.current = resolved;
      setLoading(false);
      // Un geste a déjà demandé la lecture avant la résolution → on démarre.
      if (wantPlayRef.current && resolved) startPlayback();
    });
    return () => {
      cancelled = true;
      ref.current?.pause();
      ref.current = null;
    };
  }, [trimmed]);

  const toggle = () => {
    if (playing && ref.current) {
      ref.current.pause();
      setPlaying(false);
      wantPlayRef.current = false;
      return;
    }
    wantPlayRef.current = true;
    startPlayback();
  };

  /** Demande la lecture (autoplay) : joue maintenant si prêt, sinon dès que résolu. */
  const requestPlay = () => {
    if (playing) return;
    wantPlayRef.current = true;
    startPlayback();
  };

  return { hasMusic: !!trimmed, loading, playing, toggle, requestPlay };
}

/**
 * Lecteur musique INTÉGRÉ à la carte d'invitation (remplace l'ancien bouton
 * flottant qui sortait de l'écran) : pilule élégante ♫ aux couleurs du thème.
 */
export function InlineMusicPlayer({
  url,
  accent,
  textColor,
  fontFamily,
  style,
}: {
  url?: string;
  accent: string;
  textColor?: string;
  fontFamily?: string;
  style?: CSSProperties;
}) {
  const { hasMusic, loading, playing, toggle } = useMusicPlayer(url);
  if (!hasMusic) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: `1px solid ${accent}66`,
        borderRadius: 999,
        padding: '0.45rem 1.1rem',
        background: playing ? `${accent}1e` : 'transparent',
        color: textColor ?? accent,
        fontFamily,
        fontSize: '0.74rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 600,
        cursor: 'pointer',
        // Reste cliquable dans l'aperçu du builder (template en pointerEvents: none)
        pointerEvents: 'auto',
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: '0.95rem', lineHeight: 1 }}>{playing ? '❚❚' : '♫'}</span>
      {loading ? '…' : playing ? 'Pause' : 'Notre musique'}
    </button>
  );
}

/**
 * Musique SANS aucun élément visuel : la lecture démarre au premier geste de
 * l'invité (tap / scroll / clic), car les navigateurs interdisent l'autoplay
 * sans interaction. Ne rend rien. Actif AUSSI dans l'aperçu du builder pour que
 * le couple entende sa musique sur la carte pendant qu'il compose.
 */
export function HiddenAutoMusic({ url, enabled = true }: { url?: string; enabled?: boolean }) {
  const { hasMusic, playing, requestPlay } = useMusicPlayer(url);

  useEffect(() => {
    // Rien à faire tant que la lecture n'a pas démarré. Dès que `playing`
    // devient vrai, l'effet est ré-exécuté et retire les écouteurs.
    if (!enabled || !hasMusic || playing) return;
    // `requestPlay()` pose l'intention d'autoplay : la lecture démarre dès que
    // l'extrait Deezer est résolu, sans exiger un 2e geste de l'invité.
    const start = () => requestPlay();
    window.addEventListener('pointerdown', start);
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('keydown', start);
    window.addEventListener('scroll', start, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('keydown', start);
      window.removeEventListener('scroll', start);
    };
    // toggle est recréé à chaque rendu ; les autres deps suffisent à ré-armer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasMusic, playing, url]);

  return null;
}

/**
 * Musique du site : lecture AUTOMATIQUE, sans aucun bouton visible. Active aussi
 * dans l'aperçu du builder (le couple entend sa musique sur la carte). Conserve
 * le nom `PublicAudioToggle` pour les anciens templates qui l'importent déjà.
 */
export function PublicAudioToggle({ site }: { site: WeddingSite }) {
  return <HiddenAutoMusic url={site.content?.musicUrl} />;
}

function OptionalSections({ site, useCard }: { site: WeddingSite; useCard: typeof cardStyleSurface }) {
  const L = sectionLabels(site.language);
  const t = site.theme;
  const blocks: ReactNode[] = [];

  if (site.sections.coupleStory && site.content?.coupleStory?.length) {
    blocks.push(
      <section id="couple-story" key="couple-story" className="wedding-fade-in" style={{ marginTop: '2.5rem', scrollMarginTop: 88 }}>
        <SectionHeading label={L.coupleStory} color={t.primaryColor} theme={t} />
        <CoupleStoryTimeline site={site} />
      </section>
    );
  }

  if (site.sections.program) {
    const isVintage = t.style === 'vintage-blue';
    const progCardStyle: CSSProperties = isVintage
      ? {
          background: '#44597B',
          borderRadius: 22,
          padding: '2rem 1.6rem',
          boxShadow: '0 22px 60px -30px rgba(52,70,97,0.7)',
          marginTop: '0.75rem',
        }
      : { ...useCard({ theme: t }), marginTop: '0.75rem' };
    blocks.push(
      <section id="program" key="program" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.program}</h2>
        <div style={progCardStyle}>
          <ProgramTimeline site={site} isVintage={isVintage} />
        </div>
      </section>
    );
  }
  if (site.sections.location) {
    const venue = site.content?.venue;
    const hasVenue = !!(venue?.name || venue?.address || venue?.description || venue?.photoUrl || venue?.googleMapsUrl || venue?.wazeUrl);
    blocks.push(
      <section id="location" key="loc" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.location}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          {hasVenue ? (
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {venue?.photoUrl ? (
                <img src={venue.photoUrl} alt={venue.name || 'Lieu du mariage'} loading="lazy" style={{ width: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'cover' }} />
              ) : null}
              <p style={{ margin: 0, fontWeight: 700 }}>{venue?.name || site.venue || 'Lieu principal'}</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>{venue?.address || [site.venue, site.city].filter(Boolean).join(', ') || '—'}</p>
              {venue?.description ? <p style={{ margin: 0, lineHeight: 1.65, opacity: 0.9 }}>{venue.description}</p> : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {venue?.googleMapsUrl ? <a href={venue.googleMapsUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>Ouvrir dans Google Maps</a> : null}
                {venue?.wazeUrl ? <a href={venue.wazeUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>Ouvrir dans Waze</a> : null}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.7 }}>{[site.venue, site.city].filter(Boolean).join(', ') || '—'}</p>
          )}
        </div>
      </section>
    );
  }
  if (site.sections.accommodations) {
    const allHotels = site.content?.accommodations ?? [];
    const mainHotels = allHotels.filter((h) => !h.isShabbatHatan);
    const shabbatHotels = allHotels.filter((h) => h.isShabbatHatan);

    if (mainHotels.length) {
      blocks.push(
        <section id="accommodations" key="accommodations" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
          <SectionHeading label={L.accommodations} color={t.primaryColor} theme={t} />
          <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
            {site.content?.accommodationsIntro ? <p style={{ marginTop: 0, lineHeight: 1.6 }}>{site.content.accommodationsIntro}</p> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {mainHotels.map((h) => (
                <HotelCard key={h.id} hotel={h} site={site} />
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (shabbatHotels.length) {
      blocks.push(
        <section id="shabbat-accommodations" key="shabbat-accommodations" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
          <SectionHeading label="Hébergement Chabbat Hatan" color={t.primaryColor} theme={t} />
          <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {shabbatHotels.map((h) => (
                <HotelCard key={h.id} hotel={h} site={site} />
              ))}
            </div>
          </div>
        </section>
      );
    }
  }
  if (site.sections.jewishSection) {
    const jevents = (site.content?.jewishEvents ?? []).filter((e) => e.enabled);
    if (jevents.length) {
      blocks.push(
        <section id="jewish-section" key="jewish-section" className="wedding-fade-in" style={{ marginTop: '2.5rem', scrollMarginTop: 88 }}>
          <SectionHeading label={L.jewishSection} color={t.primaryColor} theme={t} />
          <JewishEventsSection site={site} events={jevents} useCard={useCard} />
        </section>
      );
    }
  }

  if (site.sections.rsvp) {
    blocks.push(
      <section id="rsvp" key="rsvp" className="wedding-fade-in" style={{ marginTop: '2.5rem', scrollMarginTop: 88 }}>
        <SectionHeading label={L.rsvp} color={t.primaryColor} theme={t} />
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem', textAlign: 'center' }}>
          {site.rsvpForm?.introText ? <p style={{ marginTop: 0, lineHeight: 1.65 }}>{site.rsvpForm.introText}</p> : null}
          <Link
            to={`/wedding/${site.slug}/rsvp`}
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.85rem 2.5rem',
              borderRadius: Math.max(8, t.borderRadius),
              background: t.primaryColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              boxShadow: `0 8px 24px ${t.primaryColor}44`,
              transition: 'transform 160ms',
            }}
          >
            {L.rsvpCta}
          </Link>
        </div>
      </section>
    );
  }
  if (site.sections.faq) {
    const faq = site.content?.faq ?? [];
    if (faq.length) {
      blocks.push(
        <section id="faq" key="faq" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
          <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.faq}</h2>
          <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
            <FAQAccordion site={site} items={faq} />
          </div>
        </section>
      );
    }
  }
  if (site.sections.gallery) {
    const photos = (site.content?.galleryPhotos ?? []).filter(Boolean);
    if (photos.length) {
      blocks.push(
        <section key="gal" className="wedding-fade-in" style={{ marginTop: '2.5rem' }}>
          <SectionHeading label={L.gallery} color={t.primaryColor} theme={t} />
          <PhotoGallery site={site} photos={photos} />
        </section>
      );
    }
  }

  if (site.sections.giftRegistry && site.content?.giftRegistry) {
    blocks.push(
      <section id="gift-registry" key="gift-registry" className="wedding-fade-in" style={{ marginTop: '2.5rem', scrollMarginTop: 88 }}>
        <SectionHeading label={L.giftRegistry} color={t.primaryColor} theme={t} />
        <GiftRegistrySection site={site} useCard={useCard} />
      </section>
    );
  }

  if (site.sections.guestMessage && site.content?.guestMessageText?.trim()) {
    blocks.push(
      <section key="guest" className="wedding-fade-in" style={{ marginTop: '2.5rem' }}>
        <SectionHeading label={L.guestMessage} color={t.primaryColor} theme={t} />
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          <p style={{ margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.05rem', fontStyle: 'italic' }}>{site.content.guestMessageText}</p>
        </div>
      </section>
    );
  }

  if (site.sections.dressCode && site.content?.dressCode?.text) {
    blocks.push(
      <section id="dress-code" key="dressCode" className="wedding-fade-in" style={{ marginTop: '2.5rem', scrollMarginTop: 88 }}>
        <SectionHeading label={L.dressCode} color={t.primaryColor} theme={t} />
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          <p style={{ marginTop: 0, lineHeight: 1.65 }}>{site.content.dressCode.text}</p>
          {!!site.content.dressCode.colors?.length && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {site.content.dressCode.colors.map((c, i) => (
                <div key={`${c}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 999, background: c, border: '2px solid #fff', boxShadow: '0 2px 8px #0002' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (site.sections.qrCode) {
    blocks.push(
      <section key="qr" className="wedding-fade-in" style={{ marginTop: '2.5rem', textAlign: 'center' }}>
        <SectionHeading label={L.qrCode} color={t.primaryColor} theme={t} />
        <QRCodeSection site={site} />
      </section>
    );
  }

  return blocks;
}

/**
 * Galerie éditoriale : mosaïque à colonnes (masonry), hauteurs naturelles,
 * la première photo mise en avant, lightbox plein écran avec navigation.
 */
export function PhotoGallery({ site, photos }: { site: WeddingSite; photos: string[] }) {
  const t = site.theme;
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? null : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, photos.length]);

  const radius = Math.max(4, t.borderRadius);

  return (
    <>
      {/* Mise en avant de la 1re photo quand il y en a ≥ 3 */}
      {photos.length >= 3 && (
        <button
          type="button"
          onClick={() => setLightbox(0)}
          style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', marginTop: '0.75rem' }}
        >
          <img
            src={photos[0]}
            alt="Photo 1"
            loading="lazy"
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', borderRadius: radius, boxShadow: `0 18px 50px -22px ${t.primaryColor}66` }}
          />
        </button>
      )}
      <div style={{ columns: '2 220px', columnGap: 10, marginTop: 10 }}>
        {(photos.length >= 3 ? photos.slice(1) : photos).map((url, i) => {
          const idx = photos.length >= 3 ? i + 1 : i;
          return (
            <button
              key={`${idx}-${url.slice(-16)}`}
              type="button"
              onClick={() => setLightbox(idx)}
              style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', marginBottom: 10, breakInside: 'avoid' }}
            >
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                loading="lazy"
                style={{ width: '100%', display: 'block', borderRadius: radius, boxShadow: `0 10px 30px -18px ${t.primaryColor}55`, transition: 'transform 0.3s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.015)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            </button>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(12,10,8,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}
        >
          <img
            src={photos[lightbox]}
            alt={`Photo ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '92cqw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 6, boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}
          />
          <button type="button" aria-label="Fermer" onClick={() => setLightbox(null)} style={lightboxBtn({ top: 14, right: 16 })}>✕</button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Précédente"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + photos.length) % photos.length); }}
                style={lightboxBtn({ left: 12, top: '50%', transform: 'translateY(-50%)' })}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Suivante"
                onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % photos.length); }}
                style={lightboxBtn({ right: 12, top: '50%', transform: 'translateY(-50%)' })}
              >
                ›
              </button>
            </>
          )}
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: '0.8rem', letterSpacing: '0.12em', opacity: 0.8 }}>
            {lightbox + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

function lightboxBtn(pos: CSSProperties): CSSProperties {
  return {
    position: 'absolute',
    ...pos,
    width: 42,
    height: 42,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '1.3rem',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

type TimelineItem = { id: string; label: string; time?: string; place?: string; date?: string; description?: string };

function ProgramTimeline({ site, isVintage = false }: { site: WeddingSite; isVintage?: boolean }) {
  // Source du programme : jewishEvents en priorité (la date qu'on y saisit est
  // affichée telle quelle, sans passer par le `dayLabel` dérivé des rsvpEvents
  // qui ne se mettait jamais à jour visuellement) — même logique que Stripes.
  const jewishEvts = (site.content?.jewishEvents ?? []).filter((e) => e.enabled);
  const events: TimelineItem[] = jewishEvts.length
    ? jewishEvts.map((e) => ({ id: e.id, label: e.label, time: e.time, place: e.place, date: e.date, description: e.description }))
    : (site.rsvpForm?.events ?? [])
        .filter((e) => e.enabled)
        .map((e) => ({ id: e.id, label: e.label, time: e.time, place: e.place, date: e.dayLabel, description: e.shortDescription }));
  const days = Array.from(new Set(events.map((e) => e.date?.trim() || '').filter(Boolean)));
  const [activeDay, setActiveDay] = useState(days[0] ?? '');

  useEffect(() => {
    if (!days.length) return;
    if (!activeDay || !days.includes(activeDay)) setActiveDay(days[0]);
  }, [days, activeDay]);

  const visible = useMemo(() => {
    if (!days.length || !activeDay) return events;
    return events.filter((e) => (e.date?.trim() || '') === activeDay);
  }, [activeDay, days, events]);

  // Couleurs adaptées au fond bleu vintage
  const textColor = isVintage ? '#F5F0E4' : site.theme.textColor;
  const mutedColor = isVintage ? '#C7C2B4' : `${site.theme.textColor}99`;
  const dotColor = isVintage ? '#D7D2C4' : site.theme.primaryColor;
  const lineColor = isVintage ? '#9FAFC466' : `${site.theme.primaryColor}30`;
  const btnActiveBg = isVintage ? 'rgba(255,255,255,0.18)' : `${site.theme.secondaryColor}44`;
  const btnBg = isVintage ? 'rgba(255,255,255,0.08)' : '#fff';

  if (!events.length) {
    return <p style={{ margin: 0, opacity: 0.8, color: textColor }}>Programme a venir.</p>;
  }

  return (
    <div>
      {days.length > 1 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              style={{
                border: `1px solid ${isVintage ? '#9FAFC466' : `${site.theme.primaryColor}60`}`,
                borderRadius: 999,
                padding: '0.35rem 0.75rem',
                background: activeDay === day ? btnActiveBg : btnBg,
                color: textColor,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {day}
            </button>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {visible.map((ev, idx) => (
          <article key={ev.id} style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: dotColor, display: 'inline-block', marginTop: 7, opacity: 0.85 }} />
              {idx < visible.length - 1 ? <span style={{ marginTop: 4, width: 2, flex: 1, minHeight: 28, background: lineColor }} /> : null}
            </div>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: textColor }}>{ev.label}</p>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', color: mutedColor }}>{[ev.date, ev.time, ev.place].filter(Boolean).join(' · ') || 'Horaire a confirmer'}</p>
              {ev.description ? <p style={{ margin: 0, fontSize: '0.9rem', color: mutedColor }}>{ev.description}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FAQAccordion({ site, items }: { site: WeddingSite; items: { id: string; question: string; answer: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((f, idx) => (
        <article key={f.id || idx} style={{ border: `1px solid ${site.theme.primaryColor}28`, borderRadius: 10, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setOpenIdx((p) => (p === idx ? null : idx))}
            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.62rem 0.75rem', fontWeight: 700, color: site.theme.textColor }}
          >
            {f.question || 'Question'}
          </button>
          {openIdx === idx ? <div style={{ padding: '0 0.75rem 0.75rem', lineHeight: 1.6, opacity: 0.92 }}>{f.answer || 'Reponse a venir.'}</div> : null}
        </article>
      ))}
    </div>
  );
}

function useCountdown(isoDate: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = isoDate ? new Date(isoDate).getTime() : NaN;
  const diff = !isNaN(target) ? Math.max(0, target - now) : 0;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function CountdownRow({ site, countdown }: { site: WeddingSite; countdown: { d: number; h: number; m: number; s: number } }) {
  const parts = [
    { label: site.language === 'fr' ? 'Jours' : site.language === 'he' ? 'ימים' : 'Days', value: String(countdown.d) },
    { label: site.language === 'fr' ? 'Heures' : site.language === 'he' ? 'שעות' : 'Hours', value: pad2(countdown.h) },
    { label: site.language === 'fr' ? 'Minutes' : site.language === 'he' ? 'דקות' : 'Minutes', value: pad2(countdown.m) },
    { label: site.language === 'fr' ? 'Secondes' : site.language === 'he' ? 'שניות' : 'Seconds', value: pad2(countdown.s) },
  ];
  const inline = `${parts[0].value} ${parts[0].label} ${parts[1].value}:${parts[2].value}:${parts[3].value}`;
  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ margin: '0 0 0.55rem', color: site.theme.primaryColor, letterSpacing: '0.14em', fontWeight: 700 }}>{inline}</p>
      <div className="wedding-countdown-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, maxWidth: 420, marginInline: 'auto' }}>
        {parts.map((p) => (
          <div key={p.label} style={{ border: `1px solid ${site.theme.primaryColor}3a`, borderRadius: 10, padding: '0.55rem 0.35rem', background: `${site.theme.secondaryColor}1a` }}>
            <div style={{ fontWeight: 800, color: site.theme.primaryColor }}>{p.value}</div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function linkBtn(site: WeddingSite): CSSProperties {
  return {
    border: `1px solid ${site.theme.primaryColor}55`,
    borderRadius: 10,
    padding: '0.4rem 0.65rem',
    textDecoration: 'none',
    color: site.theme.textColor,
    fontWeight: 600,
    fontSize: '0.84rem',
  };
}

function SectionHeading({ label, color, theme }: { label: string; color: string; theme?: WeddingSite['theme'] }) {
  const hs = theme?.heroStyle;

  // Magazine / editorial — left-aligned, bold rule
  if (hs === 'magazine' || hs === 'cinematic') {
    return (
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ width: 3, height: 22, background: color, borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: theme?.textColor ?? color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </h2>
      </div>
    );
  }

  // Art-deco / oriental — geometric diamonds
  if (hs === 'art-deco') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
          <div style={{ width: 24, height: 1, background: color, opacity: 0.7 }} />
          <div style={{ width: 5, height: 5, background: color, transform: 'rotate(45deg)', opacity: 0.8 }} />
          <h2 style={{ fontSize: '0.62rem', letterSpacing: '0.55em', textTransform: 'uppercase', color, margin: 0, fontWeight: 700 }}>
            {label}
          </h2>
          <div style={{ width: 5, height: 5, background: color, transform: 'rotate(45deg)', opacity: 0.8 }} />
          <div style={{ width: 24, height: 1, background: color, opacity: 0.7 }} />
        </div>
      </div>
    );
  }

  // Luxe / royal — diamond flanked gradient lines
  if (hs === 'luxe' || hs === 'royal') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', justifyContent: 'center', marginBottom: '0.55rem' }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${color}88)`, maxWidth: 80 }} />
          <div style={{ width: 5, height: 5, background: color, transform: 'rotate(45deg)', opacity: 0.85 }} />
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}88, transparent)`, maxWidth: 80 }} />
        </div>
        <h2 style={{ fontSize: '0.65rem', letterSpacing: '0.42em', textTransform: 'uppercase', color, margin: 0, fontWeight: 500 }}>
          {label}
        </h2>
      </div>
    );
  }

  // Letterpress / faire-part — italic serif with thin underline
  if (hs === 'letterpress' || hs === 'faire-part') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontStyle: 'italic', color: theme?.textColor ?? color, margin: '0 0 0.5rem', fontFamily: theme?.fontFamily, fontWeight: 500 }}>
          {label}
        </h2>
        <div style={{ width: 48, height: 1, background: color, margin: '0 auto', opacity: 0.4 }} />
      </div>
    );
  }

  // Garden / monogram — botanical flanked
  if (hs === 'garden' || hs === 'monogram') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2.5" fill={color} opacity="0.6"/><circle cx="7" cy="2" r="1.5" fill={color} opacity="0.45"/><circle cx="7" cy="12" r="1.5" fill={color} opacity="0.45"/><circle cx="2" cy="7" r="1.5" fill={color} opacity="0.45"/><circle cx="12" cy="7" r="1.5" fill={color} opacity="0.45"/></svg>
          <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.28em', textTransform: 'uppercase', color, margin: 0, fontWeight: 600 }}>
            {label}
          </h2>
          <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2.5" fill={color} opacity="0.6"/><circle cx="7" cy="2" r="1.5" fill={color} opacity="0.45"/><circle cx="7" cy="12" r="1.5" fill={color} opacity="0.45"/><circle cx="2" cy="7" r="1.5" fill={color} opacity="0.45"/><circle cx="12" cy="7" r="1.5" fill={color} opacity="0.45"/></svg>
        </div>
      </div>
    );
  }

  // Minimal / editorial / split — thin left-anchored line
  if (hs === 'minimal' || hs === 'editorial' || hs === 'split') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 18, height: 1, background: color, flexShrink: 0, opacity: 0.7 }} />
        <h2 style={{ fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color, margin: 0, fontWeight: 500 }}>
          {label}
        </h2>
      </div>
    );
  }

  // Default — centered underline (classic style)
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
      <h2
        style={{
          display: 'inline-block',
          fontSize: '0.82rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color,
          fontWeight: 700,
          margin: 0,
          paddingBottom: '0.5rem',
          borderBottom: `2px solid ${color}40`,
        }}
      >
        {label}
      </h2>
    </div>
  );
}

function CoupleStoryTimeline({ site }: { site: WeddingSite }) {
  const t = site.theme;
  const items = site.content?.coupleStory ?? [];
  return (
    <div style={{ position: 'relative', paddingLeft: 32, paddingRight: 8 }}>
      {/* vertical line */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          top: 10,
          bottom: 10,
          width: 2,
          background: `linear-gradient(to bottom, ${t.primaryColor}60, ${t.secondaryColor}40)`,
          borderRadius: 2,
        }}
      />
      {items.map((item, idx) => (
        <article
          key={item.id}
          className="wedding-fade-in"
          style={{ position: 'relative', marginBottom: idx < items.length - 1 ? '2rem' : 0 }}
        >
          {/* dot */}
          <div
            style={{
              position: 'absolute',
              left: -23,
              top: 6,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: t.primaryColor,
              border: `3px solid ${t.backgroundColor || '#fff'}`,
              boxShadow: `0 0 0 3px ${t.primaryColor}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}
          >
            {item.emoji ? <span style={{ fontSize: 11 }}>{item.emoji}</span> : null}
          </div>
          <div
            style={{
              background: `${t.secondaryColor}12`,
              border: `1px solid ${t.primaryColor}20`,
              borderRadius: t.borderRadius,
              padding: '1rem 1.1rem',
            }}
          >
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: t.primaryColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {item.year}
            </p>
            <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: '1rem', color: t.textColor }}>{item.title}</p>
            {item.description ? (
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: '0.93rem', opacity: 0.88 }}>{item.description}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function JewishEventsSection({
  site,
  events,
  useCard,
}: {
  site: WeddingSite;
  events: import('../types').JewishWeddingEvent[];
  useCard: typeof cardStyleSurface;
}) {
  const t = site.theme;
  return (
    <div style={{ display: 'grid', gap: '0.85rem', marginTop: '0.75rem' }}>
      {events.map((ev) => (
        <article
          key={ev.id}
          style={{
            ...useCard({ theme: t }),
          }}
        >
          <div>
            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '1rem' }}>{ev.label}</p>
            {(ev.date || ev.time) ? (
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.88rem', color: t.primaryColor, fontWeight: 600 }}>
                {[ev.date, ev.time].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {ev.place ? <p style={{ margin: '0 0 0.2rem', fontSize: '0.88rem', opacity: 0.85 }}>{ev.place}</p> : null}
            {ev.description ? <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.88 }}>{ev.description}</p> : null}
            {(ev.googleMapsUrl || ev.wazeUrl) ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {ev.googleMapsUrl ? (
                  <a href={ev.googleMapsUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>📍 Google Maps</a>
                ) : null}
                {ev.wazeUrl ? (
                  <a href={ev.wazeUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>🚗 Waze</a>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function HotelCard({ hotel: h, site }: { hotel: import('../types').AccommodationItem; site: WeddingSite }) {
  const t = site.theme;
  return (
    <article style={{ border: `1px solid ${t.primaryColor}25`, borderRadius: 12, padding: '0.85rem', display: 'grid', gap: '0.3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 700, flex: 1 }}>🏨 {h.name || 'Hébergement'}</p>
        {h.stars ? (
          <span style={{ fontSize: '0.75rem', color: t.primaryColor }}>{'★'.repeat(Math.min(h.stars, 5))}</span>
        ) : null}
      </div>
      {h.address ? <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.85 }}>{h.address}</p> : null}
      {h.description ? <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, opacity: 0.82 }}>{h.description}</p> : null}
      {h.distanceOrDuration ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: t.primaryColor, fontWeight: 600 }}>{h.distanceOrDuration}</p>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
        {h.googleMapsUrl ? <a href={h.googleMapsUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>📍 Maps</a> : null}
        {h.wazeUrl ? <a href={h.wazeUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>🚗 Waze</a> : null}
        {h.phone ? <a href={`tel:${h.phone}`} style={linkBtn(site)}>📞 Appeler</a> : null}
        {h.bookingUrl ? (
          <a href={h.bookingUrl} target="_blank" rel="noreferrer" style={{ ...linkBtn(site), background: t.primaryColor, color: '#fff', borderColor: t.primaryColor }}>
            Réserver
          </a>
        ) : null}
      </div>
    </article>
  );
}

function GiftRegistrySection({ site, useCard }: { site: WeddingSite; useCard: typeof cardStyleSurface }) {
  const t = site.theme;
  const reg = site.content?.giftRegistry;
  if (!reg) return null;
  return (
    <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem', textAlign: 'center' }}>
      {reg.introText ? (
        <p style={{ margin: '0 0 1.25rem', lineHeight: 1.7, fontSize: '1rem', fontStyle: 'italic' }}>{reg.introText}</p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {reg.externalUrl ? (
          <a
            href={reg.externalUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.75rem 1.5rem',
              borderRadius: t.borderRadius,
              border: `1px solid ${t.primaryColor}60`,
              color: t.textColor,
              textDecoration: 'none',
              fontWeight: 600,
              background: `${t.secondaryColor}18`,
              fontSize: '0.92rem',
            }}
          >
            🛍️ Voir la liste de cadeaux
          </a>
        ) : null}
        {reg.cagnotteUrl ? (
          <a
            href={reg.cagnotteUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.75rem 1.5rem',
              borderRadius: t.borderRadius,
              background: t.primaryColor,
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              boxShadow: `0 6px 20px ${t.primaryColor}44`,
              fontSize: '0.92rem',
            }}
          >
            🎁 {reg.cagnotteLabel || 'Participer à la cagnotte'}
          </a>
        ) : null}
      </div>
      {reg.bankTransferInfo ? (
        <details style={{ marginTop: '1.25rem', textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: t.primaryColor }}>
            Virement bancaire
          </summary>
          <pre style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.7, opacity: 0.88, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {reg.bankTransferInfo}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function QRCodeSection({ site }: { site: WeddingSite }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: { dark: site.theme.primaryColor, light: '#ffffff00' },
    })
      .then(setDataUrl)
      .catch(() => null);
  }, [url, site.theme.primaryColor]);

  if (!dataUrl) return null;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', marginTop: '0.5rem' }}>
      <div
        style={{
          padding: 16,
          borderRadius: site.theme.borderRadius,
          border: `1px solid ${site.theme.primaryColor}25`,
          background: '#fff',
          boxShadow: `0 8px 32px ${site.theme.primaryColor}14`,
        }}
      >
        <img src={dataUrl} alt="QR Code du site" width={160} height={160} />
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7, maxWidth: 220, lineHeight: 1.5 }}>
        {site.language === 'fr'
          ? 'Scannez ce QR code pour accéder au site depuis votre téléphone'
          : site.language === 'he'
          ? 'סרקו את הקוד לכניסה לאתר'
          : 'Scan to open this wedding site on your phone'}
      </p>
      <a
        href={dataUrl}
        download={`${site.slug}-qrcode.png`}
        style={{
          fontSize: '0.82rem',
          color: site.theme.primaryColor,
          fontWeight: 600,
          textDecoration: 'none',
          border: `1px solid ${site.theme.primaryColor}50`,
          borderRadius: 8,
          padding: '0.35rem 0.75rem',
        }}
      >
        ⬇ Télécharger
      </a>
    </div>
  );
}
