import type { CSSProperties } from 'react';

import type { RSVPForm } from './types';

import type { WeddingSite } from '../wedding-sites/types';

import { WeddingRSVPForm } from './WeddingRSVPForm';

type Props = {
  site: WeddingSite;
  form: RSVPForm;
};

export function RSVPPreview({ site, form }: Props) {
  const merged: WeddingSite = { ...site, rsvpForm: form };
  return (
    <div className="wedding-preview-rsvp" style={shell}>
      <p style={lbl}>APERÇU RSVP</p>
      <div style={{ ...frame, pointerEvents: 'none' }}>
        <WeddingRSVPForm slugHint={merged.slug} site={merged} form={form} preview />
      </div>
    </div>
  );
}

const shell: CSSProperties = {
  marginTop: 14,
};

const lbl: CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 800,
  letterSpacing: '0.14em',
  color: '#6D5CE8',
};

const frame: CSSProperties = {
  marginTop: 8,
  maxHeight: 540,
  overflow: 'auto',
  borderRadius: 14,
  border: '1px solid #e5dff8',
  boxShadow: '0 14px 40px rgba(80, 62, 155, 0.08)',
};
