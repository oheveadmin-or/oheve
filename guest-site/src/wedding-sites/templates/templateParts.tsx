import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import type { WeddingSite } from '../types';

import { formatWeddingDate } from '../utils/date';
import { sectionLabels } from '../i18n';

import { cardStyleSurface } from './templateCardStyles';

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

export function HeroMeta({ site }: { site: WeddingSite }) {
  const line = [formatWeddingDate(site.date, site.language), site.city, site.venue].filter(Boolean).join(' · ');
  const countdown = useCountdown(site.date);

  return (
    <>
      <p style={{ margin: '0.5rem 0 0', fontSize: '1.05rem', fontWeight: 600, color: site.theme.primaryColor }}>
        {line}
      </p>
      <CountdownRow site={site} countdown={countdown} />
      {site.welcomeText ? (
        <p style={{ marginTop: '1.25rem', fontSize: '1.1rem', maxWidth: 520, marginInline: 'auto', lineHeight: 1.65 }}>
          {site.welcomeText}
        </p>
      ) : null}
      {site.content?.texts?.memorialText ? (
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.82, fontStyle: 'italic' }}>
          {site.content.texts.memorialText}
        </p>
      ) : null}
      {site.content?.texts?.familyText ? (
        <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', opacity: 0.92, lineHeight: 1.6 }}>
          {site.content.texts.familyText}
        </p>
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
    site.sections.program ? { id: 'program', label: L.program } : null,
    site.sections.location ? { id: 'location', label: L.location } : null,
    site.sections.accommodations ? { id: 'accommodations', label: L.accommodations } : null,
    site.sections.rsvp ? { id: 'rsvp', label: L.rsvp } : null,
    site.sections.faq ? { id: 'faq', label: L.faq } : null,
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
                <img src={venue.photoUrl} alt={venue.name || 'Lieu du mariage'} style={{ width: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'cover' }} />
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
    const hotels = site.content?.accommodations ?? [];
    if (hotels.length) {
      blocks.push(
        <section id="accommodations" key="accommodations" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
          <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.accommodations}</h2>
          <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
            {site.content?.accommodationsIntro ? <p style={{ marginTop: 0, lineHeight: 1.6 }}>{site.content.accommodationsIntro}</p> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {hotels.map((h) => (
                <article key={h.id} style={{ border: `1px solid ${t.primaryColor}25`, borderRadius: 12, padding: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.2rem', fontWeight: 700 }}>{h.name || 'Hébergement'}</p>
                  {h.address ? <p style={{ margin: '0 0 0.2rem', fontSize: '0.9rem' }}>{h.address}</p> : null}
                  {h.distanceOrDuration ? <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', opacity: 0.82 }}>{h.distanceOrDuration}</p> : null}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {h.googleMapsUrl ? <a href={h.googleMapsUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>Maps</a> : null}
                    {h.bookingUrl ? <a href={h.bookingUrl} target="_blank" rel="noreferrer" style={linkBtn(site)}>Reserver</a> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      );
    }
  }
  if (site.sections.rsvp) {
    blocks.push(
      <section id="rsvp" key="rsvp" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.rsvp}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem', textAlign: site.language === 'he' ? 'right' : 'center' }}>
          {site.rsvpForm?.introText ? <p style={{ marginTop: 0, lineHeight: 1.65 }}>{site.rsvpForm.introText}</p> : null}
          <Link
            to={`/wedding/${site.slug}/rsvp`}
            style={{
              border: `1px solid ${t.primaryColor}`,
              background: `${t.secondaryColor}44`,
              color: t.primaryColor,
              padding: '0.65rem 1.4rem',
              borderRadius: Math.max(8, t.borderRadius - 4),
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            {site.language === 'fr' ? 'Répondre' : site.language === 'he' ? 'אשרו' : 'Respond'}
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
    blocks.push(
      <section key="gal" className="wedding-fade-in" style={{ marginTop: '2.25rem' }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.gallery}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem', minHeight: 100, opacity: 0.85 }}>
          <p style={{ margin: 0 }}>{site.language === 'fr' ? 'Photos à venir' : site.language === 'he' ? 'תמונות בקרוב' : 'Photos coming soon'}</p>
        </div>
      </section>
    );
  }
  if (site.sections.practicalInfo) {
    blocks.push(
      <section key="info" className="wedding-fade-in" style={{ marginTop: '2.25rem' }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.practicalInfo}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          <p style={{ margin: 0, lineHeight: 1.65 }}>Parking · Hébergement · Dress code…</p>
        </div>
      </section>
    );
  }
  if (site.sections.guestMessage) {
    blocks.push(
      <section key="guest" className="wedding-fade-in" style={{ marginTop: '2.25rem' }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.guestMessage}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          <p style={{ margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{site.mainText || '—'}</p>
        </div>
      </section>
    );
  }
  if (site.sections.dressCode && site.content?.dressCode?.text) {
    blocks.push(
      <section id="dress-code" key="dressCode" className="wedding-fade-in" style={{ marginTop: '2.25rem', scrollMarginTop: 88 }}>
        <h2 style={{ fontSize: '0.95rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: t.primaryColor }}>{L.dressCode}</h2>
        <div style={{ ...useCard({ theme: t }), marginTop: '0.75rem' }}>
          <p style={{ marginTop: 0, lineHeight: 1.65 }}>{site.content.dressCode.text}</p>
          {!!site.content.dressCode.colors?.length && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {site.content.dressCode.colors.map((c, i) => (
                <span key={`${c}-${i}`} style={{ width: 24, height: 24, borderRadius: 999, background: c, border: '1px solid #ddd' }} />
              ))}
            </div>
          )}
        </div>
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
