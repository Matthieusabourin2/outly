-- =====================================================================
-- Outly — migration 0005: fixes from the adversarial security review (2026-10-14).
-- Both holes were reproduced through the local Supabase API with fresh accounts.
--   F1. Account deletion could be blocked by someone else. profiles.referred_by (and
--       the staff columns below) reference profiles with no ON DELETE action: any user
--       could set referred_by to another user's id (ids are listed in public_profiles),
--       and that person's delete-account then failed (HTTP 500, FK violation). Same
--       for door staff who scanned a pass (bookings.checked_in_by): their account could
--       not be deleted after the night. 0004 stops users from setting referred_by;
--       here every nullable reference to a person becomes ON DELETE SET NULL.
--       (payment_requests.created_by and campaigns.created_by are NOT NULL and unused
--       in V1: left as they are.)
--   F2. One account could take 30 of the 200 guest-list spots: join_guest_list(list,
--       party_size) was callable directly with party_size up to 30, bypassing
--       join_event_list (1 pass per person, SPEC A4). A handful of accounts filled the
--       list. request_table (table bookings, deferred by SPEC A1) was also live.
--       Both are closed to the API; join_event_list (SECURITY DEFINER) still calls
--       join_guest_list internally. Re-grant when table bookings / +1s ship.
-- Append-only: 0001–0004 are untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- F1. Deleting a person never fails because of a reference to them.
-- ---------------------------------------------------------------------
alter table public.profiles          drop constraint profiles_referred_by_fkey,
  add constraint profiles_referred_by_fkey foreign key (referred_by) references public.profiles(id) on delete set null;
alter table public.venue_memberships drop constraint venue_memberships_invited_by_fkey,
  add constraint venue_memberships_invited_by_fkey foreign key (invited_by) references public.profiles(id) on delete set null;
alter table public.deals             drop constraint deals_created_by_fkey,
  add constraint deals_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.events            drop constraint events_created_by_fkey,
  add constraint events_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.guest_lists       drop constraint guest_lists_created_by_fkey,
  add constraint guest_lists_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.bookings          drop constraint bookings_decided_by_fkey,
  add constraint bookings_decided_by_fkey foreign key (decided_by) references public.profiles(id) on delete set null;
alter table public.bookings          drop constraint bookings_checked_in_by_fkey,
  add constraint bookings_checked_in_by_fkey foreign key (checked_in_by) references public.profiles(id) on delete set null;
alter table public.reports           drop constraint reports_handled_by_fkey,
  add constraint reports_handled_by_fkey foreign key (handled_by) references public.profiles(id) on delete set null;
alter table public.payment_requests  drop constraint payment_requests_payer_id_fkey,
  add constraint payment_requests_payer_id_fkey foreign key (payer_id) references public.profiles(id) on delete set null;
alter table public.campaigns         drop constraint campaigns_approved_by_fkey,
  add constraint campaigns_approved_by_fkey foreign key (approved_by) references public.profiles(id) on delete set null;
alter table public.audit_log         drop constraint audit_log_actor_id_fkey,
  add constraint audit_log_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete set null;

-- ---------------------------------------------------------------------
-- F2. Guest list: only join_event_list (1 pass per person). No table requests in V1.
-- ---------------------------------------------------------------------
revoke execute on function public.join_guest_list(uuid, int, uuid) from public, anon, authenticated;
revoke execute on function public.request_table(uuid, timestamptz, int, text, uuid) from public, anon, authenticated;
grant execute on function public.join_guest_list(uuid, int, uuid), public.request_table(uuid, timestamptz, int, text, uuid) to service_role;
