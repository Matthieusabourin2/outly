-- =====================================================================
-- Outly — migration 0001: core schema + Row Level Security
-- See docs/SPEC.md. Every table has RLS enabled. Money = integer cents AUD.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type venue_role        as enum ('venue_owner','venue_manager','venue_staff','venue_door');
create type outly_role        as enum ('outly_admin','outly_marketing','outly_partnerships','outly_events','outly_support');
create type partner_status    as enum ('listed','pending','partner','inactive');
create type content_source    as enum ('public_listing','outly_partner','demo');
create type content_status    as enum ('draft','pending_review','scheduled','active','expired','archived','rejected');
create type booking_type      as enum ('guest_list','table_request','instant');
create type booking_status    as enum ('pending','confirmed','declined','expired','cancelled','checked_in','no_show');
create type friendship_status as enum ('pending','accepted');
create type activity_visibility as enum ('off','selected');
create type payment_req_status as enum ('open','partially_paid','paid','expired','cancelled','refunded');
create type share_status      as enum ('requested','paid','declined','expired','refunded');
create type report_status     as enum ('open','actioned','dismissed');
create type campaign_status   as enum ('draft','approved','scheduled','sent','cancelled');
create type ai_surface        as enum ('customer','partner','admin');
create type tier_name         as enum ('bronze','silver','gold','platinum');

-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------
create table profiles (
  id                          uuid primary key references auth.users(id) on delete cascade,
  username                    citext unique not null check (username ~ '^[a-zA-Z0-9_.]{3,24}$'),
  display_name                text not null check (char_length(display_name) between 1 and 60),
  avatar_url                  text,
  date_of_birth               date not null,
  id_verified_at              timestamptz,
  referral_code               text unique not null default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  referred_by                 uuid references profiles(id),
  preferences                 jsonb not null default '{}'::jsonb,   -- interests, budget, home area
  alcohol_promos_opt_in       boolean not null default true,
  friend_activity_visibility  activity_visibility not null default 'off',
  no_show_count               int not null default 0,
  tier                        tier_name not null default 'bronze',
  suspended_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- 18+ gate (D6). Trigger rather than CHECK because it depends on current_date.
create or replace function enforce_adult() returns trigger language plpgsql as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'OUTLY_UNDER_18' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger profiles_adult before insert or update of date_of_birth on profiles
  for each row execute function enforce_adult();

create table outly_staff (
  user_id    uuid not null references profiles(id) on delete cascade,
  role       outly_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table push_tokens (
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios','android')),
  app        text not null check (app in ('customer','partner')),
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ---------------------------------------------------------------------
-- Venues
-- Google Places content is NEVER stored here (D4) — only google_place_id.
-- name/address/lat/lng below are PARTNER-PROVIDED (the venue's own content),
-- or demo data; for 'listed' venues they stay null and are fetched live.
-- ---------------------------------------------------------------------
create table venues (
  id                          uuid primary key default gen_random_uuid(),
  google_place_id             text unique,
  partner_status              partner_status not null default 'listed',
  name                        text,
  address                     text,
  lat                         double precision,
  lng                         double precision,
  categories                  text[] not null default '{}',   -- bar, rooftop, restaurant, pub, club, live_music...
  vibe_tags                   text[] not null default '{}',
  description                 text,                            -- written by Outly or the venue
  cover_image_path            text,                            -- Supabase Storage, venue-owned photos only
  commission_rate             numeric(5,4) not null default 0.0300 check (commission_rate between 0 and 0.5),
  booking_commission_cents    int not null default 0 check (booking_commission_cents >= 0),
  stripe_account_id           text,
  booking_request_ttl_minutes int not null default 15 check (booking_request_ttl_minutes between 5 and 240),
  instant_booking_enabled     boolean not null default false,  -- v2
  default_guest_list_capacity int not null default 100 check (default_guest_list_capacity >= 0),
  is_demo                     boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint venue_identity check (google_place_id is not null or name is not null)
);
create index venues_partner_status_idx on venues(partner_status);

create table venue_memberships (
  user_id    uuid not null references profiles(id) on delete cascade,
  venue_id   uuid not null references venues(id) on delete cascade,
  role       venue_role not null,
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

-- Google lat/lng may be cached max 30 days (Service Specific Terms 14.3). Purged by cron.
create table place_cache (
  google_place_id text primary key,
  lat             double precision not null,
  lng             double precision not null,
  fetched_at      timestamptz not null default now()
);

create table saved_venues (
  user_id    uuid not null references profiles(id) on delete cascade,
  venue_id   uuid references venues(id) on delete cascade,
  google_place_id text,
  created_at timestamptz not null default now(),
  constraint saved_target check (venue_id is not null or google_place_id is not null)
);
create unique index saved_venues_uniq on saved_venues(user_id, coalesce(venue_id::text, google_place_id));

-- ---------------------------------------------------------------------
-- Offers: deals and events (D5 honesty rules)
-- ---------------------------------------------------------------------
create table deals (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references venues(id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 80),
  description   text,
  categories    text[] not null default '{}',      -- drinks, food, entry, experience
  source        content_source not null,
  source_url    text,
  verified_at   timestamptz,
  starts_at     timestamptz,
  ends_at       timestamptz,
  recurrence    text,                              -- RRULE, e.g. FREQ=WEEKLY;BYDAY=MO,TU,WE,TH;BYHOUR=16
  status        content_status not null default 'draft',
  involves_alcohol boolean not null default true,
  created_by    uuid references profiles(id),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint deal_public_listing_evidence check (source <> 'public_listing' or (source_url is not null and verified_at is not null)),
  constraint deal_demo_flag check ((source = 'demo') = is_demo),
  constraint deal_dates check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index deals_venue_idx on deals(venue_id);
create index deals_status_idx on deals(status);

create table events (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references venues(id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 100),
  description   text,
  tags          text[] not null default '{}',
  cover_image_path text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  price_cents   int check (price_cents >= 0),       -- null = free / unknown
  source        content_source not null,
  source_url    text,
  verified_at   timestamptz,
  status        content_status not null default 'draft',
  created_by    uuid references profiles(id),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint event_public_listing_evidence check (source <> 'public_listing' or (source_url is not null and verified_at is not null)),
  constraint event_demo_flag check ((source = 'demo') = is_demo),
  constraint event_dates check (ends_at is null or ends_at > starts_at)
);
create index events_venue_idx on events(venue_id);
create index events_starts_idx on events(starts_at);

-- ---------------------------------------------------------------------
-- Bookings (D8)
-- ---------------------------------------------------------------------
create table guest_lists (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references venues(id) on delete cascade,
  event_id   uuid references events(id) on delete set null,
  night      date not null,
  capacity   int not null check (capacity >= 0),
  closes_at  timestamptz,
  note       text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (venue_id, night, event_id)
);

create table bookings (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references venues(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  squad_id         uuid,                                   -- fk added after squads
  guest_list_id    uuid references guest_lists(id) on delete set null,
  type             booking_type not null,
  status           booking_status not null default 'pending',
  party_size       int not null check (party_size between 1 and 30),
  starts_at        timestamptz not null,
  special_requests text check (char_length(special_requests) <= 500),
  expires_at       timestamptz,                            -- for table requests
  decided_by       uuid references profiles(id),
  decided_at       timestamptz,
  qr_nonce         uuid not null default gen_random_uuid(),-- rotated on use; HMAC signed by Edge Function
  checked_in_at    timestamptz,
  checked_in_by    uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint guest_list_link check (type <> 'guest_list' or guest_list_id is not null)
);
create index bookings_user_idx  on bookings(user_id, starts_at desc);
create index bookings_venue_idx on bookings(venue_id, starts_at);

-- ---------------------------------------------------------------------
-- Social (D7)
-- ---------------------------------------------------------------------
create table friendships (
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status       friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  constraint no_self_friend check (requester_id <> addressee_id)
);
create unique index friendships_pair_uniq on friendships(least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create table squads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  created_by uuid not null references profiles(id) on delete cascade,
  plan_date  date,
  created_at timestamptz not null default now()
);

create table squad_members (
  squad_id  uuid not null references squads(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  is_admin  boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

alter table bookings add constraint bookings_squad_fk foreign key (squad_id) references squads(id) on delete set null;

create table squad_candidates (
  id              uuid primary key default gen_random_uuid(),
  squad_id        uuid not null references squads(id) on delete cascade,
  venue_id        uuid references venues(id) on delete cascade,
  google_place_id text,
  added_by        uuid not null references profiles(id) on delete cascade,
  note            text,
  created_at      timestamptz not null default now(),
  constraint candidate_target check (venue_id is not null or google_place_id is not null)
);

create table squad_votes (
  candidate_id uuid not null references squad_candidates(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (candidate_id, user_id)
);

create table messages (
  id         uuid primary key default gen_random_uuid(),
  squad_id   uuid not null references squads(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index messages_squad_idx on messages(squad_id, created_at desc);

create table reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid references profiles(id) on delete cascade,
  message_id       uuid references messages(id) on delete set null,
  reason           text not null check (char_length(reason) between 3 and 1000),
  status           report_status not null default 'open',
  handled_by       uuid references profiles(id),
  handled_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- "Going to X tonight" — opt-in, audience = explicitly selected friends only.
create table activity_audience (
  user_id   uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  primary key (user_id, friend_id)
);

create table activity_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  venue_id   uuid references venues(id) on delete cascade,
  google_place_id text,
  night      date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Money (D9) — Stripe TEST MODE only in v1
-- ---------------------------------------------------------------------
create table payment_requests (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references venues(id) on delete cascade,
  created_by      uuid not null references profiles(id),
  amount_cents    int not null check (amount_cents between 100 and 1000000),
  currency        text not null default 'aud' check (currency = 'aud'),
  table_label     text,
  status          payment_req_status not null default 'open',
  payer_id        uuid references profiles(id),          -- who scanned / initiated
  qr_nonce        uuid not null default gen_random_uuid(),
  expires_at      timestamptz not null default now() + interval '15 minutes',
  split_deadline  timestamptz,
  commission_rate numeric(5,4) not null,                  -- snapshot at creation
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table payment_shares (
  id                       uuid primary key default gen_random_uuid(),
  payment_request_id       uuid not null references payment_requests(id) on delete cascade,
  user_id                  uuid not null references profiles(id) on delete cascade,
  amount_cents             int not null check (amount_cents > 0),
  status                   share_status not null default 'requested',
  stripe_payment_intent_id text unique,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now(),
  unique (payment_request_id, user_id)
);

create table points_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  delta      int not null check (delta <> 0),
  reason     text not null check (reason in ('payment','check_in','referral','voucher_redeem','adjustment','reversal')),
  ref_type   text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index points_user_idx on points_ledger(user_id, created_at desc);

create table vouchers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  points_cost  int not null check (points_cost > 0),
  value_cents  int not null check (value_cents > 0),
  code         text unique not null default upper(encode(gen_random_bytes(5),'hex')),
  redeemed_at  timestamptz,
  redeemed_venue_id uuid references venues(id),
  expires_at   timestamptz not null default now() + interval '6 months',
  created_at   timestamptz not null default now()
);

create table stripe_events (
  id          text primary key,           -- Stripe event id (idempotency)
  type        text not null,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Engagement, AI, ops
-- ---------------------------------------------------------------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,             -- booking, social, deal, squad, ai, system
  title      text not null,
  body       text,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

create table campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  segment      jsonb not null default '{}'::jsonb,
  title        text not null,
  body         text not null,
  involves_alcohol boolean not null default false,
  status       campaign_status not null default 'draft',
  created_by   uuid not null references profiles(id),
  approved_by  uuid references profiles(id),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint four_eyes check (approved_by is null or approved_by <> created_by)
);

create table ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  surface    ai_surface not null,
  venue_id   uuid references venues(id) on delete cascade,  -- partner surface context
  created_at timestamptz not null default now()
);

create table ai_messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool')),
  content         jsonb not null,
  model           text,
  tokens_in       int,
  tokens_out      int,
  created_at      timestamptz not null default now()
);

create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references profiles(id),
  action     text not null,
  target     text,
  target_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Helper functions for RLS (SECURITY DEFINER, stable, search_path pinned)
-- =====================================================================
create or replace function is_outly(roles outly_role[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from outly_staff s
    where s.user_id = auth.uid()
      and (s.role = 'outly_admin' or roles is null or s.role = any(roles))
  );
$$;

create or replace function has_venue_role(v uuid, roles venue_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from venue_memberships m
    where m.user_id = auth.uid() and m.venue_id = v and m.role = any(roles)
  );
$$;

create or replace function is_venue_member(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from venue_memberships m where m.user_id = auth.uid() and m.venue_id = v);
$$;

create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks x
    where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

create or replace function is_squad_member(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from squad_members m where m.squad_id = s and m.user_id = auth.uid());
$$;

create or replace function is_partner_venue(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from venues where id = v and partner_status = 'partner');
$$;

-- A deal/event is publicly visible if active and (for public listings) verified within 30 days.
create or replace function content_visible(st content_status, src content_source, verified timestamptz) returns boolean
language sql stable as $$
  select st = 'active' and (src <> 'public_listing' or verified > now() - interval '30 days');
$$;

create or replace function is_squad_admin(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from squad_members m where m.squad_id = s and m.user_id = auth.uid() and m.is_admin);
$$;

-- Payment helpers (avoid policy recursion between payment_requests and payment_shares)
create or replace function is_payment_participant(pr uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from payment_requests r where r.id = pr and r.payer_id = auth.uid())
      or exists (select 1 from payment_shares s where s.payment_request_id = pr and s.user_id = auth.uid());
$$;

create or replace function is_payment_venue_member(pr uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from payment_requests r where r.id = pr and is_venue_member(r.venue_id));
$$;

-- Friend activity visibility: owner opted in AND viewer is in the chosen audience AND still friends AND not blocked.
create or replace function can_see_activity(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = owner and p.friend_activity_visibility = 'selected')
     and exists (select 1 from activity_audience a where a.user_id = owner and a.friend_id = auth.uid())
     and are_friends(owner, auth.uid())
     and not is_blocked_between(owner, auth.uid());
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles          enable row level security;
alter table outly_staff       enable row level security;
alter table push_tokens       enable row level security;
alter table venues            enable row level security;
alter table venue_memberships enable row level security;
alter table place_cache       enable row level security;
alter table saved_venues      enable row level security;
alter table deals             enable row level security;
alter table events            enable row level security;
alter table guest_lists       enable row level security;
alter table bookings          enable row level security;
alter table friendships       enable row level security;
alter table blocks            enable row level security;
alter table squads            enable row level security;
alter table squad_members     enable row level security;
alter table squad_candidates  enable row level security;
alter table squad_votes       enable row level security;
alter table messages          enable row level security;
alter table reports           enable row level security;
alter table activity_audience enable row level security;
alter table activity_posts    enable row level security;
alter table payment_requests  enable row level security;
alter table payment_shares    enable row level security;
alter table points_ledger     enable row level security;
alter table vouchers          enable row level security;
alter table stripe_events     enable row level security;
alter table notifications     enable row level security;
alter table campaigns         enable row level security;
alter table ai_conversations  enable row level security;
alter table ai_messages       enable row level security;
alter table audit_log         enable row level security;

-- ---- profiles
-- Everyone signed in can see minimal public profile info via the view public_profiles (below);
-- the full row only for self, friends (limited use in app), and Outly support/admin.
create policy profiles_self_read   on profiles for select using (id = auth.uid() or is_outly(array['outly_support']::outly_role[]));
create policy profiles_self_insert on profiles for insert with check (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_update on profiles for update using (is_outly(array['outly_support']::outly_role[]));

create view public_profiles with (security_invoker = false) as
  select p.id, p.username, p.display_name, p.avatar_url, p.referral_code
  from profiles p
  where p.suspended_at is null
    and auth.uid() is not null
    and not is_blocked_between(p.id, auth.uid());
revoke all on public_profiles from public;

-- ---- outly_staff: readable by staff; writable by admin only
create policy staff_read  on outly_staff for select using (user_id = auth.uid() or is_outly());
create policy staff_write on outly_staff for all using (is_outly(array['outly_admin']::outly_role[])) with check (is_outly(array['outly_admin']::outly_role[]));

-- ---- push_tokens
create policy push_self on push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- venues: everyone signed in can read; owners edit own; partnerships edit all
create policy venues_read on venues for select using (auth.uid() is not null);
create policy venues_owner_update on venues for update
  using (has_venue_role(id, array['venue_owner','venue_manager']::venue_role[]))
  with check (has_venue_role(id, array['venue_owner','venue_manager']::venue_role[]));
create policy venues_staff_all on venues for all
  using (is_outly(array['outly_partnerships']::outly_role[]))
  with check (is_outly(array['outly_partnerships']::outly_role[]));
-- Sensitive columns (commission, stripe) must not be editable by venues: enforced by trigger.
create or replace function venues_protect_columns() returns trigger language plpgsql as $$
begin
  if not is_outly(array['outly_partnerships']::outly_role[]) and auth.uid() is not null then
    if new.partner_status  is distinct from old.partner_status
    or new.commission_rate is distinct from old.commission_rate
    or new.booking_commission_cents is distinct from old.booking_commission_cents
    or new.stripe_account_id is distinct from old.stripe_account_id
    or new.google_place_id is distinct from old.google_place_id
    or new.is_demo is distinct from old.is_demo then
      raise exception 'OUTLY_FORBIDDEN_COLUMN';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger venues_protect before update on venues for each row execute function venues_protect_columns();

-- ---- venue_memberships
create policy vm_read on venue_memberships for select
  using (user_id = auth.uid() or has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]) or is_outly(array['outly_partnerships','outly_support']::outly_role[]));
create policy vm_owner_write on venue_memberships for all
  using (has_venue_role(venue_id, array['venue_owner']::venue_role[]) or is_outly(array['outly_partnerships']::outly_role[]))
  with check (has_venue_role(venue_id, array['venue_owner']::venue_role[]) or is_outly(array['outly_partnerships']::outly_role[]));

-- ---- place_cache: service role only (Edge Functions). No policies = no client access.

-- ---- saved_venues
create policy saved_self on saved_venues for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- deals / events
create policy deals_public_read on deals for select
  using (auth.uid() is not null and content_visible(status, source, verified_at));
create policy deals_venue_read on deals for select using (is_venue_member(venue_id));
create policy deals_staff_read on deals for select using (is_outly(array['outly_partnerships','outly_events','outly_marketing']::outly_role[]));
create policy deals_venue_write on deals for insert
  with check (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]) and source = 'outly_partner' and is_partner_venue(venue_id));
create policy deals_venue_update on deals for update
  using (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]))
  with check (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]) and source = 'outly_partner');
create policy deals_staff_write on deals for all
  using (is_outly(array['outly_partnerships','outly_events']::outly_role[]))
  with check (is_outly(array['outly_partnerships','outly_events']::outly_role[]));

create policy events_public_read on events for select
  using (auth.uid() is not null and content_visible(status, source, verified_at));
create policy events_venue_read on events for select using (is_venue_member(venue_id));
create policy events_staff_read on events for select using (is_outly(array['outly_partnerships','outly_events','outly_marketing']::outly_role[]));
create policy events_venue_write on events for insert
  with check (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]) and source = 'outly_partner' and is_partner_venue(venue_id));
create policy events_venue_update on events for update
  using (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]))
  with check (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]) and source = 'outly_partner');
create policy events_staff_write on events for all
  using (is_outly(array['outly_partnerships','outly_events']::outly_role[]))
  with check (is_outly(array['outly_partnerships','outly_events']::outly_role[]));

-- ---- guest_lists
create policy gl_read on guest_lists for select using (auth.uid() is not null and is_partner_venue(venue_id));
create policy gl_venue_write on guest_lists for all
  using (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]))
  with check (has_venue_role(venue_id, array['venue_owner','venue_manager']::venue_role[]) and is_partner_venue(venue_id));

-- ---- bookings: customers create only via RPC functions (no direct insert policy).
create policy bookings_self_read on bookings for select using (user_id = auth.uid());
create policy bookings_squad_read on bookings for select using (squad_id is not null and is_squad_member(squad_id));
create policy bookings_venue_read on bookings for select using (is_venue_member(venue_id));
create policy bookings_staff_read on bookings for select using (is_outly(array['outly_support','outly_partnerships']::outly_role[]));

-- ---- friendships
create policy fr_read on friendships for select using (auth.uid() in (requester_id, addressee_id));
create policy fr_request on friendships for insert
  with check (requester_id = auth.uid() and status = 'pending' and not is_blocked_between(requester_id, addressee_id));
create policy fr_accept on friendships for update
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy fr_delete on friendships for delete using (auth.uid() in (requester_id, addressee_id));

-- ---- blocks
create policy blocks_self on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
-- Blocking removes the friendship.
create or replace function on_block() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from friendships
   where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
      or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  delete from activity_audience
   where (user_id = new.blocker_id and friend_id = new.blocked_id)
      or (user_id = new.blocked_id and friend_id = new.blocker_id);
  return new;
end $$;
create trigger blocks_cleanup after insert on blocks for each row execute function on_block();

-- ---- squads
create policy squads_read on squads for select using (is_squad_member(id) or created_by = auth.uid());
create policy squads_create on squads for insert with check (created_by = auth.uid());
create policy squads_update on squads for update using (is_squad_admin(id)) with check (is_squad_admin(id));
create policy squads_delete on squads for delete using (created_by = auth.uid());

create policy sm_read on squad_members for select using (is_squad_member(squad_id));
-- Creator adds themselves; members add friends only (and never blocked users).
create policy sm_add on squad_members for insert with check (
  (user_id = auth.uid() and exists (select 1 from squads s where s.id = squad_id and s.created_by = auth.uid()))
  or (is_squad_member(squad_id) and are_friends(auth.uid(), user_id) and not is_blocked_between(auth.uid(), user_id))
);
create policy sm_leave on squad_members for delete using (user_id = auth.uid() or is_squad_admin(squad_id));

create policy sc_read  on squad_candidates for select using (is_squad_member(squad_id));
create policy sc_write on squad_candidates for insert with check (is_squad_member(squad_id) and added_by = auth.uid());
create policy sc_del   on squad_candidates for delete using (added_by = auth.uid());

create policy sv_read  on squad_votes for select using (exists (select 1 from squad_candidates c where c.id = candidate_id and is_squad_member(c.squad_id)));
create policy sv_write on squad_votes for insert with check (user_id = auth.uid() and exists (select 1 from squad_candidates c where c.id = candidate_id and is_squad_member(c.squad_id)));
create policy sv_del   on squad_votes for delete using (user_id = auth.uid());

-- ---- messages: members read, except messages from people they blocked
create policy msg_read on messages for select using (
  is_squad_member(squad_id)
  and deleted_at is null
  and not exists (select 1 from blocks b where b.blocker_id = auth.uid() and b.blocked_id = sender_id)
);
create policy msg_send on messages for insert with check (sender_id = auth.uid() and is_squad_member(squad_id));
create policy msg_soft_delete on messages for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy msg_support on messages for select using (is_outly(array['outly_support']::outly_role[]));

-- ---- reports
create policy rep_create on reports for insert with check (reporter_id = auth.uid());
create policy rep_own    on reports for select using (reporter_id = auth.uid());
create policy rep_staff  on reports for all using (is_outly(array['outly_support']::outly_role[])) with check (is_outly(array['outly_support']::outly_role[]));

-- ---- friend activity (opt-in)
create policy aa_self on activity_audience for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and are_friends(user_id, friend_id));
create policy ap_self on activity_posts for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from profiles p where p.id = auth.uid() and p.friend_activity_visibility = 'selected')
);
create policy ap_audience on activity_posts for select using (can_see_activity(user_id));

-- ---- money: writes happen only through Edge Functions (service role). Reads scoped.
create policy pr_venue_read on payment_requests for select using (is_venue_member(venue_id));
create policy pr_payer_read on payment_requests for select using (is_payment_participant(id));
create policy pr_staff_read on payment_requests for select using (is_outly(array['outly_support']::outly_role[]));

create policy ps_self_read  on payment_shares for select using (user_id = auth.uid() or is_payment_participant(payment_request_id));
create policy ps_venue_read on payment_shares for select using (is_payment_venue_member(payment_request_id));
create policy ps_staff_read on payment_shares for select using (is_outly(array['outly_support']::outly_role[]));

create policy pts_self  on points_ledger for select using (user_id = auth.uid());
create policy pts_staff on points_ledger for select using (is_outly(array['outly_support']::outly_role[]));
create policy v_self    on vouchers for select using (user_id = auth.uid());
create policy v_staff   on vouchers for select using (is_outly(array['outly_support']::outly_role[]));
-- stripe_events: service role only.

-- ---- notifications
create policy notif_self on notifications for select using (user_id = auth.uid());
create policy notif_mark_read on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- campaigns: marketing drafts; a DIFFERENT staff member approves (four_eyes constraint)
create policy camp_read  on campaigns for select using (is_outly(array['outly_marketing']::outly_role[]));
create policy camp_write on campaigns for all using (is_outly(array['outly_marketing']::outly_role[])) with check (is_outly(array['outly_marketing']::outly_role[]));

-- ---- AI logs
create policy aic_self on ai_conversations for select using (user_id = auth.uid());
create policy aim_self on ai_messages for select using (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- ---- audit log
create policy audit_admin on audit_log for select using (is_outly(array['outly_admin']::outly_role[]));

-- =====================================================================
-- Views
-- =====================================================================
create view user_points with (security_invoker = true) as
  select user_id, coalesce(sum(delta),0)::int as balance,
         coalesce(sum(delta) filter (where delta > 0 and created_at > now() - interval '12 months'),0)::int as earned_12m
  from points_ledger group by user_id;

create view guest_list_usage with (security_invoker = true) as
  select g.id as guest_list_id, g.venue_id, g.night, g.capacity,
         coalesce(sum(b.party_size) filter (where b.status in ('confirmed','checked_in')),0)::int as used
  from guest_lists g left join bookings b on b.guest_list_id = g.id
  group by g.id;

-- =====================================================================
-- Booking RPCs (D8)
-- =====================================================================
create or replace function join_guest_list(p_guest_list_id uuid, p_party_size int, p_squad_id uuid default null)
returns bookings language plpgsql security definer set search_path = public as $$
declare g guest_lists; used int; b bookings; me uuid := auth.uid();
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
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

create or replace function request_table(p_venue_id uuid, p_starts_at timestamptz, p_party_size int,
                                         p_note text default null, p_squad_id uuid default null)
returns bookings language plpgsql security definer set search_path = public as $$
declare v venues; b bookings; me uuid := auth.uid();
begin
  if me is null then raise exception 'OUTLY_AUTH_REQUIRED'; end if;
  select * into v from venues where id = p_venue_id;
  if not found or v.partner_status <> 'partner' then raise exception 'OUTLY_NOT_PARTNER'; end if;
  if p_starts_at < now() then raise exception 'OUTLY_IN_PAST'; end if;
  if p_squad_id is not null and not is_squad_member(p_squad_id) then raise exception 'OUTLY_FORBIDDEN'; end if;

  insert into bookings (venue_id, user_id, squad_id, type, status, party_size, starts_at, special_requests, expires_at)
  values (v.id, me, p_squad_id, 'table_request', 'pending', p_party_size, p_starts_at, p_note,
          now() + make_interval(mins => v.booking_request_ttl_minutes))
  returning * into b;
  return b;
end $$;

create or replace function decide_booking(p_booking_id uuid, p_accept boolean)
returns bookings language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;
  if not has_venue_role(b.venue_id, array['venue_owner','venue_manager']::venue_role[]) then raise exception 'OUTLY_FORBIDDEN'; end if;
  if b.status <> 'pending' then raise exception 'OUTLY_NOT_PENDING'; end if;
  if b.expires_at is not null and now() > b.expires_at then
    update bookings set status = 'expired', updated_at = now() where id = b.id returning * into b;
    return b;
  end if;
  update bookings set status = case when p_accept then 'confirmed'::booking_status else 'declined'::booking_status end,
         decided_by = auth.uid(), decided_at = now(), updated_at = now()
   where id = b.id returning * into b;
  return b;
end $$;

-- Called by the qr-check-in Edge Function AFTER it verified the HMAC signature.
-- The nonce is rotated so a screenshot works at most once.
create or replace function check_in(p_booking_id uuid, p_nonce uuid)
returns bookings language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'OUTLY_NOT_FOUND'; end if;
  if not has_venue_role(b.venue_id, array['venue_owner','venue_manager','venue_staff','venue_door']::venue_role[]) then
    raise exception 'OUTLY_FORBIDDEN';
  end if;
  if b.qr_nonce <> p_nonce then raise exception 'OUTLY_QR_USED_OR_INVALID'; end if;
  if b.status <> 'confirmed' then raise exception 'OUTLY_NOT_CONFIRMED'; end if;
  if (b.starts_at at time zone 'Australia/Sydney')::date not in
     ((now() at time zone 'Australia/Sydney')::date, ((now() - interval '6 hours') at time zone 'Australia/Sydney')::date) then
    raise exception 'OUTLY_WRONG_NIGHT';
  end if;
  update bookings set status = 'checked_in', checked_in_at = now(), checked_in_by = auth.uid(),
         qr_nonce = gen_random_uuid(), updated_at = now()
   where id = b.id returning * into b;
  insert into points_ledger (user_id, delta, reason, ref_type, ref_id) values (b.user_id, 10, 'check_in', 'booking', b.id);
  return b;
end $$;

create or replace function cancel_booking(p_booking_id uuid)
returns bookings language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  update bookings set status = 'cancelled', updated_at = now()
   where id = p_booking_id and user_id = auth.uid() and status in ('pending','confirmed')
   returning * into b;
  if not found then raise exception 'OUTLY_NOT_CANCELLABLE'; end if;
  return b;
end $$;

-- Cron (pg_cron or scheduled Edge Function) every 5 minutes.
create or replace function expire_and_no_show() returns void
language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'expired', updated_at = now()
   where status = 'pending' and expires_at is not null and expires_at < now();

  with ns as (
    update bookings set status = 'no_show', updated_at = now()
     where status = 'confirmed' and starts_at + interval '60 minutes' < now()
       and type <> 'guest_list'
    returning user_id
  )
  update profiles p set no_show_count = p.no_show_count + c.n
    from (select user_id, count(*)::int n from ns group by user_id) c
   where p.id = c.user_id;

  -- Guest lists: no-show at end of night (06:00 next morning Sydney time)
  update bookings set status = 'no_show', updated_at = now()
   where status = 'confirmed' and type = 'guest_list'
     and ((starts_at at time zone 'Australia/Sydney')::date + 1 + time '06:00') at time zone 'Australia/Sydney' < now();

  delete from place_cache where fetched_at < now() - interval '30 days';
  update deals  set status = 'expired', updated_at = now() where status = 'active' and ends_at is not null and ends_at < now();
  update events set status = 'expired', updated_at = now() where status = 'active' and coalesce(ends_at, starts_at + interval '8 hours') < now();
end $$;

revoke execute on function expire_and_no_show() from public, anon, authenticated;
grant execute on function check_in(uuid, uuid), join_guest_list(uuid,int,uuid), request_table(uuid,timestamptz,int,text,uuid),
                         decide_booking(uuid,boolean), cancel_booking(uuid) to authenticated;
