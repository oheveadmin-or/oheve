/**
 * VintageHero — carte d'invitation ovale (papeterie vintage).
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { VintageTheme as V } from '../themes/VintageTheme';
import { VintageAcanthus, VintageRibbon, VintageCorner, VintageFrameTop, VintageFrameBottom } from './ornaments/VintageOrnaments';

export type VintageHeroProps = {
  kicker?: string;
  name1: string;
  name2?: string;
  description?: string;
  dateLabel?: string;
  monogramSvg?: string;
  monogramSizePx?: number;
  hebrewQuote?: string;
  parentsBride?: { father?: string; mother?: string; isDivorced?: boolean };
  parentsGroom?: { father?: string; mother?: string; isDivorced?: boolean };
  brideFamilyName?: string;
  groomFamilyName?: string;
  grandparentsBride?: { grandfather?: string; grandmother?: string };
  grandparentsGroom?: { grandfather?: string; grandmother?: string };
};

/** Verset hébraïque en petit arc au sommet de l'ovale */
function HebrewVerseArc({ text }: { text: string }) {
  const clean = text.replace(/[֑-ׇ]/g, '');
  return (
    <svg
      viewBox="0 0 300 60"
      style={{ display: 'block', width: 'min(200px, 78%)', height: 'auto', margin: '0 auto 0.2rem', overflow: 'visible' }}
      aria-label={text}
      role="img"
    >
      <defs>
        <path id="vh-hq-arc" d="M 16,54 Q 150,6 284,54" />
      </defs>
      <text
        fontFamily="'Frank Ruhl Libre', 'Noto Serif Hebrew', 'SBL Hebrew', serif"
        fontSize="13"
        fill={V.colors.primary}
        textAnchor="middle"
        opacity="0.85"
      >
        <textPath href="#vh-hq-arc" startOffset="50%">
          {clean}
        </textPath>
      </text>
    </svg>
  );
}

/** Accroche « Invitation au mariage » en arc */
function ArchedKicker({ text }: { text: string }) {
  return (
    <svg
      viewBox="0 0 360 96"
      role="img"
      aria-label={text}
      style={{ display: 'block', width: 'min(240px, 82%)', height: 'auto', aspectRatio: '360 / 96', margin: '0 auto', overflow: 'visible' }}
    >
      <defs>
        <path id="vintage-arc" d="M 24,86 Q 180,6 336,86" />
      </defs>
      <text
        fontFamily={V.fonts.display}
        fontSize="15"
        letterSpacing="4"
        fill={V.colors.primary}
        textAnchor="middle"
      >
        <textPath href="#vintage-arc" startOffset="50%">
          {text.toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
}

/** Formate un bloc parents en "M. et Mme NOM" ou lignes séparées si divorcés */
function formatParentLine(
  parents: { father?: string; mother?: string; isDivorced?: boolean } | undefined,
  familyName: string | undefined,
): string[] {
  if (!parents) return [];
  const { father, mother, isDivorced } = parents;
  if (!father && !mother && !familyName) return [];

  if (!isDivorced) {
    const name =
      familyName ||
      (father ? father.trim().split(/\s+/).slice(-1)[0] : '') ||
      (mother ? mother.trim().split(/\s+/).slice(-1)[0] : '');
    return name ? [`M. et Mme ${name}`] : [];
  }

  // Divorcés : une ligne par parent
  const lines: string[] = [];
  if (father) lines.push(`M. ${father}`);
  if (mother) lines.push(`Mme ${mother}`);
  return lines;
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
  kicker = 'Invitation au mariage',
  name1,
  name2,
  description,
  dateLabel,
  monogramSvg,
  monogramSizePx,
  hebrewQuote,
  parentsBride,
  parentsGroom,
  brideFamilyName,
  groomFamilyName,
  grandparentsBride,
  grandparentsGroom,
}: VintageHeroProps) {
  const logoSize = monogramSizePx ? Math.round(Math.min(monogramSizePx * 0.375, 110)) : 52;

  const brideLines = formatParentLine(parentsBride, brideFamilyName);
  const groomLines = formatParentLine(parentsGroom, groomFamilyName);
  const gpBrideLines = formatGrandparentLine(grandparentsBride);
  const gpGroomLines = formatGrandparentLine(grandparentsGroom);
  const hasParents = brideLines.length > 0 || groomLines.length > 0;
  const hasGrandparents = gpBrideLines.length > 0 || gpGroomLines.length > 0;

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

        {/* ── פסוק hébraïque en arc (au-dessus du logo) ── */}
        {hebrewQuote ? (
          <HebrewVerseArc text={hebrewQuote} />
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

        {/* ── Accroche en arc ── */}
        <ArchedKicker text={kicker} />

        {/* ── Ruban ── */}
        <VintageRibbon width={104} color={V.colors.primary} style={{ marginTop: '-0.4rem', marginBottom: '0.5rem' }} />

        {/* ── Familles (parents + grands-parents) ── */}
        {(hasParents || hasGrandparents) && (
          <div
            style={{
              fontFamily: V.fonts.body,
              fontSize: '0.68rem',
              letterSpacing: '0.1em',
              color: V.colors.inkMuted,
              lineHeight: 1.7,
              margin: '0 auto 0.6rem',
              maxWidth: 240,
              textAlign: 'center',
            }}
          >
            {/* Parents mariée */}
            {brideLines.map((l, i) => <div key={`pb${i}`}>{l}</div>)}
            {/* Séparateur entre les deux côtés */}
            {brideLines.length > 0 && groomLines.length > 0 && (
              <div style={{ fontStyle: 'italic', opacity: 0.6, margin: '0.05rem 0', fontSize: '0.62rem' }}>et</div>
            )}
            {/* Parents marié */}
            {groomLines.map((l, i) => <div key={`pg${i}`}>{l}</div>)}
            {/* Grands-parents (si présents) */}
            {hasGrandparents && (hasParents) && (
              <div style={{ opacity: 0.55, margin: '0.15rem 0 0', fontSize: '0.6rem', letterSpacing: '0.06em' }}>·</div>
            )}
            {gpBrideLines.map((l, i) => <div key={`gpb${i}`} style={{ opacity: 0.78 }}>{l}</div>)}
            {gpBrideLines.length > 0 && gpGroomLines.length > 0 && (
              <div style={{ fontStyle: 'italic', opacity: 0.5, margin: '0.05rem 0', fontSize: '0.62rem' }}>et</div>
            )}
            {gpGroomLines.map((l, i) => <div key={`gpg${i}`} style={{ opacity: 0.78 }}>{l}</div>)}
          </div>
        )}

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

export default VintageHero;
