-- =====================================================================
-- RLS smoke tests. Run after migrations + seed_demo.sql on a DEV database.
-- Simulates users by setting request.jwt.claims (as PostgREST does).
-- Every block raises an exception on failure; success prints NOTICEs.
-- =====================================================================

-- Test users (auth.users rows) — dev only
insert into auth.users (id, email) values
 ('11111111-1111-4111-a111-111111111111','alex@demo.outly'),
 ('22222222-2222-4222-a222-222222222222','jess@demo.outly'),
 ('33333333-3333-4333-a333-333333333333','door@demo.outly'),
 ('44444444-4444-4444-a444-444444444444','owner@demo.outly'),
 ('55555555-5555-4555-a555-555555555555','kid@demo.outly'),
 ('66666666-6666-4666-a666-666666666666','admin@demo.outly');

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('role', 'postgres', true);
end $$;

begin;
-- profiles (service role, as the sign-up Edge Function would)
insert into profiles (id, username, display_name, date_of_birth) values
 ('11111111-1111-4111-a111-111111111111','alex','Alex','2000-01-01'),
 ('22222222-2222-4222-a222-222222222222','jess','Jess','1999-05-05'),
 ('33333333-3333-4333-a333-333333333333','door','Door','1995-03-03'),
 ('44444444-4444-4444-a444-444444444444','owner','Owner','1985-02-02'),
 ('66666666-6666-4666-a666-666666666666','admin','Admin','1990-06-06');
insert into venue_memberships values
 ('33333333-3333-4333-a333-333333333333','00000000-0000-4000-a000-000000000001','venue_door',null,now()),
 ('44444444-4444-4444-a444-444444444444','00000000-0000-4000-a000-000000000001','venue_owner',null,now());
insert into outly_staff values ('66666666-6666-4666-a666-666666666666','outly_admin',now());
commit;

-- T1: under-18 rejected
do $$ begin
  begin
    insert into profiles (id, username, display_name, date_of_birth)
    values ('55555555-5555-4555-a555-555555555555','kid','Kid', (current_date - interval '16 years')::date);
    raise exception 'T1 FAILED: minor accepted';
  exception when check_violation then raise notice 'T1 ok: under-18 rejected';
  end;
end $$;

-- T2: public_listing deal without evidence rejected
do $$ begin
  begin
    insert into deals (venue_id, title, source, status) values ('00000000-0000-4000-a000-000000000001','Fake deal','public_listing','active');
    raise exception 'T2 FAILED';
  exception when check_violation then raise notice 'T2 ok: public_listing needs source_url + verified_at';
  end;
end $$;

-- T3: customer sees demo deals; stale public listing hidden
begin;
insert into deals (venue_id, title, source, source_url, verified_at, status)
values ('00000000-0000-4000-a000-000000000002','Old happy hour','public_listing','https://example.com', now() - interval '40 days','active');
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
do $$ declare n int; stale int; begin
  select count(*) into n from deals;
  select count(*) into stale from deals where title = 'Old happy hour';
  if n < 4 or stale <> 0 then raise exception 'T3 FAILED n=% stale=%', n, stale; end if;
  raise notice 'T3 ok: % visible deals, stale listing hidden', n;
end $$;
rollback;

-- T4: door staff cannot change the venue, owner cannot change commission
begin;
select pg_temp.as_user('33333333-3333-4333-a333-333333333333');
do $$ declare n int; begin
  update venues set description = 'hacked' where id = '00000000-0000-4000-a000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T4a FAILED: door updated venue'; end if;
  raise notice 'T4a ok: door cannot edit venue';
end $$;
select pg_temp.as_user('44444444-4444-4444-a444-444444444444');
do $$ begin
  begin
    update venues set commission_rate = 0 where id = '00000000-0000-4000-a000-000000000001';
    raise exception 'T4b FAILED';
  exception when raise_exception then
    if sqlerrm like 'T4b%' then raise; end if;
    raise notice 'T4b ok: owner cannot change commission (%)', sqlerrm;
  end;
end $$;
rollback;

-- T5: guest list booking, capacity, partner-only, check-in with single-use nonce
begin;
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
do $$ declare b bookings; gl uuid; begin
  select id into gl from guest_lists where venue_id = '00000000-0000-4000-a000-000000000001' limit 1;
  b := join_guest_list(gl, 4);
  if b.status <> 'confirmed' then raise exception 'T5a FAILED'; end if;
  perform set_config('outly.test_booking', b.id::text, true);
  perform set_config('outly.test_nonce', b.qr_nonce::text, true);
  raise notice 'T5a ok: guest list confirmed';
  begin
    perform request_table('00000000-0000-4000-a000-000000000005', now() + interval '1 day', 2);
    raise exception 'T5b FAILED';
  exception when raise_exception then
    if sqlerrm like 'T5b%' then raise; end if;
    raise notice 'T5b ok: non-partner venue refused (%)', sqlerrm;
  end;
end $$;
select pg_temp.as_user('33333333-3333-4333-a333-333333333333');
do $$ declare b bookings; bid uuid := current_setting('outly.test_booking')::uuid; n uuid := current_setting('outly.test_nonce')::uuid; begin
  b := check_in(bid, n);
  if b.status <> 'checked_in' then raise exception 'T5c FAILED'; end if;
  raise notice 'T5c ok: door checked in';
  begin
    perform check_in(bid, n);
    raise exception 'T5d FAILED: nonce reused';
  exception when raise_exception then
    if sqlerrm like 'T5d%' then raise; end if;
    raise notice 'T5d ok: screenshot reuse refused (%)', sqlerrm;
  end;
end $$;
rollback;

-- T6: blocking hides messages and removes friendship; strangers cannot be added to squads
begin;
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
insert into friendships (requester_id, addressee_id) values ('11111111-1111-4111-a111-111111111111','22222222-2222-4222-a222-222222222222');
select pg_temp.as_user('22222222-2222-4222-a222-222222222222');
update friendships set status = 'accepted', accepted_at = now() where requester_id = '11111111-1111-4111-a111-111111111111';
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
insert into squads (id, name, created_by) values ('77777777-7777-4777-a777-777777777777','Friday crew','11111111-1111-4111-a111-111111111111');
insert into squad_members (squad_id, user_id, is_admin) values ('77777777-7777-4777-a777-777777777777','11111111-1111-4111-a111-111111111111', true);
insert into squad_members (squad_id, user_id) values ('77777777-7777-4777-a777-777777777777','22222222-2222-4222-a222-222222222222');
do $$ begin
  begin
    insert into squad_members (squad_id, user_id) values ('77777777-7777-4777-a777-777777777777','33333333-3333-4333-a333-333333333333');
    raise exception 'T6a FAILED: stranger added';
  exception when insufficient_privilege then raise notice 'T6a ok: non-friend cannot be added';
  end;
end $$;
select pg_temp.as_user('22222222-2222-4222-a222-222222222222');
insert into messages (squad_id, sender_id, body) values ('77777777-7777-4777-a777-777777777777','22222222-2222-4222-a222-222222222222','Rooftop at 8?');
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
do $$ declare n int; begin
  select count(*) into n from messages; if n <> 1 then raise exception 'T6b FAILED'; end if;
  insert into blocks values ('11111111-1111-4111-a111-111111111111','22222222-2222-4222-a222-222222222222', now());
  select count(*) into n from messages; if n <> 0 then raise exception 'T6c FAILED: blocked messages visible'; end if;
  select count(*) into n from friendships; if n <> 0 then raise exception 'T6d FAILED: friendship kept'; end if;
  raise notice 'T6 ok: block hides messages and removes friendship';
end $$;
rollback;

-- T7: friend activity is invisible unless opted in AND viewer selected
begin;
select pg_temp.as_service();
insert into friendships values ('11111111-1111-4111-a111-111111111111','22222222-2222-4222-a222-222222222222','accepted',now(),now());
insert into activity_posts (user_id, venue_id, night) values ('22222222-2222-4222-a222-222222222222','00000000-0000-4000-a000-000000000001', current_date);
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
do $$ declare n int; begin
  select count(*) into n from activity_posts; if n <> 0 then raise exception 'T7a FAILED: visible without opt-in'; end if;
  raise notice 'T7a ok: activity hidden by default';
end $$;
select pg_temp.as_service();
update profiles set friend_activity_visibility = 'selected' where id = '22222222-2222-4222-a222-222222222222';
insert into activity_audience values ('22222222-2222-4222-a222-222222222222','11111111-1111-4111-a111-111111111111');
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
do $$ declare n int; begin
  select count(*) into n from activity_posts; if n <> 1 then raise exception 'T7b FAILED'; end if;
  raise notice 'T7b ok: visible once opted in and selected';
end $$;
rollback;

-- T8: campaigns need a second person to approve
do $$ begin
  begin
    insert into campaigns (name, title, body, created_by, approved_by)
    values ('x','t','b','66666666-6666-4666-a666-666666666666','66666666-6666-4666-a666-666666666666');
    raise exception 'T8 FAILED';
  exception when check_violation then raise notice 'T8 ok: four-eyes approval enforced';
  end;
end $$;
