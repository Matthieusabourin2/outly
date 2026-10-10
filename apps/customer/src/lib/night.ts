import { sydneyNight, toUserMessage } from '@outly/core';
import type { Enums } from '@outly/db';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

const REFRESH_MS = 15_000;

async function fetchNight() {
  const { data, error } = await supabase
    .from('guest_lists')
    .select(
      'id, night, capacity, venue:venues(id, name, address), event:events(id, title, description, starts_at, ends_at, sets:event_sets(id, artist_name, stage, starts_at, ends_at, sort))',
    )
    .not('event_id', 'is', null)
    .gte('night', sydneyNight())
    .order('night')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Night = NonNullable<Awaited<ReturnType<typeof fetchNight>>>;

export type MyBooking = {
  id: string;
  status: Enums<'booking_status'>;
  qr_nonce: string;
  attendee_visibility: Enums<'attendee_visibility'>;
  checked_in_at: string | null;
};

export type Attendee = { user_id: string; username: string };
export type Offer = { id: string; title: string; description: string | null; source: Enums<'content_source'> };

type State = {
  loading: boolean;
  error: string | null;
  night: Night | null;
  stats: { capacity: number; joined: number; remaining: number } | null;
  booking: MyBooking | null;
  attendees: Attendee[];
  offer: Offer | null;
};

const EMPTY: State = { loading: true, error: null, night: null, stats: null, booking: null, attendees: [], offer: null };

/** Everything the Night and Pass tabs show, refreshed while the screen is focused. */
export function useNight() {
  const { session } = useAuth();
  const [state, setState] = useState<State>(EMPTY);
  const userId = session?.user.id;
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!userId || busy.current) return;
    busy.current = true;
    try {
      const night = await fetchNight();
      if (!night) {
        setState({ ...EMPTY, loading: false });
        return;
      }
      const [stats, booking, offer] = await Promise.all([
        supabase.rpc('guest_list_stats', { p_guest_list_id: night.id }),
        supabase
          .from('bookings')
          .select('id, status, qr_nonce, attendee_visibility, checked_in_at')
          .eq('guest_list_id', night.id)
          .eq('user_id', userId)
          .in('status', ['confirmed', 'checked_in'])
          .maybeSingle(),
        night.venue
          ? supabase
              .from('deals')
              .select('id, title, description, source')
              .eq('venue_id', night.venue.id)
              // Only offers made through Outly can promise something for an Outly pass (CLAUDE.md rule 4).
              .in('source', ['outly_partner', 'demo'])
              .eq('status', 'active')
              .contains('categories', ['drinks'])
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (stats.error) throw stats.error;
      if (booking.error) throw booking.error;
      if (offer.error) throw offer.error;

      let attendees: Attendee[] = [];
      if (booking.data?.attendee_visibility === 'classic') {
        const a = await supabase.rpc('event_attendees', { p_guest_list_id: night.id });
        if (a.error) throw a.error;
        attendees = a.data;
      }
      setState({
        loading: false,
        error: null,
        night,
        stats: stats.data[0] ?? null,
        booking: booking.data,
        attendees,
        offer: offer.data,
      });
    } catch (e) {
      console.warn('[useNight]', e);
      setState((s) => ({ ...s, loading: false, error: toUserMessage(e) }));
    } finally {
      busy.current = false;
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), REFRESH_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  return { ...state, reload: load };
}
