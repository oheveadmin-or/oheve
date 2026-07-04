/**
 * VintageHero — carte d'invitation ovale (papeterie vintage).
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { useEffect, useState } from 'react';
import type { ParentTitleStyle } from '../types';
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

type ParentsBlock = { father?: string; mother?: string; isDivorced?: boolean; titleStyle?: ParentTitleStyle };

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
};

export type VintageFamiliesProps = {
  parentsBride?: ParentsBlock;
  parentsGroom?: ParentsBlock;
  brideFamilyName?: string;
  groomFamilyName?: string;
  grandparentsBride?: { grandfather?: string; grandmother?: string };
  grandparentsGroom?: { grandfather?: string; grandmother?: string };
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
function formatParentLine(parents: ParentsBlock | undefined, familyName: string | undefined): string[] {
  if (!parents) return [];
  const { father, mother, isDivorced, titleStyle = 'couple' } = parents;
  if (!father && !mother && !familyName) return [];

  const lastName = (full?: string) => (full ? full.trim().split(/\s+/).slice(-1)[0] : '');
  const name = familyName || lastName(father) || lastName(mother);

  // Divorcés : toujours une ligne par parent
  if (isDivorced) {
    const lines: string[] = [];
    if (father) lines.push(`M. ${father}`);
    if (mother) lines.push(`Mme ${mother}`);
    return lines;
  }

  // Formule explicite choisie dans le générateur
  if (titleStyle === 'mr') return name ? [`M. ${name}`] : [];
  if (titleStyle === 'mme') return name ? [`Mme ${name}`] : [];
  return name ? [`M. et Mme ${name}`] : [];
}

/** Formate un bloc grands-parents "M. et Mme NOM" */
function formatGrandparentLine(
  gp: { grandfather?: string; grandmother?: string } | undefined,
): string[] {
  if (!gp) return [];
  const { grandfather, grandmother } = gp;
  if (!grandfather && !grandmother) return [];
  // Utilise le nom de famille du grand-père, sinon de la grand-mère
  const name =
    (grandfather ? grandfather.trim().split(/\s+/).slice(-1)[0] : '') ||
    (grandmother ? grandmother.trim().split(/\s+/).slice(-1)[0] : '');
  return name ? [`M. et Mme ${name}`] : [];
}

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
}: VintageHeroProps) {
  const logoSize = monogramSizePx ? Math.round(Math.min(monogramSizePx * 0.375, 110)) : 52;
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
            fontFamily: V.fonts.script,
            fontSize: V.titleSizes.script,
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
              fontFamily: V.fonts.script,
              fontSize: V.titleSizes.script,
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
              fontFamily: V.fonts.body,
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
              fontFamily: V.fonts.display,
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
                  fontFamily: V.fonts.body,
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
                  fontFamily: V.fonts.body,
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

/** Déduit le nom de famille à afficher en en-tête de colonne */
function deriveFamilyName(
  explicit: string | undefined,
  parents: ParentsBlock | undefined,
): string {
  if (explicit?.trim()) return explicit.trim();
  const last = (full?: string) => (full ? full.trim().split(/\s+/).slice(-1)[0] : '');
  return last(parents?.father) || last(parents?.mother) || '';
}

/** Une colonne « famille » (en-tête + parents + grands-parents) */
function FamilyColumn({
  familyName,
  parentLines,
  grandparentLines,
}: {
  familyName: string;
  parentLines: string[];
  grandparentLines: string[];
}) {
  if (parentLines.length === 0 && grandparentLines.length === 0) return null;
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>
      {familyName ? (
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
          Famille {familyName}
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
        {parentLines.map((l, i) => <div key={`p${i}`}>{l}</div>)}
        {grandparentLines.length > 0 ? (
          <div style={{ opacity: 0.78, fontSize: '0.68rem', marginTop: '0.3rem' }}>
            {grandparentLines.map((l, i) => <div key={`g${i}`}>{l}</div>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * VintageFamilies — bloc « familles » affiché SOUS le décompte.
 * Deux colonnes : côté mariée (gauche) · côté marié (droite).
 */
export function VintageFamilies({
  parentsBride,
  parentsGroom,
  brideFamilyName,
  groomFamilyName,
  grandparentsBride,
  grandparentsGroom,
}: VintageFamiliesProps) {
  const brideLines = formatParentLine(parentsBride, brideFamilyName);
  const groomLines = formatParentLine(parentsGroom, groomFamilyName);
  const gpBrideLines = formatGrandparentLine(grandparentsBride);
  const gpGroomLines = formatGrandparentLine(grandparentsGroom);

  const brideHas = brideLines.length > 0 || gpBrideLines.length > 0;
  const groomHas = groomLines.length > 0 || gpGroomLines.length > 0;
  if (!brideHas && !groomHas) return null;

  const brideFam = deriveFamilyName(brideFamilyName, parentsBride);
  const groomFam = deriveFamilyName(groomFamilyName, parentsGroom);

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
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '1.4rem',
          maxWidth: 460,
          margin: '0 auto',
        }}
      >
        {/* Côté mariée (gauche) */}
        <FamilyColumn familyName={brideFam} parentLines={brideLines} grandparentLines={gpBrideLines} />

        {/* Filet vertical de séparation si les deux côtés sont présents */}
        {brideHas && groomHas ? (
          <div style={{ alignSelf: 'stretch', width: 1, background: V.colors.line, opacity: 0.7, flex: '0 0 auto' }} />
        ) : null}

        {/* Côté marié (droite) */}
        <FamilyColumn familyName={groomFam} parentLines={groomLines} grandparentLines={gpGroomLines} />
      </div>
    </div>
  );
}

export default VintageHero;
