import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import './presentation.css';

/*
 * /presentation — la présentation globale OHEVE (PDF) transformée en page
 * interactive, à partager aux prestataires depuis Instagram.
 */

const IMG = '/presentation';
const APP_STORE_URL = 'https://apps.apple.com/fr/app/oheve/id6785535857';
const INSTAGRAM_URL = 'https://www.instagram.com/ohevewedding';
const CONTACT_EMAIL = 'support@ohevewedding.com';

const SECTIONS = [
  { id: 'qui', label: 'Qui sommes-nous ?' },
  { id: 'problematique', label: 'Problématique' },
  { id: 'solution', label: 'La solution' },
  { id: 'pourquoi', label: 'Pourquoi OHEVE ?' },
  { id: 'univers', label: "L'univers OHEVE" },
  { id: 'positionnement', label: 'Positionnement' },
  { id: 'fonctionnalites', label: 'Fonctionnalités' },
  { id: 'finance', label: 'Projection financière' },
  { id: 'parcours', label: "Parcours de l'utilisateur" },
  { id: 'creation', label: 'Création & juridique' },
  { id: 'acquisition', label: "Stratégie d'acquisition" },
  { id: 'fidelisation', label: 'Fidélisation' },
  { id: 'vision', label: 'OHEVE dans 5 ans' },
  { id: 'conclusion', label: 'Conclusion' },
] as const;

const css = (vars: Record<string, string | number>) => vars as CSSProperties;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/* ─── Petits composants ─────────────────────────────────────────── */

/** Titre dont chaque mot remonte derrière un masque. */
function Split({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="pz-split" style={css({ '--d': `${delay}s` })}>
      {text.split(' ').map((w, i) => (
        <span key={i}>
          <span style={css({ '--i': i })}>{w}</span>
        </span>
      ))}
    </span>
  );
}

function Kicker({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="pz-kicker" data-reveal>
      {String(n).padStart(2, '0')} — {children}
    </div>
  );
}

function Photo({ src, alt, className = '', delay = 0 }: { src: string; alt: string; className?: string; delay?: number }) {
  return (
    <div className={`pz-curtain ${className}`} style={css({ '--d': `${delay}s` })}>
      <img src={`${IMG}/${src}`} alt={alt} loading="lazy" decoding="async" />
    </div>
  );
}

/** Carte qui s'incline vers la souris (desktop uniquement). */
function Tilt({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.classList.add('is-hover');
    el.style.setProperty('--ry', `${(x - 0.5) * 14}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('is-hover');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };
  return (
    <div ref={ref} className={`pz-tilt ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/** Déclenche `true` la première fois que l'élément entre dans l'écran. */
function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold]);
  return [ref, inView] as const;
}

function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp01((now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6L6 18',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  handshake: 'M3 12l4-4 4 2 3-3 7 7-3 3-4-3-2 2-3-1zM7 8l-4 4',
  gift: 'M4 11h16v9H4zM2 7h20v4H2zM12 7v13M12 7c-1.5-3-5-3-5 0M12 7c1.5-3 5-3 5 0',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
  crown: 'M3 7l4 4 5-6 5 6 4-4-2 12H5z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
};

/* ─── Sections ──────────────────────────────────────────────────── */

function Hero() {
  return (
    <header className="pz-hero" id="top">
      <img className="pz-hero-shadow is-a" src={`${IMG}/ombre-feuillage.png`} alt="" aria-hidden="true" />
      <img className="pz-hero-shadow is-b" src={`${IMG}/ombre-feuillage.png`} alt="" aria-hidden="true" />
      <div className="pz-hero-inner">
        <h1 className="pz-hero-word" aria-label="OHEVE">
          {'OHEVE'.split('').map((l, i) => (
            <span key={i} style={css({ '--i': i })} aria-hidden="true">
              {l}
            </span>
          ))}
        </h1>
        <p className="pz-hero-tag">Application de Mariage</p>
        <p className="pz-hero-meta">Présentation globale · Attia Odaya &amp; Layani Rachel</p>
      </div>
      <button className="pz-scroll-cue" onClick={() => scrollToId('sommaire')}>
        Découvrir
        <i />
      </button>
    </header>
  );
}

function Sommaire() {
  return (
    <section className="pz-section" id="sommaire">
      <div className="pz-wrap" style={{ textAlign: 'center' }}>
        <h2 className="pz-title is-center" style={{ textTransform: 'none' }}>
          <Split text="Sommaire" />
        </h2>
        <p className="pz-sub" data-reveal>
          Table des matières
        </p>
      </div>
      <div className="pz-toc">
        {SECTIONS.map((s, i) => (
          <button key={s.id} className="pz-toc-item" data-reveal style={css({ '--d': `${(i % 7) * 0.06}s` })} onClick={() => scrollToId(s.id)}>
            <b>{i + 1}.</b>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const VALUES = [
  { name: 'Élégance', text: 'Une expérience haut de gamme pensée dans les moindres détails.' },
  { name: 'Simplicité', text: 'Rendre accessible une organisation souvent perçue comme complexe.' },
  { name: 'Confiance', text: 'Créer un environnement sécurisé pour les couples comme pour les prestataires.' },
  { name: 'Innovation', text: "Réinventer l'expérience du mariage grâce au digital." },
  { name: 'Bienveillance', text: 'Accompagner chaque couple avec douceur durant cette étape importante de leur vie.' },
];

function About() {
  const [value, setValue] = useState(0);
  // Les valeurs défilent seules tant qu'on ne les touche pas.
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => setValue((v) => (v + 1) % VALUES.length), 3200);
    return () => window.clearInterval(t);
  }, [auto]);

  return (
    <section className="pz-section is-sand" id="qui">
      <div className="pz-wrap pz-about">
        <Photo src="bouquet.jpg" alt="Mariée tenant un bouquet de roses et d'orchidées blanches" className="pz-about-photo" />
        <div>
          <Kicker n={1}>Introduction</Kicker>
          <h2 className="pz-title">
            <Split text={'Qui sommes-nous\u00a0?'} />
          </h2>
          <p className="pz-sub" data-reveal>
            L'art d'organiser le plus beau jour d'une vie.
          </p>
          <p className="pz-p pz-lead" data-reveal>
            OHEVE est une application pensée pour centraliser l'ensemble de l'organisation d'un mariage au sein d'une seule plateforme.
          </p>
          <p className="pz-p" data-reveal>
            Budget, planning, invités, tâches, inspirations et prestataires : chaque étape des préparatifs est regroupée dans un espace unique, intuitif et
            élégant.
          </p>
          <p className="pz-p" data-reveal>
            Grâce à un réseau de professionnels sélectionnés et des fiches enrichies de photos, vidéos, réalisations et avis, les futurs mariés peuvent
            découvrir, comparer et réserver les prestataires adaptés à leur projet.
          </p>
          <p className="pz-p" data-reveal>
            Notre ambition est simple : permettre aux couples d'organiser leur mariage de A à Z avec sérénité, efficacité et confiance.
          </p>

          <div className="pz-cards3">
            <div className="pz-card" data-reveal>
              <h3>Notre mission</h3>
              <p className="pz-p" style={{ margin: 0 }}>
                Simplifier l'organisation du mariage grâce à une solution unique permettant de gérer les prestataires, le budget, les invités, les inspirations et
                le planning dans un environnement premium et intuitif.
              </p>
            </div>
            <div className="pz-card" data-reveal style={css({ '--d': '0.12s' })}>
              <h3>Nos valeurs</h3>
              <div className="pz-values" role="tablist" aria-label="Nos valeurs">
                {VALUES.map((v, i) => (
                  <button
                    key={v.name}
                    role="tab"
                    aria-selected={value === i}
                    className={`pz-chip ${value === i ? 'is-active' : ''}`}
                    onClick={() => {
                      setAuto(false);
                      setValue(i);
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
              <p className="pz-value-text" key={value} role="tabpanel">
                {VALUES[value].text}
              </p>
            </div>
            <div className="pz-card is-quote" data-reveal style={css({ '--d': '0.2s' })}>
              <p className="pz-quote">
                « Chaque mariage raconte une histoire unique. Notre mission est de rendre son organisation aussi belle que le jour où elle sera célébrée. »
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROBLEM =
  "Comment permettre aux futurs mariés de centraliser l'ensemble de l'organisation de leur mariage au sein d'une seule plateforme intuitive, afin de simplifier les préparatifs, réduire la charge mentale et faciliter la mise en relation avec les prestataires ?";
const PROBLEM_KEYS = new Set(['centraliser', 'seule', 'plateforme', 'simplifier', 'charge', 'mentale', 'prestataires']);

function Problem() {
  const words = PROBLEM.split(' ');
  return (
    <section className="pz-section pz-problem" id="problematique" data-problem>
      <div className="pz-problem-sticky">
        <Kicker n={2}>Le constat</Kicker>
        <h2 className="pz-title is-center">
          <Split text="Problématique" />
        </h2>
        <div className="pz-problem-line" />
        <p className="pz-problem-text">
          {words.map((w, i) => (
            <span key={i} data-word className={PROBLEM_KEYS.has(w.replace(/[^\p{L}]/gu, '')) ? 'is-key' : ''}>
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="pz-section is-sand pz-solution" id="solution">
      <div className="pz-solution-text">
        <Kicker n={3}>Notre réponse</Kicker>
        <h2 className="pz-title">
          <Split text="La solution" />
        </h2>
        <p className="pz-p pz-lead" data-reveal>
          OHEVE réinvente l'organisation du mariage en réunissant, au sein d'une seule application, tout ce dont les futurs mariés ont besoin pour préparer le
          plus beau jour de leur vie.
        </p>
        <p className="pz-p" data-reveal>
          Pensée comme un véritable assistant digital, la plateforme centralise chaque étape des préparatifs :
        </p>
        <ul className="pz-stack">
          {['Gestion du budget', 'Suivi des invités', 'Recherche de prestataires', 'Planification des tâches', 'Inspirations, documents et échéances'].map((t, i) => (
            <li key={t} data-reveal="left" style={css({ '--d': `${i * 0.08}s` })}>
              {t}
            </li>
          ))}
        </ul>
        <p className="pz-p" data-reveal>
          Fini <span className="pz-strike">les tableaux Excel</span>, <span className="pz-strike" style={css({ '--d': '0.6s' })}>les notes dispersées</span>,{' '}
          <span className="pz-strike" style={css({ '--d': '0.8s' })}>les dizaines d'onglets ouverts</span> et{' '}
          <span className="pz-strike" style={css({ '--d': '1s' })}>les informations perdues entre plusieurs applications</span>. OHEVE offre une vision claire,
          structurée et instantanée de l'avancement du mariage.
        </p>
        <p className="pz-p" data-reveal>
          Grâce à un réseau de prestataires sélectionnés, des contenus immersifs, des recommandations personnalisées et des outils d'organisation performants,
          les futurs mariés peuvent prendre les bonnes décisions plus rapidement et préparer leur événement avec confiance et sérénité.
        </p>
        <p className="pz-p" data-reveal>
          Plus qu'une simple application, OHEVE a pour ambition de devenir la référence incontournable de l'organisation de mariage, en accompagnant chaque
          couple du premier rêve jusqu'au Jour J.
        </p>
        <div className="pz-motto" data-reveal>
          <p className="pz-quote">« Tout le mariage. Une seule application. Une expérience sans stress. »</p>
        </div>
      </div>
      <div className="pz-solution-media">
        <img src={`${IMG}/escalier.jpg`} alt="Escalier de pierre menant à une arche" loading="lazy" data-parallax />
      </div>
    </section>
  );
}

const NAME_PARTS = [
  {
    word: 'אוהב',
    label: 'Ohev · aimer',
    text: "Le nom OHEVE trouve d'abord son origine dans le mot hébreu « Ohev » (אוהב), qui signifie aimer — une valeur fondatrice de tout mariage.",
  },
  {
    word: 'Ève',
    label: 'La première femme',
    text: "OHEVE fait également écho à Ève, la première femme de l'histoire, symbole de l'origine du couple, de l'union et de la construction d'une vie à deux.",
  },
];

function Why() {
  const [part, setPart] = useState<number | null>(null);
  return (
    <section className="pz-section" id="pourquoi">
      <div className="pz-wrap">
        <div style={{ textAlign: 'center' }}>
          <Kicker n={4}>Le nom</Kicker>
          <h2 className="pz-title is-center">
            <Split text={'Pourquoi OHEVE\u00a0?'} />
          </h2>
          <p className="pz-p pz-lead" data-reveal style={{ margin: '0 auto' }}>
            Le nom OHEVE puise son inspiration dans plusieurs symboliques fortes.
          </p>
        </div>

        <div className="pz-hebrew" data-reveal>
          {NAME_PARTS.map((p, i) => (
            <div key={p.label} style={{ display: 'contents' }}>
              {i > 0 && <span className="pz-hebrew-plus">+</span>}
              <button
                className={`pz-hebrew-card ${part === i ? 'is-active' : ''}`}
                onMouseEnter={() => setPart(i)}
                onFocus={() => setPart(i)}
                onClick={() => setPart(i)}
                aria-pressed={part === i}
              >
                <strong lang={i === 0 ? 'he' : 'fr'}>{p.word}</strong>
                <em>{p.label}</em>
              </button>
            </div>
          ))}
        </div>
        <div className="pz-hebrew-result" aria-live="polite">
          <p className="pz-p pz-lead pz-value-text" key={part ?? 'all'} style={{ margin: '0 auto' }}>
            {part === null
              ? "À travers ce nom, l'application célèbre l'amour, l'engagement et le commencement d'un nouveau chapitre de vie. Survolez les deux symboles ci-dessus."
              : NAME_PARTS[part].text}
          </p>
        </div>
        <p className="pz-p" data-reveal style={{ textAlign: 'center', margin: '-2rem auto 4rem' }}>
          OHEVE n'est donc pas seulement une plateforme d'organisation ; c'est une marque pensée pour accompagner les futurs mariés dans l'une des aventures
          les plus importantes de leur histoire.
        </p>

        <div className="pz-concepts">
          {[
            { src: 'concept-1.jpg', alt: 'Menu de mariage vert sauge noué d’un ruban blanc' },
            { src: 'concept-2.jpg', alt: 'Mains des mariés entrelacées, manche en dentelle' },
            { src: 'concept-3.jpg', alt: 'Enveloppes vert sauge scellées à la cire dorée' },
          ].map((c, i) => (
            <div key={c.src} data-reveal style={css({ '--d': `${i * 0.12}s` })}>
              <Tilt>
                <figure className="pz-concept">
                  <div className="pz-concept-img">
                    <img src={`${IMG}/${c.src}`} alt={c.alt} loading="lazy" />
                  </div>
                  <figcaption>Concept {i + 1}</figcaption>
                </figure>
              </Tilt>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PALETTE = [
  { hex: '#EFE8DC', name: 'Ivoire', ink: '#6c6257' },
  { hex: '#D6CCBC', name: 'Lin', ink: '#5c5248' },
  { hex: '#A3AE8F', name: 'Sauge', ink: '#fff' },
  { hex: '#6B7A5E', name: 'Olivier', ink: '#fff' },
  { hex: '#4A5844', name: 'Forêt', ink: '#fff' },
];

function Universe({ onToast }: { onToast: (msg: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const copy = (hex: string, name: string) => {
    navigator.clipboard?.writeText(hex).then(
      () => onToast(`${name} ${hex} copié`),
      () => onToast(hex),
    );
  };
  return (
    <section className="pz-section is-sand" id="univers">
      <div className="pz-wrap pz-two" style={{ alignItems: 'start' }}>
        <div>
          <Kicker n={5}>Identité</Kicker>
          <h2 className="pz-title">
            <Split text="L'univers OHEVE" />
          </h2>
          <div className="pz-rule" />
          <p className="pz-p pz-lead" data-reveal>
            OHEVE incarne une vision élégante et intemporelle du mariage.
          </p>
          <p className="pz-p" data-reveal>
            Son identité visuelle s'appuie sur des teintes naturelles, des typographies raffinées et des matières nobles inspirées du luxe discret. Chaque
            élément a été pensé pour transmettre douceur, confiance et émotion, tout en reflétant l'excellence des moments les plus précieux.
          </p>
          <div className="pz-swatches" data-reveal>
            {PALETTE.map((p) => (
              <button
                key={p.hex}
                className="pz-swatch"
                style={{ background: p.hex, color: p.ink }}
                onMouseEnter={() => setHover(`${p.name} · ${p.hex}`)}
                onMouseLeave={() => setHover(null)}
                onClick={() => copy(p.hex, p.name)}
                aria-label={`Copier la couleur ${p.name} ${p.hex}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="pz-swatch-hint">{hover ?? 'La palette OHEVE — touchez une couleur pour copier son code.'}</div>
        </div>
        <div className="pz-board pz-curtain" data-reveal="zoom">
          <img src={`${IMG}/univers.jpg`} alt="Planche d'identité OHEVE : logo Oe, palette sauge et matières naturelles" loading="lazy" />
        </div>
      </div>
    </section>
  );
}

const MIND_NODES = [
  { label: 'Gestion complète du mariage', x: 30, y: 13 },
  { label: 'Suivi du budget en temps réel', x: 70, y: 13 },
  { label: 'Planning intelligent', x: 13, y: 50 },
  { label: 'Expérience premium et intuitive', x: 87, y: 50 },
  { label: 'Gestion des invités et des tables', x: 24, y: 86 },
  { label: 'Inspirations centralisées', x: 50, y: 96 },
  { label: 'Marketplace de prestataires sélectionnés', x: 76, y: 86 },
];

function Positioning() {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const [hot, setHot] = useState<number | null>(null);
  return (
    <section className="pz-section" id="positionnement">
      <div className="pz-wrap">
        <Kicker n={6}>Notre place</Kicker>
        <h2 className="pz-title">
          <Split text="Positionnement" />
        </h2>
        <div className="pz-rule" />
        <p className="pz-p pz-lead" data-reveal>
          Bien plus qu'un annuaire de mariage.
        </p>
        <p className="pz-p" data-reveal>
          Notre objectif est d'offrir aux futurs mariés un véritable assistant de planification, capable de les accompagner de la première idée jusqu'au Jour J.
        </p>
      </div>
      <div ref={ref} className={`pz-mind ${inView ? 'is-in' : ''}`}>
        <svg viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
          {MIND_NODES.map((n, i) => (
            <line
              key={i}
              className={hot === i ? 'is-hot' : ''}
              x1={80}
              y1={45}
              x2={80 + (n.x * 1.6 - 80) * 0.72}
              y2={45 + (n.y * 0.9 - 45) * 0.72}
              vectorEffect="non-scaling-stroke"
              style={css({ '--i': i })}
            />
          ))}
        </svg>
        <div className="pz-mind-core">Ce qui nous différencie</div>
        {MIND_NODES.map((n, i) => (
          <button
            key={n.label}
            className={`pz-mind-node ${hot === i ? 'is-hot' : ''}`}
            style={css({ left: `${n.x}%`, top: `${n.y}%`, '--i': i })}
            onMouseEnter={() => setHot(i)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(null)}
          >
            {n.label}
          </button>
        ))}
      </div>
      <div className="pz-idea" data-reveal>
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#45291a" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3zM12 0.5V1.5M4 4l.8.8M20 4l-.8.8M1.5 10h1M21.5 10h1" />
        </svg>
        <p className="pz-quote">« Une seule application. Des centaines de décisions simplifiées. »</p>
      </div>
    </section>
  );
}

/* ─── Fonctionnalités : to-do, budget, invités, prestataires ─── */

function TodoDemo() {
  const tasks = [
    'Création automatique des tâches',
    'Classement par priorité',
    'Échéances personnalisées',
    'Notifications et rappels',
    'Suivi de progression',
    'Tâches partagées entre les futurs mariés',
  ];
  const [done, setDone] = useState<boolean[]>(() => tasks.map((_, i) => i < 2));
  const pct = Math.round((done.filter(Boolean).length / tasks.length) * 100);
  return (
    <>
      <p className="pz-p" style={{ marginBottom: 0 }}>
        <b>Fonctionnalités clés</b> — cochez-les, comme dans l'app :
      </p>
      <ul className="pz-checks">
        {tasks.map((t, i) => (
          <li key={t}>
            <button
              className={`pz-check ${done[i] ? 'is-done' : ''}`}
              aria-pressed={done[i]}
              onClick={() => setDone((d) => d.map((v, k) => (k === i ? !v : v)))}
            >
              <i />
              <span>{t}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="pz-meter-label">
        <span>Progression</span>
        <span>{pct} %</span>
      </div>
      <div className="pz-meter">
        <div style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

function BudgetDemo() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const rows = [
    { name: 'Réception', v: 82, c: '#6f7560' },
    { name: 'Photo & vidéo', v: 64, c: '#9c9f88' },
    { name: 'Tenues', v: 48, c: '#b6ad9b' },
    { name: 'Fleurs & déco', v: 104, c: '#c08a7a' },
  ];
  return (
    <>
      <div ref={ref} className="pz-budget-bars" aria-label="Exemple de suivi : dépensé par rapport au prévu">
        {rows.map((r, i) => (
          <div className="pz-budget-row" key={r.name}>
            <span>{r.name}</span>
            <div className="pz-budget-track">
              <div style={css({ width: inView ? `${Math.min(r.v, 100)}%` : 0, '--c': r.c, '--d': `${i * 0.12}s` })} />
            </div>
            <span style={r.v > 100 ? { color: '#a3563f', fontWeight: 700 } : undefined}>{r.v} %</span>
          </div>
        ))}
      </div>
      <p className="pz-p" style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>
        Exemple de suivi : budget consommé par poste — l'alerte de dépassement s'affiche dès qu'un poste dépasse 100 %.
      </p>
      <p className="pz-p" style={{ marginBottom: 0 }}>
        <b>Fonctionnalités clés</b>
      </p>
      <ul className="pz-list">
        {['Budget prévisionnel', 'Suivi des dépenses', 'Catégories personnalisées', 'Paiements et acomptes', 'Alertes de dépassement', 'Statistiques et répartition'].map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </>
  );
}

function GuestsDemo() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const total = useCountUp(145, inView);
  const yes = useCountUp(98, inView);
  const no = useCountUp(15, inView);
  const pending = useCountUp(32, inView);
  const C = 2 * Math.PI * 58;
  const arc = (n: number) => (inView ? C * (1 - n / 145) : C);
  return (
    <>
      <div ref={ref} className={`pz-guests ${inView ? 'is-in' : ''}`}>
        <div className="pz-ring">
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r="58" stroke="rgba(69,41,26,0.08)" />
            <circle cx="70" cy="70" r="58" stroke="#d6ccbc" strokeDasharray={C} strokeDashoffset={arc(145)} />
            <circle cx="70" cy="70" r="58" stroke="#c08a7a" strokeDasharray={C} strokeDashoffset={arc(113)} />
            <circle cx="70" cy="70" r="58" stroke="#6f7560" strokeDasharray={C} strokeDashoffset={arc(98)} />
          </svg>
          <div className="pz-ring-label">
            <div>
              {total}
              <small>invités</small>
            </div>
          </div>
        </div>
        <div className="pz-stats">
          <div className="pz-stat">
            <span className="pz-dot" style={{ background: '#6f7560' }} />
            <b>{yes}</b> confirmés
          </div>
          <div className="pz-stat">
            <span className="pz-dot" style={{ background: '#c08a7a' }} />
            <b>{no}</b> refus
          </div>
          <div className="pz-stat">
            <span className="pz-dot" style={{ background: '#d6ccbc' }} />
            <b>{pending}</b> en attente
          </div>
        </div>
      </div>
      <p className="pz-p" style={{ marginBottom: 0 }}>
        Puis une vue du plan de table :
      </p>
      <div className={`pz-tables ${inView ? 'is-in' : ''}`}>
        {[8, 10, 8, 6, 10].map((seats, t) => (
          <div className="pz-table" key={t}>
            T{t + 1}
            {Array.from({ length: seats }).map((_, k) => (
              <i key={k} style={css({ '--a': `${(360 / seats) * k}deg`, '--k': k + t * 3 })} />
            ))}
          </div>
        ))}
      </div>
      <ul className="pz-list">
        {['Liste des invités', 'RSVP digital', 'Gestion des accompagnants', 'Catégorisation des invités', 'Création du plan de table', 'Suivi des confirmations'].map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </>
  );
}

function VendorsDemo() {
  const cats = ['Photographe', 'DJ', 'Fleuriste', 'Traiteur', 'Coiffure & maquillage', 'Lieu de réception', 'Coordinateur Jour J'];
  const [fav, setFav] = useState<Set<string>>(() => new Set(['Photographe']));
  return (
    <>
      <p className="pz-p" style={{ marginBottom: 0 }}>
        Recherche par catégorie — ajoutez vos favoris :
      </p>
      <div className="pz-vendors">
        {cats.map((c) => {
          const on = fav.has(c);
          return (
            <button
              key={c}
              className={`pz-vendor ${on ? 'is-fav' : ''}`}
              aria-pressed={on}
              onClick={() =>
                setFav((s) => {
                  const n = new Set(s);
                  if (on) n.delete(c);
                  else n.add(c);
                  return n;
                })
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c08a7a" strokeWidth="1.8" aria-hidden="true">
                <path d={ICONS.heart} />
              </svg>
              {c}
            </button>
          );
        })}
      </div>
      <p className="pz-p" style={{ marginBottom: 0 }}>
        <b>Fonctionnalités clés</b>
      </p>
      <ul className="pz-list">
        {['Recherche par catégorie', 'Filtres personnalisés', 'Profils détaillés', 'Demande de devis', 'Favoris', 'Contact direct'].map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </>
  );
}

const FEATURES = [
  {
    id: 'todo',
    tab: 'To-do list',
    title: 'To-do list',
    sub: "Ne rien oublier jusqu'au Jour J",
    intro: [
      'La To-Do List OHEVE accompagne les futurs mariés tout au long de leurs préparatifs grâce à un suivi clair et structuré des tâches à réaliser.',
      "Chaque action est organisée par priorité et par échéance afin de faciliter l'avancement du projet.",
    ],
    goal: "Réduire la charge mentale liée à l'organisation du mariage et garantir qu'aucune étape importante ne soit oubliée.",
    imgs: ['todo-1.jpg', 'todo-3.jpg', 'todo-2.jpg'],
    Demo: TodoDemo,
  },
  {
    id: 'budget',
    tab: 'Budget',
    title: 'Budget',
    sub: 'Une vision claire à chaque étape',
    intro: [
      "Le budget est l'un des éléments les plus importants dans l'organisation d'un mariage. OHEVE permet aux futurs mariés de suivre leurs dépenses en temps réel et d'avoir une vision claire de leur budget à chaque étape du projet.",
    ],
    goal: 'Aider les futurs mariés à maîtriser leurs finances, anticiper leurs dépenses et éviter les mauvaises surprises.',
    imgs: ['budget-1.jpg', 'budget-3.jpg', 'budget-2.jpg'],
    Demo: BudgetDemo,
  },
  {
    id: 'invites',
    tab: 'Invités',
    title: 'Invités',
    sub: 'Une gestion simplifiée de chaque invité',
    intro: [
      "OHEVE facilite l'organisation de la liste des invités en centralisant toutes les informations essentielles sur une seule interface.",
      'Du suivi des réponses à la création du plan de table, chaque étape est pensée pour offrir une gestion fluide et intuitive.',
    ],
    goal: "Permettre aux futurs mariés de gérer facilement leurs invités et de suivre en temps réel l'évolution de leur liste.",
    imgs: ['invites-1.jpg', 'chaises.jpg', 'invites-2.jpg'],
    Demo: GuestsDemo,
  },
  {
    id: 'prestataires',
    tab: 'Prestataires',
    title: 'Prestataires',
    sub: 'Trouver les bons partenaires pour le Jour J',
    intro: [
      "OHEVE permet aux futurs mariés de découvrir, comparer et contacter les prestataires essentiels à la réussite de leur mariage, directement depuis l'application.",
      "Chaque professionnel dispose d'un profil détaillé afin de faciliter la prise de décision et simplifier les échanges.",
    ],
    goal: 'Aider les futurs mariés à trouver rapidement des prestataires de confiance tout en centralisant leurs recherches et leurs échanges.',
    motto: 'Les meilleurs prestataires, au même endroit.',
    imgs: ['invites-2.jpg', 'bureau.jpg', 'invites-1.jpg'],
    Demo: VendorsDemo,
  },
];

function Features() {
  const [active, setActive] = useState(0);
  const f = FEATURES[active];
  const pick = (i: number) => {
    setActive(i);
    const el = document.getElementById('fonctionnalites-panel');
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  return (
    <section className="pz-section is-sand" id="fonctionnalites">
      <div className="pz-wrap">
        <Kicker n={7}>L'application</Kicker>
        <h2 className="pz-title">
          <Split text="Fonctionnalités" />
        </h2>
        <div className="pz-tabs" role="tablist" aria-label="Fonctionnalités" data-reveal id="fonctionnalites-panel">
          {FEATURES.map((x, i) => (
            <button key={x.id} role="tab" aria-selected={active === i} className={`pz-tab ${active === i ? 'is-active' : ''}`} onClick={() => pick(i)}>
              {x.tab}
            </button>
          ))}
        </div>
        <div className="pz-feature" key={f.id} role="tabpanel">
          <div>
            <h3 className="pz-feature-title">{f.title}</h3>
            <p className="pz-sub">{f.sub}</p>
            <div className="pz-rule is-in" />
            {f.intro.map((p) => (
              <p className="pz-p" key={p}>
                {p}
              </p>
            ))}
            <f.Demo />
            <div className="pz-goal">
              <b>Objectif</b>
              {f.goal}
            </div>
            {f.motto && <p className="pz-motto-strong">{f.motto}</p>}
          </div>
          <div className="pz-collage">
            {f.imgs.map((src) => (
              <div key={src}>
                <img src={`${IMG}/${src}`} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', gap: '1rem' }}>
          <button className="pz-pill" onClick={() => pick((active + FEATURES.length - 1) % FEATURES.length)}>
            ← {FEATURES[(active + FEATURES.length - 1) % FEATURES.length].tab}
          </button>
          <button className="pz-pill" onClick={() => pick((active + 1) % FEATURES.length)}>
            {FEATURES[(active + 1) % FEATURES.length].tab} →
          </button>
        </div>
      </div>
    </section>
  );
}

const COMMISSIONS = [
  { name: 'Photographe', v: 8 },
  { name: 'DJ', v: 10 },
  { name: 'Coiffeur / Maquilleuse', v: 8 },
  { name: 'Coordinateur Jour J', v: 8 },
  { name: 'Fleuriste', v: 5 },
];

function Finance() {
  const [mode, setMode] = useState<0 | 1>(0);
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const switchRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 4, width: 0 });
  useEffect(() => {
    const measure = () => {
      const btn = switchRef.current?.querySelectorAll('button')[mode] as HTMLElement | undefined;
      if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mode]);

  return (
    <section className="pz-section" id="finance">
      <div className="pz-wrap" style={{ textAlign: 'center' }}>
        <Kicker n={8}>Modèle économique</Kicker>
        <h2 className="pz-title is-center">
          <Split text="Projection financière" />
        </h2>
        <div className="pz-switch" ref={switchRef} role="tablist" data-reveal>
          <span className="pz-switch-thumb" style={{ left: thumb.left, width: thumb.width }} />
          <button role="tab" aria-selected={mode === 0} className={mode === 0 ? 'is-active' : ''} onClick={() => setMode(0)}>
            Prestataires
          </button>
          <button role="tab" aria-selected={mode === 1} className={mode === 1 ? 'is-active' : ''} onClick={() => setMode(1)}>
            Abonnement Premium clients
          </button>
        </div>
      </div>

      <div ref={ref}>
        {mode === 0 ? (
          <div key="pro">
            <p className="pz-sub" style={{ textAlign: 'center' }}>
              Catégorie 1 : commission · Catégorie 2 : abonnement Premium
            </p>
            <div className="pz-commission">
              {COMMISSIONS.map((c, i) => (
                <div className="pz-col" key={c.name}>
                  <span className="pz-col-val">{c.v}%</span>
                  <div className="pz-col-bar" style={css({ height: inView ? `${(c.v / 10) * 70}%` : 0, '--i': i })} />
                  <span className="pz-col-name">{c.name}</span>
                </div>
              ))}
            </div>
            <p className="pz-fin-note">Les mêmes taux par métier s'appliquent aux deux catégories : à la commission, ou dans le cadre de l'abonnement Premium prestataire.</p>
          </div>
        ) : (
          <div className="pz-plans" key="client">
            <div className="pz-plan" style={css({ '--i': 0 })}>
              <h3>Premium</h3>
              <div className="pz-plan-price">70€</div>
              <p className="pz-p" style={{ margin: 0, maxWidth: 'none' }}>
                pour l'abonnement premium
              </p>
            </div>
            <div className="pz-plan is-star" style={css({ '--i': 1 })}>
              <span className="pz-plan-badge">Accompagnement humain</span>
              <h3>OHEVE Concierge</h3>
              <div className="pz-plan-price">149€</div>
              <ul>
                <li>Aide au budget</li>
                <li>Recommandations personnalisées</li>
                <li>Optimisation du planning</li>
                <li>Aide au choix des prestataires</li>
              </ul>
            </div>
            <div className="pz-plan" style={css({ '--i': 2 })}>
              <h3>Formule</h3>
              <div className="pz-plan-price">59€</div>
              <p className="pz-p" style={{ margin: 0, maxWidth: 'none' }}>
                à définir
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const ROAD = [
  {
    v: 'V1',
    t: 'Organisation essentielle',
    items: ['Dashboard', 'Planning', 'To-Do List', 'Budget', 'Gestion des invités'],
    goal: 'permettre aux futurs mariés de centraliser leur organisation.',
  },
  {
    v: 'V2',
    t: 'Prestataires',
    items: ['Recherche de prestataires', 'Profils détaillés', 'Demandes de devis', 'Favoris'],
    goal: 'simplifier la recherche et la sélection des professionnels.',
  },
  {
    v: 'V3',
    t: 'Marketplace',
    items: ['Réservation directe', 'Paiement sécurisé', 'Gestion des commissions', 'Abonnements prestataires'],
    goal: 'créer un véritable écosystème mariage.',
  },
  {
    v: 'V4',
    t: 'Intelligence artificielle',
    items: ['Assistant IA mariage', 'Recommandations personnalisées', 'Génération automatique de tâches', 'Optimisation du budget'],
    goal: 'offrir un accompagnement intelligent et sur-mesure.',
  },
];

function Roadmap() {
  return (
    <section className="pz-section is-sand" id="parcours" data-road>
      <div className="pz-wrap">
        <Kicker n={9}>Feuille de route</Kicker>
        <h2 className="pz-title">
          <Split text="Parcours de l'utilisateur" />
        </h2>
        <div className="pz-road">
          <div className="pz-road-fill" />
          {ROAD.map((r, i) => (
            <div className="pz-step" key={r.v} data-step={i} data-reveal style={css({ '--d': `${i * 0.1}s` })}>
              <div className="pz-step-num">{i + 1}</div>
              <h3>
                <small>{r.v}</small>
                {r.t}
              </h3>
              <ul>
                {r.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p>
                <b>Objectif :</b> {r.goal}
              </p>
            </div>
          ))}
        </div>
        <p className="pz-quote" data-reveal style={{ marginTop: '2rem' }}>
          Construire aujourd'hui la référence du mariage de demain.
        </p>
      </div>
    </section>
  );
}

const PHASES = [
  { t: 'Étude de marché', items: ['Analyse du marché du mariage', 'Analyse concurrentielle', 'Validation du concept', 'Définition des besoins utilisateurs'] },
  { t: 'UX / UI Design', items: ['Parcours utilisateur', 'Wireframes', "Design de l'application", 'Prototype interactif'] },
  { t: 'Développement', items: ['Développement iOS et Android', 'Base de données', "Système d'authentification", 'Intégration des fonctionnalités'] },
  { t: 'Tests', items: ['Corrections de bugs', 'Optimisation des performances', 'Tests utilisateurs', 'Sécurisation de la plateforme'] },
  { t: 'Lancement', items: ['Publication App Store', 'Publication Google Play', 'Campagnes marketing', 'Acquisition des premiers utilisateurs'] },
];

const LEGAL = [
  {
    t: "Création et protection de l'entreprise",
    items: ['Création de la société (SAS ou SASU)', "Dépôt de la marque OHEVE auprès de l'INPI", "Protection du logo et de l'identité visuelle", "Protection de la propriété intellectuelle de l'application"],
  },
  {
    t: 'Conformité numérique',
    items: ["Conditions Générales d'Utilisation (CGU)", 'Conditions Générales de Vente (CGV)', 'Mentions légales', 'Politique de confidentialité', 'Gestion des cookies', 'Respect du RGPD'],
  },
  {
    t: 'Protection des données',
    lead: 'OHEVE collecte des données sensibles liées aux mariages :',
    items: ['Informations personnelles', 'Coordonnées des invités', 'Budgets', 'Informations prestataires'],
    after: "La plateforme devra garantir la confidentialité, le stockage sécurisé et la protection de l'ensemble des données utilisateurs.",
  },
  {
    t: 'Encadrement des prestataires',
    items: ['Contrats de partenariat', 'Conditions de référencement', 'Gestion des commissions', 'Gestion des abonnements premium', 'Vérification des informations professionnelles', 'Procédure de déréférencement'],
  },
  {
    t: 'Paiements et transactions',
    items: ['Paiement sécurisé', 'Gestion des commissions', 'Facturation automatisée', 'Conformité fiscale', 'Lutte contre la fraude'],
  },
  {
    t: 'Assurances et responsabilités',
    items: ['Assurance Responsabilité Civile Professionnelle', 'Limitation de responsabilité de la plateforme', 'Gestion des litiges utilisateurs/prestataires', 'Procédures de réclamation et médiation'],
  },
];

function Creation() {
  const [phase, setPhase] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const p = PHASES[phase];
  return (
    <section className="pz-section" id="creation">
      <div className="pz-wrap">
        <Kicker n={10}>Méthodologie</Kicker>
        <h2 className="pz-title">
          <Split text="Étapes de création" />
        </h2>
        <p className="pz-sub" data-reveal>
          De l'idée au lancement
        </p>
        <p className="pz-p" data-reveal>
          Le développement d'OHEVE suit une méthodologie structurée afin de garantir la création d'une application performante, fiable et adaptée aux besoins des
          futurs mariés.
        </p>
        <div className="pz-phases" role="tablist" data-reveal>
          {PHASES.map((x, i) => (
            <button key={x.t} role="tab" aria-selected={phase === i} className={`pz-phase ${phase === i ? 'is-active' : ''}`} onClick={() => setPhase(i)} onMouseEnter={() => setPhase(i)}>
              <small>Phase {i + 1}</small>
              <span>{x.t}</span>
            </button>
          ))}
        </div>
        <div className="pz-phase-panel" key={phase} role="tabpanel">
          <div className="pz-phase-big">0{phase + 1}</div>
          <div>
            <p className="pz-sub" style={{ marginBottom: '0.6rem' }}>
              {p.t}
            </p>
            <ul className="pz-list" style={{ margin: 0 }}>
              {p.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            {phase === PHASES.length - 1 && (
              <p className="pz-p" style={{ marginTop: '1rem', fontStyle: 'italic' }}>
                Une vision claire, une exécution rigoureuse, un lancement maîtrisé.
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: '6rem' }}>
          <h2 className="pz-title">
            <Split text="Aspects juridiques" />
          </h2>
          <p className="pz-sub" data-reveal>
            Un cadre sécurisé pour les utilisateurs et les prestataires
          </p>
          <p className="pz-p" data-reveal>
            Afin de garantir la confiance et la conformité de la plateforme, OHEVE s'appuie sur un ensemble de dispositifs juridiques indispensables à son
            fonctionnement.
          </p>
          <div data-reveal>
            {LEGAL.map((l, i) => (
              <div key={l.t} className={`pz-acc ${open === i ? 'is-open' : ''}`}>
                <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  {l.t}
                  <i />
                </button>
                <div className="pz-acc-body">
                  <div>
                    {l.lead && <p>{l.lead}</p>}
                    <ul>
                      {l.items.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    {l.after && <p style={{ marginBottom: '1.2rem' }}>{l.after}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Mini({ icon, title, children, delay = 0 }: { icon: string; title: string; children: ReactNode; delay?: number }) {
  return (
    <div className="pz-mini" data-reveal style={css({ '--d': `${delay}s` })}>
      <h3>
        <Icon d={icon} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Acquisition() {
  return (
    <>
      <section className="pz-section" id="acquisition">
        <div className="pz-wrap pz-split-media">
          <Photo src="lampe.jpg" alt="Suspension en métal brossé dans un intérieur lumineux" className="pz-tall" />
          <div>
            <Kicker n={11}>Croissance</Kicker>
            <h2 className="pz-title">
              <Split text="Stratégie d'acquisition" />
            </h2>
            <p className="pz-sub" data-reveal>
              Attirer les premiers utilisateurs et construire une communauté engagée
            </p>
            <p className="pz-p" data-reveal>
              Le lancement d'OHEVE reposera sur une stratégie d'acquisition ciblée, combinant présence digitale, partenariats et recommandation.
            </p>
            <div className="pz-grid2">
              <Mini icon={ICONS.phone} title="Réseaux sociaux">
                <p style={{ marginBottom: '0.5rem' }}>Instagram et TikTok constitueront les principaux canaux de visibilité de la marque. Contenus prévus :</p>
                <ul>
                  <li>Conseils organisation mariage</li>
                  <li>Inspirations et tendances</li>
                  <li>Témoignages utilisateurs</li>
                  <li>Présentation de prestataires</li>
                  <li>Démonstrations de l'application</li>
                </ul>
              </Mini>
              <Mini icon={ICONS.star} title="Influenceurs mariage" delay={0.08}>
                <p style={{ marginBottom: '0.5rem' }}>Collaboration avec :</p>
                <ul>
                  <li>Créateurs de contenu mariage</li>
                  <li>Futures mariées influentes</li>
                  <li>Wedding planners reconnus</li>
                </ul>
                <p style={{ marginTop: '0.5rem' }}>
                  <b>Objectif :</b> accroître rapidement la notoriété d'OHEVE auprès de la cible.
                </p>
              </Mini>
              <Mini icon={ICONS.handshake} title="Partenariats stratégiques" delay={0.12}>
                <ul>
                  <li>Wedding planners</li>
                  <li>Photographes</li>
                  <li>Domaines et lieux de réception</li>
                  <li>Traiteurs</li>
                  <li>Salons du mariage</li>
                </ul>
                <p style={{ marginTop: '0.5rem' }}>Ces partenaires deviennent des prescripteurs naturels de la plateforme.</p>
              </Mini>
              <Mini icon={ICONS.target} title="Acquisition digitale" delay={0.16}>
                <ul>
                  <li>Publicités Instagram &amp; TikTok</li>
                  <li>Google Ads</li>
                  <li>Référencement naturel (SEO)</li>
                  <li>Articles et contenus spécialisés mariage</li>
                </ul>
              </Mini>
              <Mini icon={ICONS.gift} title="Programme de parrainage" delay={0.2}>
                <p>Les utilisateurs peuvent recommander OHEVE à leurs proches et bénéficier d'avantages exclusifs.</p>
              </Mini>
            </div>
          </div>
        </div>
      </section>
      <div className="pz-banner" aria-label="Créer une marque forte avant même de créer une audience.">
        <div className="pz-marquee" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i}>Créer une marque forte avant même de créer une audience.</span>
          ))}
        </div>
      </div>
    </>
  );
}

function Loyalty() {
  return (
    <section className="pz-section is-sand" id="fidelisation">
      <div className="pz-wrap pz-split-media is-reverse">
        <div>
          <Kicker n={12}>Engagement</Kicker>
          <h2 className="pz-title">
            <Split text="Fidélisation" />
          </h2>
          <div className="pz-rule" />
          <p className="pz-sub" data-reveal>
            Une expérience pensée pour accompagner chaque couple, jusqu'au plus beau jour de leur vie.
          </p>
          <div className="pz-grid2">
            <Mini icon={ICONS.bell} title="Notifications intelligentes">
              <ul>
                <li>Rappels automatiques</li>
                <li>Échéances importantes</li>
                <li>Alertes budgétaires</li>
                <li>Suivi des tâches prioritaires</li>
              </ul>
            </Mini>
            <Mini icon={ICONS.sparkle} title="Expérience personnalisée" delay={0.08}>
              <ul>
                <li>Recommandations adaptées au projet</li>
                <li>Suggestions de prestataires</li>
                <li>Conseils selon l'avancement du mariage</li>
              </ul>
            </Mini>
            <Mini icon={ICONS.gift} title="Programme de parrainage" delay={0.12}>
              <p>Les utilisateurs peuvent recommander OHEVE à leurs proches et bénéficier d'avantages exclusifs.</p>
            </Mini>
            <Mini icon={ICONS.crown} title="Programme ambassadeur" delay={0.16}>
              <p>Les couples satisfaits deviennent les premiers ambassadeurs de la marque et contribuent à son développement grâce au bouche-à-oreille.</p>
            </Mini>
          </div>
          <div className="pz-goal" data-reveal>
            <b>Objectif</b>
            Maintenir un engagement fort tout au long des préparatifs et transformer chaque utilisateur en prescripteur de la plateforme.
          </div>
        </div>
        <Photo src="chaises.jpg" alt="Deux fauteuils en bois sombre dans une pièce lumineuse" className="pz-tall" />
      </div>
    </section>
  );
}

const VISION = [
  { src: 'vision-leader.jpg', t: 'Leader du mariage francophone', p: "Devenir l'application incontournable pour organiser son mariage simplement et efficacement." },
  { src: 'vision-marketplace.jpg', t: 'Marketplace complète', p: 'Réunir les meilleurs prestataires du mariage sur une seule plateforme et faciliter leur mise en relation avec les futurs mariés.' },
  { src: 'vision-ia.jpg', t: 'Assistant IA Mariage', p: "Proposer un accompagnement intelligent capable d'aider chaque couple à prendre les bonnes décisions au bon moment." },
  { src: 'vision-international.jpg', t: 'Développement international', p: 'Étendre progressivement OHEVE à de nouveaux marchés en Europe et dans les principales communautés francophones à travers le monde.' },
  { src: 'vision-ecosysteme.jpg', t: 'Notre vision', p: "Créer l'écosystème digital de référence qui accompagne les futurs mariés du premier préparatif jusqu'au Jour J." },
];

function Vision() {
  return (
    <section className="pz-section pz-h" id="vision" data-horizontal>
      <div className="pz-h-sticky">
        <div className="pz-h-head">
          <Kicker n={13}>Ambition</Kicker>
          <h2 className="pz-title" style={{ marginBottom: '0.8rem' }}>
            <Split text={'OHEVE dans 5\u00a0ans…'} />
          </h2>
          <p className="pz-p" data-reveal style={{ maxWidth: '80ch' }}>
            Une référence incontournable de l'univers du mariage. Notre ambition est de faire d'OHEVE la plateforme de référence pour l'organisation de mariage
            en France, puis à l'international : bien plus qu'une application, un véritable partenaire de confiance tout au long des préparatifs.
          </p>
        </div>
        <div className="pz-h-track" data-track>
          {VISION.map((v, i) => (
            <article className="pz-h-card" key={v.t}>
              <div className="pz-h-img">
                <img src={`${IMG}/${v.src}`} alt="" loading="lazy" />
              </div>
              <div className="pz-h-num">0{i + 1} / 05</div>
              <h3>{v.t}</h3>
              <p>{v.p}</p>
            </article>
          ))}
          <div className="pz-h-end">OHEVE a pour ambition de devenir le réflexe de chaque futur marié.</div>
        </div>
      </div>
    </section>
  );
}

function Conclusion() {
  return (
    <section className="pz-section is-sand" id="conclusion">
      <div className="pz-wrap">
        <Kicker n={14}>Pour finir</Kicker>
        <h2 className="pz-title">
          <Split text="Conclusion" />
        </h2>
        <div className="pz-conclusion">
          <div className="pz-bordered" data-reveal="left">
            <p className="pz-sub" style={{ textTransform: 'uppercase' }}>
              Réinventer l'organisation du mariage
            </p>
            <p className="pz-p">OHEVE est née d'un constat simple : organiser un mariage reste aujourd'hui complexe, fragmenté et chronophage.</p>
            <p className="pz-p">
              Notre ambition est de proposer une solution unique capable de centraliser l'ensemble des préparatifs au sein d'une expérience élégante, intuitive et
              rassurante.
            </p>
            <p className="pz-p">
              En réunissant organisation, inspirations, gestion des invités, budget et prestataires sur une seule plateforme, OHEVE simplifie chaque étape du
              parcours des futurs mariés.
            </p>
            <p className="pz-p" style={{ marginBottom: 0 }}>
              Plus qu'une application, OHEVE a vocation à devenir un véritable compagnon de confiance, présent du premier préparatif jusqu'au Jour J.
            </p>
          </div>
          <blockquote className="pz-big-quote">
            <Split text="“OHEVE n'est pas seulement une application d'organisation de mariage. C'est l'écosystème qui accompagne les futurs mariés du premier jour jusqu'au Jour J.”" />
          </blockquote>
        </div>
      </div>
    </section>
  );
}

function End({ onShare }: { onShare: () => void }) {
  return (
    <section className="pz-end" id="merci">
      <img className="pz-hero-shadow is-a" src={`${IMG}/ombre-feuillage.png`} alt="" aria-hidden="true" />
      <div style={{ position: 'relative', zIndex: 2, padding: '0 1.25rem' }}>
        <h2 className="pz-end-title">
          <Split text={'Merci pour votre attention\u00a0!'} />
        </h2>
        <p className="pz-p pz-lead" data-reveal style={{ margin: '0 auto 2rem', maxWidth: '46ch' }}>
          Vous êtes prestataire et souhaitez rejoindre l'aventure OHEVE ? Écrivez-nous, nous serons ravies d'échanger avec vous.
        </p>
        <div className="pz-cta-row" data-reveal>
          <a className="pz-cta" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            Nous écrire sur Instagram
          </a>
          <a className="pz-cta is-ghost" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Partenariat prestataire OHEVE')}`}>
            Par e-mail
          </a>
          <a className="pz-cta is-ghost" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            Voir l'app
          </a>
          <button className="pz-cta is-ghost" onClick={onShare}>
            <Icon d={ICONS.share} size={18} />
            Partager
          </button>
        </div>
        <p className="pz-authors" data-reveal>
          Attia Odaya · Layani Rachel
        </p>
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function PresentationPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [introDone, setIntroDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [activeId, setActiveId] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/presentation`;
    const data = { title: 'OHEVE — Présentation', text: "Découvrez OHEVE, l'application de mariage.", url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast('Lien copié !');
    } catch {
      /* partage annulé */
    }
  }, [showToast]);

  // Titre de l'onglet + écran d'ouverture
  useEffect(() => {
    const prev = document.title;
    document.title = 'OHEVE — Présentation';
    const t = window.setTimeout(() => setIntroDone(true), reducedMotion() ? 0 : 1500);
    return () => {
      document.title = prev;
      window.clearTimeout(t);
    };
  }, []);

  // Apparitions au défilement (y compris pour les éléments ajoutés plus tard : onglets…)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const SELECTOR = '[data-reveal], .pz-curtain, .pz-split, .pz-rule';
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    const watch = (scope: ParentNode) => scope.querySelectorAll(SELECTOR).forEach((el) => !el.classList.contains('is-in') && io.observe(el));
    watch(root);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n instanceof Element && (n.matches(SELECTOR) ? io.observe(n) : watch(n)));
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  // Effets liés au défilement : progression, section active, mots, parallaxe, frise, défilement horizontal
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const problem = root.querySelector<HTMLElement>('[data-problem]');
    const words = problem ? Array.from(problem.querySelectorAll<HTMLElement>('[data-word]')) : [];
    const parallax = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
    const road = root.querySelector<HTMLElement>('[data-road] .pz-road');
    const steps = road ? Array.from(road.querySelectorAll<HTMLElement>('[data-step]')) : [];
    const horizontal = root.querySelector<HTMLElement>('[data-horizontal]');
    const track = root.querySelector<HTMLElement>('[data-track]');
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    let raf = 0;
    let lastLit = -1;

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const doc = document.documentElement;
      const max = doc.scrollHeight - vh;
      root.style.setProperty('--pz-progress', String(max > 0 ? window.scrollY / max : 0));
      setSolid(window.scrollY > 40);

      let current = '';
      for (const s of sections) if (s.getBoundingClientRect().top < vh * 0.45) current = s.id;
      setActiveId(current);

      if (problem) {
        const r = problem.getBoundingClientRect();
        const p = clamp01(-r.top / Math.max(1, r.height - vh) * 1.15);
        problem.style.setProperty('--pz-pp', String(clamp01(p * 3)));
        const lit = Math.round(p * words.length);
        if (lit !== lastLit) {
          words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
          lastLit = lit;
        }
      }

      if (!reducedMotion()) {
        for (const img of parallax) {
          const r = img.parentElement!.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) continue;
          img.style.transform = `translate3d(0, ${(r.top + r.height / 2 - vh / 2) * -0.12}px, 0)`;
        }
      }

      if (road) {
        const r = road.getBoundingClientRect();
        const p = clamp01((vh * 0.75 - r.top) / r.height);
        road.style.setProperty('--pz-road', String(p));
        steps.forEach((s, i) => s.classList.toggle('is-reached', p >= i / steps.length + 0.02));
      }

      if (horizontal && track) {
        if (window.innerWidth > 900) {
          const r = horizontal.getBoundingClientRect();
          const p = clamp01(-r.top / Math.max(1, r.height - vh));
          const dist = Math.max(0, track.scrollWidth - window.innerWidth);
          track.style.transform = `translate3d(${-p * dist}px, 0, 0)`;
        } else {
          track.style.transform = '';
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Échap ferme le menu
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const go = (id: string) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  return (
    <div className="pz" ref={rootRef}>
      <div className="pz-grain" aria-hidden="true" />

      <div className={`pz-intro ${introDone ? 'is-done' : ''}`} aria-hidden="true">
        <div>
          <div className="pz-intro-mark">
            {'OHEVE'.split('').map((l, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.07}s` }}>
                {l}
              </span>
            ))}
          </div>
          <div className="pz-intro-line" />
        </div>
      </div>

      <nav className={`pz-bar ${solid ? 'is-solid' : ''}`} aria-label="Navigation de la présentation">
        <button className="pz-bar-logo" onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })}>
          OHEVE
        </button>
        <div className="pz-bar-actions">
          <button className="pz-pill" onClick={share} aria-label="Partager la présentation">
            <Icon d={ICONS.share} size={16} />
            <span>Partager</span>
          </button>
          <button className="pz-pill" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="pz-menu">
            <Icon d={menuOpen ? ICONS.close : ICONS.menu} size={16} />
            <span>{menuOpen ? 'Fermer' : 'Sommaire'}</span>
          </button>
        </div>
        <div className="pz-progress" />
      </nav>

      <div id="pz-menu" className={`pz-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <ul className="pz-menu-list">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <button onClick={() => go(s.id)} tabIndex={menuOpen ? 0 : -1}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="pz-dots" aria-hidden="true">
        {SECTIONS.map((s) => (
          <button key={s.id} tabIndex={-1} data-label={s.label} className={activeId === s.id ? 'is-active' : ''} onClick={() => scrollToId(s.id)} />
        ))}
      </div>

      <main>
        <Hero />
        <Sommaire />
        <About />
        <Problem />
        <Solution />
        <Why />
        <Universe onToast={showToast} />
        <Positioning />
        <Features />
        <Finance />
        <Roadmap />
        <Creation />
        <Acquisition />
        <Loyalty />
        <Vision />
        <Conclusion />
        <End onShare={share} />
      </main>

      <div className={`pz-toast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
