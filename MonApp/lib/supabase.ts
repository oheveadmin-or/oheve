import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * createClient() lève « supabaseUrl is required » si l'URL est vide.
 * En build EAS, les variables EXPO_PUBLIC_* doivent être injectées (eas.json `env`
 * ou EAS Environment Variables) — sinon, sans cette garde, l'app crashe au démarrage
 * du flux Google. On expose `null` proprement quand la config manque.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
