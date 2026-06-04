import type { WeddingSite } from '../types';
import { getTemplateByTheme } from '../utils/template-selector';

type Props = {
  draft: WeddingSite;
};

export function WeddingSitePreview({ draft }: Props) {
  const Template = getTemplateByTheme(draft.theme, draft.language);
  return (
    <div className="wedding-preview-shell">
      <p className="wedding-preview-label">Aperçu en direct</p>
      <div className="wedding-preview-frame">
        <Template site={draft} />
      </div>
    </div>
  );
}
