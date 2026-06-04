/**
 * Charger le mariage pour la page RSVP (formulaire défaut si aucune config enregistrée).
 */

import { useCallback, useEffect, useState } from 'react';

import type { RSVPForm } from './types';

import { createDefaultRSVPForm } from './types';

import type { WeddingSite } from '../wedding-sites/types';

import { getWeddingSiteBySlug } from '../wedding-sites/services/weddingSiteService';

export function useRSVPBundle(slug: string | undefined) {
  const [site, setSite] = useState<WeddingSite | null>(null);
  const [form, setForm] = useState<RSVPForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const s = slug?.trim();
    if (!s) {
      setErr('Slug manquant');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const ws = await getWeddingSiteBySlug(s);
      if (!ws) {
        setErr('Mini-site introuvable.');
        setSite(null);
        setForm(null);
        return;
      }
      setSite(ws);
      setForm(ws.rsvpForm ?? createDefaultRSVPForm(ws.id));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { site, form, setForm, loading, err, reload };
}
