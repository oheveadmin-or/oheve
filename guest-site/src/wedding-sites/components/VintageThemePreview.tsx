/**
 * VintageThemePreview — aperçu visuel du preset « Vintage ».
 *
 * Affiché DÈS que le client sélectionne le thème, avant toute mise en page :
 * il voit immédiatement le rendu de son thème. Réutilise EXACTEMENT les mêmes
 * composants que le site publié (VintageHero, VintageCountdown) → rendu
 * strictement identique. 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { VintageTheme as V } from '../themes/VintageTheme';
import { VintageHero } from './VintageHero';
import { VintageCountdown } from './VintageCountdown';
import {
  VintageDivider,
  VintageRibbon,
  VintageCircleBorder,
  VintageCorner,
} from './ornaments/VintageOrnaments';

type Props = {
  groomName?: string;
  brideName?: string;
  /** Date cible ISO pour le compteur (défaut : +102 jours, clin d'œil à l'inspiration) */
  targetDate?: string;
  title?: string;
};

export function VintageThemePreview({
  groomName = 'David',
  brideName = 'Sarah',
  targetDate,
  title,
}: Props) {
  const iso = targetDate ?? new Date(Date.now() + 102 * 86400000).toISOString();
  const hasTwoNames = !!(groomName?.trim() && brideName?.trim());

  return (
    <div
      style={{
        fontFamily: V.fonts.body,
        background: V.backgrounds.page,
        backgroundImage: V.backgrounds.paper,
        color: V.colors.ink,
        borderRadius: V.radius.card,
        overflow: 'hidden',
        boxShadow: V.shadows.card,
        border: `1px solid ${V.colors.line}`,
      }}
    >
      {/* ── HERO : carte d'invitation ovale (identique au site publié) ── */}
      <VintageHero
        name1={hasTwoNames ? brideName : title || brideName}
        name2={hasTwoNames ? `& ${groomName}` : undefined}
        description="Nous vous convions à célébrer notre union"
        dateLabel="12 · 09 · 2026"
      />

      {/* ── Message « chers invités » + ruban ─────────────────────── */}
      <div style={{ textAlign: 'center', padding: '1.6rem 1.8rem 0.4rem' }}>
        <VintageRibbon width={120} color={V.colors.primary} style={{ marginBottom: '0.4rem' }} />
        <div style={{ fontFamily: V.fonts.display, fontSize: '1.5rem', color: V.colors.primary, letterSpacing: '0.04em' }}>
          Chers invités
        </div>
        <p style={{ color: V.colors.inkMuted, fontSize: V.text.bodySize, lineHeight: V.text.bodyLineHeight, maxWidth: 380, margin: '0.6rem auto 0' }}>
          Nous comptons sur votre présence pour partager ce moment unique
          et inoubliable à nos côtés.
        </p>
        <VintageDivider width={180} color={V.colors.primary} style={{ marginTop: '1rem' }} />
      </div>

      {/* ── DÉCOMPTE (identique au site publié) ────────────────────── */}
      <VintageCountdown targetDate={iso} language="fr" />

      {/* ── SECTION BLEUE : formulaire RSVP ───────────────────────── */}
      <div style={{ padding: '1.4rem 1.4rem 0' }}>
        <div
          style={{
            background: V.backgrounds.blueSection,
            color: V.colors.onPrimary,
            borderRadius: V.radius.blueSection,
            padding: V.spacing.bluePadding,
            boxShadow: V.shadows.blue,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: V.fonts.display, fontSize: V.titleSizes.section, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Confirmation
            </div>
            <p style={{ color: V.colors.onPrimaryMuted, fontSize: '0.82rem', margin: '0.5rem 0 1.4rem' }}>
              Merci de confirmer votre présence avant le 10.09.2026.
            </p>
          </div>

          <label style={{ display: 'block', marginBottom: '1.4rem' }}>
            <span style={V.forms.label}>Nom &amp; prénom</span>
            <div style={{ ...V.forms.field, marginTop: '0.5rem', height: 22 }} />
          </label>

          <span style={V.forms.label}>Présence à la cérémonie</span>
          <div style={{ marginTop: '0.7rem', display: 'grid', gap: V.forms.radio.gap }}>
            {[
              { label: 'Je serai présent · nous serons présents', active: true },
              { label: 'Je ne pourrai pas venir', active: false },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: V.forms.radio.gap }}>
                <span
                  style={{
                    width: V.forms.radio.size,
                    height: V.forms.radio.size,
                    borderRadius: V.radius.pill,
                    border: V.forms.radio.border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {r.active && (
                    <span style={{ width: 8, height: 8, borderRadius: V.radius.pill, background: V.forms.radio.activeColor }} />
                  )}
                </span>
                <span
                  style={{
                    fontSize: V.forms.radio.labelSize,
                    letterSpacing: V.forms.radio.labelLetterSpacing,
                    textTransform: V.forms.radio.labelTransform,
                    color: V.colors.onPrimary,
                  }}
                >
                  {r.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
            <button type="button" style={{ ...V.buttons.primary, cursor: 'pointer' }}>
              Envoyer
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER bleu : sceau + icônes ──────────────────────────── */}
      <div style={{ padding: '1.4rem' }}>
        <div
          style={{
            background: V.footer.background,
            color: V.footer.color,
            borderRadius: V.footer.borderRadius,
            padding: V.footer.padding,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <VintageCorner width={44} style={{ position: 'absolute', top: 10, left: 10 }} color={V.colors.lineOnPrimary} />
          <VintageCorner width={44} style={{ position: 'absolute', top: 10, right: 10, transform: 'scaleX(-1)' }} color={V.colors.lineOnPrimary} />
          <div style={{ display: 'inline-flex', position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem' }}>
            <VintageCircleBorder width={90} color={V.colors.lineOnPrimary} style={{ position: 'absolute', inset: 0 }} />
            <span style={{ fontFamily: V.fonts.script, fontSize: '2rem', color: V.colors.onPrimary }}>
              {(brideName[0] ?? '') + (groomName[0] ?? '')}
            </span>
          </div>
          <div style={{ fontFamily: V.fonts.display, fontSize: V.titleSizes.section, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            À très bientôt
          </div>
          <p style={{ color: V.footer.mutedColor, fontSize: '0.78rem', maxWidth: 320, margin: '0.6rem auto 1.2rem', letterSpacing: V.footer.letterSpacing }}>
            Pour toute question, contactez-nous — nous avons hâte de partager ce moment avec vous.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: V.icons.gap }}>
            {['✉', '☎', '✦'].map((g) => (
              <span
                key={g}
                style={{
                  width: V.icons.circleSize,
                  height: V.icons.circleSize,
                  borderRadius: V.radius.pill,
                  border: V.icons.circleBorder,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: V.icons.color,
                  fontSize: V.icons.size,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VintageThemePreview;
