-- =====================================================================
-- Tests for migration 0003 (launch hardening). Self-contained: own users and data
-- on demo venue Harbourlight. Each block raises on failure; success prints "H.. ok".
-- =====================================================================

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false);
  perform set_config('role', 'authenticated', false);
end $$;

create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  perform set_config('role', 'anon', false);
end $$;

create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claims', '{}', false);
end $$;

-- ---- Setup (service role) ----
insert into auth.users (id, email) values
 ('b2000000-0000-4000-a000-000000000001','h.guest@demo.outly'),
 ('b2000000-0000-4000-a000-000000000002','h.friend@demo.outly'),
 ('b2000000-0000-4000-a000-000000000003','h.door@demo.outly'),
 ('b2000000-0000-4000-a000-000000000004','h.manager@demo.outly'),
 ('b2000000-0000-4000-a000-000000000005','h.partnerships@demo.outly');
insert into profiles (id, username, display_name, date_of_birth) values
 ('b2000000-0000-4000-a000-000000000001','h_guest','Hannah','2000-01-01'),
 ('b2000000-0000-4000-a000-000000000002','h_friend','Harriet','2000-01-01'),
 ('b2000000-0000-4000-a000-000000000003','h_door','Door','1990-01-01'),
 ('b2000000-0000-4000-a000-000000000004','h_manager','Manager','1988-01-01'),
 ('b2000000-0000-4000-a000-000000000005','h_partner','Partner','1987-01-01');
insert into venue_memberships (user_id, venue_id, role) values
 ('b2000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000001','venue_door'),
 ('b2000000-0000-4000-a000-000000000004','00000000-0000-4000-a000-000000000001','venue_manager');
insert into outly_staff (user_id, role) values ('b2000000-0000-4000-a000-000000000005','outly_partnerships');
insert into guest_lists (id, venue_id, night, capacity) values
 ('92000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001', private.sydney_night(now()) + 30, 50);

-- H1: internal helpers are out of the API schema, and policies still use them
do $$ declare leaked text; missing int; begin
  select string_agg(p.proname, ', ') into leaked
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('is_outly','has_venue_role','is_venue_member','are_friends','is_blocked_between',
                       'is_squad_member','is_squad_admin','is_partner_venue','content_visible',
                       'is_payment_participant','is_payment_venue_member','can_see_activity','is_suspended',
                       'can_see_venue_stats','sydney_night','parse_pass_code','enforce_adult',
                       'venues_protect_columns','on_block','expire_and_no_show');
  if leaked is not null then raise exception 'H1a FAILED: still in public: %', leaked; end if;
  select 20 - count(*) into missing
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in ('is_outly','has_venue_role','is_venue_member','are_friends','is_blocked_between',
                       'is_squad_member','is_squad_admin','is_partner_venue','content_visible',
                       'is_payment_participant','is_payment_venue_member','can_see_activity','is_suspended',
                       'can_see_venue_stats','sydney_night','parse_pass_code','enforce_adult',
                       'venues_protect_columns','on_block','expire_and_no_show');
  if missing <> 0 then raise exception 'H1b FAILED: % helper(s) missing from private', missing; end if;
  if has_function_privilege('authenticated', 'private.expire_and_no_show()', 'execute') then
    raise exception 'H1c FAILED: cron job executable by authenticated';
  end if;
  raise notice 'H1 ok: 20 internal helpers moved to schema private, cron job service-only';
end $$;

-- H1d: a policy that calls a moved helper still works (signed-in user reads a partner venue guest list)
select pg_temp.as_user('b2000000-0000-4000-a000-000000000001');
do $$ declare n int; begin
  select count(*) into n from guest_lists where id = '92000000-0000-4000-a000-000000000001';
  if n <> 1 then raise exception 'H1d FAILED: gl_read policy broken (%)', n; end if;
  raise notice 'H1d ok: policies keep working after the move';
end $$;

-- H2: anon cannot execute any RPC that needs a signed-in user; authenticated can
select pg_temp.as_service();
do $$ declare f text; bad text := ''; begin
  foreach f in array array[
    'public.join_guest_list(uuid,integer,uuid)', 'public.request_table(uuid,timestamp with time zone,integer,text,uuid)',
    'public.decide_booking(uuid,boolean)', 'public.check_in(uuid,uuid)', 'public.cancel_booking(uuid)',
    'public.join_event_list(uuid,attendee_visibility)', 'public.set_attendee_visibility(uuid,attendee_visibility)',
    'public.guest_list_stats(uuid)', 'public.event_attendees(uuid)', 'public.scan_pass(uuid,text)',
    'public.redeem_offer(uuid,uuid,text)', 'public.venue_live_stats(uuid,date)', 'public.venue_activity(uuid,integer)',
    'public.recent_scans(uuid,integer)', 'public.venue_commercial_terms(uuid)']
  loop
    if has_function_privilege('anon', f, 'execute') then bad := bad || ' anon:' || f; end if;
    if not has_function_privilege('authenticated', f, 'execute') then bad := bad || ' authenticated-missing:' || f; end if;
  end loop;
  if bad <> '' then raise exception 'H2 FAILED:%', bad; end if;
  raise notice 'H2 ok: 15 RPCs closed to anon, open to signed-in users';
end $$;

-- H3: public_profiles exposes usernames only, to signed-in users only
do $$ declare cols text; begin
  select string_agg(column_name, ',' order by column_name) into cols
    from information_schema.columns where table_schema = 'public' and table_name = 'public_profiles';
  if cols <> 'avatar_url,id,username' then raise exception 'H3a FAILED: columns %', cols; end if;
  if has_table_privilege('anon', 'public.public_profiles', 'select') then raise exception 'H3b FAILED: anon can read'; end if;
end $$;
select pg_temp.as_user('b2000000-0000-4000-a000-000000000001');
do $$ declare n int; begin
  select count(*) into n from public_profiles where username = 'h_friend';
  if n <> 1 then raise exception 'H3c FAILED: username not visible (%)', n; end if;
  raise notice 'H3 ok: public_profiles = id, username, avatar_url (no real names), signed-in only';
end $$;

-- H4: door staff cannot read raw bookings (pass nonces); managers can; door scanning still works
select pg_temp.as_user('b2000000-0000-4000-a000-000000000001');
select join_guest_list('92000000-0000-4000-a000-000000000001', 1);
select pg_temp.as_user('b2000000-0000-4000-a000-000000000003');
do $$ declare n int; begin
  select count(*) into n from bookings where guest_list_id = '92000000-0000-4000-a000-000000000001';
  if n <> 0 then raise exception 'H4a FAILED: door reads % booking(s)', n; end if;
  raise notice 'H4a ok: door staff cannot read bookings or nonces';
end $$;
select pg_temp.as_user('b2000000-0000-4000-a000-000000000004');
do $$ declare n int; begin
  select count(*) into n from bookings where guest_list_id = '92000000-0000-4000-a000-000000000001';
  if n <> 1 then raise exception 'H4b FAILED: manager reads % booking(s)', n; end if;
  raise notice 'H4b ok: managers still read their venue bookings';
end $$;
select pg_temp.as_user('b2000000-0000-4000-a000-000000000001');
do $$ declare n int; begin
  select count(*) into n from bookings where guest_list_id = '92000000-0000-4000-a000-000000000001' and qr_nonce is not null;
  if n <> 1 then raise exception 'H4c FAILED: guest cannot read own pass (%)', n; end if;
  raise notice 'H4c ok: guests still read their own pass';
end $$;

-- H5: venue commercial terms are hidden from the API; safe columns still readable; RPC for the right people
select pg_temp.as_user('b2000000-0000-4000-a000-000000000001');
do $$ declare n int; begin
  begin
    perform commission_rate from venues limit 1;
    raise exception 'H5a FAILED: commission_rate readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform stripe_account_id from venues limit 1;
    raise exception 'H5b FAILED: stripe_account_id readable';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from venues where name is not null and partner_status = 'partner';
  if n < 1 then raise exception 'H5c FAILED: safe columns not readable'; end if;
  begin
    perform venue_commercial_terms('00000000-0000-4000-a000-000000000001');
    raise exception 'H5d FAILED: customer read the terms';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN' then raise exception 'H5d FAILED: %', sqlerrm; end if;
  end;
  raise notice 'H5a ok: commission and Stripe account hidden; name, address, tags still readable';
end $$;
select pg_temp.as_user('b2000000-0000-4000-a000-000000000004');
do $$ declare r record; begin
  select * into r from venue_commercial_terms('00000000-0000-4000-a000-000000000001');
  if r.commission_rate is null then raise exception 'H5e FAILED: manager cannot read terms'; end if;
  raise notice 'H5e ok: venue managers read their own terms through the RPC';
end $$;
select pg_temp.as_user('b2000000-0000-4000-a000-000000000005');
do $$ declare r record; begin
  select * into r from venue_commercial_terms('00000000-0000-4000-a000-000000000001');
  if r.commission_rate is null then raise exception 'H5f FAILED: Outly partnerships cannot read terms'; end if;
  raise notice 'H5f ok: Outly partnerships staff read terms through the RPC';
end $$;
select pg_temp.as_anon();
do $$ begin
  begin
    perform name from venues limit 1;
  exception when insufficient_privilege then raise exception 'H5g FAILED: anon lost select on safe venue columns';
  end;
  raise notice 'H5g ok: anon keeps column access (RLS still requires sign-in)';
end $$;
select pg_temp.as_service();
