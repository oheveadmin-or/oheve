import type { Pool } from 'pg';

/**
 * Tables de la fonctionnalité « Contacter un prestataire ».
 *
 * Une « demande » = le 1er contact d'UN client avec UN prestataire. Elle est
 * attachée à la conversation existante (table conversations, déjà unique par
 * couple client/prestataire) : les messages suivants passent par la table
 * messages existante, on n'invente pas une 2e messagerie. Le côté « auteur »
 * d'un message se déduit de sender_id (client_id ou prestataire_id de la demande).
 */
export async function ensureDemandesSchema(pool: Pool): Promise<void> {
  // Compteur de demandes offertes + préférence e-mail, sur le compte (users) :
  // c'est là que vit déjà l'abonnement prestataire (presta_sub_status…).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS demandes_gratuites_utilisees INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN NOT NULL DEFAULT true`);

  const existed = (await pool.query(`SELECT to_regclass('public.demandes') AS t`)).rows[0]?.t;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS demandes (
      id                   SERIAL PRIMARY KEY,
      prestataire_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id      INTEGER UNIQUE REFERENCES conversations(id) ON DELETE SET NULL,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      statut               VARCHAR(20) NOT NULL
                           CHECK (statut IN ('gratuite','verrouillee','debloquee','abonnement')),
      numero_gratuit       INTEGER,
      debloquee_at         TIMESTAMPTZ,
      consentement_contact BOOLEAN NOT NULL DEFAULT false,
      relance_24h_envoyee  BOOLEAN NOT NULL DEFAULT false,
      relance_72h_envoyee  BOOLEAN NOT NULL DEFAULT false,
      -- 'formulaire' (bouton Contacter), 'chat' (1er message envoyé depuis la
      -- messagerie), 'historique' (conversation antérieure à la fonctionnalité).
      origine              VARCHAR(20) NOT NULL DEFAULT 'formulaire',
      UNIQUE (client_id, prestataire_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_demandes_presta ON demandes(prestataire_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_demandes_client ON demandes(client_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_demandes_relances ON demandes(statut, created_at) WHERE statut='verrouillee'`);

  // Suivi de l'e-mail envoyé pour chaque message (table messages existante).
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS statut_email VARCHAR(20)`);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS resend_email_id TEXT`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_statut_email_check') THEN
        ALTER TABLE messages ADD CONSTRAINT messages_statut_email_check
          CHECK (statut_email IS NULL OR statut_email IN ('en_attente','envoye','echec'));
      END IF;
    END $$;
  `);

  // Déblocages payés : une ligne par session Stripe → le webhook est idempotent
  // (Stripe peut renvoyer le même événement plusieurs fois).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS demande_deblocages (
      stripe_session_id TEXT PRIMARY KEY,
      demande_id        INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
      prestataire_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_total      INTEGER,
      currency          VARCHAR(10),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 1re installation seulement : les conversations qui existaient déjà restent
  // lisibles comme avant (rien n'est verrouillé rétroactivement, aucun crédit
  // offert n'est consommé, aucune relance).
  if (!existed) {
    const r = await pool.query(`
      INSERT INTO demandes (prestataire_id, client_id, conversation_id, created_at, statut,
                            debloquee_at, consentement_contact, relance_24h_envoyee, relance_72h_envoyee, origine)
      SELECT c.prestataire_id, c.client_id, c.id, c.created_at, 'debloquee',
             c.created_at, false, true, true, 'historique'
      FROM conversations c
      WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)
      ON CONFLICT DO NOTHING
    `);
    if (r.rowCount) console.log(`📨 Demandes : ${r.rowCount} conversation(s) existante(s) reprise(s) telles quelles`);
  }

  await pool.query(`ALTER TABLE demandes ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE demande_deblocages ENABLE ROW LEVEL SECURITY`);
}
