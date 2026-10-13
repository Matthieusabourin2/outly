-- =====================================================================
-- Outly — migration 0003: launch hardening (security audit, 2026-10-13)
-- Closes data leaks through the Supabase API before real guests sign up.
--   H1. Internal helper functions move to a schema PostgREST does not expose.
--   H2. RPCs that need a signed-in user are no longer executable by anon.
--   H3. public_profiles stops exposing real first names (SPEC A5: usernames only).
--   H4. Door / bar staff can no longer read raw bookings (pass nonces).
--   H5. Venue commercial terms are no longer readable by every signed-in user.
-- Append-only: 0001 and 0002 are untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- H1. Internal helpers → schema "private"
-- Every function in schema public is callable as /rest/v1/rpc/<name>, and Postgres
-- grants EXECUTE to PUBLIC by default: anyone could ask "are A and B friends?",
-- "did A block B?", "is this user suspended?". RLS policies and views reference
-- functions by OID, so moving them keeps every policy working.
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
-- Policies run as the querying role and call these helpers: those roles need them,
-- but the schema is not exposed by the API, so they cannot be called directly.
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_outly(outly_role[])                                   set schema private;
alter function public.has_venue_role(uuid, venue_role[])                       set schema private;
alter function public.is_venue_member(uuid)                                    set schema private;
alter function public.are_friends(uuid, uuid)                                  set schema private;
alter function public.is_blocked_between(uuid, uuid)                           set schema private;
alter function public.is_squad_member(uuid)                                    set schema private;
alter function public.is_squad_admin(uuid)                                     set schema private;
alter function public.is_partner_venue(uuid)                                   set schema private;
alter function public.content_visible(content_status, content_source, timestamptz) set schema private;
alter function public.is_payment_participant(uuid)                             set schema private;
alter function public.is_payment_venue_member(uuid)                            set schema private;
alter function public.can_see_activity(uuid)                                   set schema private;
alter function public.is_suspended(uuid)                                       set schema private;
alter function public.can_see_venue_stats(uuid)                                set schema private;
alter function public.sydney_night(timestamptz)                                set schema private;
alter function public.parse_pass_code(text)                                    set schema private;
-- Trigger functions and the cron job are not callable as RPCs in a useful way,
-- but they have no business in the API schema either.
alter function public.enforce_adult()                                          set schema private;
alter function public.venues_protect_columns()                                 set schema private;
alter function public.on_block()                                               set schema private;
alter function public.expire_and_no_show()                                     set schema private;

-- Function bodies call helpers by unqualified name: give every function a search_path
-- that finds both schemas (and pin it where it was missing).
alter function private.is_outly(outly_role[])                                   set search_path = public, private;
alter function private.has_venue_role(uuid, venue_role[])                       set search_path = public, private;
alter function private.is_venue_member(uuid)                                    set search_path = public, private;
alter function private.are_friends(uuid, uuid)                                  set search_path = public, private;
alter function private.is_blocked_between(uuid, uuid)                           set search_path = public, private;
alter function private.is_squad_member(uuid)                                    set search_path = public, private;
alter function private.is_squad_admin(uuid)                                     set search_path = public, private;
alter function private.is_partner_venue(uuid)                                   set search_path = public, private;
alter function private.content_visible(content_status, content_source, timestamptz) set search_path = public, private;
alter function private.is_payment_participant(uuid)                             set search_path = public, private;
alter function private.is_payment_venue_member(uuid)                            set search_path = public, private;
alter function private.can_see_activity(uuid)                                   set search_path = public, private;
alter function private.is_suspended(uuid)                                       set search_path = public, private;
alter function private.can_see_venue_stats(uuid)                                set search_path = public, private;
alter function private.sydney_night(timestamptz)                                set search_path = public, private;
alter function private.parse_pass_code(text)                                    set search_path = public, private;
alter function private.enforce_adult()                                          set search_path = public, private;
alter function private.venues_protect_columns()                                 set search_path = public, private;
alter function private.on_block()                                               set search_path = public, private;
alter function private.expire_and_no_show()                                     set search_path = public, private;

alter function public.join_guest_list(uuid, int, uuid)                          set search_path = public, private;
alter function public.request_table(uuid, timestamptz, int, text, uuid)         set search_path = public, private;
alter function public.decide_booking(uuid, boolean)                             set search_path = public, private;
alter function public.check_in(uuid, uuid)                                      set search_path = public, private;
alter function public.cancel_booking(uuid)                                      set search_path = public, private;
alter function public.join_event_list(uuid, attendee_visibility)                set search_path = public, private;
alter function public.set_attendee_visibility(uuid, attendee_visibility)        set search_path = public, private;
alter function public.guest_list_stats(uuid)                                    set search_path = public, private;
alter function public.event_attendees(uuid)                                     set search_path = public, private;
alter function public.scan_pass(uuid, text)                                     set search_path = public, private;
alter function public.redeem_offer(uuid, uuid, text)                            set search_path = public, private;
alter function public.venue_live_stats(uuid, date)                              set search_path = public, private;
alter function public.venue_activity(uuid, int)                                 set search_path = public, private;
alter function public.recent_scans(uuid, int)                                   set search_path = public, private;

-- Policies evaluated for anon (e.g. reading active deals) and signed-in users call
-- helpers: keep EXECUTE for them. The cron job stays service-only.
grant execute on all functions in schema private to anon, authenticated, service_role;
revoke execute on function private.expire_and_no_show() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- H2. RPCs that need a signed-in user: not executable by anon
-- (they already refuse inside, this removes them from the anonymous surface)
-- ---------------------------------------------------------------------
revoke execute on function
  public.join_guest_list(uuid, int, uuid),
  public.request_table(uuid, timestamptz, int, text, uuid),
  public.decide_booking(uuid, boolean),
  public.check_in(uuid, uuid),
  public.cancel_booking(uuid)
  from public, anon;
grant execute on function
  public.join_guest_list(uuid, int, uuid),
  public.request_table(uuid, timestamptz, int, text, uuid),
  public.decide_booking(uuid, boolean),
  public.check_in(uuid, uuid),
  public.cancel_booking(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- H3. public_profiles: usernames only (SPEC A5). display_name is a real first
-- name and referral_code is private; neither belongs in a list everyone can read.
-- ---------------------------------------------------------------------
drop view public.public_profiles;
create view public.public_profiles with (security_invoker = false) as
  select p.id, p.username, p.avatar_url
  from profiles p
  where p.suspended_at is null
    and auth.uid() is not null
    and not private.is_blocked_between(p.id, auth.uid());
revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------
-- H4. Raw bookings (with their pass nonce) readable by owners/managers only.
-- Door and bar staff work through scan_pass / redeem_offer / recent_scans /
-- guest_list_stats, which never return a nonce. A door account could otherwise
-- mint a valid pass for any guest of the venue.
-- ---------------------------------------------------------------------
drop policy bookings_venue_read on bookings;
create policy bookings_venue_read on bookings for select
  using (private.has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]));

-- ---------------------------------------------------------------------
-- H5. Venue commercial terms (commission, booking commission, Stripe account)
-- are not readable through the API. Column privileges: every other column stays
-- readable exactly as before (RLS unchanged). Apps must select explicit columns
-- (they do). Owners, managers and Outly staff read the terms via an RPC.
-- ---------------------------------------------------------------------
revoke select on public.venues from anon, authenticated;
grant select (id, google_place_id, partner_status, name, address, lat, lng, categories, vibe_tags,
              description, cover_image_path, booking_request_ttl_minutes, instant_booking_enabled,
              default_guest_list_capacity, is_demo, created_at, updated_at)
  on public.venues to anon, authenticated;

create or replace function public.venue_commercial_terms(p_venue_id uuid)
returns table (commission_rate numeric, booking_commission_cents int, stripe_account_id text)
language plpgsql stable security definer set search_path = public, private as $$
begin
  if auth.uid() is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  if not (has_venue_role(p_venue_id, array['venue_owner','venue_manager']::venue_role[])
          or is_outly(array['outly_partnerships']::outly_role[])) then
    raise exception 'OUTLY_FORBIDDEN';
  end if;
  return query select v.commission_rate, v.booking_commission_cents, v.stripe_account_id
                 from venues v where v.id = p_venue_id;
end $$;
revoke execute on function public.venue_commercial_terms(uuid) from public, anon;
grant execute on function public.venue_commercial_terms(uuid) to authenticated;
