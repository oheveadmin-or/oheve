-- Crée un index pour chaque clé étrangère du schéma public qui n'en a pas
-- (Performance Advisor « Unindexed foreign keys »). Idempotent.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, cl.relname AS tname,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord) AS cols,
           string_agg(a.attname, '_' ORDER BY k.ord) AS colnames
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (i.indkey::int2[])[0:cardinality(c.conkey)-1] = c.conkey
      )
    GROUP BY c.oid, c.conrelid, cl.relname
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)',
                   left('idx_' || r.tname || '_' || r.colnames, 63), r.tbl, r.cols);
  END LOOP;
END $$;
