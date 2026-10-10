-- =====================================================================
-- RLS + RPC tests for migration 0002 (Rouge launch). Self-contained:
-- creates its own users, event and guest list on demo venue "Velvet Tram".
-- Every block raises on failure; success prints NOTICEs ("R.. ok").
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
insert into auth.users (id, email) values
 ('a1000000-0000-4000-a000-000000000001','r.alex@demo.outly'),
 ('a1000000-0000-4000-a000-000000000002','r.jess@demo.outly'),
 ('a1000000-0000-4000-a000-000000000003','r.sam@demo.outly'),
 ('a1000000-0000-4000-a000-000000000004','r.door@demo.outly'),
 ('a1000000-0000-4000-a000-000000000005','r.bar@demo.outly'),
 ('a1000000-0000-4000-a000-000000000006','r.manager@demo.outly'),
 ('a1000000-0000-4000-a000-000000000007','r.support@demo.outly'),
 ('a1000000-0000-4000-a000-000000000008','r.banned@demo.outly');
insert into profiles (id, username, display_name, date_of_birth) values
 ('a1000000-0000-4000-a000-000000000001','r_alex','Alex','2000-01-01'),
 ('a1000000-0000-4000-a000-000000000002','r_jess','Jess','1999-05-05'),
 ('a1000000-0000-4000-a000-000000000003','r_sam','Sam','1998-03-03'),
 ('a1000000-0000-4000-a000-000000000004','r_door','Door','1990-01-01'),
 ('a1000000-0000-4000-a000-000000000005','r_bar','Bar','1991-01-01'),
 ('a1000000-0000-4000-a000-000000000006','r_manager','Manager','1988-01-01'),
 ('a1000000-0000-4000-a000-000000000007','r_support','Support','1987-01-01'),
 ('a1000000-0000-4000-a000-000000000008','r_banned','Banned','1997-01-01');
update profiles set suspended_at = now() where id = 'a1000000-0000-4000-a000-000000000008';
insert into venue_memberships (user_id, venue_id, role) values
 ('a1000000-0000-4000-a000-000000000004','00000000-0000-4000-a000-000000000002','venue_door'),
 ('a1000000-0000-4000-a000-000000000005','00000000-0000-4000-a000-000000000002','venue_staff'),
 ('a1000000-0000-4000-a000-000000000006','00000000-0000-4000-a000-000000000002','venue_manager');
insert into outly_staff (user_id, role) values ('a1000000-0000-4000-a000-000000000007','outly_support');

insert into events (id, venue_id, title, starts_at, source, status, is_demo) values
 ('e1000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002','Rouge test night', now(), 'demo','active', true);
insert into guest_lists (id, venue_id, event_id, night, capacity) values
 ('91000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002','e1000000-0000-4000-a000-000000000001',
  sydney_night(now()), 200);
insert into event_sets (event_id, artist_name, sort) values ('e1000000-0000-4000-a000-000000000001','Test Artist', 1);

-- R1: join with a visibility; one pass per person
select pg_temp.as_user('a1000000-0000-4000-a000-000000000001');
do $$ declare b bookings; begin
  b := join_event_list('91000000-0000-4000-a000-000000000001', 'classic');
  if b.attendee_visibility <> 'classic' or b.status <> 'confirmed' or b.party_size <> 1 then raise exception 'R1a FAILED'; end if;
  begin
    perform join_event_list('91000000-0000-4000-a000-000000000001', 'classic');
    raise exception 'R1b FAILED: joined twice';
  exception when raise_exception then
    if sqlerrm like 'R1b%' then raise; end if;
    if sqlerrm <> 'OUTLY_ALREADY_ON_LIST' then raise exception 'R1b FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R1 ok: joined as classic, second join refused';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000002');
select join_event_list('91000000-0000-4000-a000-000000000001', 'classic');
select pg_temp.as_user('a1000000-0000-4000-a000-000000000003');
do $$ declare b bookings; begin
  b := join_event_list('91000000-0000-4000-a000-000000000001');
  if b.attendee_visibility <> 'ghost' then raise exception 'R2a FAILED: default is not ghost'; end if;
  raise notice 'R2a ok: ghost by default';
end $$;

-- R2: a ghost sees nobody; R3: a classic sees other classics only, never ghosts or self
do $$ declare n int; begin
  select count(*) into n from event_attendees('91000000-0000-4000-a000-000000000001');
  if n <> 0 then raise exception 'R2b FAILED: ghost sees % attendees', n; end if;
  raise notice 'R2b ok: ghost sees nobody';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000001');
do $$ declare n int; u text; begin
  select count(*), max(username) into n, u from event_attendees('91000000-0000-4000-a000-000000000001');
  if n <> 1 or u <> 'r_jess' then raise exception 'R3 FAILED: n=% u=%', n, u; end if;
  raise notice 'R3 ok: classic sees only other classics (usernames)';
end $$;

-- R4: public counter, visible to any member of the list
select pg_temp.as_user('a1000000-0000-4000-a000-000000000003');
do $$ declare s record; begin
  select * into s from guest_list_stats('91000000-0000-4000-a000-000000000001');
  if s.capacity <> 200 or s.joined <> 3 or s.remaining <> 197 then raise exception 'R4 FAILED: %', s; end if;
  raise notice 'R4 ok: counter 3/200';
end $$;

-- R5: suspended account can't join
select pg_temp.as_user('a1000000-0000-4000-a000-000000000008');
do $$ begin
  begin
    perform join_event_list('91000000-0000-4000-a000-000000000001');
    raise exception 'R5 FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_SUSPENDED' then raise exception 'R5 FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R5 ok: suspended account refused';
end $$;

-- R6: blocking hides both ways (rolled back)
begin;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000001');
insert into blocks values ('a1000000-0000-4000-a000-000000000001','a1000000-0000-4000-a000-000000000002', now());
do $$ declare n int; begin
  select count(*) into n from event_attendees('91000000-0000-4000-a000-000000000001');
  if n <> 0 then raise exception 'R6a FAILED'; end if;
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000002');
do $$ declare n int; begin
  select count(*) into n from event_attendees('91000000-0000-4000-a000-000000000001');
  if n <> 0 then raise exception 'R6b FAILED: blocked user still visible to the blocked party'; end if;
  raise notice 'R6 ok: block hides both ways';
end $$;
rollback;

-- R7: a customer can't scan, can't write the scan log, can't change someone else's visibility
select pg_temp.as_service();
select set_config('outly.alex_booking', (select id::text from bookings
  where guest_list_id = '91000000-0000-4000-a000-000000000001' and user_id = 'a1000000-0000-4000-a000-000000000001'), false);
select pg_temp.as_user('a1000000-0000-4000-a000-000000000003');
do $$ begin
  begin
    perform scan_pass('00000000-0000-4000-a000-000000000002', 'OUTLY1:x:y');
    raise exception 'R7a FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN' then raise exception 'R7a FAILED: %', sqlerrm; end if;
  end;
  begin
    insert into scan_events (venue_id, scanned_by, result)
    values ('00000000-0000-4000-a000-000000000002','a1000000-0000-4000-a000-000000000003','ok');
    raise exception 'R7b FAILED: customer wrote the scan log';
  exception when insufficient_privilege then null;
  end;
  begin
    perform set_attendee_visibility(current_setting('outly.alex_booking')::uuid, 'ghost');
    raise exception 'R7c FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_NOT_FOUND' then raise exception 'R7c FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R7 ok: customer cannot scan, write scans or edit others';
end $$;

-- R8: door scanning — ok once, then already used; garbage and wrong nonce are invalid; all logged
select pg_temp.as_user('a1000000-0000-4000-a000-000000000004');
do $$
declare alex text; jess text; jess_bad text; r record;
begin
  select 'OUTLY1:' || id || ':' || qr_nonce into alex from bookings
   where guest_list_id = '91000000-0000-4000-a000-000000000001' and user_id = 'a1000000-0000-4000-a000-000000000001';
  select 'OUTLY1:' || id || ':' || qr_nonce, 'OUTLY1:' || id || ':' || gen_random_uuid() into jess, jess_bad from bookings
   where guest_list_id = '91000000-0000-4000-a000-000000000001' and user_id = 'a1000000-0000-4000-a000-000000000002';
  if alex is null or jess is null then raise exception 'R8 FAILED: door cannot read the venue bookings'; end if;
  perform set_config('outly.alex_code', alex, false);

  select * into r from scan_pass('00000000-0000-4000-a000-000000000002', alex);
  if r.result <> 'ok' or r.username <> 'r_alex' then raise exception 'R8a FAILED: %', r; end if;
  select * into r from scan_pass('00000000-0000-4000-a000-000000000002', alex);
  if r.result <> 'already_used' or r.checked_in_at is null then raise exception 'R8b FAILED: %', r; end if;
  select * into r from scan_pass('00000000-0000-4000-a000-000000000002', 'not a pass');
  if r.result <> 'invalid' or r.username is not null then raise exception 'R8c FAILED: %', r; end if;
  select * into r from scan_pass('00000000-0000-4000-a000-000000000002', jess_bad);
  if r.result <> 'invalid' then raise exception 'R8d FAILED: %', r; end if;
  select * into r from scan_pass('00000000-0000-4000-a000-000000000002', jess);
  if r.result <> 'ok' then raise exception 'R8e FAILED: %', r; end if;
  raise notice 'R8 ok: scan ok once, reuse and fakes refused';
end $$;

-- R9: who can read the scan log and the live stats
select pg_temp.as_user('a1000000-0000-4000-a000-000000000001');
do $$ declare n int; begin
  select count(*) into n from scan_events;
  if n <> 0 then raise exception 'R9a FAILED: customer sees % scans', n; end if;
  begin
    perform venue_live_stats('00000000-0000-4000-a000-000000000002', sydney_night(now()));
    raise exception 'R9b FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN' then raise exception 'R9b FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R9a ok: customers see no scans and no stats';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000006');
do $$ declare s record; begin
  select * into s from venue_live_stats('00000000-0000-4000-a000-000000000002', sydney_night(now()))
   where guest_list_id = '91000000-0000-4000-a000-000000000001';
  if s.joined <> 3 or s.checked_in <> 2 or s.classic_count <> 2 or s.ghost_count <> 1
     or s.scans_ok <> 2 or s.scans_failed <> 3 or s.last_scan_at is null then
    raise exception 'R9c FAILED: %', s;
  end if;
  raise notice 'R9c ok: manager sees live stats (3 joined, 2 in, 3 refused scans)';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000007');
do $$ declare n int; m int; begin
  select count(*) into n from venue_live_stats('00000000-0000-4000-a000-000000000002', sydney_night(now()));
  select count(*) into m from scan_events where venue_id = '00000000-0000-4000-a000-000000000002';
  if n < 1 or m <> 5 then raise exception 'R9d FAILED: stats=% scans=%', n, m; end if;
  raise notice 'R9d ok: Outly staff see stats and the scan log';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000004');
do $$ begin
  begin
    perform venue_live_stats('00000000-0000-4000-a000-000000000002');
    raise exception 'R9e FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN' then raise exception 'R9e FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R9e ok: door staff do not see manager stats';
end $$;

-- R10: activity chart buckets
select pg_temp.as_user('a1000000-0000-4000-a000-000000000006');
do $$ declare j int; c int; begin
  select sum(joins), sum(check_ins) into j, c from venue_activity('91000000-0000-4000-a000-000000000001', 15);
  if j <> 3 or c <> 2 then raise exception 'R10 FAILED: joins=% check_ins=%', j, c; end if;
  raise notice 'R10 ok: activity buckets';
end $$;

-- R11: drinks offer — off while draft; once per pass; door staff can't redeem
select pg_temp.as_user('a1000000-0000-4000-a000-000000000005');
do $$ begin
  begin
    perform redeem_offer('00000000-0000-4000-a000-000000000002','00000000-0000-4000-d000-000000000001', current_setting('outly.alex_code'));
    raise exception 'R11a FAILED: draft offer redeemed';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_NOT_FOUND' then raise exception 'R11a FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R11a ok: offer is off while draft';
end $$;
select pg_temp.as_service();
update deals set status = 'active' where id = '00000000-0000-4000-d000-000000000001';
select pg_temp.as_user('a1000000-0000-4000-a000-000000000005');
do $$ declare r record; begin
  select * into r from redeem_offer('00000000-0000-4000-a000-000000000002','00000000-0000-4000-d000-000000000001', current_setting('outly.alex_code'));
  if r.result <> 'ok' or r.username <> 'r_alex' then raise exception 'R11b FAILED: %', r; end if;
  select * into r from redeem_offer('00000000-0000-4000-a000-000000000002','00000000-0000-4000-d000-000000000001', current_setting('outly.alex_code'));
  if r.result <> 'already_used' then raise exception 'R11c FAILED: %', r; end if;
  raise notice 'R11b ok: offer redeemed once per pass';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000004');
do $$ begin
  begin
    perform redeem_offer('00000000-0000-4000-a000-000000000002','00000000-0000-4000-d000-000000000001', current_setting('outly.alex_code'));
    raise exception 'R11d FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN' then raise exception 'R11d FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R11d ok: door staff cannot redeem offers';
end $$;
select pg_temp.as_service();
update deals set status = 'draft' where id = '00000000-0000-4000-d000-000000000001';

-- R12: line-up readable by any signed-in user while the event is active
select pg_temp.as_user('a1000000-0000-4000-a000-000000000003');
do $$ declare n int; begin
  select count(*) into n from event_sets where event_id = 'e1000000-0000-4000-a000-000000000001';
  if n <> 1 then raise exception 'R12 FAILED: %', n; end if;
  raise notice 'R12 ok: line-up visible';
end $$;
select pg_temp.as_service();

-- R13: recent scans with usernames — managers see all, door sees only their own, customers nothing
select pg_temp.as_user('a1000000-0000-4000-a000-000000000006');
do $$ declare n int; u text; begin
  select count(*), max(username) into n, u from recent_scans('00000000-0000-4000-a000-000000000002', 50);
  if n <> 7 or u <> 'r_jess' then raise exception 'R13a FAILED: n=% u=%', n, u; end if;
  raise notice 'R13a ok: manager sees every scan with usernames';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000005');
do $$ declare n int; begin
  select count(*) into n from recent_scans('00000000-0000-4000-a000-000000000002', 50);
  if n <> 2 then raise exception 'R13b FAILED: bar sees % scans', n; end if;
  raise notice 'R13b ok: bar staff see only their own scans';
end $$;
select pg_temp.as_user('a1000000-0000-4000-a000-000000000001');
do $$ begin
  begin
    perform recent_scans('00000000-0000-4000-a000-000000000002');
    raise exception 'R13c FAILED';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN' then raise exception 'R13c FAILED: %', sqlerrm; end if;
  end;
  raise notice 'R13c ok: customers cannot list scans';
end $$;
select pg_temp.as_service();
