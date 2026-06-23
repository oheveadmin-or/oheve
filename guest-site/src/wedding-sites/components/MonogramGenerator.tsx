import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ─── Types ───────────────────────────────────────────────────────────────────

type SizeKey = 'xs' | 's' | 'm' | 'l' | 'xl';

const SIZES: Record<SizeKey, { label: string; px: number }> = {
  xs: { label: 'XS', px: 96 },
  s:  { label: 'S',  px: 140 },
  m:  { label: 'M',  px: 190 },
  l:  { label: 'L',  px: 250 },
  xl: { label: 'XL', px: 320 },
};

/** Everything a monogram needs to draw itself. */
type RP = {
  i1: string;   // 1re initiale (mariée)
  i2: string;   // 2e initiale (marié)
  c: string;    // couleur principale
  bg: string;   // couleur de fond du médaillon
  n1: string;   // prénom complet (mariée)
  n2: string;   // prénom complet (marié)
  date: string; // date formatée "JJ.MM.AAAA" (peut être vide)
};

type MonogramRenderFn = (p: RP) => JSX.Element;

type MonogramStyle = {
  id: string;
  label: string;
  group: string;
  render: MonogramRenderFn;
};

// ─── Geometry ──────────────────────────────────────────────────────────────────

const V = 240; // viewBox size
const CX = V / 2;
const CY = V / 2;

// ─── Fonts (toutes chargées via index.html) ──────────────────────────────────────
const serif   = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"; // élégant fin
const display = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";  // fort contraste
const roman   = "'Cinzel', 'Cormorant Garamond', Georgia, serif";            // capitales formelles
const script  = "'Great Vibes', 'Dancing Script', cursive";                  // calligraphie fluide
const sans    = "'Montserrat', 'Inter', Helvetica, Arial, sans-serif";       // labels

// ─── SVG drawing helpers ─────────────────────────────────────────────────────────

/** Feuille pointue élégante (pointe en haut, base en (x,y)). */
function leafD(x: number, y: number, len = 16, wd = 0.42) {
  const w = len * wd;
  return `M ${x} ${y} C ${x + w} ${y - len * 0.45} ${x + w * 0.5} ${y - len * 0.85} ${x} ${y - len} C ${x - w * 0.5} ${y - len * 0.85} ${x - w} ${y - len * 0.45} ${x} ${y} Z`;
}

/** Petite branche courbe (quadratique). */
function branch(x1: number, y1: number, x2: number, y2: number, flip = false) {
  const mx = (x1 + x2) / 2;
  const my = flip ? Math.min(y1, y2) - 22 : Math.max(y1, y2) + 22;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

/** Crochets d'angle (coins style luxe). */
function corner(x: number, y: number, dx: number, dy: number, c: string, len = 18) {
  return (
    <>
      <line x1={x} y1={y} x2={x + dx * len} y2={y} stroke={c} strokeWidth="1.5" />
      <line x1={x} y1={y} x2={x} y2={y + dy * len} stroke={c} strokeWidth="1.5" />
    </>
  );
}

/** Petite fleur à 5 pétales. */
function flowerMark(cx: number, cy: number, r: number, c: string, op = 0.26) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const px = cx + Math.cos(rad) * r;
        const py = cy + Math.sin(rad) * r;
        return (
          <ellipse key={i} cx={px} cy={py} rx={r * 0.55} ry={r * 0.95} fill={c} opacity={op}
            transform={`rotate(${a + 90} ${px} ${py})`} />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.42} fill={c} opacity={op + 0.18} />
    </g>
  );
}

/** Couronne ovale de feuilles (style botanique « GJ »). */
function leafyOval(c: string, rx = 86, ry = 104, count = 30, op = 0.32) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(a) * rx;
    const y = CY + Math.sin(a) * ry;
    items.push(<path key={i} d={leafD(x, y, 15)} fill={c} opacity={op} transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`} />);
  }
  return <g>{items}</g>;
}

/** Légende prénoms + date (Cinzel) sous le glyphe. */
function NameCaption({ c, n1, n2, date, y, size = 11.5, sep = '&' }: { c: string; n1: string; n2: string; date: string; y: number; size?: number; sep?: string }) {
  const names = [n1, n2].filter(Boolean).map((s) => s.toUpperCase()).join(`   ${sep}   `);
  return (
    <>
      {names ? (
        <text x={CX} y={y} fontFamily={roman} fontSize={size} fill={c} textAnchor="middle" letterSpacing="0.16em" opacity={0.8}>{names}</text>
      ) : null}
      {date ? (
        <text x={CX} y={y + size + 6} fontFamily={roman} fontSize={size * 0.78} fill={c} textAnchor="middle" letterSpacing="0.3em" opacity={0.55}>{date}</text>
      ) : null}
    </>
  );
}

/**
 * Cœur du rendu : deux initiales ENTRELACÉES.
 * La 2e lettre passe devant la 1re grâce à un halo de la couleur de fond
 * (paint-order: stroke) → rendu « tissé » net, comme les monogrammes de joaillerie.
 */
function Interlock({
  i1, i2, c, bg, S = 138, font = display, dx, dy = 0, italic = false, halo = true, cy = CY, weight,
}: {
  i1: string; i2: string; c: string; bg: string; S?: number; font?: string;
  dx?: number; dy?: number; italic?: boolean; halo?: boolean; cy?: number; weight?: number;
}) {
  const ddx = dx ?? S * 0.23;
  const y = cy + S * 0.33;
  const common = {
    fontFamily: font,
    fontSize: S,
    textAnchor: 'middle' as const,
    fontStyle: (italic ? 'italic' : 'normal') as 'italic' | 'normal',
    ...(weight ? { fontWeight: weight } : {}),
  };
  return (
    <>
      <text x={CX - ddx} y={y - dy} fill={c} {...common}>{i1}</text>
      <text
        x={CX + ddx} y={y + dy} fill={c}
        stroke={halo ? bg : undefined}
        strokeWidth={halo ? S * 0.055 : undefined}
        strokeLinejoin="round"
        paintOrder="stroke"
        {...common}
      >{i2}</text>
    </>
  );
}

/**
 * Entrelacs TISSÉ (over/under) : la 1re lettre passe devant en haut,
 * la 2de repasse devant en bas via un clip → vrai effet tressé de joaillerie.
 * Générique : fonctionne avec n'importe quelle paire d'initiales.
 */
let __wvId = 0;
function WovenInterlock({
  i1, i2, c, bg, S = 138, font = display, dx, dy = 0, italic = false, cy = CY, weight,
}: {
  i1: string; i2: string; c: string; bg: string; S?: number; font?: string;
  dx?: number; dy?: number; italic?: boolean; cy?: number; weight?: number;
}) {
  const ddx = dx ?? S * 0.23;
  const y = cy + S * 0.33;
  const splitY = cy + S * 0.05; // ligne de tressage, proche du centre
  const sw = S * 0.055;
  const clipId = `wv${(__wvId += 1)}`;
  const common = {
    fontFamily: font,
    fontSize: S,
    textAnchor: 'middle' as const,
    fontStyle: (italic ? 'italic' : 'normal') as 'italic' | 'normal',
    ...(weight ? { fontWeight: weight } : {}),
  };
  const haloProps = { stroke: bg, strokeWidth: sw, strokeLinejoin: 'round' as const, paintOrder: 'stroke' };
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={splitY} width={V} height={V} />
        </clipPath>
      </defs>
      {/* base : 2de lettre derrière */}
      <text x={CX + ddx} y={y + dy} fill={c} {...common}>{i2}</text>
      {/* 1re lettre devant partout (halo) */}
      <text x={CX - ddx} y={y - dy} fill={c} {...haloProps} {...common}>{i1}</text>
      {/* 2de lettre repasse devant dans la bande basse → tressage */}
      <g clipPath={`url(#${clipId})`}>
        <text x={CX + ddx} y={y + dy} fill={c} {...haloProps} {...common}>{i2}</text>
      </g>
    </>
  );
}

// ─── 50 Monogram styles ───────────────────────────────────────────────────────

const STYLES: MonogramStyle[] = [

  // ════════════════════════ ENTRELACÉS ════════════════════════
  {
    id: 'm01', label: 'Entrelacé classique', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <WovenInterlock i1={i1} i2={i2} c={c} bg={bg} S={150} dx={150 * 0.24} dy={150 * 0.13} />,
  },
  {
    id: 'm02', label: 'Entrelacé serré', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <WovenInterlock i1={i1} i2={i2} c={c} bg={bg} S={150} dx={150 * 0.28} dy={0} />,
  },
  {
    id: 'm03', label: 'Entrelacé italique', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <WovenInterlock i1={i1} i2={i2} c={c} bg={bg} S={152} dx={152 * 0.22} dy={152 * 0.1} italic />,
  },
  {
    id: 'm04', label: 'Entrelacé calligraphie', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <Interlock i1={i1} i2={i2} c={c} bg={bg} S={170} dx={170 * 0.17} dy={0} font={script} />,
  },
  {
    id: 'm05', label: 'Grand + niché', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => (
      <>
        <text x={CX - 16} y={CY + 46} fontFamily={display} fontSize={156} fill={c} textAnchor="middle">{i1}</text>
        <text x={CX + 54} y={CY + 2} fontFamily={display} fontSize={64} fill={c} textAnchor="middle" stroke={bg} strokeWidth={3.2} strokeLinejoin="round" paintOrder="stroke">{i2}</text>
      </>
    ),
  },
  {
    id: 'm06', label: 'Plein + contour', group: 'Entrelacés',
    render: ({ i1, i2, c }) => {
      const y = CY + 138 * 0.33;
      return (
        <>
          <text x={CX - 30} y={y} fontFamily={display} fontSize={138} fill={c} textAnchor="middle">{i1}</text>
          <text x={CX + 30} y={y} fontFamily={display} fontSize={138} fill="none" stroke={c} strokeWidth={1.3} textAnchor="middle">{i2}</text>
        </>
      );
    },
  },
  {
    id: 'm07', label: 'Étagé haut/bas', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <WovenInterlock i1={i1} i2={i2} c={c} bg={bg} S={148} dx={148 * 0.2} dy={148 * 0.2} />,
  },
  {
    id: 'm08', label: 'Entrelacé fin', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <WovenInterlock i1={i1} i2={i2} c={c} bg={bg} S={150} dx={150 * 0.25} dy={150 * 0.08} weight={400} />,
  },
  {
    id: 'm09', label: 'Capitales romaines', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => <WovenInterlock i1={i1} i2={i2} c={c} bg={bg} S={120} dx={120 * 0.32} dy={0} font={roman} />,
  },
  {
    id: 'm10', label: 'Entrelacé ombré', group: 'Entrelacés',
    render: ({ i1, i2, c, bg }) => (
      <>
        <g transform="translate(2.4 2.6)" opacity="0.18"><Interlock i1={i1} i2={i2} c={c} bg={bg} S={150} dx={150 * 0.24} dy={150 * 0.12} halo={false} /></g>
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={150} dx={150 * 0.24} dy={150 * 0.12} />
      </>
    ),
  },

  // ════════════════════════ OVALE ════════════════════════
  {
    id: 'm11', label: 'M · A ovale fin', group: 'Ovale',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={60} ry={88} fill={bg} stroke={c} strokeWidth="0.9" />
        <text x={CX} y={CY - 6} fontFamily={display} fontSize={58} fill={c} textAnchor="middle">{i1}</text>
        <line x1={CX - 24} y1={CY + 6} x2={CX + 24} y2={CY + 6} stroke={c} strokeWidth="0.8" opacity="0.7" />
        <text x={CX} y={CY + 52} fontFamily={display} fontSize={58} fill={c} textAnchor="middle">{i2}</text>
      </>
    ),
  },
  {
    id: 'm12', label: 'Entrelacé ovale', group: 'Ovale',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={68} ry={96} fill={bg} stroke={c} strokeWidth="0.9" />
        <ellipse cx={CX} cy={CY} rx={61} ry={89} fill="none" stroke={c} strokeWidth="0.35" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={104} dx={104 * 0.2} dy={104 * 0.12} />
      </>
    ),
  },
  {
    id: 'm13', label: 'Ovale perlé', group: 'Ovale',
    render: ({ i1, i2, c, bg }) => {
      const beads = Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        return { x: CX + Math.cos(a) * 78, y: CY + Math.sin(a) * 100 };
      });
      return (
        <>
          {beads.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={1.5} fill={c} opacity="0.5" />)}
          <ellipse cx={CX} cy={CY} rx={70} ry={92} fill={bg} stroke={c} strokeWidth="0.4" />
          <Interlock i1={i1} i2={i2} c={c} bg={bg} S={108} dx={108 * 0.18} dy={0} font={script} />
        </>
      );
    },
  },
  {
    id: 'm14', label: 'Ovale flourish', group: 'Ovale',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={66} ry={96} fill={bg} stroke={c} strokeWidth="0.9" />
        <path d={`M ${CX - 52} ${CY} q -14 0 -20 -8`} fill="none" stroke={c} strokeWidth="0.8" opacity="0.45" />
        <path d={`M ${CX - 52} ${CY} q -14 0 -20 8`} fill="none" stroke={c} strokeWidth="0.8" opacity="0.45" />
        <path d={`M ${CX + 52} ${CY} q 14 0 20 -8`} fill="none" stroke={c} strokeWidth="0.8" opacity="0.45" />
        <path d={`M ${CX + 52} ${CY} q 14 0 20 8`} fill="none" stroke={c} strokeWidth="0.8" opacity="0.45" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={104} dx={104 * 0.2} dy={104 * 0.1} italic />
      </>
    ),
  },
  {
    id: 'm15', label: 'Ovale double trait', group: 'Ovale',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={92} ry={106} fill={bg} stroke={c} strokeWidth="1.3" />
        <ellipse cx={CX} cy={CY} rx={84} ry={98} fill="none" stroke={c} strokeWidth="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={118} dx={118 * 0.22} dy={118 * 0.1} />
      </>
    ),
  },
  {
    id: 'm16', label: 'Ovale pointillé', group: 'Ovale',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={90} ry={104} fill={bg} stroke={c} strokeWidth="1" strokeDasharray="2 4" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={116} dx={116 * 0.2} dy={116 * 0.1} italic />
      </>
    ),
  },

  // ════════════════════════ BOTANIQUE ════════════════════════
  {
    id: 'm17', label: 'Couronne botanique', group: 'Botanique',
    render: ({ i1, i2, c, bg }) => (
      <>
        {leafyOval(c, 88, 106, 34, 0.3)}
        <ellipse cx={CX} cy={CY} rx={70} ry={88} fill="none" stroke={c} strokeWidth="0.5" opacity="0.5" />
        {flowerMark(CX, CY - 104, 7, c, 0.34)}
        {flowerMark(CX, CY + 104, 7, c, 0.34)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={112} dx={112 * 0.17} dy={0} font={script} />
      </>
    ),
  },
  {
    id: 'm18', label: 'Orchidée ovale', group: 'Botanique',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={84} ry={100} fill={bg} stroke={c} strokeWidth="0.9" />
        {flowerMark(CX - 66, CY + 54, 14, c, 0.32)}
        {flowerMark(CX - 48, CY + 76, 10, c, 0.26)}
        {flowerMark(CX + 66, CY - 54, 14, c, 0.32)}
        {flowerMark(CX + 48, CY - 76, 10, c, 0.26)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={116} dx={116 * 0.2} dy={116 * 0.1} />
      </>
    ),
  },
  {
    id: 'm19', label: 'Fleurs aux coins', group: 'Botanique',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={70} ry={94} fill={bg} stroke={c} strokeWidth="0.8" />
        {flowerMark(CX - 34, CY - 78, 10, c, 0.3)}
        {flowerMark(CX + 34, CY + 78, 10, c, 0.3)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={104} dx={104 * 0.2} dy={104 * 0.1} />
      </>
    ),
  },
  {
    id: 'm20', label: 'Laurier haut/bas', group: 'Botanique',
    render: ({ i1, i2, c, bg }) => (
      <>
        {[-42, -28, -14, 0, 14, 28, 42].map((dx, i) => (
          <path key={`t${i}`} d={leafD(CX + dx, CY - 70 + Math.abs(dx) * 0.16, 12)} fill={c} opacity="0.24" transform={`rotate(${dx * 1.6} ${CX + dx} ${CY - 70})`} />
        ))}
        {[-42, -28, -14, 0, 14, 28, 42].map((dx, i) => (
          <path key={`b${i}`} d={leafD(CX + dx, CY + 70 - Math.abs(dx) * 0.16, 12)} fill={c} opacity="0.24" transform={`rotate(${-dx * 1.6 + 180} ${CX + dx} ${CY + 70})`} />
        ))}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={120} dx={120 * 0.22} dy={120 * 0.1} />
      </>
    ),
  },
  {
    id: 'm21', label: 'Branches latérales', group: 'Botanique',
    render: ({ i1, i2, c, bg }) => (
      <>
        <path d={`M 24 ${CY + 22} Q 48 ${CY - 8} 60 ${CY - 30}`} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
        <path d={`M 24 ${CY + 22} Q 46 ${CY + 46} 60 ${CY + 58}`} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
        {[0, 1, 2].map((i) => <path key={`l${i}`} d={leafD(46 + i * 7, CY - 18 + i * 26, 10)} fill={c} opacity="0.24" transform={`rotate(${-50 + i * 30} ${46 + i * 7} ${CY - 18 + i * 26})`} />)}
        <path d={`M ${V - 24} ${CY + 22} Q ${V - 48} ${CY - 8} ${V - 60} ${CY - 30}`} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
        <path d={`M ${V - 24} ${CY + 22} Q ${V - 46} ${CY + 46} ${V - 60} ${CY + 58}`} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
        {[0, 1, 2].map((i) => <path key={`r${i}`} d={leafD(V - 46 - i * 7, CY - 18 + i * 26, 10)} fill={c} opacity="0.24" transform={`rotate(${50 - i * 30} ${V - 46 - i * 7} ${CY - 18 + i * 26})`} />)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={118} dx={118 * 0.22} dy={118 * 0.1} />
      </>
    ),
  },
  {
    id: 'm22', label: 'Couronne complète', group: 'Botanique',
    render: ({ i1, i2, c, bg }) => (
      <>
        {leafyOval(c, 98, 100, 30, 0.22)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={122} dx={122 * 0.23} dy={122 * 0.1} />
      </>
    ),
  },

  // ════════════════════════ PRÉNOMS & DATE ════════════════════════
  {
    id: 'm23', label: 'Faire-part M · A', group: 'Prénoms & date',
    render: ({ i1, i2, c, bg, n1, n2, date }) => (
      <>
        <ellipse cx={CX} cy={CY - 16} rx={48} ry={62} fill={bg} stroke={c} strokeWidth="0.8" />
        <text x={CX} y={CY - 24} fontFamily={display} fontSize={42} fill={c} textAnchor="middle">{i1}</text>
        <line x1={CX - 18} y1={CY - 14} x2={CX + 18} y2={CY - 14} stroke={c} strokeWidth="0.7" opacity="0.7" />
        <text x={CX} y={CY + 8} fontFamily={display} fontSize={42} fill={c} textAnchor="middle">{i2}</text>
        <NameCaption c={c} n1={n1} n2={n2} date={date} y={CY + 64} sep="AND" />
      </>
    ),
  },
  {
    id: 'm24', label: 'Empilé + prénoms', group: 'Prénoms & date',
    render: ({ i1, i2, c, bg, n1, n2, date }) => {
      const names = [n1, n2].filter(Boolean).map((s) => s.toUpperCase()).join(' AND ');
      return (
        <>
          {names ? <text x={CX} y={CY - 58} fontFamily={roman} fontSize={11} fill={c} textAnchor="middle" letterSpacing="0.24em" opacity="0.75">{names}</text> : null}
          <text x={CX + 30} y={CY - 36} fontFamily={serif} fontSize={14} fill={c} textAnchor="middle" opacity="0.5">✦</text>
          <text x={CX} y={CY - 4} fontFamily={display} fontSize={72} fill={c} textAnchor="middle">{i1}</text>
          <text x={CX} y={CY + 50} fontFamily={display} fontSize={72} fill={c} textAnchor="middle" stroke={bg} strokeWidth="3.5" strokeLinejoin="round" paintOrder="stroke">{i2}</text>
          {date ? <text x={CX} y={CY + 78} fontFamily={roman} fontSize={10} fill={c} textAnchor="middle" letterSpacing="0.3em" opacity="0.55">{date}</text> : null}
        </>
      );
    },
  },
  {
    id: 'm25', label: 'Barre prénoms', group: 'Prénoms & date',
    render: ({ i1, i2, c, n1, n2, date }) => (
      <>
        <text x={CX - 36} y={CY - 4} fontFamily={roman} fontSize={58} fill={c} textAnchor="middle">{i1}</text>
        <line x1={CX} y1={CY - 52} x2={CX} y2={CY + 8} stroke={c} strokeWidth="0.9" opacity="0.6" />
        <text x={CX} y={CY - 18} fontFamily={serif} fontSize={15} fill={c} textAnchor="middle" fontStyle="italic" opacity="0.7">&amp;</text>
        <text x={CX + 36} y={CY - 4} fontFamily={roman} fontSize={58} fill={c} textAnchor="middle">{i2}</text>
        <NameCaption c={c} n1={n1} n2={n2} date={date} y={CY + 34} size={11} />
      </>
    ),
  },
  {
    id: 'm26', label: 'Entrelacé + prénoms', group: 'Prénoms & date',
    render: ({ i1, i2, c, bg, n1, n2, date }) => (
      <>
        <g transform={`translate(0 ${-18})`}><Interlock i1={i1} i2={i2} c={c} bg={bg} S={120} dx={120 * 0.22} dy={120 * 0.11} italic /></g>
        <NameCaption c={c} n1={n1} n2={n2} date={date} y={CY + 58} size={11} />
      </>
    ),
  },
  {
    id: 'm27', label: 'Arc + prénoms', group: 'Prénoms & date',
    render: ({ i1, i2, c, bg, n1, n2, date }) => (
      <>
        <path d={`M ${CX - 64} ${CY + 44} L ${CX - 64} ${CY - 30} A 64 64 0 0 1 ${CX + 64} ${CY - 30} L ${CX + 64} ${CY + 44} Z`} fill={bg} stroke={c} strokeWidth="1" />
        <g transform={`translate(0 ${-22})`}><Interlock i1={i1} i2={i2} c={c} bg={bg} S={88} dx={88 * 0.22} dy={88 * 0.1} /></g>
        <NameCaption c={c} n1={n1} n2={n2} date={date} y={CY + 74} size={10.5} />
      </>
    ),
  },
  {
    id: 'm28', label: 'Calligraphie + prénoms', group: 'Prénoms & date',
    render: ({ i1, i2, c, bg, n1, n2, date }) => (
      <>
        <g transform={`translate(0 ${-20})`}><Interlock i1={i1} i2={i2} c={c} bg={bg} S={120} dx={120 * 0.16} dy={0} font={script} /></g>
        <path d={`M ${CX - 56} ${CY + 18} Q ${CX} ${CY + 32} ${CX + 56} ${CY + 18}`} fill="none" stroke={c} strokeWidth="0.7" opacity="0.4" />
        <NameCaption c={c} n1={n1} n2={n2} date={date} y={CY + 48} size={11} />
      </>
    ),
  },

  // ════════════════════════ CERCLE ════════════════════════
  {
    id: 'm29', label: 'Cercle minimaliste', group: 'Cercle',
    render: ({ i1, i2, c, bg }) => (
      <>
        <circle cx={CX} cy={CY} r={100} fill={bg} stroke={c} strokeWidth="1.1" />
        <circle cx={CX} cy={CY} r={91} fill="none" stroke={c} strokeWidth="0.4" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={118} dx={118 * 0.22} dy={118 * 0.1} />
      </>
    ),
  },
  {
    id: 'm30', label: 'Double cercle', group: 'Cercle',
    render: ({ i1, i2, c, bg }) => (
      <>
        <circle cx={CX} cy={CY} r={104} fill={bg} stroke={c} strokeWidth="1.8" />
        <circle cx={CX} cy={CY} r={94} fill="none" stroke={c} strokeWidth="0.7" />
        <circle cx={CX} cy={CY} r={87} fill="none" stroke={c} strokeWidth="0.3" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={116} dx={116 * 0.22} dy={116 * 0.1} />
      </>
    ),
  },
  {
    id: 'm31', label: 'Cercle perlé', group: 'Cercle',
    render: ({ i1, i2, c, bg }) => {
      const beads = Array.from({ length: 44 }, (_, i) => {
        const a = (i * (360 / 44) * Math.PI) / 180;
        return { x: CX + Math.cos(a) * 102, y: CY + Math.sin(a) * 102 };
      });
      return (
        <>
          {beads.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={1.8} fill={c} opacity="0.5" />)}
          <circle cx={CX} cy={CY} r={92} fill={bg} stroke={c} strokeWidth="0.5" />
          <Interlock i1={i1} i2={i2} c={c} bg={bg} S={114} dx={114 * 0.22} dy={114 * 0.1} />
        </>
      );
    },
  },
  {
    id: 'm32', label: 'Sceau tampon', group: 'Cercle',
    render: ({ i1, i2, c, bg }) => {
      const ticks = Array.from({ length: 40 }, (_, i) => {
        const a = (i * (360 / 40) * Math.PI) / 180;
        return { x1: CX + Math.cos(a) * 96, y1: CY + Math.sin(a) * 96, x2: CX + Math.cos(a) * 104, y2: CY + Math.sin(a) * 104 };
      });
      return (
        <>
          {ticks.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={c} strokeWidth="0.9" opacity="0.32" />)}
          <circle cx={CX} cy={CY} r={92} fill={bg} stroke={c} strokeWidth="1.1" />
          <circle cx={CX} cy={CY} r={80} fill="none" stroke={c} strokeWidth="0.5" />
          <Interlock i1={i1} i2={i2} c={c} bg={bg} S={108} dx={108 * 0.22} dy={108 * 0.1} />
        </>
      );
    },
  },
  {
    id: 'm33', label: 'Cercle calligraphie', group: 'Cercle',
    render: ({ i1, i2, c, bg }) => (
      <>
        <circle cx={CX} cy={CY} r={102} fill={bg} stroke={c} strokeWidth="0.9" />
        <path d={branch(CX - 82, CY + 18, CX + 82, CY + 18, true)} fill="none" stroke={c} strokeWidth="0.7" opacity="0.3" />
        <path d={branch(CX - 82, CY - 18, CX + 82, CY - 18)} fill="none" stroke={c} strokeWidth="0.7" opacity="0.3" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={128} dx={128 * 0.17} dy={0} font={script} />
      </>
    ),
  },

  // ════════════════════════ CADRE ════════════════════════
  {
    id: 'm34', label: 'Cadre carré', group: 'Cadre',
    render: ({ i1, i2, c, bg }) => (
      <>
        <rect x={16} y={16} width={V - 32} height={V - 32} fill={bg} stroke={c} strokeWidth="1.5" />
        <rect x={26} y={26} width={V - 52} height={V - 52} fill="none" stroke={c} strokeWidth="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={122} dx={122 * 0.22} dy={122 * 0.1} />
      </>
    ),
  },
  {
    id: 'm35', label: 'Coins ornés', group: 'Cadre',
    render: ({ i1, i2, c, bg }) => (
      <>
        <rect x={14} y={14} width={V - 28} height={V - 28} rx={3} fill={bg} stroke={c} strokeWidth="1.6" />
        <rect x={24} y={24} width={V - 48} height={V - 48} rx={2} fill="none" stroke={c} strokeWidth="0.5" />
        {corner(24, 24, 1, 1, c, 14)}{corner(V - 24, 24, -1, 1, c, 14)}
        {corner(24, V - 24, 1, -1, c, 14)}{corner(V - 24, V - 24, -1, -1, c, 14)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={118} dx={118 * 0.22} dy={118 * 0.1} />
      </>
    ),
  },
  {
    id: 'm36', label: 'Cadre arrondi', group: 'Cadre',
    render: ({ i1, i2, c, bg }) => (
      <>
        <rect x={18} y={18} width={V - 36} height={V - 36} rx={28} fill={bg} stroke={c} strokeWidth="1.3" />
        <rect x={28} y={28} width={V - 56} height={V - 56} rx={20} fill="none" stroke={c} strokeWidth="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={120} dx={120 * 0.22} dy={120 * 0.1} />
      </>
    ),
  },
  {
    id: 'm37', label: 'Arc roman', group: 'Cadre',
    render: ({ i1, i2, c, bg }) => (
      <>
        <path d={`M ${CX - 76} ${CY + 106} L ${CX - 76} ${CY - 26} A 76 76 0 0 1 ${CX + 76} ${CY - 26} L ${CX + 76} ${CY + 106} Z`} fill={bg} stroke={c} strokeWidth="1.3" />
        <path d={`M ${CX - 66} ${CY + 101} L ${CX - 66} ${CY - 22} A 66 66 0 0 1 ${CX + 66} ${CY - 22} L ${CX + 66} ${CY + 101}`} fill="none" stroke={c} strokeWidth="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={110} dx={110 * 0.22} dy={110 * 0.1} cy={CY - 6} />
      </>
    ),
  },
  {
    id: 'm38', label: 'Arc minimaliste', group: 'Cadre',
    render: ({ i1, i2, c, bg }) => (
      <>
        <path d={`M ${CX - 82} ${V - 16} L ${CX - 82} ${CY - 20} A 82 82 0 0 1 ${CX + 82} ${CY - 20} L ${CX + 82} ${V - 16}`} fill={bg} stroke={c} strokeWidth="1.2" />
        <path d={`M ${CX - 72} ${V - 16} L ${CX - 72} ${CY - 16} A 72 72 0 0 1 ${CX + 72} ${CY - 16} L ${CX + 72} ${V - 16}`} fill="none" stroke={c} strokeWidth="0.4" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={114} dx={114 * 0.22} dy={114 * 0.1} />
      </>
    ),
  },

  // ════════════════════════ GÉOMÉTRIQUE ════════════════════════
  {
    id: 'm39', label: 'Hexagone', group: 'Géométrique',
    render: ({ i1, i2, c, bg }) => {
      const poly = (r: number) => Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 - 30) * Math.PI) / 180;
        return `${CX + Math.cos(a) * r},${CY + Math.sin(a) * r}`;
      }).join(' ');
      return (
        <>
          <polygon points={poly(104)} fill={bg} stroke={c} strokeWidth="1.3" />
          <polygon points={poly(94)} fill="none" stroke={c} strokeWidth="0.5" />
          <Interlock i1={i1} i2={i2} c={c} bg={bg} S={112} dx={112 * 0.22} dy={112 * 0.1} />
        </>
      );
    },
  },
  {
    id: 'm40', label: 'Losange', group: 'Géométrique',
    render: ({ i1, i2, c, bg }) => (
      <>
        <polygon points={`${CX},${CY - 108} ${CX + 86},${CY} ${CX},${CY + 108} ${CX - 86},${CY}`} fill={bg} stroke={c} strokeWidth="1.3" />
        <polygon points={`${CX},${CY - 96} ${CX + 76},${CY} ${CX},${CY + 96} ${CX - 76},${CY}`} fill="none" stroke={c} strokeWidth="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={96} dx={96 * 0.24} dy={0} />
      </>
    ),
  },
  {
    id: 'm41', label: 'Écusson', group: 'Géométrique',
    render: ({ i1, i2, c, bg }) => (
      <>
        <path d={`M ${CX} 18 L ${CX + 88} 50 L ${CX + 88} ${CY + 26} Q ${CX + 88} ${CY + 82} ${CX} ${V - 16} Q ${CX - 88} ${CY + 82} ${CX - 88} ${CY + 26} L ${CX - 88} 50 Z`} fill={bg} stroke={c} strokeWidth="1.3" />
        <path d={`M ${CX} 28 L ${CX + 78} 56 L ${CX + 78} ${CY + 24} Q ${CX + 78} ${CY + 74} ${CX} ${V - 26} Q ${CX - 78} ${CY + 74} ${CX - 78} ${CY + 24} L ${CX - 78} 56 Z`} fill="none" stroke={c} strokeWidth="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={100} dx={100 * 0.22} dy={100 * 0.1} cy={CY - 4} />
      </>
    ),
  },
  {
    id: 'm42', label: 'Art déco', group: 'Géométrique',
    render: ({ i1, i2, c, bg }) => (
      <>
        <rect x={22} y={22} width={V - 44} height={V - 44} fill={bg} stroke={c} strokeWidth="1.4" />
        <rect x={31} y={31} width={V - 62} height={V - 62} fill="none" stroke={c} strokeWidth="0.4" />
        <path d={`M ${CX - 28} 31 L ${CX} 50 L ${CX + 28} 31`} fill="none" stroke={c} strokeWidth="0.8" opacity="0.5" />
        <path d={`M ${CX - 28} ${V - 31} L ${CX} ${V - 50} L ${CX + 28} ${V - 31}`} fill="none" stroke={c} strokeWidth="0.8" opacity="0.5" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={84} dx={84 * 0.34} dy={0} font={roman} />
      </>
    ),
  },

  // ════════════════════════ MINIMAL ════════════════════════
  {
    id: 'm43', label: 'Séparateur |', group: 'Minimal',
    render: ({ i1, i2, c }) => (
      <>
        <line x1={CX} y1={CY - 58} x2={CX} y2={CY + 58} stroke={c} strokeWidth="1.1" />
        <text x={CX - 38} y={CY + 26} fontFamily={display} fontSize={84} fill={c} textAnchor="middle">{i1}</text>
        <text x={CX + 38} y={CY + 26} fontFamily={display} fontSize={84} fill={c} textAnchor="middle">{i2}</text>
      </>
    ),
  },
  {
    id: 'm44', label: 'Esperluette centrée', group: 'Minimal',
    render: ({ i1, i2, c }) => (
      <>
        <text x={CX - 50} y={CY + 26} fontFamily={display} fontSize={84} fill={c} textAnchor="middle">{i1}</text>
        <text x={CX} y={CY + 18} fontFamily={script} fontSize={48} fill={c} textAnchor="middle" opacity="0.7">&amp;</text>
        <text x={CX + 50} y={CY + 26} fontFamily={display} fontSize={84} fill={c} textAnchor="middle">{i2}</text>
      </>
    ),
  },
  {
    id: 'm45', label: 'Ultra fin espacé', group: 'Minimal',
    render: ({ i1, i2, c }) => (
      <>
        <text x={CX - 46} y={CY + 28} fontFamily={serif} fontSize={92} fill={c} textAnchor="middle" fontWeight="300">{i1}</text>
        <text x={CX + 46} y={CY + 28} fontFamily={serif} fontSize={92} fill={c} textAnchor="middle" fontWeight="300">{i2}</text>
        <line x1={40} y1={CY + 46} x2={V - 40} y2={CY + 46} stroke={c} strokeWidth="0.4" opacity="0.3" />
      </>
    ),
  },
  {
    id: 'm46', label: 'Baseline serif', group: 'Minimal',
    render: ({ i1, i2, c }) => (
      <>
        <line x1={32} y1={CY + 40} x2={V - 32} y2={CY + 40} stroke={c} strokeWidth="0.8" />
        <text x={CX - 32} y={CY + 34} fontFamily={display} fontSize={84} fill={c} textAnchor="middle">{i1}</text>
        <text x={CX + 32} y={CY + 34} fontFamily={display} fontSize={84} fill={c} textAnchor="middle">{i2}</text>
      </>
    ),
  },

  // ════════════════════════ LUXE ════════════════════════
  {
    id: 'm47', label: 'Coins dorés', group: 'Luxe',
    render: ({ i1, i2, c, bg }) => (
      <>
        {corner(24, 24, 1, 1, c, 20)}{corner(V - 24, 24, -1, 1, c, 20)}
        {corner(24, V - 24, 1, -1, c, 20)}{corner(V - 24, V - 24, -1, -1, c, 20)}
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={124} dx={124 * 0.22} dy={124 * 0.1} />
        <text x={CX} y={CY + 62} fontFamily={sans} fontSize={9} fill={c} textAnchor="middle" letterSpacing="0.32em" opacity="0.45">✦ ✦ ✦</text>
      </>
    ),
  },
  {
    id: 'm48', label: 'Blason royal', group: 'Luxe',
    render: ({ i1, i2, c, bg }) => (
      <>
        <rect x={20} y={20} width={V - 40} height={V - 40} fill={bg} stroke={c} strokeWidth="1.9" />
        <rect x={28} y={28} width={V - 56} height={V - 56} fill="none" stroke={c} strokeWidth="0.7" />
        <path d={`M ${CX - 22} 46 L ${CX - 18} 34 L ${CX - 9} 40 L ${CX} 30 L ${CX + 9} 40 L ${CX + 18} 34 L ${CX + 22} 46 Z`} fill={c} opacity="0.55" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={104} dx={104 * 0.22} dy={104 * 0.1} cy={CY - 2} />
        <text x={CX} y={CY + 60} fontFamily={sans} fontSize={8.5} fill={c} textAnchor="middle" letterSpacing="0.34em" opacity="0.5">MARIAGE</text>
      </>
    ),
  },
  {
    id: 'm49', label: 'Double ovale flourish', group: 'Luxe',
    render: ({ i1, i2, c, bg }) => (
      <>
        <ellipse cx={CX} cy={CY} rx={98} ry={108} fill={bg} stroke={c} strokeWidth="1.9" />
        <ellipse cx={CX} cy={CY} rx={88} ry={98} fill="none" stroke={c} strokeWidth="0.6" />
        <ellipse cx={CX} cy={CY} rx={81} ry={91} fill="none" stroke={c} strokeWidth="0.3" />
        <path d={`M ${CX - 14} ${CY - 96} Q ${CX} ${CY - 112} ${CX + 14} ${CY - 96}`} fill="none" stroke={c} strokeWidth="1" opacity="0.45" />
        <circle cx={CX} cy={CY - 106} r={2.6} fill={c} opacity="0.45" />
        <Interlock i1={i1} i2={i2} c={c} bg={bg} S={116} dx={116 * 0.22} dy={116 * 0.1} />
      </>
    ),
  },
  {
    id: 'm50', label: 'Laurier classique', group: 'Luxe',
    render: ({ i1, i2, c, bg }) => {
      const arc = (mirror: boolean) => Array.from({ length: 9 }, (_, i) => {
        const a = ((-44 + i * 11) * Math.PI) / 180;
        const base = mirror ? Math.PI : 0;
        const x = CX + Math.cos(a + base) * 100;
        const y = CY + Math.sin(a + base) * 100;
        return { x, y, rot: ((a * 180) / Math.PI) + (mirror ? 90 : -90) };
      });
      return (
        <>
          {arc(true).map((l, i) => <path key={`l${i}`} d={leafD(l.x, l.y, 11)} fill={c} opacity="0.22" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />)}
          {arc(false).map((l, i) => <path key={`r${i}`} d={leafD(l.x, l.y, 11)} fill={c} opacity="0.22" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />)}
          <Interlock i1={i1} i2={i2} c={c} bg={bg} S={120} dx={120 * 0.22} dy={120 * 0.1} />
        </>
      );
    },
  },
];

// ─── Groups for filter tabs ───────────────────────────────────────────────────

const GROUPS = ['Tous', ...Array.from(new Set(STYLES.map((s) => s.group)))];

// ─── SVG render + export ─────────────────────────────────────────────────────────

function MonogramSvg({ style, p, px }: { style: MonogramStyle; p: RP; px: number }) {
  return (
    <svg viewBox={`0 0 ${V} ${V}`} width={px} height={px} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', color: p.c }}>
      {style.render(p)}
    </svg>
  );
}

/** SVG string propre, taille figée — robuste (pas de lecture du DOM). */
function buildSvgString(style: MonogramStyle, p: RP, px: number): string {
  return renderToStaticMarkup(<MonogramSvg style={style} p={p} px={px} />);
}

function initial(name: string, fallback: string): string {
  const ch = name.trim()[0];
  return ch ? ch.toUpperCase() : fallback;
}

function formatShortDate(raw?: string): string {
  if (!raw) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }
  return '';
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FullProps = {
  groomName: string;
  brideName: string;
  /** Date du mariage (ISO `AAAA-MM-JJ` ou autre) — affichée sur les styles « Prénoms & date ». */
  date?: string;
  primaryColor?: string;
  backgroundColor?: string;
  /** Style déjà enregistré, pour ré-ouvrir sur la bonne sélection. */
  initialStyle?: string;
  onSelect?: (svgString: string, style: string) => void;
};

export function MonogramGenerator({
  groomName,
  brideName,
  date,
  primaryColor = '#6b6b4f',
  backgroundColor = '#faf7f2',
  initialStyle,
  onSelect,
}: FullProps) {
  const i1 = initial(brideName, 'A');
  const i2 = initial(groomName, 'B');
  const n1 = brideName.trim();
  const n2 = groomName.trim();
  const dateStr = formatShortDate(date);

  const [selectedId, setSelectedId] = useState<string>(
    initialStyle && STYLES.some((s) => s.id === initialStyle) ? initialStyle : 'm01',
  );
  const [size, setSize] = useState<SizeKey>('m');
  const [group, setGroup] = useState<string>('Tous');
  const [copied, setCopied] = useState(false);

  const filtered = group === 'Tous' ? STYLES : STYLES.filter((s) => s.group === group);
  const selected = STYLES.find((s) => s.id === selectedId) ?? STYLES[0];
  const px = SIZES[size].px;

  const p: RP = useMemo(
    () => ({ i1, i2, c: primaryColor, bg: backgroundColor, n1, n2, date: dateStr }),
    [i1, i2, primaryColor, backgroundColor, n1, n2, dateStr],
  );

  // Garde le monogramme enregistré toujours synchronisé avec le style/taille/prénoms/couleurs courants.
  useEffect(() => {
    if (!onSelect) return;
    onSelect(buildSvgString(selected, p, px), selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, px, p]);

  function handleCopy() {
    navigator.clipboard.writeText(buildSvgString(selected, p, px)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([buildSvgString(selected, p, px)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monogramme-${i1}${i2}-${selectedId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={wrap}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.4rem' }}>💍</span>
        <div>
          <strong style={{ display: 'block', fontSize: '1rem' }}>50 logos monogrammes</strong>
          <span style={{ fontSize: '0.8rem', opacity: 0.65 }}>
            Initiales : <strong>{i1} &amp; {i2}</strong> · choisissez un style et une taille
          </span>
        </div>
      </div>

      {/* Group filter tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            style={{
              ...tabBtn,
              background: group === g ? primaryColor : '#f5f5f5',
              color: group === g ? '#fff' : '#555',
              borderColor: group === g ? primaryColor : '#e0e0e0',
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Grid of mini previews */}
      <div style={grid}>
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.label}
            onClick={() => setSelectedId(s.id)}
            style={{
              ...gridItem,
              border: selectedId === s.id ? `2px solid ${primaryColor}` : '2px solid #e8e8e8',
              background: selectedId === s.id ? `${primaryColor}10` : '#fafafa',
            }}
          >
            <div style={{ width: 74, height: 74, pointerEvents: 'none' }}>
              <MonogramSvg style={s} p={p} px={74} />
            </div>
            <span style={{ fontSize: '0.6rem', color: '#777', marginTop: 2, textAlign: 'center', lineHeight: 1.2 }}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Large preview + size selector */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: backgroundColor,
            borderRadius: 12,
            padding: 12,
            border: '1px solid #e8e8e8',
            minWidth: 180,
          }}
        >
          <MonogramSvg style={selected} p={p} px={px} />
        </div>

        {/* Size picker + info */}
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.85rem', color: '#333' }}>{selected.label}</p>
          <p style={{ margin: '0 0 0.8rem', fontSize: '0.76rem', color: '#888' }}>Groupe : {selected.group}</p>

          <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>Taille du logo</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSize(k)}
                style={{
                  ...sizeBtn,
                  background: size === k ? primaryColor : '#f0f0f0',
                  color: size === k ? '#fff' : '#555',
                  borderColor: size === k ? primaryColor : '#ddd',
                }}
              >
                {SIZES[k].label}
                <span style={{ display: 'block', fontSize: '0.6rem', opacity: 0.75 }}>{SIZES[k].px}px</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={actionBtn} onClick={handleCopy}>
          {copied ? '✅ Copié !' : '📋 Copier SVG'}
        </button>
        <button
          type="button"
          style={{ ...actionBtn, background: primaryColor, color: '#fff', borderColor: primaryColor }}
          onClick={handleDownload}
        >
          ⬇️ Télécharger SVG
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const wrap: CSSProperties = { display: 'grid', gap: '0.9rem' };

const tabBtn: CSSProperties = {
  padding: '0.25rem 0.65rem',
  borderRadius: 20,
  border: '1px solid',
  cursor: 'pointer',
  fontSize: '0.76rem',
  fontWeight: 600,
  transition: 'all 0.15s',
};

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
  gap: 8,
  maxHeight: 420,
  overflowY: 'auto',
  paddingRight: 2,
};

const gridItem: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '6px 4px 4px',
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const sizeBtn: CSSProperties = {
  padding: '0.3rem 0.6rem',
  borderRadius: 8,
  border: '1px solid',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontWeight: 700,
  textAlign: 'center',
  minWidth: 42,
};

const actionBtn: CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  borderRadius: 9,
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.82rem',
};
