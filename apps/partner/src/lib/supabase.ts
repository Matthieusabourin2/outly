import 'react-native-url-polyfill/auto';
import './storage';
import { createClient } from '@supabase/supabase-js';
import type { Database, OutlyClient } from '@outly/db';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!rawUrl || !publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See apps/partner/.env.example.');
}

/**
 * Local dev on a real phone (Expo Go): 127.0.0.1 is the phone itself, so reuse the
 * Mac's LAN address that Metro is served from. Web and hosted URLs are untouched.
 */
function resolveDevUrl(url: string): string {
  if (Platform.OS === 'web') return url;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!devHost) return url;
  return url.replace(/\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, `//${devHost}`);
}

export const supabase: OutlyClient = createClient<Database>(resolveDevUrl(rawUrl), publishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: pick up the session from password-reset links.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

