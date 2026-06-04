import type { CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { WeddingRSVPForm } from './WeddingRSVPForm';

import { createDefaultRSVPForm } from './types';

import { useRSVPBundle } from './useRSVPForm';

export function WeddingRSVPPage() {
  const { slug, token } = useParams<{ slug: string; token?: string }>();
  const [searchParams] = useSearchParams();

  const { site, form, loading, err } = useRSVPBundle(slug);

  if (loading) {
    return (
      <main style={center}>
        <p>Chargement…</p>
      </main>
    );
  }

  if (err || !site) {
    return (
      <main style={center}>
        <p style={{ color: '#991b1b', maxWidth: 420 }}>{err ?? 'Mini-site introuvable.'}</p>
      </main>
    );
  }

  const baseForm = form ?? createDefaultRSVPForm(site.id);

  // Resolve which events to show from token or ?events= param
  let filteredForm = baseForm;
  const eventsParam = searchParams.get('events');

  if (token && site.inviteLinks) {
    const link = site.inviteLinks.find((l) => l.token === token);
    if (link && link.eventIds.length > 0) {
      filteredForm = {
        ...baseForm,
        events: baseForm.events.map((e) => ({
          ...e,
          enabled: link.eventIds.includes(e.id) ? e.enabled : false,
        })),
      };
    }
  } else if (eventsParam) {
    const ids = eventsParam.split(',').map((s) => s.trim());
    filteredForm = {
      ...baseForm,
      events: baseForm.events.map((e) => ({
        ...e,
        enabled: ids.includes(e.id) ? e.enabled : false,
      })),
    };
  }

  return <WeddingRSVPForm slugHint={slug ?? site.slug} site={site} form={filteredForm} />;
}

const center: CSSProperties = {
  minHeight: '60vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  textAlign: 'center',
};
