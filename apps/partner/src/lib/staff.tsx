import type { Session } from '@supabase/supabase-js';
import type { Enums } from '@outly/db';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type VenueRole = Enums<'venue_role'>;
export type Membership = { venueId: string; venueName: string; role: VenueRole };

/** What each role sees on the staff site (SPEC §4, A4). */
export function canScanDoor(role: VenueRole) {
  return role !== 'venue_staff';
}
export function canScanBar(role: VenueRole) {
  return role !== 'venue_door';
}
export function canSeeVenueStats(role: VenueRole) {
  return role === 'venue_owner' || role === 'venue_manager';
}

export const ROLE_LABELS: Record<VenueRole, string> = {
  venue_owner: 'Owner',
  venue_manager: 'Manager',
  venue_staff: 'Bar staff',
  venue_door: 'Door',
};

type StaffState = {
  ready: boolean;
  session: Session | null;
  memberships: Membership[];
  /** The venues could not be loaded (network): not the same as "no venue on this account". */
  loadFailed: boolean;
  retry: () => Promise<void>;
  current: Membership | null;
  selectVenue: (venueId: string) => void;
  signOut: () => Promise<void>;
};

const StaffContext = createContext<StaffState | null>(null);

async function loadMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('venue_memberships')
    .select('role, venue:venues(id, name)')
    .eq('user_id', userId);
  if (error) throw error;
  return data
    .filter((m) => m.venue)
    .map((m) => ({ venueId: m.venue!.id, venueName: m.venue!.name ?? 'Venue', role: m.role }))
    .sort((a, b) => a.venueName.localeCompare(b.venueName));
}

const VENUE_KEY = 'outly.staff.venue';

/** The venue a multi-venue manager picked survives a page reload (web only, best effort). */
function rememberedVenue(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(VENUE_KEY) : null;
  } catch {
    return null;
  }
}
function rememberVenue(venueId: string) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(VENUE_KEY, venueId);
  } catch {
    // Private browsing: just not remembered.
  }
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  const sync = useCallback(async (next: Session | null) => {
    try {
      const list = next ? await loadMemberships(next.user.id) : [];
      loadedFor.current = next?.user.id ?? null;
      setMemberships(list);
      setLoadFailed(false);
      const saved = rememberedVenue();
      setVenueId((prev) =>
        prev && list.some((m) => m.venueId === prev)
          ? prev
          : saved && list.some((m) => m.venueId === saved)
            ? saved
            : (list[0]?.venueId ?? null),
      );
    } catch (e) {
      console.warn('[staff] memberships', e);
      // Keep what we had for this person (a refresh failed); never show "no venue" because of the network.
      if (loadedFor.current !== next?.user.id) {
        loadedFor.current = null;
        setMemberships([]);
      }
      setLoadFailed(true);
    }
    setSession(next);
    setReady(true);
  }, []);

  const selectVenue = useCallback((id: string) => {
    rememberVenue(id);
    setVenueId(id);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'TOKEN_REFRESHED') setSession(next);
      else void sync(next);
    });
    return () => data.subscription.unsubscribe();
  }, [sync]);

  const value = useMemo<StaffState>(
    () => ({
      ready,
      session,
      memberships,
      loadFailed,
      retry: async () => {
        const { data } = await supabase.auth.getSession();
        await sync(data.session);
      },
      current: memberships.find((m) => m.venueId === venueId) ?? null,
      selectVenue,
      // Works offline too: supabase-js clears the session on this device whatever the server says.
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session, memberships, loadFailed, venueId, selectVenue, sync],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffState {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used inside <StaffProvider>');
  return ctx;
}
