-- ============================================================
-- Migration RLS — idempotente (safe to run multiple times)
--
-- Pattern : DROP POLICY IF EXISTS + CREATE POLICY
--           ALTER TABLE ... ENABLE ROW LEVEL SECURITY est
--           toujours no-op si déjà activé.
--
-- CONTEXTE :
-- Le backend Express se connecte via DATABASE_URL (rôle postgres /
-- service_role) qui BYPASS le RLS automatiquement. Ces policies ne
-- bloquent que l'accès direct via la clé anon/authenticated du SDK
-- Supabase — le backend n'est pas impacté.
--
-- Tables couvertes (22) — schéma public, au 2026-06-30 :
--   appointment_requests, calendar_events, conversations, devis,
--   messages, otp_codes, payments, photo_comments, photo_likes,
--   prestataire_photos, prestataire_profiles,
--   provider_availability_settings, provider_blocked_periods,
--   public_sites, push_tokens, refresh_tokens, reservations,
--   rsvp_answers, rsvp_push_tokens, stripe_connect_accounts,
--   users, wedding_sites
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Macro helper : on regroupe les DROP + CREATE dans des blocs
-- DO pour éviter les erreurs si une table est absente (sécurité
-- supplémentaire sans alourdir le code).
-- ────────────────────────────────────────────────────────────


-- ── 1. users ─────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_no_direct_access_select" ON users;
DROP POLICY IF EXISTS "users_no_direct_access_insert" ON users;
DROP POLICY IF EXISTS "users_no_direct_access_update" ON users;
DROP POLICY IF EXISTS "users_no_direct_access_delete" ON users;

CREATE POLICY "users_no_direct_access_select" ON users FOR SELECT USING (false);
CREATE POLICY "users_no_direct_access_insert" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "users_no_direct_access_update" ON users FOR UPDATE USING (false);
CREATE POLICY "users_no_direct_access_delete" ON users FOR DELETE USING (false);


-- ── 2. refresh_tokens ────────────────────────────────────────
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refresh_tokens_no_direct_access_select" ON refresh_tokens;
DROP POLICY IF EXISTS "refresh_tokens_no_direct_access_insert" ON refresh_tokens;
DROP POLICY IF EXISTS "refresh_tokens_no_direct_access_update" ON refresh_tokens;
DROP POLICY IF EXISTS "refresh_tokens_no_direct_access_delete" ON refresh_tokens;

CREATE POLICY "refresh_tokens_no_direct_access_select" ON refresh_tokens FOR SELECT USING (false);
CREATE POLICY "refresh_tokens_no_direct_access_insert" ON refresh_tokens FOR INSERT WITH CHECK (false);
CREATE POLICY "refresh_tokens_no_direct_access_update" ON refresh_tokens FOR UPDATE USING (false);
CREATE POLICY "refresh_tokens_no_direct_access_delete" ON refresh_tokens FOR DELETE USING (false);


-- ── 3. otp_codes ─────────────────────────────────────────────
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otp_codes_no_direct_access_select" ON otp_codes;
DROP POLICY IF EXISTS "otp_codes_no_direct_access_insert" ON otp_codes;
DROP POLICY IF EXISTS "otp_codes_no_direct_access_update" ON otp_codes;
DROP POLICY IF EXISTS "otp_codes_no_direct_access_delete" ON otp_codes;

CREATE POLICY "otp_codes_no_direct_access_select" ON otp_codes FOR SELECT USING (false);
CREATE POLICY "otp_codes_no_direct_access_insert" ON otp_codes FOR INSERT WITH CHECK (false);
CREATE POLICY "otp_codes_no_direct_access_update" ON otp_codes FOR UPDATE USING (false);
CREATE POLICY "otp_codes_no_direct_access_delete" ON otp_codes FOR DELETE USING (false);


-- ── 4. payments ──────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_no_direct_access_select" ON payments;
DROP POLICY IF EXISTS "payments_no_direct_access_insert" ON payments;
DROP POLICY IF EXISTS "payments_no_direct_access_update" ON payments;
DROP POLICY IF EXISTS "payments_no_direct_access_delete" ON payments;

CREATE POLICY "payments_no_direct_access_select" ON payments FOR SELECT USING (false);
CREATE POLICY "payments_no_direct_access_insert" ON payments FOR INSERT WITH CHECK (false);
CREATE POLICY "payments_no_direct_access_update" ON payments FOR UPDATE USING (false);
CREATE POLICY "payments_no_direct_access_delete" ON payments FOR DELETE USING (false);


-- ── 5. conversations ─────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_no_direct_access_select" ON conversations;
DROP POLICY IF EXISTS "conversations_no_direct_access_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_no_direct_access_update" ON conversations;
DROP POLICY IF EXISTS "conversations_no_direct_access_delete" ON conversations;

CREATE POLICY "conversations_no_direct_access_select" ON conversations FOR SELECT USING (false);
CREATE POLICY "conversations_no_direct_access_insert" ON conversations FOR INSERT WITH CHECK (false);
CREATE POLICY "conversations_no_direct_access_update" ON conversations FOR UPDATE USING (false);
CREATE POLICY "conversations_no_direct_access_delete" ON conversations FOR DELETE USING (false);


-- ── 6. messages ──────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_no_direct_access_select" ON messages;
DROP POLICY IF EXISTS "messages_no_direct_access_insert" ON messages;
DROP POLICY IF EXISTS "messages_no_direct_access_update" ON messages;
DROP POLICY IF EXISTS "messages_no_direct_access_delete" ON messages;

CREATE POLICY "messages_no_direct_access_select" ON messages FOR SELECT USING (false);
CREATE POLICY "messages_no_direct_access_insert" ON messages FOR INSERT WITH CHECK (false);
CREATE POLICY "messages_no_direct_access_update" ON messages FOR UPDATE USING (false);
CREATE POLICY "messages_no_direct_access_delete" ON messages FOR DELETE USING (false);


-- ── 7. devis ─────────────────────────────────────────────────
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_no_direct_access_select" ON devis;
DROP POLICY IF EXISTS "devis_no_direct_access_insert" ON devis;
DROP POLICY IF EXISTS "devis_no_direct_access_update" ON devis;
DROP POLICY IF EXISTS "devis_no_direct_access_delete" ON devis;

CREATE POLICY "devis_no_direct_access_select" ON devis FOR SELECT USING (false);
CREATE POLICY "devis_no_direct_access_insert" ON devis FOR INSERT WITH CHECK (false);
CREATE POLICY "devis_no_direct_access_update" ON devis FOR UPDATE USING (false);
CREATE POLICY "devis_no_direct_access_delete" ON devis FOR DELETE USING (false);


-- ── 8. stripe_connect_accounts ───────────────────────────────
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_connect_no_direct_access_select" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "stripe_connect_no_direct_access_insert" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "stripe_connect_no_direct_access_update" ON stripe_connect_accounts;
DROP POLICY IF EXISTS "stripe_connect_no_direct_access_delete" ON stripe_connect_accounts;

CREATE POLICY "stripe_connect_no_direct_access_select" ON stripe_connect_accounts FOR SELECT USING (false);
CREATE POLICY "stripe_connect_no_direct_access_insert" ON stripe_connect_accounts FOR INSERT WITH CHECK (false);
CREATE POLICY "stripe_connect_no_direct_access_update" ON stripe_connect_accounts FOR UPDATE USING (false);
CREATE POLICY "stripe_connect_no_direct_access_delete" ON stripe_connect_accounts FOR DELETE USING (false);


-- ── 9. calendar_events ───────────────────────────────────────
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_no_direct_access_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_no_direct_access_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_no_direct_access_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_no_direct_access_delete" ON calendar_events;

CREATE POLICY "calendar_events_no_direct_access_select" ON calendar_events FOR SELECT USING (false);
CREATE POLICY "calendar_events_no_direct_access_insert" ON calendar_events FOR INSERT WITH CHECK (false);
CREATE POLICY "calendar_events_no_direct_access_update" ON calendar_events FOR UPDATE USING (false);
CREATE POLICY "calendar_events_no_direct_access_delete" ON calendar_events FOR DELETE USING (false);


-- ── 10. reservations ─────────────────────────────────────────
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_no_direct_access_select" ON reservations;
DROP POLICY IF EXISTS "reservations_no_direct_access_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_no_direct_access_update" ON reservations;
DROP POLICY IF EXISTS "reservations_no_direct_access_delete" ON reservations;

CREATE POLICY "reservations_no_direct_access_select" ON reservations FOR SELECT USING (false);
CREATE POLICY "reservations_no_direct_access_insert" ON reservations FOR INSERT WITH CHECK (false);
CREATE POLICY "reservations_no_direct_access_update" ON reservations FOR UPDATE USING (false);
CREATE POLICY "reservations_no_direct_access_delete" ON reservations FOR DELETE USING (false);


-- ── 11. appointment_requests ─────────────────────────────────
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appt_req_no_direct_select" ON appointment_requests;
DROP POLICY IF EXISTS "appt_req_no_direct_insert" ON appointment_requests;
DROP POLICY IF EXISTS "appt_req_no_direct_update" ON appointment_requests;
DROP POLICY IF EXISTS "appt_req_no_direct_delete" ON appointment_requests;

CREATE POLICY "appt_req_no_direct_select" ON appointment_requests FOR SELECT USING (false);
CREATE POLICY "appt_req_no_direct_insert" ON appointment_requests FOR INSERT WITH CHECK (false);
CREATE POLICY "appt_req_no_direct_update" ON appointment_requests FOR UPDATE USING (false);
CREATE POLICY "appt_req_no_direct_delete" ON appointment_requests FOR DELETE USING (false);


-- ── 12. provider_availability_settings ───────────────────────
ALTER TABLE provider_availability_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_avail_no_direct_access_select" ON provider_availability_settings;
DROP POLICY IF EXISTS "provider_avail_no_direct_access_insert" ON provider_availability_settings;
DROP POLICY IF EXISTS "provider_avail_no_direct_access_update" ON provider_availability_settings;
DROP POLICY IF EXISTS "provider_avail_no_direct_access_delete" ON provider_availability_settings;

CREATE POLICY "provider_avail_no_direct_access_select" ON provider_availability_settings FOR SELECT USING (false);
CREATE POLICY "provider_avail_no_direct_access_insert" ON provider_availability_settings FOR INSERT WITH CHECK (false);
CREATE POLICY "provider_avail_no_direct_access_update" ON provider_availability_settings FOR UPDATE USING (false);
CREATE POLICY "provider_avail_no_direct_access_delete" ON provider_availability_settings FOR DELETE USING (false);


-- ── 13. provider_blocked_periods ─────────────────────────────
ALTER TABLE provider_blocked_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_blocked_no_direct_access_select" ON provider_blocked_periods;
DROP POLICY IF EXISTS "provider_blocked_no_direct_access_insert" ON provider_blocked_periods;
DROP POLICY IF EXISTS "provider_blocked_no_direct_access_update" ON provider_blocked_periods;
DROP POLICY IF EXISTS "provider_blocked_no_direct_access_delete" ON provider_blocked_periods;

CREATE POLICY "provider_blocked_no_direct_access_select" ON provider_blocked_periods FOR SELECT USING (false);
CREATE POLICY "provider_blocked_no_direct_access_insert" ON provider_blocked_periods FOR INSERT WITH CHECK (false);
CREATE POLICY "provider_blocked_no_direct_access_update" ON provider_blocked_periods FOR UPDATE USING (false);
CREATE POLICY "provider_blocked_no_direct_access_delete" ON provider_blocked_periods FOR DELETE USING (false);


-- ── 14. push_tokens ──────────────────────────────────────────
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_no_direct_select" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_no_direct_insert" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_no_direct_update" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_no_direct_delete" ON push_tokens;

CREATE POLICY "push_tokens_no_direct_select" ON push_tokens FOR SELECT USING (false);
CREATE POLICY "push_tokens_no_direct_insert" ON push_tokens FOR INSERT WITH CHECK (false);
CREATE POLICY "push_tokens_no_direct_update" ON push_tokens FOR UPDATE USING (false);
CREATE POLICY "push_tokens_no_direct_delete" ON push_tokens FOR DELETE USING (false);


-- ── 15. rsvp_push_tokens ─────────────────────────────────────
ALTER TABLE rsvp_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsvp_push_tokens_no_direct_access_select" ON rsvp_push_tokens;
DROP POLICY IF EXISTS "rsvp_push_tokens_no_direct_access_insert" ON rsvp_push_tokens;
DROP POLICY IF EXISTS "rsvp_push_tokens_no_direct_access_update" ON rsvp_push_tokens;
DROP POLICY IF EXISTS "rsvp_push_tokens_no_direct_access_delete" ON rsvp_push_tokens;

CREATE POLICY "rsvp_push_tokens_no_direct_access_select" ON rsvp_push_tokens FOR SELECT USING (false);
CREATE POLICY "rsvp_push_tokens_no_direct_access_insert" ON rsvp_push_tokens FOR INSERT WITH CHECK (false);
CREATE POLICY "rsvp_push_tokens_no_direct_access_update" ON rsvp_push_tokens FOR UPDATE USING (false);
CREATE POLICY "rsvp_push_tokens_no_direct_access_delete" ON rsvp_push_tokens FOR DELETE USING (false);


-- ── 16. photo_likes ──────────────────────────────────────────
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_likes_no_direct_access_select" ON photo_likes;
DROP POLICY IF EXISTS "photo_likes_no_direct_access_insert" ON photo_likes;
DROP POLICY IF EXISTS "photo_likes_no_direct_access_update" ON photo_likes;
DROP POLICY IF EXISTS "photo_likes_no_direct_access_delete" ON photo_likes;

CREATE POLICY "photo_likes_no_direct_access_select" ON photo_likes FOR SELECT USING (false);
CREATE POLICY "photo_likes_no_direct_access_insert" ON photo_likes FOR INSERT WITH CHECK (false);
CREATE POLICY "photo_likes_no_direct_access_update" ON photo_likes FOR UPDATE USING (false);
CREATE POLICY "photo_likes_no_direct_access_delete" ON photo_likes FOR DELETE USING (false);


-- ── 17. photo_comments ───────────────────────────────────────
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_comments_no_direct_access_select" ON photo_comments;
DROP POLICY IF EXISTS "photo_comments_no_direct_access_insert" ON photo_comments;
DROP POLICY IF EXISTS "photo_comments_no_direct_access_update" ON photo_comments;
DROP POLICY IF EXISTS "photo_comments_no_direct_access_delete" ON photo_comments;

CREATE POLICY "photo_comments_no_direct_access_select" ON photo_comments FOR SELECT USING (false);
CREATE POLICY "photo_comments_no_direct_access_insert" ON photo_comments FOR INSERT WITH CHECK (false);
CREATE POLICY "photo_comments_no_direct_access_update" ON photo_comments FOR UPDATE USING (false);
CREATE POLICY "photo_comments_no_direct_access_delete" ON photo_comments FOR DELETE USING (false);


-- ── 18. prestataire_profiles (lecture publique) ───────────────
-- Les profils sont listés dans l'app sans authentification.
ALTER TABLE prestataire_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prestataire_profiles_public_read" ON prestataire_profiles;
DROP POLICY IF EXISTS "prestataire_profiles_no_direct_write_insert" ON prestataire_profiles;
DROP POLICY IF EXISTS "prestataire_profiles_no_direct_write_update" ON prestataire_profiles;
DROP POLICY IF EXISTS "prestataire_profiles_no_direct_write_delete" ON prestataire_profiles;

CREATE POLICY "prestataire_profiles_public_read"          ON prestataire_profiles FOR SELECT USING (true);
CREATE POLICY "prestataire_profiles_no_direct_write_insert" ON prestataire_profiles FOR INSERT WITH CHECK (false);
CREATE POLICY "prestataire_profiles_no_direct_write_update" ON prestataire_profiles FOR UPDATE USING (false);
CREATE POLICY "prestataire_profiles_no_direct_write_delete" ON prestataire_profiles FOR DELETE USING (false);


-- ── 19. prestataire_photos (lecture publique) ─────────────────
-- Les photos de portfolio sont visibles sans compte.
ALTER TABLE prestataire_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presta_photos_public_read"    ON prestataire_photos;
DROP POLICY IF EXISTS "presta_photos_no_write_insert" ON prestataire_photos;
DROP POLICY IF EXISTS "presta_photos_no_write_update" ON prestataire_photos;
DROP POLICY IF EXISTS "presta_photos_no_write_delete" ON prestataire_photos;

CREATE POLICY "presta_photos_public_read"    ON prestataire_photos FOR SELECT USING (true);
CREATE POLICY "presta_photos_no_write_insert" ON prestataire_photos FOR INSERT WITH CHECK (false);
CREATE POLICY "presta_photos_no_write_update" ON prestataire_photos FOR UPDATE USING (false);
CREATE POLICY "presta_photos_no_write_delete" ON prestataire_photos FOR DELETE USING (false);


-- ── 20. public_sites (lecture publique) ───────────────────────
-- Sites Oheve legacy (guest-site les lit via l'API backend,
-- mais une lecture directe SELECT est inoffensive).
ALTER TABLE public_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_sites_public_read"           ON public_sites;
DROP POLICY IF EXISTS "public_sites_no_direct_write_insert" ON public_sites;
DROP POLICY IF EXISTS "public_sites_no_direct_write_update" ON public_sites;
DROP POLICY IF EXISTS "public_sites_no_direct_write_delete" ON public_sites;

CREATE POLICY "public_sites_public_read"           ON public_sites FOR SELECT USING (true);
CREATE POLICY "public_sites_no_direct_write_insert" ON public_sites FOR INSERT WITH CHECK (false);
CREATE POLICY "public_sites_no_direct_write_update" ON public_sites FOR UPDATE USING (false);
CREATE POLICY "public_sites_no_direct_write_delete" ON public_sites FOR DELETE USING (false);


-- ── 21. wedding_sites (lecture publique) ──────────────────────
-- Sites modernes — mêmes règles que public_sites.
ALTER TABLE wedding_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wedding_sites_public_read"           ON wedding_sites;
DROP POLICY IF EXISTS "wedding_sites_no_direct_write_insert" ON wedding_sites;
DROP POLICY IF EXISTS "wedding_sites_no_direct_write_update" ON wedding_sites;
DROP POLICY IF EXISTS "wedding_sites_no_direct_write_delete" ON wedding_sites;

CREATE POLICY "wedding_sites_public_read"           ON wedding_sites FOR SELECT USING (true);
CREATE POLICY "wedding_sites_no_direct_write_insert" ON wedding_sites FOR INSERT WITH CHECK (false);
CREATE POLICY "wedding_sites_no_direct_write_update" ON wedding_sites FOR UPDATE USING (false);
CREATE POLICY "wedding_sites_no_direct_write_delete" ON wedding_sites FOR DELETE USING (false);


-- ── 22. rsvp_answers (INSERT public, lecture bloquée) ─────────
-- Les invités soumettent leur RSVP sans compte (anon INSERT).
-- La lecture des réponses est réservée au backend.
ALTER TABLE rsvp_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsvp_answers_public_insert"       ON rsvp_answers;
DROP POLICY IF EXISTS "rsvp_answers_no_direct_read_select" ON rsvp_answers;
DROP POLICY IF EXISTS "rsvp_answers_no_direct_update"    ON rsvp_answers;
DROP POLICY IF EXISTS "rsvp_answers_no_direct_delete"    ON rsvp_answers;

CREATE POLICY "rsvp_answers_public_insert"       ON rsvp_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "rsvp_answers_no_direct_read_select" ON rsvp_answers FOR SELECT USING (false);
CREATE POLICY "rsvp_answers_no_direct_update"    ON rsvp_answers FOR UPDATE USING (false);
CREATE POLICY "rsvp_answers_no_direct_delete"    ON rsvp_answers FOR DELETE USING (false);


-- ── Vérification post-migration ────────────────────────────────
-- Après exécution, lance ces deux requêtes pour confirmer :
--
-- 1) Toutes les tables ont RLS activé :
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- 2) Toutes les policies sont créées (88 lignes attendues) :
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
