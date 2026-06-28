/**
 * VintageHero — carte d'invitation ovale (papeterie vintage).
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import type { ParentTitleStyle } from '../types';
import { VintageTheme as V } from '../themes/VintageTheme';
import { VintageAcanthus, VintageRibbon, VintageCorner, VintageFrameTop, VintageFrameBottom } from './ornaments/VintageOrnaments';

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

/** Verset hébraïque (פסוק) — ligne droite, centrée, lisible (RTL) */
function HebrewVerse({ text }: { text: string }) {
  const clean = text.replace(/[֑-ׇ]/g, '');
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', serif",
        fontSize: '1.05rem',
        lineHeight: 1.7,
        color: V.colors.primary,
        textAlign: 'center',
        margin: '0 auto 0.7rem',
        maxWidth: '92%',
        opacity: 0.9,
      }}
    >
      {clean}
    </div>
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

  return (
    <div
      style={{
        position: 'relative',
        background: V.backgrounds.card,
        backgroundImage: V.backgrounds.paper,
        padding: '2.4rem 1rem 2.8rem',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* ─ Gauche / Droite : acanthes pleine hauteur ─ */}
      <VintageAcanthus
        width={210} color={V.colors.primarySoft} opacity={0.55}
        style={{ position: 'absolute', left: '-52px', top: '-8%', height: '118%' }}
      />
      <VintageAcanthus
        flip width={210} color={V.colors.primarySoft} opacity={0.55}
        style={{ position: 'absolute', right: '-52px', top: '-8%', height: '118%' }}
      />
      <VintageAcanthus
        width={200} color={V.colors.primary} opacity={0.35}
        style={{ position: 'absolute', left: '-45px', top: '-8%', height: '118%' }}
      />
      <VintageAcanthus
        flip width={200} color={V.colors.primary} opacity={0.35}
        style={{ position: 'absolute', right: '-45px', top: '-8%', height: '118%' }}
      />

      {/* ─ Haut : cadre feuillagé horizontal ─ */}
      <VintageFrameTop
        width="100%" color={V.colors.primarySoft} opacity={0.6}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      />
      <VintageFrameTop
        width="100%" color={V.colors.primary} opacity={0.35}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      />

      {/* ─ Bas : cadre feuillagé horizontal retourné ─ */}
      <VintageFrameBottom
        width="100%" color={V.colors.primarySoft} opacity={0.6}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      />
      <VintageFrameBottom
        width="100%" color={V.colors.primary} opacity={0.35}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      />

      {/* ─ 4 coins ─ */}
      <VintageCorner width={80} height={80} color={V.colors.primary} opacity={0.5}
        style={{ position: 'absolute', top: 4, left: 4 }} />
      <VintageCorner width={80} height={80} color={V.colors.primary} opacity={0.5}
        style={{ position: 'absolute', top: 4, right: 4, transform: 'scaleX(-1)' }} />
      <VintageCorner width={80} height={80} color={V.colors.primary} opacity={0.5}
        style={{ position: 'absolute', bottom: 4, left: 4, transform: 'scaleY(-1)' }} />
      <VintageCorner width={80} height={80} color={V.colors.primary} opacity={0.5}
        style={{ position: 'absolute', bottom: 4, right: 4, transform: 'scale(-1,-1)' }} />

      {/* Cadre ovale double-trait */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(360px, 86%)',
          padding: '2.2rem 1.7rem 2.6rem',
          border: `${V.borders.frame} solid ${V.colors.primary}`,
          borderRadius: '200px / 160px',
          background: 'rgba(247, 244, 237, 0.90)',
          textAlign: 'center',
          boxShadow: V.shadows.soft,
          overflow: 'hidden',
        }}
      >
        {/* Cadre intérieur (double liseré comme sur le modèle) */}
        <div
          style={{
            position: 'absolute',
            inset: 7,
            border: `1px solid ${V.colors.primary}`,
            borderRadius: '192px / 154px',
            pointerEvents: 'none',
          }}
        />

        {/* ── פסוק hébraïque (ligne droite, lisible) ── */}
        {hebrewQuote ? (
          <HebrewVerse text={hebrewQuote} />
        ) : (
          <div style={{ height: '0.5rem' }} />
        )}

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
            margin: '1.2rem auto 0',
          }}
        />
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
        background: V.backgrounds.page,
        backgroundImage: V.backgrounds.paper,
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
