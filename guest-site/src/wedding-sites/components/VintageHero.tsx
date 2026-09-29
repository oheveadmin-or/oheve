/**
 * VintageHero — carte d'invitation ovale (papeterie vintage).
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { useEffect, useState } from 'react';
import type { WeddingTheme } from '../types';
import { TITLE_SIZE_SCALE } from '../types';
import type { ResolvedFamilyColumn } from '../templates/templateParts';
import { vintageTokens } from '../themes/VintageTheme';
import { VintageRibbon, VintageDamaskField } from './ornaments/VintageOrnaments';
import { HebrewVerseArc } from './HebrewVerseArc';
import { FloralLayer } from '../templates/PatternOverlay';

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

/**
 * Géométrie du פסוק dans la carte ovale, en unités SVG, dans le repère de la
 * carte de référence (340 px de large, bord intérieur du cadre = padding-box).
 * Le SVG s'étend sur toute la largeur intérieure de la carte et se met à
 * l'échelle avec elle : l'arc reste concentrique au cintre du double liseré
 * quelle que soit la largeur réelle (296 px sur téléphone, 340 px sur ordinateur).
 *
 * Cintre du liseré intérieur ≈ centre (170, 150), rayons 161 × 141.
 * Ligne de base du verset : rayons 141 × 121 — la hampe du ל (la plus haute,
 * ≈ 0,8 corps en Frank Ruhl Libre) reste à 6,5–8 unités du liseré pour toutes
 * les tailles de police possibles (mesuré à l'encre réelle).
 */
const VERSE_ARC = {
  width: 340,
  centerY: 150,
  rx: 141,
  ry: 121,
  /** ≈ 155° : le verset descend le long du cintre, sans devenir vertical */
  maxSpread: 2.7,
  /** Plafond des versets courts : au-delà, les lettres frôleraient le liseré */
  maxFontSize: 17,
  minFontSize: 10.5,
  /**
   * Hauteur réservée dans le flux : le logo commence juste sous le haut du
   * verset et se niche dans le creux de l'arc (au lieu d'être repoussé sous
   * les extrémités du verset).
   */
  layoutHeight: 50,
} as const;

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
  /** Masque le titre de chaque colonne (comme Éditorial Rayures) — seuls les noms restent visibles */
  hideTitles?: boolean;
  /** Thème live — pilote la palette quand une combinaison est active */
  theme?: WeddingTheme;
};

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

  // Couleurs : palette de la combinaison choisie, sinon identité Vintage d'origine
  const V = vintageTokens(theme);

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
  const detectedFloralBg = useFloralBgUrl();

  // Quand une combinaison de couleurs fournit son motif, il REMPLACE le fond
  // baroque bleu du modèle — au même endroit (autour de la carte ovale) et
  // nulle part ailleurs : le reste de la page ne change que de couleurs.
  const comboFloral = Boolean(theme?.floralPattern);
  const floralBg = comboFloral ? null : detectedFloralBg;

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: V.colors.cream,
        backgroundImage: comboFloral ? undefined : floralBg ? `url('${floralBg}')` : V.backgrounds.paper,
        backgroundSize: floralBg ? '760px auto' : undefined,
        backgroundRepeat: floralBg ? 'repeat' : undefined,
        backgroundPosition: 'center top',
        padding: '2.4rem 1rem 2.8rem',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        // Conteneur de requête : la hauteur de la carte à verset s'exprime en
        // `cqw` (largeur réelle, y compris dans l'aperçu iPhone mis à l'échelle)
        ...(hebrewQuote ? { containerType: 'inline-size' as const } : null),
      }}
    >
      {/* ─ Fond floral : motif de la combinaison s'il y en a une, sinon image
          réelle du modèle si présente, sinon motif SVG dense. ─ */}
      {comboFloral && theme ? <FloralLayer theme={theme} /> : null}
      {!floralBg && !comboFloral && <VintageDamaskField soft={V.colors.primarySoft} deep={V.colors.primary} />}

      {/* Cadre ovale double-trait — vertical, façon modèle */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'min(340px, 82%)',
          // Avec un verset, la hauteur minimale suit la LARGEUR de la carte
          // (proportion 340 × 560, en unités de conteneur) au lieu de la fenêtre
          // (`vh`), qui laissait un grand vide entre le verset et le logo. Pas
          // d'`aspect-ratio` : avec `overflow: hidden` il fige la hauteur et
          // rognerait un contenu long — ici la carte grandit toujours avec lui.
          // (0,82 × 560 / 340 ≈ 135cqw, la carte faisant 82 % du conteneur.)
          minHeight: hebrewQuote ? 'min(560px, 135cqw)' : 'clamp(640px, 84vh, 720px)',
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

        {/* ── פסוק hébraïque — épouse le cintre du double liseré ── */}
        {hebrewQuote ? (
          <div
            style={{
              // Annule le padding de la carte : le SVG couvre toute la largeur
              // intérieure et partage le repère du cadre (arc concentrique).
              alignSelf: 'stretch',
              margin: '-2.2rem -2rem 0',
              flexShrink: 0,
            }}
          >
            <HebrewVerseArc
              text={hebrewQuote}
              color={V.colors.primary}
              width={VERSE_ARC.width}
              rx={VERSE_ARC.rx}
              ry={VERSE_ARC.ry}
              centerY={VERSE_ARC.centerY}
              layoutHeight={VERSE_ARC.layoutHeight}
              maxSpread={VERSE_ARC.maxSpread}
              maxFontSize={VERSE_ARC.maxFontSize}
              minFontSize={VERSE_ARC.minFontSize}
              style={{ width: '100%', height: 'auto', maxWidth: 'none' }}
              // Verset trop long pour l'arc : ligne centrée, dans le cintre
              fallbackStyle={{
                padding: '2.9rem 3.6rem 0.6rem',
                fontSize: '0.85rem',
                lineHeight: 1.6,
              }}
            />
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
export function VintageFamilies({ columns, hideTitles, theme }: VintageFamiliesProps) {
  const V = vintageTokens(theme);
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
              {col.title && !hideTitles ? (
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
