-- Payments : paiements via Stripe (client → prestataire, 5% commission plateforme)
CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL PRIMARY KEY,
  conversation_id     INT REFERENCES conversations(id) ON DELETE SET NULL,
  client_id           INT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  prestataire_id      INT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id  TEXT,
  amount_total        INT NOT NULL,   -- en centimes (ex: 100000 = 1000€)
  commission_amount   INT NOT NULL,   -- 5% en centimes
  net_amount          INT NOT NULL,   -- montant reversé au prestataire
  currency            VARCHAR(3) NOT NULL DEFAULT 'eur',
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe Connect : comptes prestataires
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  stripe_account_id   TEXT UNIQUE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  charges_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devis : messages spéciaux type "devis" dans les conversations
CREATE TABLE IF NOT EXISTS devis (
  id                  SERIAL PRIMARY KEY,
  conversation_id     INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id           INT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  titre               TEXT NOT NULL,
  services            JSONB NOT NULL DEFAULT '[]',   -- [{description, quantite, prix_unitaire}]
  montant_total       NUMERIC(10,2) NOT NULL,
  tva_percent         NUMERIC(5,2) NOT NULL DEFAULT 20,
  validite_jours      INT NOT NULL DEFAULT 30,
  notes               TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'envoye', -- envoye | accepte | refuse | expire
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajout colonne message_type dans messages pour distinguer devis/normal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='messages' AND column_name='message_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'text';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='messages' AND column_name='devis_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN devis_id INT REFERENCES devis(id) ON DELETE SET NULL;
  END IF;
END $$;
