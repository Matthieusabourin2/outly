-- =====================================================================
-- Outly — migration 0006: findings of the final security audit of the launch branch
-- (2026-10-14), each reproduced on a test database before this fix.
--   F1. Deleting a door account deleted its whole scan history (scan_events.scanned_by was
--       NOT NULL ... ON DELETE CASCADE): the night's figures would change after the event,
--       and any staff member can delete their own account. Now kept, author set to null.
--   F2. A suspended account kept its powers: a suspended guest still read the classic
--       attendee list and could change their visibility; a suspended staff member could still
--       scan passes, redeem offers and read the venue stats (has_venue_role ignored
--       suspension). Suspension now closes all of them.
--   F3. A scan at venue A of a pass from venue B logged B's booking, so A's "latest scans"
--       showed B's guest username. A scan now only logs a booking of its own venue.
--   F4. check_in(booking, nonce), replaced by scan_pass for Rouge, was still callable by any
--       signed-in user: it skips the scan log and the suspension check. Closed to users.
--   F5. A new message could be back-dated (created_at on insert). Squads are hidden in V1.
-- Append-only: 0001–0005 are untouched.
-- =====================================================================

-- F1 ------------------------------------------------------------------
alter table public.scan_events alter column scanned_by drop not null;
alter table public.scan_events drop constraint scan_events_scanned_by_fkey;
alter table public.scan_events add constraint scan_events_scanned_by_fkey
  foreign key (scanned_by) references public.profiles(id) on delete set null;

-- F2 ------------------------------------------------------------------
-- Venue roles only count for an account that is not suspended.
create or replace function private.has_venue_role(v uuid, roles venue_role[]) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from venue_memberships m
    where m.user_id = auth.uid() and m.venue_id = v and m.role = any(roles)
  ) and not is_suspended(auth.uid());
$$;

create or replace function private.is_venue_member(v uuid) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from venue_memberships m where m.user_id = auth.uid() and m.venue_id = v)
     and not is_suspended(auth.uid());
$$;

-- A5: usernames of classic attendees, only for a caller who is classic on the same list
-- and not suspended. Never real names; suspended accounts and blocked pairs are left out.
create or replace function public.event_attendees(p_guest_list_id uuid)
returns table (user_id uuid, username text)
language plpgsql stable security definer set search_path = public, private as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  if is_suspended(me) then return; end if;
  if not exists (select 1 from bookings
                  where guest_list_id = p_guest_list_id and bookings.user_id = me
                    and status in ('confirmed','checked_in') and attendee_visibility = 'classic') then
    return;
  end if;
  return query
    select p.id, p.username::text
      from bookings b join profiles p on p.id = b.user_id
     where b.guest_list_id = p_guest_list_id
       and b.status in ('confirmed','checked_in')
       and b.attendee_visibility = 'classic'
       and b.user_id <> me
       and p.suspended_at is null
       and not is_blocked_between(p.id, me)
     order by p.username;
end $$;

create or replace function public.set_attendee_visibility(p_booking_id uuid, p_visibility attendee_visibility)
returns bookings language plpgsql security definer set search_path = public, private as $$
declare b bookings;
begin
  if is_suspended(auth.uid()) then raise exception 'OUTLY_SUSPENDED'; end if;
  update bookings set attendee_visibility = p_visibility, updated_at = now()
   where id = p_booking_id and user_id = auth.uid() and type = 'guest_list'
   returning * into b;
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;
  return b;
end $$;

-- F3 ------------------------------------------------------------------
-- scan_pass and redeem_offer log the booking id read from the QR; keep it only when the
-- booking belongs to the scanning venue (the result stays 'invalid' either way).
create or replace function private.scan_event_own_venue() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.booking_id is not null
     and not exists (select 1 from bookings b where b.id = new.booking_id and b.venue_id = new.venue_id) then
    new.booking_id := null;
    new.guest_list_id := null;
  end if;
  return new;
end $$;
revoke execute on function private.scan_event_own_venue() from public, anon, authenticated;

create trigger scan_events_own_venue before insert on public.scan_events
  for each row execute function private.scan_event_own_venue();

-- F4 ------------------------------------------------------------------
revoke execute on function public.check_in(uuid, uuid) from public, anon, authenticated;
grant execute on function public.check_in(uuid, uuid) to service_role;

-- F5 ------------------------------------------------------------------
revoke insert on public.messages from anon, authenticated;
grant insert (squad_id, sender_id, body) on public.messages to authenticated;
