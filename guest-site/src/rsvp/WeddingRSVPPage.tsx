import type { CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { WeddingRSVPForm } from './WeddingRSVPForm';

import { createDefaultRSVPForm } from './types';

import { useRSVPBundle } from './useRSVPForm';
import { setSiteAccessKey } from '../wedding-sites/services/weddingSiteService';
import {
  filterRsvpFormEvents,
  getActiveInviteToken,
  inviteEventIds,
  setActiveInviteToken,
} from '../wedding-sites/utils/inviteFilter';

export function WeddingRSVPPage() {
  const { slug, token } = useParams<{ slug: string; token?: string }>();
  const [searchParams] = useSearchParams();

  // Site privé : le token d'invitation (ou ?k=) sert de clé d'accès au backend.
  const keyParam = searchParams.get('k');
  if (token) setSiteAccessKey(token);
  else if (keyParam) setSiteAccessKey(keyParam);
  // Mémorise le lien de groupe pour que « ← Site du mariage » montre le même programme filtré.
  if (slug && token) setActiveInviteToken(slug, token);
  else if (slug && keyParam) setActiveInviteToken(slug, null);

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

  // Événements visibles : lien d'invitation (dans l'URL ou mémorisé depuis le site), sinon ?events=
  const eventsParam = searchParams.get('events');
  const linkIds = inviteEventIds(site, token ?? getActiveInviteToken(site.slug));
  const ids = linkIds ?? (eventsParam ? eventsParam.split(',').map((s) => s.trim()) : null);
  const filteredForm = ids ? filterRsvpFormEvents(baseForm, ids) : baseForm;

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
