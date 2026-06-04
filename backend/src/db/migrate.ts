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

    console.log('✅ Schema DB synchronisé (roles, boutique, subscriptions, refresh_tokens, prestataires, messaging, push_tokens, rsvp)');
  } catch (err) {
    console.error('❌ Migration DB:', (err as Error).message);
  }
}
