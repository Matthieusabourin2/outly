-- =====================================================================
-- Tests for migration 0006 (final security audit, 2026-10-14).
-- Self-contained: own users and data. Each block raises on failure; success prints "X.. ok".
-- =====================================================================

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false);
  perform set_config('role', 'authenticated', false);
end $$;

create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claims', '{}', false);
end $$;

-- ---- Setup (service role) ----
-- c6..01 door A · 02 second door A (gets suspended) · 03 guest 1 (classic) · 04 guest 2 (classic, gets suspended)
-- c6..05 guest at venue B
insert into auth.users (id, email) values
 ('c6000000-0000-4000-a000-000000000001','x.door@demo.outly'),
 ('c6000000-0000-4000-a000-000000000002','x.door2@demo.outly'),
 ('c6000000-0000-4000-a000-000000000003','x.guest1@demo.outly'),
 ('c6000000-0000-4000-a000-000000000004','x.guest2@demo.outly'),
 ('c6000000-0000-4000-a000-000000000005','x.guestb@demo.outly');
insert into profiles (id, username, display_name, date_of_birth) values
 ('c6000000-0000-4000-a000-000000000001','x_door','Door','1990-01-01'),
 ('c6000000-0000-4000-a000-000000000002','x_door2','Door two','1990-01-01'),
 ('c6000000-0000-4000-a000-000000000003','x_guest1','Gia','2000-01-01'),
 ('c6000000-0000-4000-a000-000000000004','x_guest2','Gil','2000-01-01'),
 ('c6000000-0000-4000-a000-000000000005','x_guestb','Bea','2000-01-01');
insert into venues (id, name, partner_status) values
 ('96000000-0000-4000-a000-0000000000a1', 'Audit Club A', 'partner'),
 ('96000000-0000-4000-a000-0000000000b1', 'Audit Club B', 'partner');
insert into venue_memberships (user_id, venue_id, role) values
 ('c6000000-0000-4000-a000-000000000001','96000000-0000-4000-a000-0000000000a1','venue_door'),
 ('c6000000-0000-4000-a000-000000000002','96000000-0000-4000-a000-0000000000a1','venue_door');
insert into guest_lists (id, venue_id, night, capacity) values
 ('97000000-0000-4000-a000-0000000000a1','96000000-0000-4000-a000-0000000000a1', (now() at time zone 'Australia/Sydney')::date, 200),
 ('97000000-0000-4000-a000-0000000000b1','96000000-0000-4000-a000-0000000000b1', (now() at time zone 'Australia/Sydney')::date, 200);
insert into squads (id, name, created_by) values ('98000000-0000-4000-a000-000000000001','Audit squad','c6000000-0000-4000-a000-000000000003');
insert into squad_members (squad_id, user_id, is_admin) values ('98000000-0000-4000-a000-000000000001','c6000000-0000-4000-a000-000000000003', true);

-- Guests join (classic): 1 and 2 at venue A, B's guest at venue B.
select pg_temp.as_user('c6000000-0000-4000-a000-000000000003');
do $$ declare b bookings; begin
  b := join_event_list('97000000-0000-4000-a000-0000000000a1', 'classic');
  perform set_config('outly.x_code1', 'OUTLY1:' || b.id || ':' || b.qr_nonce, false);
end $$;
select pg_temp.as_user('c6000000-0000-4000-a000-000000000004');
do $$ declare b bookings; begin
  b := join_event_list('97000000-0000-4000-a000-0000000000a1', 'classic');
  perform set_config('outly.x_booking2', b.id::text, false);
end $$;
select pg_temp.as_user('c6000000-0000-4000-a000-000000000005');
do $$ declare b bookings; begin
  b := join_event_list('97000000-0000-4000-a000-0000000000b1', 'classic');
  perform set_config('outly.x_codeb', 'OUTLY1:' || b.id || ':' || b.qr_nonce, false);
  perform set_config('outly.x_bookingb', b.id::text, false);
end $$;

-- X1: a suspended guest no longer sees the classic attendee list, nor changes their visibility
select pg_temp.as_user('c6000000-0000-4000-a000-000000000004');
do $$ begin
  if (select count(*) from event_attendees('97000000-0000-4000-a000-0000000000a1')) <> 1 then
    raise exception 'X1 FAILED: guest 2 should see guest 1 before the suspension';
  end if;
end $$;
select pg_temp.as_service();
update profiles set suspended_at = now() where id = 'c6000000-0000-4000-a000-000000000004';
select pg_temp.as_user('c6000000-0000-4000-a000-000000000004');
do $$ begin
  if (select count(*) from event_attendees('97000000-0000-4000-a000-0000000000a1')) <> 0 then
    raise exception 'X1 FAILED: a suspended guest still reads the attendee list';
  end if;
  begin
    perform set_attendee_visibility(current_setting('outly.x_booking2')::uuid, 'ghost');
    raise exception 'X1 FAILED: a suspended guest changed their visibility';
  exception when raise_exception then
    if sqlerrm not like 'OUTLY_SUSPENDED%' then raise; end if;
  end;
  raise notice 'X1 ok: suspension closes the attendee list and the visibility switch';
end $$;

-- X2: a suspended door account can no longer scan
select pg_temp.as_service();
update profiles set suspended_at = now() where id = 'c6000000-0000-4000-a000-000000000002';
select pg_temp.as_user('c6000000-0000-4000-a000-000000000002');
do $$ begin
  begin
    perform scan_pass('96000000-0000-4000-a000-0000000000a1', current_setting('outly.x_code1'));
    raise exception 'X2 FAILED: a suspended door account scanned a pass';
  exception when raise_exception then
    if sqlerrm not like 'OUTLY_FORBIDDEN%' then raise; end if;
  end;
  raise notice 'X2 ok: a suspended staff account loses its venue powers';
end $$;

-- X3: a pass from venue B scanned at venue A is "invalid" and does not log B's booking
select pg_temp.as_user('c6000000-0000-4000-a000-000000000001');
do $$ declare r record; begin
  select * into r from scan_pass('96000000-0000-4000-a000-0000000000a1', current_setting('outly.x_codeb'));
  if r.result <> 'invalid' or r.username is not null then raise exception 'X3 FAILED: % / %', r.result, r.username; end if;
  select * into r from scan_pass('96000000-0000-4000-a000-0000000000a1', current_setting('outly.x_code1'));
  if r.result <> 'ok' then raise exception 'X3 FAILED: own pass %', r.result; end if;
end $$;
select pg_temp.as_service();
do $$ begin
  if exists (select 1 from scan_events where booking_id = current_setting('outly.x_bookingb')::uuid) then
    raise exception 'X3 FAILED: venue B''s booking logged by a scan at venue A';
  end if;
  if (select count(*) from scan_events where venue_id = '96000000-0000-4000-a000-0000000000a1' and booking_id is not null) <> 1 then
    raise exception 'X3 FAILED: the scan of its own pass must keep its booking';
  end if;
  raise notice 'X3 ok: a scan only logs bookings of its own venue';
end $$;

-- X4: check_in (replaced by scan_pass) is closed to the API
do $$ begin
  if has_function_privilege('authenticated', 'public.check_in(uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.check_in(uuid,uuid)', 'execute') then
    raise exception 'X4 FAILED: check_in still callable';
  end if;
  raise notice 'X4 ok: check_in closed to users';
end $$;

-- X5: a new message cannot be back-dated; a normal message still goes through
select pg_temp.as_user('c6000000-0000-4000-a000-000000000003');
do $$ begin
  begin
    insert into messages (squad_id, sender_id, body, created_at)
    values ('98000000-0000-4000-a000-000000000001','c6000000-0000-4000-a000-000000000003','old news', '2020-01-01');
    raise exception 'X5 FAILED: back-dated message';
  exception when insufficient_privilege then null;
  end;
  insert into messages (squad_id, sender_id, body)
  values ('98000000-0000-4000-a000-000000000001','c6000000-0000-4000-a000-000000000003','hi');
  raise notice 'X5 ok: messages cannot be back-dated, sending still works';
end $$;

-- X6: deleting a door account keeps the night's scans (author set to null)
select pg_temp.as_service();
do $$ declare before int; after int; begin
  select count(*) into before from scan_events where venue_id = '96000000-0000-4000-a000-0000000000a1';
  delete from profiles where id = 'c6000000-0000-4000-a000-000000000001';
  select count(*) into after from scan_events where venue_id = '96000000-0000-4000-a000-0000000000a1';
  if before = 0 or after <> before then raise exception 'X6 FAILED: % scans before, % after', before, after; end if;
  if exists (select 1 from scan_events where scanned_by = 'c6000000-0000-4000-a000-000000000001') then
    raise exception 'X6 FAILED: author not cleared';
  end if;
  raise notice 'X6 ok: % scan(s) kept after the door account was deleted', after;
end $$;
