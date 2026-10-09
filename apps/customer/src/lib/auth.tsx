import type { Session } from '@supabase/supabase-js';
import type { Tables } from '@outly/db';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type Profile = Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'suspended_at'>;

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
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
  const [ready, setReady] = useState(false);

  const sync = useCallback(async (next: Session | null) => {
    setSession(next);
    try {
      setProfile(next ? await loadProfile(next.user.id) : null);
    } catch (e) {
      console.warn('[auth] profile', e);
      setProfile(null);
    }
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
      refreshProfile: async () => {
        if (session) setProfile(await loadProfile(session.user.id));
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
