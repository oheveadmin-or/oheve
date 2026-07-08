import { pool } from '../config/database';

// ── users ────────────────────────────────────────────────────────────────────
const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    mot_de_passe VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'client',
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    phone VARCHAR(50),
    date_mariage DATE,
    budget_mode VARCHAR(20),
    budget_global NUMERIC(12,2),
    budget_categories JSONB,
    wedding_location_type VARCHAR(20),
    wedding_city TEXT,
    wedding_country TEXT,
    wedding_lat NUMERIC,
    wedding_lng NUMERIC,
    wedding_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

const USERS_ADD_COLS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'client'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mot_de_passe VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS date_mariage DATE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_mode VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_global NUMERIC(12,2)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_categories JSONB`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_location_type VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_city TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_country TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_lat NUMERIC`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_lng NUMERIC`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS wedding_address TEXT`,
  // ── Connexions sociales (Google, Apple) ─────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_provider VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS social_provider_id VARCHAR(255)`,
  // Rend mot_de_passe optionnel pour les comptes créés via Google/Apple
  `ALTER TABLE users ALTER COLUMN mot_de_passe DROP NOT NULL`,
  // ── Abonnements boutique ────────────────────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE`,
  // ── Noms du couple (futurs mariés) ─────────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bride_name VARCHAR(100)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS groom_name VARCHAR(100)`,
  // ── Oheve Premium (paiement unique 50€) ────────────────────────────────────
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_purchased_at TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_stripe_payment_intent_id TEXT`,
  // ── Réparation : comptes Apple créés avec l'id du relay comme nom ──────────
  // ("000416.fd0b…" affiché comme nom de profil). On vide pour laisser la place
  // aux prénoms des mariés saisis dans l'app.
  `UPDATE users SET nom = ''
     WHERE email LIKE '%@privaterelay.appleid.com'
       AND nom = split_part(email, '@', 1)`,
  `UPDATE users SET prenom = ''
     WHERE email LIKE '%@privaterelay.appleid.com'
       AND prenom = split_part(email, '@', 1)`,
];

// ── refresh_tokens ────────────────────────────────────────────────────────────
const CREATE_REFRESH_TOKENS = `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(600) UNIQUE NOT NULL,
    device_name VARCHAR(200),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

// ── prestataire_profiles ──────────────────────────────────────────────────────
const CREATE_PRESTATAIRE_PROFILES = `
  CREATE TABLE IF NOT EXISTS prestataire_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    business_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    location_city TEXT,
    location_country TEXT DEFAULT 'France',
    price_min NUMERIC(10,2),
    price_max NUMERIC(10,2),
    website_url TEXT,
    instagram_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    rating NUMERIC(3,2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

// ── conversations ─────────────────────────────────────────────────────────────
const CREATE_CONVERSATIONS = `
  CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prestataire_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, prestataire_id)
  )
`;

// ── messages ──────────────────────────────────────────────────────────────────
const CREATE_MESSAGES = `
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    file_url TEXT,
    file_name TEXT,
    file_type VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

const MESSAGES_ADD_COLS = [
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT`,
  `ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type VARCHAR(100)`,
  `ALTER TABLE messages ALTER COLUMN content SET DEFAULT ''`,
];

// ── prestataire_photos ────────────────────────────────────────────────────────
const CREATE_PRESTATAIRE_PHOTOS = `
  CREATE TABLE IF NOT EXISTS prestataire_photos (
    id SERIAL PRIMARY KEY,
    prestataire_id INTEGER NOT NULL REFERENCES prestataire_profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    filename TEXT NOT NULL,
    is_cover BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

// ── public_sites ──────────────────────────────────────────────────────────────
const CREATE_PUBLIC_SITES = `
  CREATE TABLE IF NOT EXISTS public_sites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(160) UNIQUE NOT NULL,
    bride_name VARCHAR(200) NOT NULL,
    groom_name VARCHAR(200) NOT NULL,
    wedding_date DATE NOT NULL,
    location TEXT,
    phone VARCHAR(50),
    template_id VARCHAR(80),
    custom_text TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

// ── otp_codes ─────────────────────────────────────────────────────────────────
const CREATE_OTP_CODES = `
  CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'inscription',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`;

// ── push_tokens ───────────────────────────────────────────────────────────────
const CREATE_PUSH_TOKENS = `
  CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
  )
`;

const PUSH_TOKENS_INDICES = [
  `CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id)`,
];

// ── notifications anti-spam ────────────────────────────────────────────────────
const NOTIF_ADD_COLS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_msg_notif_at TIMESTAMP WITH TIME ZONE`,
];

// ── indices ───────────────────────────────────────────────────────────────────
const INDICES = [
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_prestataire_profiles_category ON prestataire_profiles(category)`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_prestataire ON conversations(prestataire_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_public_sites_user_id ON public_sites(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_public_sites_slug ON public_sites(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_prestataire_photos_presta ON prestataire_photos(prestataire_id)`,
];

export async function runMigrations(): Promise<void> {
  try {
    await pool.query(CREATE_USERS);
    for (const sql of USERS_ADD_COLS) {
      await pool.query(sql);
    }
    await pool.query(CREATE_REFRESH_TOKENS);
    await pool.query(CREATE_PRESTATAIRE_PROFILES);
    await pool.query(CREATE_PRESTATAIRE_PHOTOS);
    await pool.query(CREATE_CONVERSATIONS);
    await pool.query(CREATE_MESSAGES);
    await pool.query(CREATE_PUBLIC_SITES);
    await pool.query(CREATE_OTP_CODES);
    for (const sql of MESSAGES_ADD_COLS) await pool.query(sql);
    await pool.query(CREATE_PUSH_TOKENS);
    for (const sql of NOTIF_ADD_COLS) await pool.query(sql);
    for (const sql of INDICES) await pool.query(sql);
    for (const sql of PUSH_TOKENS_INDICES) await pool.query(sql);

    // Add site_config column to public_sites for full theme/sections/RSVP config
    await pool.query(`ALTER TABLE public_sites ADD COLUMN IF NOT EXISTS site_config JSONB`);
    await pool.query(`ALTER TABLE public_sites ADD COLUMN IF NOT EXISTS invite_links JSONB DEFAULT '[]'`);

    // RSVP tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvp_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wedding_slug VARCHAR(200) NOT NULL,
        form_id VARCHAR(200),
        invite_token VARCHAR(200),
        firstname VARCHAR(100) NOT NULL,
        lastname VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        dietary_restrictions TEXT,
        dietary_selections JSONB DEFAULT '[]',
        drink_preference VARCHAR(100),
        events JSONB DEFAULT '{}',
        message TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notified BOOLEAN DEFAULT FALSE
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rsvp_slug ON rsvp_answers(wedding_slug)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rsvp_submitted ON rsvp_answers(submitted_at DESC)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rsvp_push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        wedding_slug VARCHAR(200) NOT NULL,
        expo_push_token VARCHAR(300),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, wedding_slug)
      )
    `);

    // ── Payments & Stripe Connect ─────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                        SERIAL PRIMARY KEY,
        conversation_id           INT REFERENCES conversations(id) ON DELETE SET NULL,
        client_id                 INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prestataire_id            INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_intent_id  TEXT UNIQUE,
        stripe_transfer_id        TEXT,
        amount_total              INT NOT NULL,
        commission_amount         INT NOT NULL,
        net_amount                INT NOT NULL,
        currency                  VARCHAR(3) NOT NULL DEFAULT 'eur',
        status                    VARCHAR(30) NOT NULL DEFAULT 'pending',
        description               TEXT,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
        id                  SERIAL PRIMARY KEY,
        user_id             INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        stripe_account_id   TEXT UNIQUE,
        onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
        payouts_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
        charges_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS devis (
        id                SERIAL PRIMARY KEY,
        conversation_id   INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        titre             TEXT NOT NULL,
        services          JSONB NOT NULL DEFAULT '[]',
        montant_ht        NUMERIC(10,2) NOT NULL,
        tva_percent       NUMERIC(5,2) NOT NULL DEFAULT 20,
        montant_ttc       NUMERIC(10,2) NOT NULL,
        validite_jours    INT NOT NULL DEFAULT 30,
        notes             TEXT,
        status            VARCHAR(20) NOT NULL DEFAULT 'envoye',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'text'`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS devis_id INT REFERENCES devis(id) ON DELETE SET NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_presta ON payments(prestataire_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_devis_conv ON devis(conversation_id)`);

    // ── Profil prestataire : téléphone + fourchette de prix (texte libre) ─────
    await pool.query(`ALTER TABLE prestataire_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE prestataire_profiles ADD COLUMN IF NOT EXISTS price_range TEXT`);

    // ── Admin : suspension prestataires, masquage annonces ───────────────────
    await pool.query(`ALTER TABLE prestataire_profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE prestataire_profiles ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE public_sites ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false`);

    // ── Réservations ─────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prestataire_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        amount_cents INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_client ON reservations(client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_presta ON reservations(prestataire_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)`);

    // ── Calendrier couple & disponibilités prestataires ─────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        event_date DATE,
        event_time TIME,
        prestataire_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        appointment_request_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date)`);
    await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_availability_settings (
        prestataire_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        working_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
        work_start TIME NOT NULL DEFAULT '09:00',
        work_end TIME NOT NULL DEFAULT '18:00',
        slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_blocked_periods (
        id SERIAL PRIMARY KEY,
        prestataire_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_blocked_periods_presta ON provider_blocked_periods(prestataire_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointment_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prestataire_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        requested_date DATE NOT NULL,
        requested_time TIME NOT NULL,
        proposed_date DATE,
        proposed_time TIME,
        notes TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appt_client ON appointment_requests(client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appt_presta ON appointment_requests(prestataire_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appt_status ON appointment_requests(status)`);

    // ── Likes & commentaires photos ───────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photo_likes (
        id SERIAL PRIMARY KEY,
        photo_id INTEGER NOT NULL REFERENCES prestataire_photos(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(photo_id, user_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photo_comments (
        id SERIAL PRIMARY KEY,
        photo_id INTEGER NOT NULL REFERENCES prestataire_photos(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id)`);

    // ── Méthodes de connexion multiples (email + Google + Apple sur un compte) ─
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_auth_providers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(provider, provider_user_id),
        UNIQUE(user_id, provider)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_providers_user ON user_auth_providers(user_id)`);
    // Backfill depuis les anciennes colonnes users.social_provider*
    await pool.query(`
      INSERT INTO user_auth_providers (user_id, provider, provider_user_id, email)
      SELECT id, social_provider, social_provider_id, email FROM users
      WHERE social_provider IS NOT NULL AND social_provider_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    // ── Wedding Sites (web builder) ───────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wedding_sites (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        slug        VARCHAR(200) NOT NULL UNIQUE,
        couple_name VARCHAR(300) NOT NULL DEFAULT '',
        groom_name  VARCHAR(150) NOT NULL DEFAULT '',
        bride_name  VARCHAR(150) NOT NULL DEFAULT '',
        date        VARCHAR(50)  NOT NULL DEFAULT '',
        time        VARCHAR(10)  NOT NULL DEFAULT '',
        city        VARCHAR(200) NOT NULL DEFAULT '',
        venue       VARCHAR(300) NOT NULL DEFAULT '',
        welcome_text TEXT        NOT NULL DEFAULT '',
        main_text   TEXT         NOT NULL DEFAULT '',
        language    VARCHAR(5)   NOT NULL DEFAULT 'fr',
        theme       JSONB        NOT NULL DEFAULT '{}',
        sections    JSONB        NOT NULL DEFAULT '{}',
        content     JSONB        NOT NULL DEFAULT '{}',
        rsvp_form   JSONB,
        invite_links JSONB       NOT NULL DEFAULT '[]',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wedding_sites_slug ON wedding_sites(slug)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wedding_sites_user ON wedding_sites(user_id)`);

    // ── Invités (synchro serveur : partagés entre appareils d'un même compte) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wedding_guests (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        guest_count     INTEGER NOT NULL DEFAULT 1,
        status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',
        guest_group     TEXT NOT NULL DEFAULT '',
        table_name      TEXT,
        email           TEXT,
        phone           TEXT,
        from_rsvp       BOOLEAN NOT NULL DEFAULT false,
        rsvp_ref        TEXT,
        events          JSONB,
        manual_event_id TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wedding_guests_user ON wedding_guests(user_id)`);

    console.log('✅ Schema DB synchronisé (roles, boutique, subscriptions, refresh_tokens, prestataires, messaging, push_tokens, rsvp, payments, stripe_connect, devis, reservations, calendar, admin, photo_likes, photo_comments)');
  } catch (err) {
    console.error('❌ Migration DB:', (err as Error).message);
  }
}
