-- =====================================================================
-- Outly — migration 0002: Rouge launch (SPEC Amendments A1–A9)
-- Attendee list (ghost / classic), event line-up, door + bar scanning with a
-- scan log, live stats for venue managers and Outly staff.
-- Append-only: never edit 0001.
-- =====================================================================

create type attendee_visibility as enum ('ghost','classic');
create type scan_result as enum ('ok','already_used','invalid','wrong_night','not_confirmed','forbidden');

-- A5: chosen when joining a guest list; ghost (default) = hidden and sees nobody.
alter table bookings add column attendee_visibility attendee_visibility not null default 'ghost';

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function is_suspended(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = u and suspended_at is not null);
$$;

-- The "night" a moment belongs to, Sydney time: a scan at 1am counts for the previous evening.
create or replace function sydney_night(ts timestamptz) returns date
language sql immutable as $$
  select ((ts - interval '6 hours') at time zone 'Australia/Sydney')::date;
$$;

-- ---------------------------------------------------------------------
-- Line-up (A1)
-- ---------------------------------------------------------------------
create table event_sets (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  artist_name text not null check (char_length(artist_name) between 1 and 80),
  stage       text check (char_length(stage) <= 40),
  starts_at   timestamptz,
  ends_at     timestamptz,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  constraint event_set_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index event_sets_event_idx on event_sets(event_id, sort);
alter table event_sets enable row level security;

create policy es_read on event_sets for select using (
  exists (select 1 from events e where e.id = event_id
          and (content_visible(e.status, e.source, e.verified_at) or is_venue_member(e.venue_id) or is_outly())));
create policy es_write on event_sets for all
  using (exists (select 1 from events e where e.id = event_id
                 and (has_venue_role(e.venue_id, array['venue_owner','venue_manager']::venue_role[])
                      or is_outly(array['outly_events','outly_partnerships']::outly_role[]))))
  with check (exists (select 1 from events e where e.id = event_id
                 and (has_venue_role(e.venue_id, array['venue_owner','venue_manager']::venue_role[])
                      or is_outly(array['outly_events','outly_partnerships']::outly_role[]))));

-- ---------------------------------------------------------------------
-- Scan log: every door/bar scan, accepted or refused (counts failed scans)
-- Written only by scan_pass / redeem_offer. A scan that never reaches the
-- server (no signal) is not logged.
-- ---------------------------------------------------------------------
create table scan_events (
  id            bigint generated always as identity primary key,
  venue_id      uuid not null references venues(id) on delete cascade,
  guest_list_id uuid references guest_lists(id) on delete set null,
  booking_id    uuid references bookings(id) on delete set null,
  deal_id       uuid references deals(id) on delete set null,
  scanned_by    uuid not null references profiles(id) on delete cascade,
  kind          text not null default 'door' check (kind in ('door','bar')),
  result        scan_result not null,
  created_at    timestamptz not null default now()
);
create index scan_events_venue_idx on scan_events(venue_id, created_at);
alter table scan_events enable row level security;

create policy se_read on scan_events for select using (
  scanned_by = auth.uid()
  or has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[])
  or is_outly());

-- ---------------------------------------------------------------------
-- Drinks offer redemptions (A4) — feature stays off until a deal is active
-- ---------------------------------------------------------------------
create table offer_redemptions (
  id          bigint generated always as identity primary key,
  deal_id     uuid not null references deals(id) on delete cascade,
  booking_id  uuid not null references bookings(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  venue_id    uuid not null references venues(id) on delete cascade,
  redeemed_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (deal_id, booking_id)
);
alter table offer_redemptions enable row level security;

create policy or_read on offer_redemptions for select using (
  user_id = auth.uid() or is_venue_member(venue_id) or is_outly());

-- ---------------------------------------------------------------------
-- Guest list: suspended accounts can't join; event join with visibility
-- ---------------------------------------------------------------------
create or replace function join_guest_list(p_guest_list_id uuid, p_party_size int, p_squad_id uuid default null)
returns bookings language plpgsql security definer set search_path = public as $$
declare g guest_lists; used int; b bookings; me uuid := auth.uid();
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  if is_suspended(me) then raise exception 'OUTLY_SUSPENDED'; end if;
  select * into g from guest_lists where id = p_guest_list_id for update;
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;
  if not is_partner_venue(g.venue_id) then raise exception 'OUTLY_NOT_PARTNER'; end if;
  if g.closes_at is not null and now() > g.closes_at then raise exception 'OUTLY_LIST_CLOSED'; end if;
  if p_squad_id is not null and not is_squad_member(p_squad_id) then raise exception 'OUTLY_FORBIDDEN'; end if;
  if exists (select 1 from bookings where guest_list_id = g.id and user_id = me and status in ('confirmed','checked_in')) then
    raise exception 'OUTLY_ALREADY_ON_LIST';
  end if;
  select coalesce(sum(party_size),0) into used from bookings
   where guest_list_id = g.id and status in ('confirmed','checked_in');
  if used + p_party_size > g.capacity then raise exception 'OUTLY_LIST_FULL'; end if;

  insert into bookings (venue_id, user_id, squad_id, guest_list_id, type, status, party_size, starts_at)
  values (g.venue_id, me, p_squad_id, g.id, 'guest_list', 'confirmed', p_party_size,
          (g.night::timestamp + time '18:00') at time zone 'Australia/Sydney')
  returning * into b;
  return b;
end $$;

-- A4: one pass per person (no +1). A5: visibility chosen at join time.
create or replace function join_event_list(p_guest_list_id uuid, p_visibility attendee_visibility default 'ghost')
returns bookings language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  b := join_guest_list(p_guest_list_id, 1);
  update bookings set attendee_visibility = coalesce(p_visibility, 'ghost'), updated_at = now()
   where id = b.id returning * into b;
  return b;
end $$;

create or replace function set_attendee_visibility(p_booking_id uuid, p_visibility attendee_visibility)
returns bookings language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  update bookings set attendee_visibility = p_visibility, updated_at = now()
   where id = p_booking_id and user_id = auth.uid() and type = 'guest_list'
   returning * into b;
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;
  return b;
end $$;

-- Public counter ("87 / 200"): any signed-in user, partner venues only.
create or replace function guest_list_stats(p_guest_list_id uuid)
returns table (capacity int, joined int, remaining int)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  return query
    select g.capacity,
           coalesce(sum(b.party_size) filter (where b.status in ('confirmed','checked_in')),0)::int,
           greatest(g.capacity - coalesce(sum(b.party_size) filter (where b.status in ('confirmed','checked_in')),0), 0)::int
      from guest_lists g left join bookings b on b.guest_list_id = g.id
     where g.id = p_guest_list_id and is_partner_venue(g.venue_id)
     group by g.id;
end $$;

-- A5: usernames of classic attendees, only for a caller who is classic on the same list.
-- Never real names; suspended accounts and blocked pairs are left out.
create or replace function event_attendees(p_guest_list_id uuid)
returns table (user_id uuid, username text)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
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

-- ---------------------------------------------------------------------
-- Door scan (A4, A7). Pass QR = 'OUTLY1:<booking_id>:<nonce>'.
-- Returns a result instead of raising, so refusals are logged and counted.
-- ---------------------------------------------------------------------
create or replace function parse_pass_code(p_code text, out booking_id uuid, out nonce uuid)
language plpgsql immutable as $$
begin
  if p_code !~* '^OUTLY1:[0-9a-f-]{36}:[0-9a-f-]{36}$' then return; end if;
  booking_id := split_part(p_code, ':', 2)::uuid;
  nonce      := split_part(p_code, ':', 3)::uuid;
exception when invalid_text_representation then
  booking_id := null; nonce := null;
end $$;

create or replace function scan_pass(p_venue_id uuid, p_code text)
returns table (result scan_result, username text, checked_in_at timestamptz, booking_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  code record;
  b bookings;
  r scan_result;
  uname text;
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  if not has_venue_role(p_venue_id, array['venue_owner','venue_manager','venue_staff','venue_door']::venue_role[]) then
    raise exception 'OUTLY_FORBIDDEN';
  end if;

  select * into code from parse_pass_code(p_code);
  if code.booking_id is not null then
    select * into b from bookings where id = code.booking_id for update;
  end if;

  if b.id is null or b.venue_id <> p_venue_id or b.type <> 'guest_list' then
    r := 'invalid';
  elsif b.status = 'checked_in' then
    r := 'already_used';
  elsif b.qr_nonce <> code.nonce then
    r := 'invalid';
  elsif b.status <> 'confirmed' then
    r := 'not_confirmed';
  elsif is_suspended(b.user_id) then
    r := 'forbidden';
  elsif (b.starts_at at time zone 'Australia/Sydney')::date not in
        ((now() at time zone 'Australia/Sydney')::date, sydney_night(now())) then
    r := 'wrong_night';
  else
    r := 'ok';
    update bookings set status = 'checked_in', checked_in_at = now(), checked_in_by = me,
           qr_nonce = gen_random_uuid(), updated_at = now()
     where id = b.id returning * into b;
  end if;

  insert into scan_events (venue_id, guest_list_id, booking_id, scanned_by, kind, result)
  values (p_venue_id, b.guest_list_id, b.id, me, 'door', r);

  if b.id is not null and b.venue_id = p_venue_id then
    select p.username::text into uname from profiles p where p.id = b.user_id;
    return query select r, uname, b.checked_in_at, b.id;
  else
    return query select r, null::text, null::timestamptz, null::uuid;
  end if;
end $$;

-- Bar scan for an active drinks offer: once per pass per offer.
create or replace function redeem_offer(p_venue_id uuid, p_deal_id uuid, p_code text)
returns table (result scan_result, username text)
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  code record;
  b bookings;
  d deals;
  r scan_result;
  uname text;
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  if not has_venue_role(p_venue_id, array['venue_owner','venue_manager','venue_staff']::venue_role[]) then
    raise exception 'OUTLY_FORBIDDEN';
  end if;
  select * into d from deals where id = p_deal_id and venue_id = p_venue_id
     and content_visible(status, source, verified_at);
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;

  select * into code from parse_pass_code(p_code);
  if code.booking_id is not null then
    select * into b from bookings where id = code.booking_id;
  end if;

  -- The QR nonce rotates at check-in, so the bar accepts the booking id of a pass
  -- that is confirmed or already checked in tonight.
  if b.id is null or b.venue_id <> p_venue_id or b.type <> 'guest_list'
     or b.status not in ('confirmed','checked_in') then
    r := 'invalid';
  elsif is_suspended(b.user_id) then
    r := 'forbidden';
  elsif (b.starts_at at time zone 'Australia/Sydney')::date not in
        ((now() at time zone 'Australia/Sydney')::date, sydney_night(now())) then
    r := 'wrong_night';
  elsif exists (select 1 from offer_redemptions o where o.deal_id = d.id and o.booking_id = b.id) then
    r := 'already_used';
  else
    r := 'ok';
    insert into offer_redemptions (deal_id, booking_id, user_id, venue_id, redeemed_by)
    values (d.id, b.id, b.user_id, p_venue_id, me);
  end if;

  insert into scan_events (venue_id, guest_list_id, booking_id, deal_id, scanned_by, kind, result)
  values (p_venue_id, b.guest_list_id, b.id, d.id, me, 'bar', r);

  if b.id is not null and b.venue_id = p_venue_id then
    select p.username::text into uname from profiles p where p.id = b.user_id;
  end if;
  return query select r, uname;
end $$;

-- ---------------------------------------------------------------------
-- Live stats: venue owner/manager of that venue, or any Outly staff (aggregates only)
-- ---------------------------------------------------------------------
create or replace function can_see_venue_stats(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select has_venue_role(v, array['venue_owner','venue_manager']::venue_role[]) or is_outly();
$$;

create or replace function venue_live_stats(p_venue_id uuid, p_night date default null)
returns table (guest_list_id uuid, capacity int, joined int, checked_in int,
               classic_count int, ghost_count int, scans_ok int, scans_failed int, last_scan_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare n date := coalesce(p_night, sydney_night(now()));
begin
  if auth.uid() is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  if not can_see_venue_stats(p_venue_id) then raise exception 'OUTLY_FORBIDDEN'; end if;
  return query
    with s as (
      select count(*) filter (where e.result = 'ok' and e.kind = 'door')::int as ok,
             count(*) filter (where e.result <> 'ok' and e.kind = 'door')::int as failed,
             max(e.created_at) as last_at
        from scan_events e
       where e.venue_id = p_venue_id and sydney_night(e.created_at) = n
    )
    select g.id, g.capacity,
           coalesce(sum(b.party_size) filter (where b.status in ('confirmed','checked_in')),0)::int,
           coalesce(sum(b.party_size) filter (where b.status = 'checked_in'),0)::int,
           (count(b.id) filter (where b.status in ('confirmed','checked_in') and b.attendee_visibility = 'classic'))::int,
           (count(b.id) filter (where b.status in ('confirmed','checked_in') and b.attendee_visibility = 'ghost'))::int,
           s.ok, s.failed, s.last_at
      from guest_lists g
      left join bookings b on b.guest_list_id = g.id
      cross join s
     where g.venue_id = p_venue_id and g.night = n
     group by g.id, s.ok, s.failed, s.last_at;
end $$;

create or replace function venue_activity(p_guest_list_id uuid, p_bucket_minutes int default 15)
returns table (bucket_start timestamptz, joins int, check_ins int, scans_failed int)
language plpgsql stable security definer set search_path = public as $$
declare g guest_lists; step interval := make_interval(mins => greatest(5, least(coalesce(p_bucket_minutes, 15), 240)));
begin
  if auth.uid() is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  select * into g from guest_lists where id = p_guest_list_id;
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;
  if not can_see_venue_stats(g.venue_id) then raise exception 'OUTLY_FORBIDDEN'; end if;
  return query
    with ev as (
      select date_bin(step, b.created_at, timestamptz '2000-01-01') as t, 1 as j, 0 as c, 0 as f
        from bookings b where b.guest_list_id = g.id and b.status in ('confirmed','checked_in','no_show')
      union all
      select date_bin(step, b.checked_in_at, timestamptz '2000-01-01'), 0, 1, 0
        from bookings b where b.guest_list_id = g.id and b.checked_in_at is not null
      union all
      select date_bin(step, e.created_at, timestamptz '2000-01-01'), 0, 0, 1
        from scan_events e
       where e.venue_id = g.venue_id and e.kind = 'door' and e.result <> 'ok' and sydney_night(e.created_at) = g.night
    )
    select ev.t, sum(ev.j)::int, sum(ev.c)::int, sum(ev.f)::int from ev group by ev.t order by ev.t;
end $$;

-- ---------------------------------------------------------------------
-- Grants: RPCs for signed-in users only (each function checks its own rights)
-- ---------------------------------------------------------------------
revoke execute on function join_event_list(uuid, attendee_visibility), set_attendee_visibility(uuid, attendee_visibility),
  guest_list_stats(uuid), event_attendees(uuid), scan_pass(uuid, text), redeem_offer(uuid, uuid, text),
  venue_live_stats(uuid, date), venue_activity(uuid, int), is_suspended(uuid), can_see_venue_stats(uuid)
  from public, anon;
grant execute on function join_event_list(uuid, attendee_visibility), set_attendee_visibility(uuid, attendee_visibility),
  guest_list_stats(uuid), event_attendees(uuid), scan_pass(uuid, text), redeem_offer(uuid, uuid, text),
  venue_live_stats(uuid, date), venue_activity(uuid, int)
  to authenticated;
