-- =====================================================================
-- RSVP — schéma Postgres / Supabase recommandé (à exécuter dans le SQL editor)
-- =====================================================================
-- Relation : un formulaire par mini-site (slug unique), réponses 1..N.
--
-- Branchement côté client (voir rsvp/rsvpService.ts) :
--   supabase.from('rsvp_forms').select().eq('wedding_slug', slug).maybeSingle()
--   supabase.from('rsvp_answers').insert({ ... })
-- =====================================================================

CREATE TABLE IF NOT EXISTS rsvp_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_slug TEXT NOT NULL UNIQUE,
  wedding_site_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_forms_wedding_slug ON rsvp_forms (wedding_slug);

CREATE TABLE IF NOT EXISTS rsvp_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES rsvp_forms (id) ON DELETE CASCADE,
  wedding_slug TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_answers_form ON rsvp_answers (form_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_answers_slug ON rsvp_answers (wedding_slug);

-- `payload` : JSON correspondant aux types RSVPForm (formulaire) / RSVPAnswer (réponse).
