import type { WeddingSite } from '../types';
import { getTemplateByTheme } from '../utils/template-selector';
import { ErrorBoundary } from '@guest/components/ErrorBoundary';

type Props = {
  draft: WeddingSite;
};

const PREVIEW_SCALE = 0.55;
const PREVIEW_HEIGHT = '78vh';

export function WeddingSitePreview({ draft }: Props) {
  const Template = getTemplateByTheme(draft.theme, draft.language);
  return (
    <div className="wedding-preview-shell">
      <p className="wedding-preview-label">Aperçu en direct</p>
      <div className="wedding-preview-frame">
        <ErrorBoundary>
          <div style={{ width: '100%', height: PREVIEW_HEIGHT, overflowX: 'hidden', overflowY: 'auto' }}>
            <div
              style={{
                transform: `scale(${PREVIEW_SCALE})`,
                transformOrigin: 'top left',
                width: `${Math.round(100 / PREVIEW_SCALE)}%`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <Template site={draft} />
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
