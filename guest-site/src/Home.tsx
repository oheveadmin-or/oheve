import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const SAGE = '#A7AD9A';
const SAGE_DEEP = '#8F947F';
const SAGE_LIGHT = '#edf2ec';
const MOKA = '#3d2e1f';
const MOKA_MID = '#6b5344';
const GOLD = '#b8965a';
const IVORY = '#faf8f3';
const IVORY_CARD = '#f5f0e8';
const SAND = '#ede8df';

const APP_STORE_URL = 'https://apps.apple.com/fr/app/oheve/id6785535857';
const INSTAGRAM_URL = 'https://www.instagram.com/ohevewedding';

/* ─── ICONES ────────────────────────────────────────────────────── */

function AppleGlyph({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.05 12.04c-.02-2.2 1.79-3.26 1.87-3.31-1.02-1.49-2.6-1.7-3.16-1.72-1.35-.14-2.63.79-3.31.79-.69 0-1.74-.77-2.86-.75-1.47.02-2.83.86-3.58 2.18-1.53 2.65-.39 6.57 1.1 8.72.73 1.05 1.6 2.23 2.75 2.19 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.95-1.08 2.68-2.14.84-1.22 1.19-2.4 1.21-2.46-.03-.01-2.31-.89-2.42-3.48zM14.88 5.5c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.3-.55.64-1.04 1.68-.91 2.67.97.08 1.95-.49 2.55-1.21z" />
    </svg>
  );
}

function InstagramGlyph({ size = 18, color = MOKA_MID }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill={color} stroke="none" />
    </svg>
  );
}

/* ─── BOUTONS RÉUTILISABLES ─────────────────────────────────────── */

function AppStoreButton({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="ohv-btn-store"
      style={compact ? { padding: '0.5rem 1.05rem' } : undefined}
    >
      <AppleGlyph size={compact ? 16 : 22} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
        {!compact && (
          <span style={{ fontSize: '0.62rem', opacity: 0.72, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Télécharger sur
          </span>
        )}
        <span style={{ fontSize: compact ? '0.84rem' : '1.02rem', fontWeight: 600 }}>App Store</span>
      </span>
    </a>
  );
}

function InstagramButton({ label = 'Suivre @ohevewedding' }: { label?: string }) {
  return (
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="ohv-btn-insta">
      <InstagramGlyph size={17} color="#fff" />
      {label}
    </a>
  );
}

/* ─── MAQUETTES IPHONE ──────────────────────────────────────────── */

function Phone({ children, label, lifted = false }: { children: React.ReactNode; label: string; lifted?: boolean }) {
  return (
    <div className="ohv-phone-wrap" style={{ transform: lifted ? 'translateY(-18px)' : undefined }}>
      <div className="ohv-phone">
        <div className="ohv-phone-notch" />
        <div className="ohv-phone-screen">{children}</div>
      </div>
      <div className="ohv-phone-label">{label}</div>
    </div>
  );
}

function ScreenHome() {
  return (
    <div style={{ padding: '1.8rem 0.9rem 1rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: MOKA }}>Sarah & Léa</div>
        <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', color: MOKA_MID, opacity: 0.6 }}>17 JUIN 2027 · PARIS</div>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
        {[['264', 'JOURS'], ['11', 'H'], ['42', 'MIN']].map(([v, u]) => (
          <div key={u} style={{ flex: 1, background: SAGE_LIGHT, borderRadius: 8, padding: '0.35rem 0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: MOKA }}>{v}</div>
            <div style={{ fontSize: '0.38rem', letterSpacing: '0.1em', color: SAGE_DEEP }}>{u}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 10, padding: '0.55rem 0.6rem', boxShadow: '0 1px 6px rgba(61,46,31,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: MOKA_MID, marginBottom: '0.3rem' }}>
          <span>Organisation</span><span style={{ fontWeight: 700, color: SAGE_DEEP }}>68 %</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: SAND }}>
          <div style={{ width: '68%', height: '100%', borderRadius: 4, background: SAGE }} />
        </div>
      </div>
      {[['✓', 'To-do list', '12 / 18'], ['€', 'Budget', '14 200 €'], ['☂', 'Météo du jour J', '24° soleil']].map(([ic, t, v]) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#fff', borderRadius: 10, padding: '0.45rem 0.55rem', boxShadow: '0 1px 6px rgba(61,46,31,0.05)' }}>
          <div style={{ width: 16, height: 16, borderRadius: 5, background: SAGE_LIGHT, color: SAGE_DEEP, fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ic}</div>
          <span style={{ flex: 1, fontSize: '0.52rem', color: MOKA }}>{t}</span>
          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: MOKA_MID }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenGuests() {
  const guests: [string, string, string][] = [
    ['R', 'Rachel Cohen', 'oui'],
    ['D', 'David Lévy', 'oui'],
    ['M', 'Myriam Attia', 'attente'],
    ['E', 'Élie Benhamou', 'oui'],
    ['N', 'Noa Zerbib', 'attente'],
  ];
  return (
    <div style={{ padding: '1.8rem 0.9rem 1rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: MOKA }}>Invités</span>
        <span style={{ fontSize: '0.48rem', color: SAGE_DEEP, fontWeight: 700 }}>184 confirmés</span>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {['Houppa', 'Henné', 'Chabbat'].map((c, i) => (
          <span key={c} style={{ fontSize: '0.44rem', padding: '0.2rem 0.4rem', borderRadius: 20, background: i === 0 ? SAGE : '#fff', color: i === 0 ? '#fff' : MOKA_MID, border: `1px solid ${i === 0 ? SAGE : 'rgba(91,70,54,0.14)'}` }}>{c}</span>
        ))}
      </div>
      {guests.map(([initial, name, state]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#fff', borderRadius: 10, padding: '0.42rem 0.5rem', boxShadow: '0 1px 6px rgba(61,46,31,0.05)' }}>
          <div style={{ width: 17, height: 17, borderRadius: '50%', background: SAGE_LIGHT, color: SAGE_DEEP, fontSize: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initial}</div>
          <span style={{ flex: 1, fontSize: '0.52rem', color: MOKA }}>{name}</span>
          <span style={{ fontSize: '0.42rem', fontWeight: 700, padding: '0.12rem 0.34rem', borderRadius: 20, background: state === 'oui' ? SAGE_LIGHT : '#fdf3e3', color: state === 'oui' ? SAGE_DEEP : GOLD }}>
            {state === 'oui' ? 'Présent' : 'En attente'}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.46rem', color: MOKA_MID, opacity: 0.6 }}>Import Excel · Lien RSVP par groupe</div>
    </div>
  );
}

function ScreenSeating() {
  return (
    <div style={{ padding: '1.8rem 0.9rem 1rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: MOKA }}>Plan de table</span>
        <span style={{ fontSize: '0.46rem', color: SAGE_DEEP, fontWeight: 700 }}>PDF</span>
      </div>
      <div style={{ background: '#fff', borderRadius: 10, padding: '0.5rem', boxShadow: '0 1px 6px rgba(61,46,31,0.05)' }}>
        <div style={{ height: 14, borderRadius: 4, background: SAGE_LIGHT, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4rem', letterSpacing: '0.1em', color: SAGE_DEEP }}>
          MARIÉS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div key={n} style={{ aspectRatio: '1', borderRadius: '50%', border: `1px solid ${n % 4 === 0 ? GOLD : SAGE}`, background: n % 4 === 0 ? '#fdf8ef' : SAGE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.55rem', color: MOKA }}>
              {n}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        {['12 tables', '184 places', '6 modèles'].map((t) => (
          <span key={t} style={{ flex: 1, textAlign: 'center', fontSize: '0.44rem', padding: '0.28rem 0', borderRadius: 7, background: '#fff', color: MOKA_MID, boxShadow: '0 1px 5px rgba(61,46,31,0.05)' }}>{t}</span>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.46rem', color: MOKA_MID, opacity: 0.6 }}>Panneaux d'accueil & marque-places exportables</div>
    </div>
  );
}

/* ─── PAGE ──────────────────────────────────────────────────────── */

export default function Home() {
  // Bannière App Store de Safari iOS — uniquement sur la page de présentation,
  // jamais sur les sites de mariage des couples.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'apple-itunes-app';
    meta.content = 'app-id=6785535857';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${IVORY}; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatOrn {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-7px); }
        }

        .ohv-badge    { animation: fadeUp 0.55s ease both; }
        .ohv-icon     { animation: fadeUp 0.6s 0.06s ease both; }
        .ohv-title    { animation: fadeUp 0.65s 0.14s ease both; }
        .ohv-sub      { animation: fadeUp 0.65s 0.24s ease both; }
        .ohv-meta     { animation: fadeUp 0.65s 0.34s ease both; }
        .ohv-cta-row  { animation: fadeUp 0.65s 0.44s ease both; }
        .ohv-phones   { animation: fadeUp 0.7s 0.5s ease both; }

        .ohv-app-icon { animation: floatOrn 6s ease-in-out infinite; }

        .ohv-btn-store {
          display: inline-flex; align-items: center; gap: 0.6rem;
          padding: 0.75rem 1.6rem;
          background: #211a14; color: #fff;
          border-radius: 50px; text-decoration: none;
          font-family: 'Inter', sans-serif;
          box-shadow: 0 6px 22px rgba(33,26,20,0.28);
          transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }
        .ohv-btn-store:hover {
          background: #362b22; transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(33,26,20,0.34);
        }
        .ohv-btn-insta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 50px; text-decoration: none;
          font-family: 'Inter', sans-serif; font-size: 0.93rem; font-weight: 600; color: #fff;
          background: linear-gradient(120deg, #b8965a 0%, #c77b7b 45%, #8f7fa8 100%);
          box-shadow: 0 6px 22px rgba(160,110,110,0.28);
          transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
        }
        .ohv-btn-insta:hover {
          transform: translateY(-2px); filter: saturate(1.1);
          box-shadow: 0 10px 30px rgba(160,110,110,0.34);
        }
        .ohv-btn-ghost {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.75rem 1.6rem;
          background: transparent; color: ${MOKA_MID};
          border: 1.5px solid rgba(91,70,54,0.2); border-radius: 50px;
          font-family: 'Inter', sans-serif; font-size: 0.93rem; font-weight: 500;
          text-decoration: none; cursor: pointer;
          transition: all 0.22s ease;
        }
        .ohv-btn-ghost:hover {
          border-color: ${SAGE}; color: ${SAGE_DEEP};
          background: ${SAGE_LIGHT}; transform: translateY(-2px);
        }
        .ohv-nav-insta {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid rgba(91,70,54,0.14); background: #fff;
          transition: all 0.22s ease;
        }
        .ohv-nav-insta:hover { border-color: ${SAGE}; background: ${SAGE_LIGHT}; }

        .ohv-feat-card {
          background: #fff; border-radius: 20px;
          padding: 1.6rem 1.4rem;
          border: 1px solid rgba(91,70,54,0.08);
          box-shadow: 0 2px 16px rgba(61,46,31,0.05);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          text-align: left;
        }
        .ohv-feat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 36px rgba(61,46,31,0.1);
        }

        /* ── Maquettes iPhone ── */
        .ohv-phone-row {
          display: flex; align-items: flex-end; justify-content: center;
          gap: 1.6rem; flex-wrap: wrap;
        }
        .ohv-phone-wrap { display: flex; flex-direction: column; align-items: center; }
        .ohv-phone {
          position: relative;
          width: 212px; height: 430px;
          border-radius: 36px;
          background: #221b15;
          padding: 7px;
          box-shadow: 0 18px 50px rgba(61,46,31,0.22), 0 2px 6px rgba(61,46,31,0.14);
        }
        .ohv-phone-screen {
          width: 100%; height: 100%;
          border-radius: 30px;
          background: ${IVORY};
          overflow: hidden;
          display: flex; flex-direction: column;
        }
        .ohv-phone-notch {
          position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
          width: 62px; height: 5px; border-radius: 6px;
          background: rgba(34,27,21,0.85); z-index: 2;
        }
        .ohv-phone-label {
          margin-top: 0.9rem; text-align: center;
          font-size: 0.74rem; letter-spacing: 0.1em; text-transform: uppercase;
          color: ${MOKA_MID}; opacity: 0.55; font-weight: 600;
        }

        @media (max-width: 860px) {
          .ohv-feat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ohv-phone-wrap { transform: none !important; }
        }
        @media (max-width: 640px) {
          .ohv-title  { font-size: 2.5rem !important; }
          .ohv-feat-grid { grid-template-columns: 1fr !important; }
          .ohv-hero-inner { padding: 3.5rem 1.25rem 2.5rem !important; }
          .ohv-cta-row { flex-direction: column !important; align-items: center !important; }
          .ohv-nav { padding: 0.8rem 1.1rem !important; }
          /* Maquettes : carrousel horizontal plutôt qu'une pile interminable */
          .ohv-phone-row {
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding: 0.5rem 0.25rem 1.5rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .ohv-phone-row::-webkit-scrollbar { display: none; }
          .ohv-phone-wrap { flex: 0 0 auto; scroll-snap-align: center; }
          .ohv-footer { flex-direction: column !important; gap: 1.1rem !important; text-align: center !important; }
          .ohv-insta-card { flex-direction: column !important; text-align: center !important; }
        }
      `}</style>

      <div style={{ background: IVORY, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

        {/* ─── NAV ──────────────────────────────────────────── */}
        <nav className="ohv-nav" style={navStyle}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.1rem', fontWeight: 600, color: MOKA, letterSpacing: '0.06em' }}>
            OHEVE <span style={{ color: SAGE }}>WEDDING</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="ohv-nav-insta" aria-label="Instagram Oheve">
              <InstagramGlyph size={17} />
            </a>
            <AppStoreButton compact />
          </div>
        </nav>

        {/* ─── HERO ─────────────────────────────────────────── */}
        <section style={heroSection}>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: '-12%', right: '-8%', width: 460, height: 460, borderRadius: '50%', background: `radial-gradient(circle, ${SAGE_LIGHT} 0%, transparent 70%)`, opacity: 0.65 }} />
            <div style={{ position: 'absolute', bottom: '0%', left: '-8%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${SAND} 0%, transparent 70%)`, opacity: 0.75 }} />
          </div>

          <div className="ohv-hero-inner" style={heroInner}>
            <div className="ohv-badge" style={badgeStyle}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: SAGE, display: 'inline-block' }} />
              Application iPhone · Wedding planner
            </div>

            {/* Icône de l'app */}
            <div className="ohv-icon" style={{ marginBottom: '1.6rem' }}>
              <img
                src="/app-icon.jpg"
                alt="Icône de l'application Oheve"
                className="ohv-app-icon"
                width={104}
                height={104}
                style={{ width: 104, height: 104, borderRadius: 26, boxShadow: '0 12px 34px rgba(61,46,31,0.18)', border: '1px solid rgba(91,70,54,0.08)' }}
              />
            </div>

            <h1 className="ohv-title" style={heroTitle}>
              Votre mariage,<br />
              <em style={{ fontStyle: 'italic', color: SAGE, fontWeight: 300 }}>dans une seule app.</em>
            </h1>

            <p className="ohv-sub" style={heroSub}>
              Oheve réunit votre to-do list, votre budget, vos invités, votre plan de table,
              votre site de mariage et votre annuaire de prestataires. Pensée pour les mariages
              juifs, ouverte à tous les couples.
            </p>

            <div className="ohv-meta" style={metaRow}>
              {['Gratuit', 'iPhone & iPad', 'RSVP en ligne', 'Plan de table PDF', 'Sans publicité'].map((t) => (
                <span key={t} style={metaChip}>{t}</span>
              ))}
            </div>

            <div className="ohv-cta-row" style={{ display: 'flex', gap: '0.9rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <AppStoreButton />
              <a href="#app" className="ohv-btn-ghost">Découvrir l'application</a>
            </div>
            <p style={{ fontSize: '0.78rem', color: MOKA_MID, opacity: 0.6 }}>
              Téléchargement gratuit · Connexion avec Apple, Google ou email
            </p>
          </div>
        </section>

        {/* ─── MAQUETTES ────────────────────────────────────── */}
        <section id="app" style={phoneSection}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 3rem' }}>
            <div style={sectionLabel}>L'APPLICATION</div>
            <h2 style={sectionTitle}>Tout votre mariage, au même endroit</h2>
            <p style={{ ...sectionSub, marginBottom: 0 }}>
              De la première to-do au plan de table imprimé, chaque étape se suit depuis votre téléphone.
            </p>
          </div>

          <div className="ohv-phones ohv-phone-row">
            <Phone label="Accueil"><ScreenHome /></Phone>
            <Phone label="Invités & RSVP" lifted><ScreenGuests /></Phone>
            <Phone label="Plan de table"><ScreenSeating /></Phone>
          </div>
        </section>

        {/* ─── SEPARATEUR ───────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${SAND})`, maxWidth: 120 }} />
          <svg width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" fill={GOLD} opacity="0.55" /></svg>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${SAND})`, maxWidth: 120 }} />
        </div>

        {/* ─── FONCTIONNALITES ──────────────────────────────── */}
        <section id="features" style={featSection}>
          <div style={sectionLabel}>FONCTIONNALITÉS</div>
          <h2 style={sectionTitle}>Ce que fait Oheve pour vous</h2>
          <p style={sectionSub}>Six mois d'organisation tiennent dans votre poche — sans tableur, sans papier perdu.</p>

          <div className="ohv-feat-grid" style={featGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className="ohv-feat-card">
                <div style={{ fontSize: '1.7rem', marginBottom: '0.8rem' }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.2rem', fontWeight: 600, color: MOKA, marginBottom: '0.45rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.88rem', color: MOKA_MID, lineHeight: 1.62, opacity: 0.85 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SITE DE MARIAGE ──────────────────────────────── */}
        <section style={previewSection}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={sectionLabel}>INCLUS DANS L'APP</div>
            <h2 style={{ ...sectionTitle, marginBottom: '1rem' }}>Votre site de mariage, en quelques minutes</h2>
            <p style={{ ...sectionSub, marginBottom: '2.5rem' }}>
              Plus de 30 thèmes, faire-part numériques, versets hébraïques, musique et galerie photos.
              Les réponses de vos invités remontent automatiquement dans l'application.
            </p>
            <div style={previewCard}>
              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
                {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ background: IVORY_CARD, borderRadius: 14, padding: '2rem', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: `1.5px solid ${SAGE}`, margin: '0 auto 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: MOKA_MID }}>♡</span>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.6rem', fontWeight: 300, color: MOKA, marginBottom: '0.3rem' }}>Sarah & Léa</div>
                <div style={{ fontSize: '0.8rem', color: MOKA_MID, opacity: 0.7, letterSpacing: '0.08em' }}>17 JUIN 2027 · PARIS</div>
                <div style={{ margin: '1.2rem auto', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {['264 J', '11 H', '42 M'].map((v) => (
                    <div key={v} style={{ background: '#fff', borderRadius: 10, padding: '0.5rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, color: MOKA, boxShadow: '0 2px 8px rgba(61,46,31,0.07)' }}>{v}</div>
                  ))}
                </div>
                <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${SAGE}, transparent)`, margin: '0.8rem auto' }} />
                <div style={{ fontSize: '0.8rem', color: SAGE_DEEP, fontWeight: 500 }}>RSVP →</div>
              </div>
            </div>
            <div style={{ marginTop: '2.2rem', display: 'flex', gap: '0.9rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <AppStoreButton />
              <Link to="/wedding/build" className="ohv-btn-ghost">Essayer le créateur de site</Link>
            </div>
          </div>
        </section>

        {/* ─── INSTAGRAM ────────────────────────────────────── */}
        <section style={{ padding: '4.5rem 1.5rem' }}>
          <div className="ohv-insta-card" style={instaCard}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ ...sectionLabel, marginBottom: '0.6rem' }}>INSTAGRAM</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.9rem', fontWeight: 300, color: MOKA, lineHeight: 1.2, marginBottom: '0.6rem' }}>
                Inspirations, coulisses<br />
                <em style={{ fontStyle: 'italic', color: SAGE }}>et vrais mariages.</em>
              </h2>
              <p style={{ fontSize: '0.93rem', color: MOKA_MID, opacity: 0.8, lineHeight: 1.6, marginBottom: '1.6rem' }}>
                Nouveaux thèmes, idées de décoration et nouveautés de l'app : tout est publié sur
                notre compte <strong style={{ fontWeight: 600 }}>@ohevewedding</strong>.
              </p>
              <InstagramButton />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', width: 240, flexShrink: 0 }}>
              {['♡', '✧', '❀', '◈', '✡', '❁', '✦', '♢', '❋'].map((g, i) => (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: 12,
                  background: i % 3 === 0 ? SAGE_LIGHT : i % 3 === 1 ? '#fdf8ef' : '#fff',
                  border: '1px solid rgba(91,70,54,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', color: i % 3 === 1 ? GOLD : SAGE_DEEP,
                }}>{g}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ────────────────────────────────────── */}
        <section style={ctaSection}>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" style={{ marginBottom: '1rem' }}>
              <polygon points="18,2 21,12 31,12 23,19 26,29 18,23 10,29 13,19 5,12 15,12" fill={GOLD} opacity="0.6" />
            </svg>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2.2rem', fontWeight: 300, color: MOKA, marginBottom: '0.8rem', lineHeight: 1.2 }}>
              Prêt à organiser<br /><em style={{ fontStyle: 'italic', color: SAGE }}>votre mariage ?</em>
            </h2>
            <p style={{ fontSize: '0.95rem', color: MOKA_MID, opacity: 0.75, marginBottom: '2rem', lineHeight: 1.6 }}>
              Téléchargez Oheve gratuitement et créez votre mariage en quelques minutes.
            </p>
            <div style={{ display: 'flex', gap: '0.9rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <AppStoreButton />
              <InstagramButton label="Nous suivre" />
            </div>
          </div>
        </section>

        {/* ─── FOOTER ───────────────────────────────────────── */}
        <footer className="ohv-footer" style={footerStyle}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontWeight: 600, letterSpacing: '0.08em', color: MOKA_MID }}>
            OHEVE <span style={{ color: SAGE }}>WEDDING</span>
          </span>
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={footerLink}>App Store</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={footerLink}>Instagram</a>
            <Link to="/privacy" style={footerLink}>Confidentialité</Link>
            <Link to="/cgu" style={footerLink}>CGU</Link>
            <Link to="/support" style={footerLink}>Support</Link>
            <a href="https://www.ohevewedding.com" style={footerLink}>www.ohevewedding.com</a>
            <span style={{ fontSize: '0.78rem', color: MOKA_MID, opacity: 0.5 }}>© 2026 Oheve</span>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ─── DATA ──────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: '✅',
    title: 'To-do list & rappels',
    desc: "Toutes les tâches d'un mariage, déjà prêtes et classées par échéance. Vous cochez, l'app vous rappelle le reste.",
  },
  {
    icon: '💰',
    title: 'Budget maîtrisé',
    desc: 'Budget détaillé par poste, acomptes et paiements suivis, reste à payer calculé en temps réel.',
  },
  {
    icon: '💌',
    title: 'Invités & RSVP',
    desc: "Import Excel de votre liste, liens d'invitation par groupe et réponses par événement : houppa, henné, chabbat hatan.",
  },
  {
    icon: '🪑',
    title: 'Plan de table',
    desc: 'Placez vos invités table par table, puis exportez en PDF : plan, panneaux d\'accueil et marque-places.',
  },
  {
    icon: '🌿',
    title: 'Site de mariage',
    desc: 'Un site élégant à partager avec vos invités, plus de 30 thèmes premium, faire-part numérique et galerie photos.',
  },
  {
    icon: '✡️',
    title: 'Pensée mariage juif',
    desc: 'Événements traditionnels, versets hébraïques, hébreu de droite à gauche, officiants et acte de mariage.',
  },
  {
    icon: '🤝',
    title: 'Annuaire de prestataires',
    desc: 'Traiteurs, photographes, DJ, salles : portfolios, avis et messagerie intégrée pour comparer sans quitter l\'app.',
  },
  {
    icon: '☀️',
    title: 'Le jour J',
    desc: 'Planning de la journée, calendrier partagé et météo du grand jour, pour n\'avoir plus qu\'à profiter.',
  },
];

/* ─── STYLES ────────────────────────────────────────────────────── */

const navStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.9rem 2rem',
  background: 'rgba(250,248,243,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(91,70,54,0.07)',
};

const heroSection: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const heroInner: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  maxWidth: 680,
  width: '100%',
  textAlign: 'center',
  padding: '4.5rem 2rem 4rem',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.4rem 1rem',
  background: SAGE_LIGHT,
  borderRadius: 50,
  fontSize: '0.78rem',
  fontWeight: 500,
  color: SAGE_DEEP,
  letterSpacing: '0.05em',
  marginBottom: '2rem',
  border: '1px solid rgba(122,153,117,0.2)',
};

const heroTitle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '3.3rem',
  fontWeight: 300,
  lineHeight: 1.15,
  color: MOKA,
  marginBottom: '1.2rem',
};

const heroSub: CSSProperties = {
  fontSize: '1.03rem',
  color: MOKA_MID,
  lineHeight: 1.7,
  opacity: 0.82,
  marginBottom: '1.7rem',
  maxWidth: 560,
  marginLeft: 'auto',
  marginRight: 'auto',
};

const metaRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  justifyContent: 'center',
  marginBottom: '2.1rem',
};

const metaChip: CSSProperties = {
  padding: '0.3rem 0.85rem',
  borderRadius: 50,
  fontSize: '0.78rem',
  color: MOKA_MID,
  background: '#fff',
  border: '1px solid rgba(91,70,54,0.12)',
  fontWeight: 500,
};

const phoneSection: CSSProperties = {
  background: IVORY_CARD,
  padding: '4.5rem 1.5rem 5rem',
  borderTop: '1px solid rgba(91,70,54,0.07)',
  borderBottom: '1px solid rgba(91,70,54,0.07)',
};

const featSection: CSSProperties = {
  maxWidth: 1080,
  margin: '0 auto',
  padding: '4.5rem 1.5rem 5rem',
  textAlign: 'center',
};

const featGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1.1rem',
  textAlign: 'left',
};

const sectionLabel: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.15em',
  color: SAGE_DEEP,
  textTransform: 'uppercase',
  marginBottom: '0.8rem',
};

const sectionTitle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '2.1rem',
  fontWeight: 300,
  color: MOKA,
  marginBottom: '0.75rem',
  lineHeight: 1.2,
};

const sectionSub: CSSProperties = {
  fontSize: '0.97rem',
  color: MOKA_MID,
  opacity: 0.72,
  lineHeight: 1.6,
  marginBottom: '3rem',
};

const previewSection: CSSProperties = {
  background: IVORY_CARD,
  padding: '4.5rem 1.5rem',
  borderTop: '1px solid rgba(91,70,54,0.07)',
  borderBottom: '1px solid rgba(91,70,54,0.07)',
};

const previewCard: CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: '1.5rem',
  boxShadow: '0 4px 32px rgba(61,46,31,0.08)',
  border: '1px solid rgba(91,70,54,0.07)',
  maxWidth: 380,
  margin: '0 auto',
  textAlign: 'left',
};

const instaCard: CSSProperties = {
  maxWidth: 880,
  margin: '0 auto',
  background: '#fff',
  borderRadius: 24,
  border: '1px solid rgba(91,70,54,0.08)',
  boxShadow: '0 4px 32px rgba(61,46,31,0.07)',
  padding: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '2.5rem',
};

const ctaSection: CSSProperties = {
  padding: '4.5rem 1.5rem 5.5rem',
  textAlign: 'center',
};

const footerStyle: CSSProperties = {
  borderTop: '1px solid rgba(91,70,54,0.08)',
  padding: '1.5rem 2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: IVORY_CARD,
  flexWrap: 'wrap',
  gap: '1rem',
};

const footerLink: CSSProperties = {
  fontSize: '0.78rem',
  color: MOKA_MID,
  opacity: 0.6,
  textDecoration: 'none',
};
