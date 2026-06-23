import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';

import type { WeddingSite } from '../types';

import { formatWeddingDate } from '../utils/date';
import { sectionLabels } from '../i18n';

import { cardStyleSurface } from './templateCardStyles';

type GrandparentsData = {
  grandfather?: string;
  grandmother?: string;
  paternalGrandfather?: string;
  paternalGrandmother?: string;
  maternalGrandfather?: string;
  maternalGrandmother?: string;
};

function GrandparentsBlock({ gp, color }: { gp?: GrandparentsData; color: string }) {
  if (!gp) return null;
  const names = [
    gp.grandfather || gp.paternalGrandfather,
    gp.grandmother || gp.paternalGrandmother,
    gp.maternalGrandfather,
    gp.maternalGrandmother,
  ].filter(Boolean);
  if (names.length === 0) return null;
  return (
    <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: `1px solid ${color}30` }}>
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5 }}>
        Grands-parents
      </p>
      {names.map((n, i) => (
        <p key={i} style={{ margin: '0.1rem 0', fontSize: '0.82rem', opacity: 0.75 }}>{n}</p>
      ))}
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
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function HeroMeta({ site }: { site: WeddingSite }) {
  const line = [formatWeddingDate(site.date, site.language), site.city, site.venue].filter(Boolean).join(' · ');
  const countdown = useCountdown(site.date);

  const hasBrideFamily = !!(site.content?.parentsBride?.father || site.content?.parentsBride?.mother);
  const hasGroomFamily = !!(site.content?.parentsGroom?.father || site.content?.parentsGroom?.mother);
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
      {(hasBrideFamily || hasGroomFamily) ? (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem' }}>
          {hasBrideFamily ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6 }}>
                Famille {site.content?.brideFamilyName?.trim() || site.brideName.split(' ').pop()}
              </p>
              {site.content!.parentsBride!.father ? (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.95rem', fontWeight: 600 }}>{site.content!.parentsBride!.father}</p>
              ) : null}
              {site.content!.parentsBride!.mother ? (
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', fontWeight: 600 }}>{site.content!.parentsBride!.mother}</p>
              ) : null}
              <GrandparentsBlock gp={site.content?.grandparentsBride} color={site.theme.primaryColor} />
            </div>
          ) : null}
          {hasBrideFamily && hasGroomFamily ? (
            <div style={{ width: 1, background: `${site.theme.primaryColor}40`, flexShrink: 0 }} />
          ) : null}
          {hasGroomFamily ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6 }}>
                Famille {site.content?.groomFamilyName?.trim() || site.groomName.split(' ').pop()}
              </p>
              {site.content!.parentsGroom!.father ? (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.95rem', fontWeight: 600 }}>{site.content!.parentsGroom!.father}</p>
              ) : null}
              {site.content!.parentsGroom!.mother ? (
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', fontWeight: 600 }}>{site.content!.parentsGroom!.mother}</p>
              ) : null}
              <GrandparentsBlock gp={site.content?.grandparentsGroom} color={site.theme.primaryColor} />
            </div>
          ) : null}
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

  const anchors = [
    site.sections.coupleStory ? { id: 'couple-story', label: L.coupleStory } : null,
    site.sections.program ? { id: 'program', label: L.program } : null,
    site.sections.jewishSection ? { id: 'jewish-section', label: L.jewishSection } : null,
    site.sections.location ? { id: 'location', label: L.location } : null,
    site.sections.accommodations ? { id: 'accommodations', label: L.accommodations } : null,
    site.sections.rsvp ? { id: 'rsvp', label: L.rsvp } : null,
    site.sections.faq ? { id: 'faq', label: L.faq } : null,
    site.sections.giftRegistry ? { id: 'gift-registry', label: L.giftRegistry } : null,
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

  if (!anchors.length) return null;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        transform: visible ? 'translateY(0)' : 'translateY(-105%)',
        transition: 'transform 220ms ease',
        backdropFilter: 'blur(8px)',
        background: `${site.theme.backgroundColor}dd`,
        borderBottom: `1px solid ${site.theme.primaryColor}30`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.72rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <a href="#top" style={{ textDecoration: 'none', color: site.theme.textColor, fontWeight: 700, letterSpacing: '0.05em' }}>
          {site.coupleName || `${site.brideName} & ${site.groomName}`}
        </a>
        <button
          type="button"
          className="wedding-mobile-nav-btn"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: 'none',
            border: `1px solid ${site.theme.primaryColor}66`,
            borderRadius: 10,
            background: 'transparent',
            padding: '0.35rem 0.55rem',
            color: site.theme.primaryColor,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
        <div className="wedding-nav-links" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {anchors.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              style={{ color: site.theme.textColor, textDecoration: 'none', fontSize: '0.87rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {a.label}
            </a>
          ))}
        </div>
      </div>
      {menuOpen ? (
        <div style={{ borderTop: `1px solid ${site.theme.primaryColor}22`, padding: '0.55rem 1rem 0.8rem' }} className="wedding-mobile-nav">
          {anchors.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              onClick={() => setMenuOpen(false)}
              style={{ display: 'block', marginTop: 8, textDecoration: 'none', color: site.theme.textColor }}
            >
              {a.label}
            </a>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

export function PublicAudioToggle({ site }: { site: WeddingSite }) {
  const url = site.content?.musicUrl?.trim();
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    ref.current = audio;
    return () => {
      audio.pause();
      ref.current = null;
    };
  }, [url]);

  if (!url) return null;

  const toggle = async () => {
    const audio = ref.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 80,
        border: `1px solid ${site.theme.primaryColor}66`,
        borderRadius: 999,
        padding: '0.55rem 0.8rem',
        background: `${site.theme.backgroundColor}ee`,
        color: site.theme.textColor,
        cursor: 'pointer',
        fontWeight: 700,
      }}
    >
      {playing ? '🔇' : '🔊'}
    </button>
  );
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
    blocks.push(
      <section id="program" key="program" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.program}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          <ProgramTimeline site={site} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: '0.75rem' }}>
            {photos.map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: t.borderRadius, overflow: 'hidden', background: `${t.primaryColor}10` }}>
                <img src={url} alt={`Photo ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
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

function ProgramTimeline({ site }: { site: WeddingSite }) {
  const events = (site.rsvpForm?.events ?? []).filter((e) => e.enabled);
  const days = Array.from(new Set(events.map((e) => e.dayLabel?.trim() || '').filter(Boolean)));
  const [activeDay, setActiveDay] = useState(days[0] ?? '');

  useEffect(() => {
    if (!days.length) return;
    if (!activeDay || !days.includes(activeDay)) setActiveDay(days[0]);
  }, [days, activeDay]);

  const visible = useMemo(() => {
    if (!days.length || !activeDay) return events;
    return events.filter((e) => (e.dayLabel?.trim() || '') === activeDay);
  }, [activeDay, days, events]);

  if (!events.length) {
    return <p style={{ margin: 0, opacity: 0.8 }}>Programme a venir.</p>;
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
                border: `1px solid ${site.theme.primaryColor}60`,
                borderRadius: 999,
                padding: '0.35rem 0.75rem',
                background: activeDay === day ? `${site.theme.secondaryColor}44` : '#fff',
                color: site.theme.textColor,
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
              <span style={{ width: 24, height: 24, borderRadius: 999, background: `${site.theme.primaryColor}20`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {ev.emojiIcon?.trim() || '•'}
              </span>
              {idx < visible.length - 1 ? <span style={{ marginTop: 4, width: 2, flex: 1, minHeight: 28, background: `${site.theme.primaryColor}30` }} /> : null}
            </div>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontWeight: 700 }}>{ev.label}</p>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', opacity: 0.9 }}>{[ev.time, ev.place].filter(Boolean).join(' · ') || 'Horaire a confirmer'}</p>
              {ev.shortDescription ? <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.84 }}>{ev.shortDescription}</p> : null}
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
  const target = new Date(isoDate).getTime();
  const diff = Math.max(0, target - now);
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
