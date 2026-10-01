import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import './presentation.css';

/*
 * /presentation — la présentation globale OHEVE (PDF) transformée en page
 * interactive, à partager aux prestataires depuis Instagram.
 */

// BASE_URL (« / » sur le site) garde les images trouvables si la page est servie ailleurs qu'à la racine.
const IMG = `${import.meta.env.BASE_URL}presentation`;
const APP_STORE_URL = 'https://apps.apple.com/fr/app/oheve/id6785535857';
const INSTAGRAM_URL = 'https://www.instagram.com/ohevewedding';
const CONTACT_EMAIL = 'support@ohevewedding.com';

const SECTIONS = [
  { id: 'problematique', label: 'Problématique' },
  { id: 'solution', label: 'La solution' },
  { id: 'positionnement', label: 'Positionnement' },
  { id: 'fonctionnalites', label: 'Fonctionnalités' },
  { id: 'prestataire', label: 'Ce que OHEVE vous apporte' },
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
  calendar: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4M8 14h3',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12zM8.5 12h.01M12 12h.01M15.5 12h.01',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
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
        <p className="pz-hero-meta">Présentation prestataires · Attia Odaya</p>
      </div>
      <button className="pz-scroll-cue" onClick={() => scrollToId('problematique')}>
        Découvrir
        <i />
      </button>
    </header>
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
        <Kicker n={1}>Le constat</Kicker>
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
        <Kicker n={2}>Notre réponse</Kicker>
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
        <Kicker n={3}>Notre place</Kicker>
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
        <Kicker n={4}>L'application</Kicker>
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

const BENEFITS = [
  { icon: 'users', t: 'De nouveaux clients qualifiés', p: 'grâce à une visibilité auprès de futurs mariés.' },
  { icon: 'star', t: 'Une présence digitale premium', p: 'avec une fiche professionnelle (photos, vidéos, avis, réseaux sociaux…).' },
  { icon: 'calendar', t: 'Une gestion simplifiée', p: 'des demandes, devis, réservations et disponibilités.' },
  { icon: 'chat', t: 'Une communication centralisée', p: 'avec les couples (chat, documents, notifications).' },
  { icon: 'chart', t: 'Un tableau de bord', p: 'pour suivre les performances (vues, clics, demandes, réservations).' },
  { icon: 'sparkle', t: 'Une mise en avant marketing', p: 'via OHEVE (sélections, inspirations, réseaux sociaux).' },
  { icon: 'shield', t: 'Une image de confiance', p: 'grâce aux profils vérifiés et aux avis authentifiés.' },
  { icon: 'trend', t: "Un développement du chiffre d'affaires", p: 'en transformant plus facilement les demandes en réservations.' },
] as const;

const FUNNEL = [
  { name: 'Vues', v: 1240 },
  { name: 'Clics', v: 380 },
  { name: 'Demandes', v: 46 },
  { name: 'Réservations', v: 18 },
];

function FunnelRow({ name, v, max, active, i }: { name: string; v: number; max: number; active: boolean; i: number }) {
  const n = useCountUp(v, active, 1400 + i * 200);
  return (
    <div className="pz-funnel-row">
      <span>{name}</span>
      <div className="pz-funnel-track">
        <div style={css({ width: active ? `${Math.max(6, Math.sqrt(v / max) * 100)}%` : 0, '--d': `${i * 0.15}s` })} />
      </div>
      <b>{n.toLocaleString('fr-FR')}</b>
    </div>
  );
}

function Benefits() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <section className="pz-section" id="prestataire">
      <div className="pz-wrap">
        <Kicker n={5}>Pour vous, prestataires</Kicker>
        <h2 className="pz-title is-md">
          <Split text="Ce que OHEVE apporte au prestataire" />
        </h2>
        <div className="pz-rule" />
      </div>
      <div className="pz-wrap pz-benefits-layout">
        <div className="pz-benefits">
          {BENEFITS.map((b, i) => (
            <div key={b.t} data-reveal style={css({ '--d': `${(i % 2) * 0.08 + Math.floor(i / 2) * 0.06}s` })}>
              <Tilt className="pz-benefit">
                <span className="pz-benefit-icon">
                  <Icon d={ICONS[b.icon]} size={22} />
                </span>
                <h3>{b.t}</h3>
                <p>{b.p}</p>
              </Tilt>
            </div>
          ))}
        </div>
        <div className="pz-benefits-side">
          <Photo src="chaises.jpg" alt="Deux fauteuils en bois sombre et un ordinateur portable dans une pièce lumineuse" className="pz-tall" />
          <div ref={ref} className="pz-dash" data-reveal="right">
            <div className="pz-dash-head">
              <span>Votre tableau de bord</span>
              <em>Exemple</em>
            </div>
            {FUNNEL.map((f, i) => (
              <FunnelRow key={f.name} name={f.name} v={f.v} max={FUNNEL[0].v} active={inView} i={i} />
            ))}
          </div>
        </div>
      </div>
      <div className="pz-wrap">
        <p className="pz-benefit-motto" data-reveal>
          Une seule plateforme pour développer son activité, gérer ses demandes et transformer plus de prospects en clients.
        </p>
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
    <section className="pz-section is-sand pz-h" id="vision" data-horizontal>
      <div className="pz-h-sticky">
        <div className="pz-h-head">
          <Kicker n={6}>Ambition</Kicker>
          <h2 className="pz-title is-md" style={{ marginBottom: '0.8rem' }}>
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
    <section className="pz-section" id="conclusion">
      <div className="pz-wrap">
        <Kicker n={7}>Pour finir</Kicker>
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
          Attia Odaya
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
        <Problem />
        <Solution />
        <Positioning />
        <Features />
        <Benefits />
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
