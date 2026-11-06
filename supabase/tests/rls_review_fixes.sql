-- =====================================================================
-- Tests for migration 0005 (adversarial security review, 2026-10-14).
-- Self-contained: own users and data. Each block raises on failure; success prints "F.. ok".
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
 ('c5000000-0000-4000-a000-000000000001','r.referrer@demo.outly'),
 ('c5000000-0000-4000-a000-000000000002','r.referred@demo.outly'),
 ('c5000000-0000-4000-a000-000000000003','r.door@demo.outly'),
 ('c5000000-0000-4000-a000-000000000004','r.guest@demo.outly');
insert into profiles (id, username, display_name, date_of_birth) values
 ('c5000000-0000-4000-a000-000000000001','r_referrer','Rita','2000-01-01'),
 ('c5000000-0000-4000-a000-000000000002','r_referred','Rob','2000-01-01'),
 ('c5000000-0000-4000-a000-000000000003','r_door','Door','1990-01-01'),
 ('c5000000-0000-4000-a000-000000000004','r_guest','Gus','2000-01-01');
update profiles set referred_by = 'c5000000-0000-4000-a000-000000000001' where id = 'c5000000-0000-4000-a000-000000000002';
insert into venues (id, name, partner_status) values ('95000000-0000-4000-a000-000000000001', 'Review Club', 'partner');
insert into venue_memberships (user_id, venue_id, role) values ('c5000000-0000-4000-a000-000000000003','95000000-0000-4000-a000-000000000001','venue_door');
insert into guest_lists (id, venue_id, night, capacity) values ('96000000-0000-4000-a000-000000000001','95000000-0000-4000-a000-000000000001', (now() at time zone 'Australia/Sydney')::date, 200);

-- F2a: a guest cannot call join_guest_list / request_table directly (party of 30, table requests)
select pg_temp.as_user('c5000000-0000-4000-a000-000000000004');
do $$ declare f text; bad text := ''; begin
  foreach f in array array['public.join_guest_list(uuid,integer,uuid)', 'public.request_table(uuid,timestamp with time zone,integer,text,uuid)'] loop
    if has_function_privilege('authenticated', f, 'execute') then bad := bad || ' authenticated:' || f; end if;
    if has_function_privilege('anon', f, 'execute') then bad := bad || ' anon:' || f; end if;
  end loop;
  if bad <> '' then raise exception 'F2a FAILED:%', bad; end if;
  begin
    perform join_guest_list('96000000-0000-4000-a000-000000000001', 30);
    raise exception 'F2a FAILED: party of 30 joined';
  exception when insufficient_privilege then null;
  end;
  raise notice 'F2a ok: join_guest_list and request_table are closed to the API';
end $$;

-- F2b: joining through join_event_list still works, for exactly 1 person
do $$ declare b bookings; begin
  b := join_event_list('96000000-0000-4000-a000-000000000001', 'ghost');
  if b.status <> 'confirmed' or b.party_size <> 1 then raise exception 'F2b FAILED: % / %', b.status, b.party_size; end if;
  perform set_config('outly.r_booking', b.id::text, false);
  perform set_config('outly.r_nonce', b.qr_nonce::text, false);
  raise notice 'F2b ok: join_event_list still books 1 pass';
end $$;

-- door staff scans it (bookings.checked_in_by now references the door account)
select pg_temp.as_user('c5000000-0000-4000-a000-000000000003');
do $$ declare r record; begin
  select * into r from scan_pass('95000000-0000-4000-a000-000000000001',
    'OUTLY1:' || current_setting('outly.r_booking') || ':' || current_setting('outly.r_nonce'));
  if r.result <> 'ok' then raise exception 'F1 setup FAILED: scan %', r.result; end if;
end $$;

-- F1a: deleting a person still works when someone named them as referrer
select pg_temp.as_service();
do $$ begin
  delete from auth.users where id = 'c5000000-0000-4000-a000-000000000001';
  if (select referred_by from profiles where id = 'c5000000-0000-4000-a000-000000000002') is not null then
    raise exception 'F1a FAILED: referred_by not cleared';
  end if;
  raise notice 'F1a ok: a referrer can delete their account';
end $$;

-- F1b: a door account that scanned passes can be deleted (bookings keep their check-in, without the scanner)
do $$ declare b bookings; begin
  delete from auth.users where id = 'c5000000-0000-4000-a000-000000000003';
  select * into b from bookings where id = current_setting('outly.r_booking')::uuid;
  if b.status <> 'checked_in' or b.checked_in_by is not null then raise exception 'F1b FAILED: % / %', b.status, b.checked_in_by; end if;
  raise notice 'F1b ok: door staff accounts can be deleted after the night';
end $$;

-- F1c: no nullable reference to a person blocks a deletion any more
do $$ declare bad text; begin
  select string_agg(c.conrelid::regclass || '.' || a.attname, ', ') into bad
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
   where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass
     and c.confdeltype not in ('c', 'n') and not a.attnotnull;
  if bad is not null then raise exception 'F1c FAILED: deletion still blocked by %', bad; end if;
  raise notice 'F1c ok: every nullable reference to a profile is ON DELETE SET NULL or CASCADE';
end $$;
