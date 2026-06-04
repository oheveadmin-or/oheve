-- RSVP answers table
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
);

CREATE INDEX IF NOT EXISTS idx_rsvp_slug ON rsvp_answers(wedding_slug);
CREATE INDEX IF NOT EXISTS idx_rsvp_submitted ON rsvp_answers(submitted_at DESC);

-- SSE notification tokens per user (pour push in-app)
CREATE TABLE IF NOT EXISTS rsvp_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wedding_slug VARCHAR(200) NOT NULL,
  expo_push_token VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wedding_slug)
);
