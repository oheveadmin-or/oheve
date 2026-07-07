/**
 * VintageCountdown — décompte papeterie vintage.
 *
 * Reproduit exactement la mise en page de l'inspiration :
 *   • accroche centrée en capitales espacées
 *   • « 102 | 12 | 11 | 01 » : grands chiffres serif bleu poussiéreux
 *   • fins séparateurs verticaux entre chaque cellule
 *   • libellés discrets sous chaque chiffre
 *
 * Sur fond clair par défaut (comme l'image). Réutilisé par l'aperçu et le site.
 * 100 % piloté par VintageTheme — aucune couleur en dur.
 */
import { useEffect, useState } from 'react';
import { VintageTheme as V } from '../themes/VintageTheme';

type Props = {
  /** Date cible ISO */
  targetDate: string;
  /** Accroche au-dessus du décompte */
  eyebrow?: string;
  language?: 'fr' | 'he' | 'en';
};

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = new Date(iso).getTime();
  const diff = isNaN(target) ? 0 : Math.max(0, target - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

const LABELS = {
  fr: ['Jours', 'Heures', 'Minutes', 'Secondes'],
  en: ['Days', 'Hours', 'Minutes', 'Seconds'],
  he: ['ימים', 'שעות', 'דקות', 'שניות'],
};

export function VintageCountdown({ targetDate, language = 'fr' }: Props) {
  const c = useCountdown(targetDate);
  const labels = LABELS[language] ?? LABELS.fr;
  const cells = [
    { v: String(c.d), l: labels[0] },
    { v: pad(c.h), l: labels[1] },
    { v: pad(c.m), l: labels[2] },
    { v: pad(c.s), l: labels[3] },
  ];
  return (
    <div style={{ textAlign: 'center', padding: '1.6rem 1rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
        {cells.map((cell, i) => (
          <div key={cell.l} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ minWidth: 'clamp(56px, 16cqw, 72px)', padding: '0 0.2rem' }}>
              <div
                key={cell.v}
                style={{
                  fontFamily: V.countdown.numberFont,
                  fontSize: V.countdown.numberSize,
                  fontWeight: V.countdown.numberWeight,
                  color: V.colors.primary,
                  lineHeight: 1,
                  animation: V.countdown.tickAnimation,
                }}
              >
                {cell.v}
              </div>
              <div
                style={{
                  fontFamily: V.countdown.labelFont,
                  fontSize: V.countdown.labelSize,
                  letterSpacing: V.countdown.labelLetterSpacing,
                  textTransform: V.countdown.labelTransform,
                  color: V.colors.inkMuted,
                  marginTop: '0.5rem',
                }}
              >
                {cell.l}
              </div>
            </div>
            {i < cells.length - 1 && (
              <div
                style={{
                  width: V.countdown.separatorWidth,
                  height: 'clamp(34px, 9cqw, 46px)',
                  background: V.colors.line,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VintageCountdown;
