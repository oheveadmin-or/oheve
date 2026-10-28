import { useEffect, useRef, useState } from 'react';

import type { WeddingSite } from '../types';
import { getTemplateByTheme } from '../utils/template-selector';
import { ErrorBoundary } from '@guest/components/ErrorBoundary';
import { EnvelopeOpening } from './EnvelopeOpening';

type Props = {
  draft: WeddingSite;
  /** Incrémenté par le builder (« ▶ Voir ») pour rejouer l'ouverture dans l'aperçu */
  openingReplay?: number;
  /** Nom d'invité écrit sur l'enveloppe rejouée (essai d'un lien personnalisé) */
  openingGuestName?: string;
};

/**
 * Aperçu en direct présenté dans une maquette iPhone : on rend le template à
 * la largeur logique d'un iPhone (390 × 844) puis on met à l'échelle l'écran
 * entier. Le contenu défile à l'intérieur de l'écran comme sur un vrai
 * téléphone. Le template reste non-interactif (pointerEvents: none) pour éviter
 * toute navigation involontaire depuis le builder.
 *
 * L'échelle est ADAPTATIVE : calculée pour que le téléphone entier tienne dans
 * la colonne d'aperçu (largeur) et dans la fenêtre (hauteur), quel que soit
 * l'écran — desktop, portable ou vue mobile compacte.
 *
 * Dimensions logiques d'un iPhone 16 (393 × 852 pt).
 */
const IPHONE_W = 393;
const IPHONE_H = 852;

/** Épaisseur du bezel (padding .iphone-frame) de chaque côté, en px affichés */
const BEZEL = 12;

/** Barre de statut (zone Dynamic Island) — le site scrolle en dessous, comme
 *  sous le chrome de Safari sur un vrai iPhone. Hauteur en px affichés. */
const STATUSBAR_H = 34;

/** Échelle d'affichage : téléphone entier visible, ni trop grand ni trop petit */
function usePhoneScale(shellRef: React.RefObject<HTMLDivElement>) {
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const update = () => {
      const colWidth = el.clientWidth;
      const isSplitMobile = window.innerWidth <= 960;
      // Vue mobile : l'aperçu s'ouvre en plein écran sous la barre « Fermer ✕ »
      const maxH = isSplitMobile ? window.innerHeight - 90 : window.innerHeight - 150;
      const byWidth = (colWidth - BEZEL * 2 - 8) / IPHONE_W;
      const byHeight = (maxH - BEZEL * 2) / IPHONE_H;
      setScale(Math.max(0.35, Math.min(0.8, byWidth, byHeight)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [shellRef]);

  return scale;
}

export function WeddingSitePreview({ draft, openingReplay = 0, openingGuestName }: Props) {
  const Template = getTemplateByTheme(draft.theme, draft.language);
  const shellRef = useRef<HTMLDivElement>(null);
  const scale = usePhoneScale(shellRef);

  const screenW = Math.round(IPHONE_W * scale); // largeur écran affichée
  const screenH = Math.round(IPHONE_H * scale); // hauteur écran affichée
  const scrollH = screenH - STATUSBAR_H;

  // L'enveloppe ne s'affiche dans l'aperçu qu'à la demande (sinon elle masquerait
  // le site pendant toute l'édition) ; elle disparaît une fois ouverte.
  const [envelopeShownFor, setEnvelopeShownFor] = useState(0);
  const showEnvelope =
    (draft.theme.opening === 'envelope' || !!openingGuestName) && openingReplay > 0 && envelopeShownFor !== openingReplay;

  return (
    <div className="wedding-preview-shell" ref={shellRef}>
      <p className="wedding-preview-label">Aperçu en direct · iPhone</p>

      {/* La largeur du cadre inclut le bezel (padding 12px × 2) car
          box-sizing:border-box : sans ça, la zone intérieure du cadre ne
          faisait que screenW − 24px et l'écran (largeur screenW) débordait de
          12px à droite — visible surtout à petite échelle (aperçu mobile). */}
      <div className="iphone-frame" style={{ width: screenW + BEZEL * 2 }}>
        {/* Boutons latéraux */}
        <span className="iphone-btn iphone-btn-silent" />
        <span className="iphone-btn iphone-btn-volup" />
        <span className="iphone-btn iphone-btn-voldown" />
        <span className="iphone-btn iphone-btn-power" />

        {/* Écran */}
        <div className="iphone-screen" style={{ width: screenW, height: screenH }}>
          {/* Barre de statut avec Dynamic Island — le site ne passe pas dessous */}
          <div className="iphone-statusbar" style={{ height: STATUSBAR_H }}>
            <div className="iphone-island" />
          </div>

          <ErrorBoundary>
            <div
              className="iphone-scroll"
              style={{
                width: IPHONE_W,
                height: Math.round(scrollH / scale),
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <div style={{ width: IPHONE_W, pointerEvents: 'none', userSelect: 'none' }}>
                <Template site={draft} />
              </div>
            </div>
            {showEnvelope && (
              <div
                style={{
                  position: 'absolute',
                  top: STATUSBAR_H,
                  left: 0,
                  width: IPHONE_W,
                  height: Math.round(scrollH / scale),
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  zIndex: 4,
                }}
              >
                <EnvelopeOpening
                  key={openingReplay}
                  site={draft}
                  contained
                  guestName={openingGuestName}
                  onDone={() => setEnvelopeShownFor(openingReplay)}
                />
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
