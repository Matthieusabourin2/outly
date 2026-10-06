import { VENUE_LIST_COLUMNS, type Tables } from '@outly/db';
import { toUserMessage } from '@outly/core';
import { useCallback, useEffect, useState } from 'react';
import { ensureDevSession, supabase } from './supabase';

export type VenueListItem = Pick<Tables<'venues'>, 'id' | 'name' | 'partner_status' | 'categories' | 'vibe_tags' | 'is_demo'>;

type State = { venues: VenueListItem[]; error: string | null; loading: boolean };

async function fetchVenues(): Promise<State> {
  try {
    await ensureDevSession();
    const { data, error } = await supabase.from('venues').select(VENUE_LIST_COLUMNS).order('name');
    if (error) throw error;
    return { venues: data, error: null, loading: false };
  } catch (e) {
    console.warn('[useDemoVenues]', e);
    return { venues: [], error: toUserMessage(e), loading: false };
  }
}

/** Slice 0 proof of the chain: app → Supabase → RLS → demo seed. */
export function useDemoVenues() {
  const [state, setState] = useState<State>({ venues: [], error: null, loading: true });

  useEffect(() => {
    let active = true;
    void fetchVenues().then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    void fetchVenues().then(setState);
  }, []);

  return { ...state, reload };
}
