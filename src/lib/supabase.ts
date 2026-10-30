import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from 'astro:env/client';

/** Prefer the GOLDSTOCK names; fall back to the Vercel ↔ Supabase integration names. */
const supabaseUrl = PUBLIC_SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const REMEMBER_KEY = 'gs-remember-device';

/** "Rester connecté sur cet appareil": the session lives in localStorage, otherwise only for the tab. */
export function setRememberDevice(remember: boolean) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* Private mode: the session stays in memory for this page. */
  }
}

const sessionStore = {
  getItem: (key: string) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key: string, value: string) => {
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    (remember ? localStorage : sessionStorage).setItem(key, value);
    (remember ? sessionStorage : localStorage).removeItem(key);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

let client: SupabaseClient | null = null;

/** Browser only: the client reads its session from web storage as soon as it is created. */
export function getSupabase() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured (PUBLIC_SUPABASE_URL / KEY).');
  client ??= createClient(supabaseUrl!, supabaseKey!, {
    auth: {
      storage: sessionStore,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // Not PKCE: the confirmation link is often opened on another device (the phone that reads the mail).
      flowType: 'implicit',
    },
  });
  return client;
}
