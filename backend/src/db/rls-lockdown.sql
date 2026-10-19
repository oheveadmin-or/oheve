-- ============================================================
-- Verrouillage RLS de tout le schéma public — idempotent
-- (à coller dans Supabase → SQL Editor → Run ; relançable sans risque)
--
-- POURQUOI :
-- Aucune partie de l'app (MonApp, guest-site) ne lit la base via la clé
-- anon / authenticated de Supabase : tout passe par le backend Express,
-- connecté via DATABASE_URL (rôle postgres, propriétaire des tables) qui
-- n'est pas soumis au RLS. On peut donc tout fermer côté API Supabase.
--
-- CE QUE ÇA FAIT, pour CHAQUE table du schéma public (y compris les
-- futures tables si on relance le script) :
--   1. active le RLS ;
--   2. supprime toutes les anciennes policies (dont les « USING (true) »
--      signalées par l'advisor, ex. rsvp_answers) ;
--   3. crée une seule policy qui refuse tout aux rôles anon/authenticated.
-- Puis fixe le search_path des fonctions du schéma public
-- (avertissement « Function Search Path Mutable »).
--
-- Remplace backend/src/db/rls-migration.sql (qui ne couvrait que 22 tables).
-- ============================================================

DO $$
DECLARE
  t   record;
  pol record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t.relname
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t.relname);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      t.relname || '_no_client_access', t.relname
    );
  END LOOP;
END $$;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND d.objid IS NULL -- ignore les fonctions fournies par une extension
  LOOP
    EXECUTE format('ALTER ROUTINE %s SET search_path = public, pg_catalog', f.sig);
  END LOOP;
END $$;

-- Vérification : toutes les lignes doivent afficher rls_enabled = true
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;
