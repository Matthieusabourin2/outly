import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import type { Database, OutlyClient } from '@outly/db';
import Constants from 'expo-constants';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!rawUrl || !publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See apps/customer/.env.example.');
}

/**
 * Local dev: 127.0.0.1 only works in the iOS simulator. On a real phone (Expo Go),
 * reuse the Mac's LAN address that Metro is already served from.
 */
function resolveDevUrl(url: string): string {
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!devHost) return url;
  return url.replace(/\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, `//${devHost}`);
}

export const supabase: OutlyClient = createClient<Database>(resolveDevUrl(rawUrl), publishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * SLICE 0 ONLY. RLS lets only signed-in users read venues, and real sign-in arrives in slice 1.
 * Until then the shell signs in anonymously (enabled in local supabase/config.toml only).
 * Remove this together with `enable_anonymous_sign_ins` in slice 1.
 */
export async function ensureDevSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
