import type { Session } from '@supabase/supabase-js';
import type { Tables } from '@outly/db';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type Profile = Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'suspended_at'>;

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /**
   * True when the profile could not be loaded (network). Distinct from "no profile yet":
   * an existing guest must never be sent to profile set-up because of a bad connection.
   */
  profileFailed: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, suspended_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const sync = useCallback(async (next: Session | null) => {
    try {
      const p = next ? await loadProfile(next.user.id) : null;
      setProfile(p);
      setProfileFailed(false);
    } catch (e) {
      console.warn('[auth] profile', e);
      // Keep the profile we already have for this person (a refresh failed); drop anyone else's.
      setProfile((prev) => (prev && next && prev.id === next.user.id ? prev : null));
      setProfileFailed(true);
    }
    // Session last, so the screens never see a new session with the previous person's profile.
    setSession(next);
    setReady(true);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Token refreshes keep the same user: no need to reload the profile.
      if (event === 'TOKEN_REFRESHED') setSession(next);
      else void sync(next);
    });
    return () => data.subscription.unsubscribe();
  }, [sync]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      profile,
      profileFailed,
      refreshProfile: async () => {
        if (!session) return;
        try {
          setProfile(await loadProfile(session.user.id));
          setProfileFailed(false);
        } catch (e) {
          console.warn('[auth] profile', e);
          setProfileFailed(true);
        }
      },
      // Clears the session on this device even without network (supabase-js removes it
      // locally whatever the server says), and tells the other open tabs.
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session, profile, profileFailed],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
