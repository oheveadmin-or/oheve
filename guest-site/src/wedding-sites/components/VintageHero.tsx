/**
 * VintageHero — carte d'invitation ovale (papeterie vintage).
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { useEffect, useState } from 'react';
import type { WeddingTheme } from '../types';
import { TITLE_SIZE_SCALE } from '../types';
import type { ResolvedFamilyColumn } from '../templates/templateParts';
import { VintageTheme as V } from '../themes/VintageTheme';
import { VintageRibbon, VintageDamaskField } from './ornaments/VintageOrnaments';

/**
 * Image de fond floral (baroque bleu sur ivoire). Déposer le fichier dans
 * guest-site/public/ sous l'un de ces noms — il est détecté automatiquement.
 * Si aucune image n'est trouvée, on retombe sur le motif SVG VintageDamaskField.
 */
const FLORAL_BG_CANDIDATES = [
  '/vintage-floral-bg.png',
  '/vintage-floral-bg.jpg',
  '/vintage-floral-bg.jpeg',
  '/vintage-floral-bg.webp',
];

function useFloralBgUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const candidate of FLORAL_BG_CANDIDATES) {
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = candidate;
        });
        if (cancelled) return;
        if (ok) { setUrl(candidate); return; }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return url;
}

export type VintageHeroProps = {
  name1: string;
  name2?: string;
  description?: string;
  dateLabel?: string;
  /** Ville (ex. « Paris ») affichée sous la date */
  city?: string;
  /** Lieu précis (ex. « Domaine des Lys ») affiché sous la date */
  venue?: string;
  monogramSvg?: string;
  monogramSizePx?: number;
  hebrewQuote?: string;
  /** Thème live du builder — polices Titres/Prénoms/Texte + taille des prénoms */
  theme?: WeddingTheme;
};

export type VintageFamiliesProps = {
  /** Colonnes familles libres (source unique partagée : getFamilyColumns) */
  columns: ResolvedFamilyColumn[];
};

/**
 * Verset hébraïque (פסוק) — disposé en arc au-dessus du monogramme.
 *
 * Placement lettre par lettre le long d'une ellipse qui épouse l'arrondi
 * du haut de la carte ovale (borderRadius 170/150). `textPath` + RTL +
 * textLength écrasait les glyphes de façon imprévisible selon le navigateur ;
 * ici chaque caractère est positionné et incliné individuellement, dans
 * l'ordre de lecture droite → gauche.
 */
function HebrewVerse({ text }: { text: string }) {
  // On retire les téamim/niqqoud (U+0591–U+05C7) : illisibles à cette taille
  const clean = text.replace(/[֑-ׇ]/g, '').trim();
  if (!clean) return null;

  const chars = Array.from(clean);
  const n = chars.length;

  // Taille de police dégressive pour les longs versets
  const fs = n > 24 ? Math.max(10.5, 15 - (n - 24) * 0.18) : 15;

  // Ellipse concentrique à l'arrondi de la carte (170/150), à l'échelle du panneau
  const w = 280;
  const rx = 126;
  const ry = 108;
  const cx = w / 2;
  const cy = ry + fs + 6; // sommet de l'arc à y = fs + 6

  // Angle total : avance moyenne d'un glyphe (~0.62 em) sur le rayon moyen
  const rAvg = (rx + ry) / 2;
  const spread = Math.min(1.9, (n * fs * 0.62) / rAvg);

  // Hauteur utile : jusqu'aux extrémités de l'arc + la descente des glyphes
  const h = Math.ceil(cy - ry * Math.cos(spread / 2) + fs * 0.9);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-label={clean}
      style={{ display: 'block', margin: '0 auto', maxWidth: '100%', overflow: 'visible' }}
    >
      {chars.map((ch, i) => {
        if (ch === ' ') return null; // l'espace garde son créneau, rien à dessiner
        // RTL : 1er caractère à droite (+spread/2) → dernier à gauche (−spread/2)
        const phi = n === 1 ? 0 : spread / 2 - (i * spread) / (n - 1);
        const x = cx + rx * Math.sin(phi);
        const y = cy - ry * Math.cos(phi);
        // Inclinaison = tangente de l'ellipse au point (et non l'angle polaire)
        const rot = (Math.atan2(ry * Math.sin(phi), rx * Math.cos(phi)) * 180) / Math.PI;
        return (
          <text
            key={i}
            x={x}
            y={y}
            fill={V.colors.primary}
            transform={`rotate(${rot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
            style={{
              fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', serif",
              fontSize: `${fs}px`,
              opacity: 0.9,
              textAnchor: 'middle',
            }}
          >
            {ch}
          </text>
        );
      })}
    </svg>
  );
}

/** Formate un bloc parents selon la formule choisie (couple / M. / Mme) */
export function VintageHero({
  name1,
  name2,
  description,
  dateLabel,
  city,
  venue,
  monogramSvg,
  monogramSizePx,
  hebrewQuote,
  theme,
}: VintageHeroProps) {
  // Plafond relevé à 140 : L (250 px) et XL (320 px) restent distincts
  const logoSize = monogramSizePx ? Math.round(Math.min(monogramSizePx * 0.44, 140)) : 52;

  // Polices pilotées par le builder (Titres / Prénoms), défauts vintage.
  // Le corps garde les petites capitales Cinzel : elles font partie de
  // l'identité du faire-part vintage (le texte des sections suit, lui,
  // la « Police du texte » via la racine du template).
  const F = {
    script: theme?.scriptFontFamily || V.fonts.script,
    display: theme?.titleFontFamily || V.fonts.display,
    body: V.fonts.body,
  };
  const nameScale = TITLE_SIZE_SCALE[theme?.nameSize ?? 'medium'];
  const nameSize = nameScale === 1 ? V.titleSizes.script : `calc(${V.titleSizes.script} * ${nameScale})`;
  const floralBg = useFloralBgUrl();

  return (
    <div
      style={{
        position: 'relative',
        background: V.colors.cream,
        backgroundImage: floralBg ? `url('${floralBg}')` : V.backgrounds.paper,
        backgroundSize: floralBg ? '760px auto' : undefined,
        backgroundRepeat: floralBg ? 'repeat' : undefined,
        backgroundPosition: 'center top',
        padding: '2.4rem 1rem 2.8rem',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* ─ Fond floral : image réelle si présente, sinon motif SVG dense ─ */}
      {!floralBg && <VintageDamaskField soft={V.colors.primarySoft} deep={V.colors.primary} />}

      {/* Cadre ovale double-trait — vertical, façon modèle */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(340px, 82%)',
          minHeight: 'clamp(640px, 84vh, 720px)',
          // Padding vertical symétrique : le contenu reste parfaitement centré
          padding: '2.2rem 2rem',
          border: `${V.borders.frame} solid ${V.colors.primary}`,
          // Cap haut/bas bien arrondi (capsule) — symétrique
          borderRadius: '170px / 150px',
          background: V.colors.ivory,
          textAlign: 'center',
          boxShadow: V.shadows.card,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        {/* Cadre intérieur (double liseré comme sur le modèle) */}
        <div
          style={{
            position: 'absolute',
            inset: 8,
            border: `1px solid ${V.colors.primary}`,
            borderRadius: '162px / 142px',
            pointerEvents: 'none',
          }}
        />

        {/* ── פסוק hébraïque — dans le flux, niché sous l'arrondi du haut ── */}
        {hebrewQuote ? (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              flexShrink: 0,
              marginBottom: '0.2rem',
            }}
          >
            <HebrewVerse text={hebrewQuote} />
          </div>
        ) : null}

        {/* ── Contenu central : centré dans l'espace sous le verset ── */}
        <div
          style={{
            flex: 1,
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
          }}
        >
        {/* ── Logo / monogramme ── */}
        <div
          style={{
            height: logoSize + 8,
            marginBottom: '0.3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden={!monogramSvg}
        >
          {monogramSvg ? (
            <div
              style={{
                width: logoSize,
                height: logoSize,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              dangerouslySetInnerHTML={{
                __html: monogramSvg
                  .replace(/width="[^"]*"/, 'width="100%"')
                  .replace(/height="[^"]*"/, 'height="100%"'),
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: `1.5px dashed ${V.colors.primary}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${V.colors.primary}22` }} />
            </div>
          )}
        </div>

        {/* ── Ruban ── */}
        <VintageRibbon width={104} color={V.colors.primary} style={{ marginTop: '0.2rem', marginBottom: '0.6rem' }} />

        {/* ── Titre 1 — même police script que le titre 2 ── */}
        <div
          style={{
            fontFamily: F.script,
            fontSize: nameSize,
            color: V.colors.ink,
            lineHeight: 1.05,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          {name1}
        </div>

        {/* ── Titre 2 — Great Vibes calligraphique ── */}
        {name2 ? (
          <div
            style={{
              fontFamily: F.script,
              fontSize: nameSize,
              color: V.colors.primary,
              lineHeight: 1.05,
              marginTop: '-0.2rem',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%',
            }}
          >
            {name2}
          </div>
        ) : null}

        {/* ── Phrase d'accueil — Cinzel petites capitales, centrée ── */}
        {description ? (
          <p
            style={{
              fontFamily: F.body,
              fontSize: '0.68rem',
              lineHeight: 1.85,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: V.colors.inkMuted,
              margin: '0.9rem auto 0',
              maxWidth: 210,
              wordBreak: 'break-word',
            }}
          >
            {description}
          </p>
        ) : null}

        {/* ── Date — Playfair Display, grande et centrée ── */}
        {dateLabel ? (
          <div
            style={{
              fontFamily: F.display,
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: V.colors.ink,
              marginTop: '1rem',
            }}
          >
            {dateLabel}
          </div>
        ) : null}

        {/* ── Lieu — salle (en valeur) puis ville ── */}
        {(venue?.trim() || city?.trim()) ? (
          <div style={{ marginTop: '0.8rem' }}>
            {venue?.trim() ? (
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: '0.78rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: V.colors.ink,
                  lineHeight: 1.5,
                }}
              >
                {venue.trim()}
              </div>
            ) : null}
            {city?.trim() ? (
              <div
                style={{
                  fontFamily: F.body,
                  fontSize: '0.66rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: V.colors.inkMuted,
                  marginTop: '0.15rem',
                }}
              >
                {city.trim()}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Petit point final */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: V.colors.primary,
            margin: '0.9rem auto 0',
          }}
        />
        </div>
      </div>
    </div>
  );
}

/**
 * VintageFamilies — bloc « familles » affiché SOUS le décompte.
 * Colonnes libres (titre + lignes) — même structure que tous les thèmes.
 */
export function VintageFamilies({ columns }: VintageFamiliesProps) {
  if (!columns.length) return null;

  return (
    <div
      style={{
        // Pas de fond propre : on s'appuie sur le fond continu de la page
        // (sinon le dégradé « paper » se ré-applique et dessine un rectangle visible).
        background: 'transparent',
        padding: '0.5rem 1.2rem 2.6rem',
        textAlign: 'center',
      }}
    >
      <VintageRibbon width={84} color={V.colors.primary} style={{ margin: '0 auto 0.9rem' }} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: '1.4rem',
          maxWidth: 460,
          margin: '0 auto',
        }}
      >
        {columns.map((col, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {i > 0 ? (
              <div style={{ width: 1, background: V.colors.line, opacity: 0.7, flex: '0 0 auto' }} aria-hidden />
            ) : null}
            <div style={{ flex: '1 1 0', minWidth: 120, textAlign: 'center' }}>
              {col.title ? (
                <div
                  style={{
                    fontFamily: V.fonts.body,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: V.colors.primary,
                    marginBottom: '0.45rem',
                  }}
                >
                  {col.title}
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: V.fonts.body,
                  fontSize: '0.74rem',
                  letterSpacing: '0.08em',
                  color: V.colors.inkMuted,
                  lineHeight: 1.7,
                }}
              >
                {col.lines.map((l, j) => <div key={j}>{l}</div>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VintageHero;
