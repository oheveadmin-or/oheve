import type { CSSProperties } from 'react';
import { useState } from 'react';

type MonogramStyle = 'elegance' | 'luxe' | 'floral' | 'minimal' | 'calligraphic';

type Props = {
  initial1: string; // ex. "J"
  initial2: string; // ex. "D"
  primaryColor?: string;
  backgroundColor?: string;
};

const STYLES: { id: MonogramStyle; label: string; desc: string }[] = [
  { id: 'elegance',    label: 'Élégance',      desc: 'Cadre ovale classique' },
  { id: 'luxe',        label: 'Luxe',           desc: 'Double cadre doré' },
  { id: 'floral',      label: 'Floral',         desc: 'Couronnes de fleurs' },
  { id: 'minimal',     label: 'Minimaliste',    desc: 'Cercle épuré' },
  { id: 'calligraphic',label: 'Calligraphique', desc: 'Script élégant' },
];

function MonogramSVG({ i1, i2, style, primary, bg }: { i1: string; i2: string; style: MonogramStyle; primary: string; bg: string }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = 72;

  if (style === 'minimal') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
        <circle cx={cx} cy={cy} r={108} fill="none" stroke={primary} strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={100} fill="none" stroke={primary} strokeWidth="0.5" />
        <text x={cx - 30} y={cy + 22} fontFamily="Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle" fontWeight="300">{i1}</text>
        <text x={cx + 30} y={cy + 22} fontFamily="Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle" fontWeight="300">{i2}</text>
        <text x={cx} y={cy + 26} fontFamily="Georgia, serif" fontSize={24} fill={primary} textAnchor="middle" fontStyle="italic" opacity="0.7">&amp;</text>
      </svg>
    );
  }

  if (style === 'elegance') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
        <ellipse cx={cx} cy={cy} rx={108} ry={108} fill={bg} stroke={primary} strokeWidth="1.5" />
        <ellipse cx={cx} cy={cy} rx={100} ry={100} fill="none" stroke={primary} strokeWidth="0.6" />
        {/* Top ornament */}
        <path d={`M ${cx} ${cy - 100} L ${cx - 6} ${cy - 88} L ${cx} ${cy - 82} L ${cx + 6} ${cy - 88} Z`} fill={primary} opacity="0.6" />
        {/* Bottom ornament */}
        <path d={`M ${cx} ${cy + 100} L ${cx - 6} ${cy + 88} L ${cx} ${cy + 82} L ${cx + 6} ${cy + 88} Z`} fill={primary} opacity="0.6" />
        {/* Side decorations */}
        <line x1={cx - 108} y1={cy} x2={cx - 72} y2={cy} stroke={primary} strokeWidth="1" opacity="0.4" />
        <line x1={cx + 72} y1={cy} x2={cx + 108} y2={cy} stroke={primary} strokeWidth="1" opacity="0.4" />
        <text x={cx - 28} y={cy + 25} fontFamily="'Playfair Display', Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle">{i1}</text>
        <text x={cx + 28} y={cy + 25} fontFamily="'Playfair Display', Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle">{i2}</text>
        <text x={cx} y={cy + 28} fontFamily="Georgia, serif" fontSize={22} fill={primary} textAnchor="middle" fontStyle="italic">&amp;</text>
      </svg>
    );
  }

  if (style === 'luxe') {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="12" width={size - 24} height={size - 24} rx="6" fill={bg} stroke={primary} strokeWidth="2" />
        <rect x="20" y="20" width={size - 40} height={size - 40} rx="4" fill="none" stroke={primary} strokeWidth="0.7" />
        {/* Corner ornaments */}
        {([[20,20],[size-20,20],[20,size-20],[size-20,size-20]] as [number,number][]).map(([x,y],i) => {
          const dx = i % 2 === 0 ? 1 : -1;
          const dy = i < 2 ? 1 : -1;
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={x + dx*18} y2={y} stroke={primary} strokeWidth="2" />
              <line x1={x} y1={y} x2={x} y2={y + dy*18} stroke={primary} strokeWidth="2" />
            </g>
          );
        })}
        {/* Horizontal rule */}
        <line x1={36} y1={cy + 46} x2={size - 36} y2={cy + 46} stroke={primary} strokeWidth="0.6" opacity="0.5" />
        <text x={cx - 28} y={cy + 22} fontFamily="'Playfair Display', Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle" fontWeight="700">{i1}</text>
        <text x={cx + 28} y={cy + 22} fontFamily="'Playfair Display', Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle" fontWeight="700">{i2}</text>
        <text x={cx} y={cy + 25} fontFamily="Georgia, serif" fontSize={20} fill={primary} textAnchor="middle" fontStyle="italic" opacity="0.8">&amp;</text>
        <text x={cx} y={cy + 60} fontFamily="Georgia, serif" fontSize={11} fill={primary} textAnchor="middle" letterSpacing="0.2em" opacity="0.6">✦ ✦ ✦</text>
      </svg>
    );
  }

  if (style === 'floral') {
    const petals = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const r = 112;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const pr = 7;
      return { px, py, pr, angle };
    });
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
        {/* Petal ring */}
        {petals.map((p, i) => (
          <ellipse key={i} cx={p.px} cy={p.py} rx={p.pr} ry={p.pr * 1.6}
            fill={primary} opacity="0.18"
            transform={`rotate(${p.angle * 180 / Math.PI + 90}, ${p.px}, ${p.py})`} />
        ))}
        <circle cx={cx} cy={cy} r={94} fill={bg} stroke={primary} strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r={86} fill="none" stroke={primary} strokeWidth="0.5" strokeDasharray="4 3" />
        {/* Leaf accents top/bottom */}
        <path d={`M ${cx} ${cy - 90} Q ${cx + 10} ${cy - 70} ${cx} ${cy - 55} Q ${cx - 10} ${cy - 70} ${cx} ${cy - 90}`} fill={primary} opacity="0.3" />
        <path d={`M ${cx} ${cy + 90} Q ${cx + 10} ${cy + 70} ${cx} ${cy + 55} Q ${cx - 10} ${cy + 70} ${cx} ${cy + 90}`} fill={primary} opacity="0.3" />
        <text x={cx - 28} y={cy + 24} fontFamily="Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle" fontStyle="italic">{i1}</text>
        <text x={cx + 28} y={cy + 24} fontFamily="Georgia, serif" fontSize={fontSize} fill={primary} textAnchor="middle" fontStyle="italic">{i2}</text>
        <text x={cx} y={cy + 26} fontFamily="Georgia, serif" fontSize={20} fill={primary} textAnchor="middle" fontStyle="italic" opacity="0.7">&amp;</text>
      </svg>
    );
  }

  // calligraphic
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <circle cx={cx} cy={cy} r={108} fill={bg} stroke={primary} strokeWidth="1" />
      {/* Swash lines */}
      <path d={`M ${cx - 95} ${cy - 20} Q ${cx - 60} ${cy - 55} ${cx} ${cy - 62} Q ${cx + 60} ${cy - 55} ${cx + 95} ${cy - 20}`}
        fill="none" stroke={primary} strokeWidth="1" opacity="0.35" />
      <path d={`M ${cx - 95} ${cy + 30} Q ${cx - 60} ${cy + 65} ${cx} ${cy + 70} Q ${cx + 60} ${cy + 65} ${cx + 95} ${cy + 30}`}
        fill="none" stroke={primary} strokeWidth="1" opacity="0.35" />
      <text x={cx - 26} y={cy + 26} fontFamily="'Dancing Script', 'Pacifico', Georgia, serif" fontSize={80} fill={primary} textAnchor="middle" fontStyle="italic" fontWeight="700">{i1}</text>
      <text x={cx + 26} y={cy + 26} fontFamily="'Dancing Script', 'Pacifico', Georgia, serif" fontSize={80} fill={primary} textAnchor="middle" fontStyle="italic" fontWeight="700">{i2}</text>
      <text x={cx} y={cy + 28} fontFamily="Georgia, serif" fontSize={28} fill={primary} textAnchor="middle" fontStyle="italic">&amp;</text>
    </svg>
  );
}

type FullProps = {
  groomName: string;
  brideName: string;
  primaryColor?: string;
  backgroundColor?: string;
  onSelect?: (svgString: string, style: MonogramStyle) => void;
};

export function MonogramGenerator({ groomName, brideName, primaryColor = '#6b6b4f', backgroundColor = '#faf7f2', onSelect }: FullProps) {
  const i1 = (brideName.trim()[0] ?? 'A').toUpperCase();
  const i2 = (groomName.trim()[0] ?? 'B').toUpperCase();
  const [selected, setSelected] = useState<MonogramStyle>('elegance');
  const [copied, setCopied] = useState(false);

  function getSvgString(style: MonogramStyle) {
    const wrapper = document.getElementById(`monogram-svg-${style}`);
    const svg = wrapper?.querySelector('svg');
    return svg?.outerHTML ?? '';
  }

  function handleSelect(style: MonogramStyle) {
    setSelected(style);
    const svg = getSvgString(style);
    onSelect?.(svg, style);
  }

  function handleCopy() {
    const svg = getSvgString(selected);
    navigator.clipboard.writeText(svg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const svg = getSvgString(selected);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monogramme-${i1}${i2}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: '1.3rem' }}>💍</span>
        <div>
          <strong style={{ display: 'block' }}>Générateur de logo monogramme</strong>
          <span style={{ fontSize: '0.82rem', opacity: 0.75 }}>
            {i1}{i2} — {STYLES.length} styles disponibles
          </span>
        </div>
      </div>

      {/* Style selector */}
      <div style={stylesRow}>
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleSelect(s.id)}
            style={{
              ...styleBtn,
              background: selected === s.id ? '#5b4fd6' : '#f8f6ff',
              color: selected === s.id ? '#fff' : '#3d3580',
              borderColor: selected === s.id ? '#5b4fd6' : '#dcd7f7',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Preview grid — all styles hidden except selected */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        {STYLES.map((s) => (
          <div
            key={s.id}
            id={`monogram-svg-${s.id}`}
            style={{ display: selected === s.id ? 'block' : 'none' }}
          >
            <MonogramSVG i1={i1} i2={i2} style={s.id} primary={primaryColor} bg={backgroundColor} />
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.8rem', textAlign: 'center', color: '#64748b', marginBottom: '0.75rem' }}>
        {STYLES.find(s => s.id === selected)?.desc}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={actionBtn} onClick={handleCopy}>
          {copied ? '✅ Copié !' : '📋 Copier SVG'}
        </button>
        <button type="button" style={{ ...actionBtn, background: '#5b4fd6', color: '#fff', borderColor: '#5b4fd6' }} onClick={handleDownload}>
          ⬇️ Télécharger SVG
        </button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = { display: 'grid', gap: '0.85rem' };
const header: CSSProperties = { display: 'flex', gap: 10, alignItems: 'flex-start' };
const stylesRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const styleBtn: CSSProperties = {
  padding: '0.3rem 0.7rem',
  borderRadius: 20,
  border: '1px solid',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
};
const actionBtn: CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.5rem',
  borderRadius: 9,
  border: '1px solid #dcd7f7',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '0.82rem',
};
