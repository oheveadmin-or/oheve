import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const SAGE = '#A7AD9A';
const SAGE_LIGHT = '#edf2ec';
const MOKA = '#3d2e1f';
const MOKA_MID = '#6b5344';
const GOLD = '#b8965a';
const IVORY = '#faf8f3';
const IVORY_CARD = '#f5f0e8';
const SAND = '#ede8df';

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${IVORY}; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatOrn {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .ohv-badge    { animation: fadeUp 0.55s ease both; }
        .ohv-title    { animation: fadeUp 0.65s 0.12s ease both; }
        .ohv-sub      { animation: fadeUp 0.65s 0.24s ease both; }
        .ohv-meta     { animation: fadeUp 0.65s 0.36s ease both; }
        .ohv-cta-row  { animation: fadeUp 0.65s 0.48s ease both; }
        .ohv-orn      { animation: fadeUp 0.8s 0.6s ease both; }
        .ohv-features { animation: fadeUp 0.65s 0.7s ease both; }

        .ohv-btn-primary {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.85rem 2.1rem;
          background: ${SAGE}; color: #fff;
          border: none; border-radius: 50px;
          font-family: 'Inter', sans-serif; font-size: 0.97rem; font-weight: 600;
          text-decoration: none; cursor: pointer;
          box-shadow: 0 4px 18px rgba(122,153,117,0.32);
          transition: all 0.22s ease;
        }
        .ohv-btn-primary:hover {
          background: #6b8f66; transform: translateY(-2px);
          box-shadow: 0 8px 26px rgba(122,153,117,0.38);
        }
        .ohv-btn-ghost {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.85rem 1.8rem;
          background: transparent; color: ${MOKA_MID};
          border: 1.5px solid rgba(91,70,54,0.2); border-radius: 50px;
          font-family: 'Inter', sans-serif; font-size: 0.97rem; font-weight: 500;
          text-decoration: none; cursor: pointer;
          transition: all 0.22s ease;
        }
        .ohv-btn-ghost:hover {
          border-color: ${SAGE}; color: ${SAGE};
          background: ${SAGE_LIGHT}; transform: translateY(-2px);
        }
        .ohv-feat-card {
          background: #fff; border-radius: 20px;
          padding: 1.75rem 1.5rem;
          border: 1px solid rgba(91,70,54,0.08);
          box-shadow: 0 2px 16px rgba(61,46,31,0.05);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          text-align: left;
        }
        .ohv-feat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 36px rgba(61,46,31,0.1);
        }
        .ohv-orn svg { animation: floatOrn 5s ease-in-out infinite; }
        .ohv-orb-ring { animation: spinSlow 28s linear infinite; transform-origin: center; }

        @media (max-width: 640px) {
          .ohv-title  { font-size: 2.6rem !important; }
          .ohv-feat-grid { grid-template-columns: 1fr !important; }
          .ohv-hero-inner { padding: 4rem 1.25rem 2.5rem !important; }
          .ohv-cta-row { flex-direction: column !important; align-items: center !important; }
        }
      `}</style>

      <div style={{ background: IVORY, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

        {/* ─── NAV ──────────────────────────────────────────── */}
        <nav style={navStyle}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.1rem', fontWeight: 600, color: MOKA, letterSpacing: '0.06em' }}>
            OHEVE <span style={{ color: SAGE }}>WEDDING</span>
          </span>
          <Link to="/wedding/build" className="ohv-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Créer mon site →
          </Link>
        </nav>

        {/* ─── HERO ─────────────────────────────────────────── */}
        <section style={heroSection}>
          {/* Decorative background blobs */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-8%', width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${SAGE_LIGHT} 0%, transparent 70%)`, opacity: 0.6 }} />
            <div style={{ position: 'absolute', bottom: '5%', left: '-6%', width: 340, height: 340, borderRadius: '50%', background: `radial-gradient(circle, ${SAND} 0%, transparent 70%)`, opacity: 0.7 }} />
          </div>

          <div className="ohv-hero-inner" style={heroInner}>
            {/* Badge */}
            <div className="ohv-badge" style={badgeStyle}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: SAGE, display: 'inline-block' }} />
              Mariage · Site personnalisé · RSVP
            </div>

            {/* SVG ornament */}
            <div className="ohv-orn" style={{ marginBottom: '2.2rem' }}>
              <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
                {/* Outer ring */}
                <circle cx="55" cy="55" r="50" stroke={SAGE} strokeWidth="0.8" opacity="0.35" />
                <circle cx="55" cy="55" r="44" stroke={GOLD} strokeWidth="0.5" strokeDasharray="3 5" opacity="0.4" className="ohv-orb-ring" />
                {/* Inner decorations */}
                <circle cx="55" cy="55" r="36" stroke={SAGE} strokeWidth="0.8" opacity="0.25" />
                {/* Cardinal diamonds */}
                <polygon points="55,8 58,14 55,20 52,14" fill={SAGE} opacity="0.5" />
                <polygon points="55,90 58,96 55,102 52,96" fill={SAGE} opacity="0.5" />
                <polygon points="8,55 14,52 20,55 14,58" fill={SAGE} opacity="0.5" />
                <polygon points="90,55 96,52 102,55 96,58" fill={SAGE} opacity="0.5" />
                {/* Monogram */}
                <text x="55" y="62" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="26" fontWeight="300" fill={MOKA} textAnchor="middle" opacity="0.75">♡</text>
              </svg>
            </div>

            {/* Headline */}
            <h1 className="ohv-title" style={heroTitle}>
              Votre mariage,<br />
              <em style={{ fontStyle: 'italic', color: SAGE, fontWeight: 300 }}>votre histoire.</em>
            </h1>

            <p className="ohv-sub" style={heroSub}>
              Créez en quelques minutes un site de mariage élégant,<br />
              personnalisé et partageable avec vos invités.
            </p>

            {/* Meta features */}
            <div className="ohv-meta" style={metaRow}>
              {['12 styles de hero', '24 motifs', 'RSVP intégré', 'Mobile-first'].map((t) => (
                <span key={t} style={metaChip}>{t}</span>
              ))}
            </div>

            {/* CTA */}
            <div className="ohv-cta-row" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/wedding/build" className="ohv-btn-primary">
                Créer mon site gratuit
              </Link>
              <a href="#features" className="ohv-btn-ghost">
                Voir les fonctionnalités
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', opacity: 0.4 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.68rem', letterSpacing: '0.1em', color: MOKA_MID, textTransform: 'uppercase' }}>Découvrir</span>
            <div style={{ width: 1, height: 32, background: `linear-gradient(to bottom, ${MOKA_MID}, transparent)` }} />
          </div>
        </section>

        {/* ─── SEPARATOR ────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '0.5rem 0' }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${SAND})`, maxWidth: 120 }} />
          <svg width="24" height="24" viewBox="0 0 24 24"><polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" fill={GOLD} opacity="0.55" /></svg>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${SAND})`, maxWidth: 120 }} />
        </div>

        {/* ─── FEATURES ─────────────────────────────────────── */}
        <section id="features" className="ohv-features" style={featSection}>
          <div style={sectionLabel}>FONCTIONNALITÉS</div>
          <h2 style={sectionTitle}>Tout ce qu'il faut pour un site mariage premium</h2>
          <p style={sectionSub}>Conçu pour être beau dès le premier clic — sans coder, sans compromis.</p>

          <div className="ohv-feat-grid" style={featGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className="ohv-feat-card">
                <div style={{ fontSize: '1.8rem', marginBottom: '0.9rem' }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.22rem', fontWeight: 600, color: MOKA, marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9rem', color: MOKA_MID, lineHeight: 1.65, opacity: 0.85 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── PREVIEW STRIP ────────────────────────────────── */}
        <section style={previewSection}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={sectionLabel}>APERÇU EN DIRECT</div>
            <h2 style={{ ...sectionTitle, marginBottom: '1rem' }}>Chaque couple, un site unique</h2>
            <p style={{ ...sectionSub, marginBottom: '2.5rem' }}>
              Style de hero, motif de fond, séparateurs, cartes — tout se personnalise en temps réel.
            </p>
            <div style={previewCard}>
              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
                {['#ef4444','#f59e0b','#22c55e'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ background: IVORY_CARD, borderRadius: 14, padding: '2rem', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: `1.5px solid ${SAGE}`, margin: '0 auto 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: MOKA_MID }}>♡</span>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.6rem', fontWeight: 300, color: MOKA, marginBottom: '0.3rem' }}>Sarah & Léa</div>
                <div style={{ fontSize: '0.8rem', color: MOKA_MID, opacity: 0.7, letterSpacing: '0.08em' }}>17 SEPTEMBRE 2026 · PARIS</div>
                <div style={{ margin: '1.2rem auto', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  {['91 J', '23 H', '52 M'].map(v => (
                    <div key={v} style={{ background: '#fff', borderRadius: 10, padding: '0.5rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, color: MOKA, boxShadow: '0 2px 8px rgba(61,46,31,0.07)' }}>{v}</div>
                  ))}
                </div>
                <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${SAGE}, transparent)`, margin: '0.8rem auto' }} />
                <div style={{ fontSize: '0.8rem', color: SAGE, fontWeight: 500 }}>RSVP →</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ────────────────────────────────────── */}
        <section style={ctaSection}>
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" style={{ marginBottom: '1rem' }}>
              <polygon points="18,2 21,12 31,12 23,19 26,29 18,23 10,29 13,19 5,12 15,12" fill={GOLD} opacity="0.6" />
            </svg>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2.2rem', fontWeight: 300, color: MOKA, marginBottom: '0.8rem', lineHeight: 1.2 }}>
              Prêt à créer<br /><em style={{ fontStyle: 'italic', color: SAGE }}>votre site mariage ?</em>
            </h2>
            <p style={{ fontSize: '0.95rem', color: MOKA_MID, opacity: 0.75, marginBottom: '2rem', lineHeight: 1.6 }}>
              Gratuit, élégant, personnalisable à l'infini.
            </p>
            <Link to="/wedding/build" className="ohv-btn-primary" style={{ fontSize: '1.05rem', padding: '1rem 2.5rem' }}>
              Commencer maintenant →
            </Link>
          </div>
        </section>

        {/* ─── FOOTER ───────────────────────────────────────── */}
        <footer style={footerStyle}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontWeight: 600, letterSpacing: '0.08em', color: MOKA_MID }}>
            OHEVE <span style={{ color: SAGE }}>WEDDING</span>
          </span>
          <span style={{ fontSize: '0.78rem', color: MOKA_MID, opacity: 0.5 }}>www.ohevewedding.com</span>
        </footer>
      </div>
    </>
  );
}

/* ─── DATA ──────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: '🎨',
    title: 'Studio de Design',
    desc: '12 styles de hero, 24 motifs de fond, séparateurs SVG élégants. Chaque couple obtient un site visuellement unique.',
  },
  {
    icon: '💌',
    title: 'RSVP Intégré',
    desc: "Liens d'invitation par groupe d'invités. Gestion des confirmations avec multi-événements (houppa, henné, chabbat hatan…).",
  },
  {
    icon: '✡️',
    title: 'Identité Juive',
    desc: 'Versets hébraïques en arc, événements du mariage juif, support hébreu RTL, monogramme IA personnalisé.',
  },
  {
    icon: '📱',
    title: 'Mobile-First',
    desc: 'Optimisé pour les smartphones. Navigation flottante, compte à rebours, photos — parfait sur tous les écrans.',
  },
  {
    icon: '🖋️',
    title: 'Thèmes Premium',
    desc: '30+ presets visuels : Classique, Luxe, Art Déco, Oriental, Botanique, Cinéma… Changez en un clic.',
  },
  {
    icon: '⚡',
    title: 'Publication Instantanée',
    desc: 'Votre site est en ligne immédiatement sur votre URL personnalisée. Modifications en temps réel.',
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
  minHeight: '92vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const heroInner: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  maxWidth: 640,
  width: '100%',
  textAlign: 'center',
  padding: '5rem 2rem 4rem',
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
  color: SAGE,
  letterSpacing: '0.05em',
  marginBottom: '2rem',
  border: `1px solid rgba(122,153,117,0.2)`,
};

const heroTitle: CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: '3.4rem',
  fontWeight: 300,
  lineHeight: 1.15,
  color: MOKA,
  marginBottom: '1.2rem',
};

const heroSub: CSSProperties = {
  fontSize: '1.05rem',
  color: MOKA_MID,
  lineHeight: 1.7,
  opacity: 0.8,
  marginBottom: '1.8rem',
};

const metaRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  justifyContent: 'center',
  marginBottom: '2.2rem',
};

const metaChip: CSSProperties = {
  padding: '0.3rem 0.85rem',
  borderRadius: 50,
  fontSize: '0.78rem',
  color: MOKA_MID,
  background: '#fff',
  border: `1px solid rgba(91,70,54,0.12)`,
  fontWeight: 500,
};

const featSection: CSSProperties = {
  maxWidth: 1000,
  margin: '0 auto',
  padding: '4.5rem 1.5rem 5rem',
  textAlign: 'center',
};

const featGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1.25rem',
  textAlign: 'left',
};

const sectionLabel: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.15em',
  color: SAGE,
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
  opacity: 0.7,
  lineHeight: 1.6,
  marginBottom: '3rem',
};

const previewSection: CSSProperties = {
  background: IVORY_CARD,
  padding: '4.5rem 1.5rem',
  borderTop: `1px solid rgba(91,70,54,0.07)`,
  borderBottom: `1px solid rgba(91,70,54,0.07)`,
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

const ctaSection: CSSProperties = {
  padding: '5.5rem 1.5rem',
  textAlign: 'center',
};

const footerStyle: CSSProperties = {
  borderTop: `1px solid rgba(91,70,54,0.08)`,
  padding: '1.5rem 2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: IVORY_CARD,
};
