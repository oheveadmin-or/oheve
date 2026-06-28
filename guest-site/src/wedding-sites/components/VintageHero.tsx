/**
 * VintageHero — carte d'invitation ovale (papeterie vintage).
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { VintageTheme as V } from '../themes/VintageTheme';
import { VintageAcanthus, VintageRibbon } from './ornaments/VintageOrnaments';

export type VintageHeroProps = {
  kicker?: string;
  name1: string;
  name2?: string;
  description?: string;
  dateLabel?: string;
  monogramSvg?: string;
  monogramSizePx?: number;
  /** Verset hébraïque affiché en arc au-dessus du logo */
  hebrewQuote?: string;
  /** Parents de la mariée */
  parentsBride?: { father?: string; mother?: string; isDivorced?: boolean };
  /** Parents du marié */
  parentsGroom?: { father?: string; mother?: string; isDivorced?: boolean };
  /** Nom de famille (pour affichage M. et Mme X) */
  brideFamilyName?: string;
  groomFamilyName?: string;
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
    // M. et Mme [FamilyName ou patronyme du père]
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
}: VintageHeroProps) {
  const logoSize = monogramSizePx ? Math.round(Math.min(monogramSizePx * 0.375, 110)) : 52;

  const brideLines = formatParentLine(parentsBride, brideFamilyName);
  const groomLines = formatParentLine(parentsGroom, groomFamilyName);
  const hasParents = brideLines.length > 0 || groomLines.length > 0;

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
      <VintageAcanthus
        width={185}
        color={V.colors.primarySoft}
        opacity={0.9}
        style={{ position: 'absolute', left: '-38px', top: '-3%', height: '106%' }}
      />
      <VintageAcanthus
        flip
        width={185}
        color={V.colors.primarySoft}
        opacity={0.9}
        style={{ position: 'absolute', right: '-38px', top: '-3%', height: '106%' }}
      />

      {/* Cadre ovale double-trait */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(360px, 86%)',
          padding: '2rem 1.7rem 2.4rem',
          border: `${V.borders.frame} solid ${V.colors.primary}`,
          borderRadius: '190px / 150px',
          background: 'rgba(251, 248, 241, 0.86)',
          textAlign: 'center',
          boxShadow: V.shadows.soft,
          overflow: 'hidden',
        }}
      >
        {/* Cadre intérieur */}
        <div
          style={{
            position: 'absolute',
            inset: 9,
            border: `1px solid ${V.colors.primary}66`,
            borderRadius: '180px / 142px',
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

        {/* ── Parents (M. et Mme format) ── */}
        {hasParents && (
          <div
            style={{
              fontFamily: V.fonts.body,
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              color: V.colors.inkMuted,
              lineHeight: 1.6,
              margin: '0 auto 0.6rem',
              maxWidth: 240,
            }}
          >
            {brideLines.map((l, i) => <div key={i}>{l}</div>)}
            {brideLines.length > 0 && groomLines.length > 0 && (
              <div style={{ fontStyle: 'italic', opacity: 0.7, margin: '0.1rem 0', fontSize: '0.65rem' }}>et</div>
            )}
            {groomLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        {/* ── Prénom 1 (script, même police que le 2ème) ── */}
        <div
          style={{
            fontFamily: V.fonts.script,
            fontSize: V.titleSizes.hero,
            color: V.colors.ink,
            lineHeight: 1.05,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
          }}
        >
          {name1}
        </div>

        {/* ── Prénom 2 (script) ── */}
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

        {/* ── Phrase d'accueil (s'adapte à la longueur du texte) ── */}
        {description ? (
          <p
            style={{
              fontFamily: V.fonts.body,
              fontSize: '0.72rem',
              lineHeight: 1.75,
              letterSpacing: '0.08em',
              color: V.colors.inkMuted,
              margin: '0.8rem auto 0',
              maxWidth: 220,
              wordBreak: 'break-word',
            }}
          >
            {description}
          </p>
        ) : null}

        {/* ── Date ── */}
        {dateLabel ? (
          <div
            style={{
              fontFamily: V.fonts.display,
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: V.colors.primary,
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
