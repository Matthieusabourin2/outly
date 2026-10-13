import { sydneyNight, toUserMessage } from '@outly/core';
import type { Enums } from '@outly/db';
import { startVisiblePolling } from '@outly/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { canSeeVenueStats, useStaff } from './staff';
import { supabase } from './supabase';

const REFRESH_MS = 10_000;

export type LiveStats = {
  capacity: number;
  joined: number;
  checked_in: number;
  classic_count: number;
  ghost_count: number;
  scans_ok: number;
  scans_failed: number;
};
export type RecentScan = { id: number; result: Enums<'scan_result'>; kind: string; created_at: string; username: string | null };
export type BarOffer = { id: string; title: string };

type State = {
  loading: boolean;
  error: string | null;
  guestListId: string | null;
  counter: { capacity: number; joined: number; remaining: number } | null;
  live: LiveStats | null;
  scans: RecentScan[];
  offer: BarOffer | null;
};

const EMPTY: State = { loading: true, error: null, guestListId: null, counter: null, live: null, scans: [], offer: null };

/** Tonight at the selected venue. Managers get full stats; door and bar staff get the counter and their own scans. */
export function useTonight() {
  const { current } = useStaff();
  const [state, setState] = useState<State>(EMPTY);
  const busy = useRef(false);
  const venueId = current?.venueId;
  const manager = current ? canSeeVenueStats(current.role) : false;

  const load = useCallback(async () => {
    if (!venueId || busy.current) return;
    busy.current = true;
    try {
      const [list, offer, scans] = await Promise.all([
        supabase.from('guest_lists').select('id').eq('venue_id', venueId).eq('night', sydneyNight()).order('created_at').limit(1).maybeSingle(),
        supabase
          .from('deals')
          .select('id, title')
          .eq('venue_id', venueId)
          .eq('status', 'active')
          .in('source', ['outly_partner', 'demo'])
          .contains('categories', ['drinks'])
          .limit(1)
          .maybeSingle(),
        supabase.rpc('recent_scans', { p_venue_id: venueId, p_limit: 8 }),
      ]);
      if (list.error) throw list.error;
      if (offer.error) throw offer.error;
      if (scans.error) throw scans.error;

      let counter: State['counter'] = null;
      let live: LiveStats | null = null;
      if (list.data) {
        const c = await supabase.rpc('guest_list_stats', { p_guest_list_id: list.data.id });
        if (c.error) throw c.error;
        counter = c.data[0] ?? null;
        if (manager) {
          const s = await supabase.rpc('venue_live_stats', { p_venue_id: venueId });
          if (s.error) throw s.error;
          live = s.data.find((r) => r.guest_list_id === list.data!.id) ?? null;
        }
      }
      setState({
        loading: false,
        error: null,
        guestListId: list.data?.id ?? null,
        counter,
        live,
        offer: offer.data,
        scans: scans.data,
      });
    } catch (e) {
      console.warn('[useTonight]', e);
      setState((s) => ({ ...s, loading: false, error: toUserMessage(e) }));
    } finally {
      busy.current = false;
    }
  }, [venueId, manager]);

  // Live while the screen is focused AND the tab/app is visible (no polling from a phone in a pocket).
  useFocusEffect(useCallback(() => startVisiblePolling(() => void load(), REFRESH_MS), [load]));

  return { ...state, reload: load };
}
