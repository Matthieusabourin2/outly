-- =====================================================================
-- Tests for migration 0004 (columns people must not change on their own rows).
-- Self-contained: own users and data. Each block raises on failure; success prints "P.. ok".
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
 ('c3000000-0000-4000-a000-000000000001','p.guest@demo.outly'),
 ('c3000000-0000-4000-a000-000000000002','p.other@demo.outly'),
 ('c3000000-0000-4000-a000-000000000003','p.puppet@demo.outly'),
 ('c3000000-0000-4000-a000-000000000004','p.support@demo.outly'),
 ('c3000000-0000-4000-a000-000000000005','p.new@demo.outly');
insert into profiles (id, username, display_name, date_of_birth) values
 ('c3000000-0000-4000-a000-000000000001','p_guest','Pia','2000-01-01'),
 ('c3000000-0000-4000-a000-000000000002','p_other','Paul','2000-01-01'),
 ('c3000000-0000-4000-a000-000000000003','p_puppet','Puppet','2000-01-01'),
 ('c3000000-0000-4000-a000-000000000004','p_support','Support','1990-01-01');
insert into outly_staff (user_id, role) values ('c3000000-0000-4000-a000-000000000004','outly_support');
insert into squads (id, name, created_by) values
 ('93000000-0000-4000-a000-000000000001','Mine','c3000000-0000-4000-a000-000000000001'),
 ('93000000-0000-4000-a000-000000000002','Theirs','c3000000-0000-4000-a000-000000000002');
insert into squad_members (squad_id, user_id, is_admin) values
 ('93000000-0000-4000-a000-000000000001','c3000000-0000-4000-a000-000000000001', true),
 ('93000000-0000-4000-a000-000000000002','c3000000-0000-4000-a000-000000000002', true);
insert into messages (id, squad_id, sender_id, body) values
 ('94000000-0000-4000-a000-000000000001','93000000-0000-4000-a000-000000000001','c3000000-0000-4000-a000-000000000001','hello');

-- P1a: a user still edits their own name, username and settings
select pg_temp.as_user('c3000000-0000-4000-a000-000000000001');
do $$ declare n text; begin
  update profiles set display_name = 'Pia B', username = 'p_guest2', alcohol_promos_opt_in = false
   where id = 'c3000000-0000-4000-a000-000000000001';
  select username into n from profiles where id = 'c3000000-0000-4000-a000-000000000001';
  if n <> 'p_guest2' then raise exception 'P1a FAILED: own profile not editable (%)', n; end if;
  raise notice 'P1a ok: users still edit their name, username and settings';
end $$;

-- P1b: a suspended user cannot lift their own suspension
select pg_temp.as_service();
update profiles set suspended_at = now() where id = 'c3000000-0000-4000-a000-000000000001';
select pg_temp.as_user('c3000000-0000-4000-a000-000000000001');
do $$ begin
  begin
    update profiles set suspended_at = null where id = 'c3000000-0000-4000-a000-000000000001';
    raise exception 'P1b FAILED: user lifted their own suspension';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN_COLUMN' then raise exception 'P1b FAILED: %', sqlerrm; end if;
  end;
end $$;
select pg_temp.as_service();
do $$ begin
  if not private.is_suspended('c3000000-0000-4000-a000-000000000001') then raise exception 'P1b FAILED: no longer suspended'; end if;
  raise notice 'P1b ok: a suspended account cannot unsuspend itself';
end $$;

-- P1c: a user cannot mark themselves ID-verified, change tier, no-shows or referral data
select pg_temp.as_user('c3000000-0000-4000-a000-000000000002');
do $$ declare c text; bad text := ''; begin
  foreach c in array array[
    'id_verified_at = now()', 'tier = ''platinum''', 'no_show_count = 0 - 1',
    'referral_code = ''HACKED01''', 'referred_by = ''c3000000-0000-4000-a000-000000000003''', 'created_at = now() - interval ''5 years''']
  loop
    begin
      execute format('update profiles set %s where id = %L', c, 'c3000000-0000-4000-a000-000000000002');
      bad := bad || ' ' || c;
    exception when raise_exception then
      if sqlerrm <> 'OUTLY_FORBIDDEN_COLUMN' then raise; end if;
    end;
  end loop;
  if bad <> '' then raise exception 'P1c FAILED: changed by the user:%', bad; end if;
  raise notice 'P1c ok: ID verification, tier, no-shows, referral, created_at are read-only for users';
end $$;

-- P1d: a new user creates a normal profile, but not a pre-verified / pre-tiered one
select pg_temp.as_user('c3000000-0000-4000-a000-000000000005');
do $$ begin
  begin
    insert into profiles (id, username, display_name, date_of_birth, id_verified_at, tier)
    values ('c3000000-0000-4000-a000-000000000005','p_new','New','2000-01-01', now(), 'platinum');
    raise exception 'P1d FAILED: forged profile created';
  exception when raise_exception then
    if sqlerrm <> 'OUTLY_FORBIDDEN_COLUMN' then raise exception 'P1d FAILED: %', sqlerrm; end if;
  end;
  insert into profiles (id, username, display_name, date_of_birth)
  values ('c3000000-0000-4000-a000-000000000005','p_new','New','2000-01-01');
  raise notice 'P1d ok: normal sign-up profile works, forged one refused';
end $$;

-- P1e: Outly support can still suspend and unsuspend (moderation through the API)
select pg_temp.as_user('c3000000-0000-4000-a000-000000000004');
do $$ declare s timestamptz; begin
  update profiles set suspended_at = now() where id = 'c3000000-0000-4000-a000-000000000002';
  select suspended_at into s from profiles where id = 'c3000000-0000-4000-a000-000000000002';
  if s is null then raise exception 'P1e FAILED: support cannot suspend'; end if;
  update profiles set suspended_at = null where id = 'c3000000-0000-4000-a000-000000000001';
  select suspended_at into s from profiles where id = 'c3000000-0000-4000-a000-000000000001';
  if s is not null then raise exception 'P1e FAILED: support cannot unsuspend'; end if;
  raise notice 'P1e ok: Outly support still suspends / unsuspends';
end $$;

-- P1f: jobs and the service role (no signed-in user) still update system columns
select pg_temp.as_service();
do $$ declare n int; begin
  update profiles set no_show_count = no_show_count + 1 where id = 'c3000000-0000-4000-a000-000000000003';
  select no_show_count into n from profiles where id = 'c3000000-0000-4000-a000-000000000003';
  if n <> 1 then raise exception 'P1f FAILED: service cannot update no_show_count'; end if;
  raise notice 'P1f ok: service role and cron jobs keep full access';
end $$;

-- P2: the addressee of a friend request cannot rewrite who sent it
select pg_temp.as_user('c3000000-0000-4000-a000-000000000003');
insert into friendships (requester_id, addressee_id) values ('c3000000-0000-4000-a000-000000000003','c3000000-0000-4000-a000-000000000002');
select pg_temp.as_user('c3000000-0000-4000-a000-000000000002');
do $$ begin
  begin
    update friendships set requester_id = 'c3000000-0000-4000-a000-000000000004', status = 'accepted'
     where requester_id = 'c3000000-0000-4000-a000-000000000003' and addressee_id = 'c3000000-0000-4000-a000-000000000002';
    raise exception 'P2a FAILED: requester rewritten';
  exception when insufficient_privilege then null;
  end;
  update friendships set status = 'accepted', accepted_at = now()
   where requester_id = 'c3000000-0000-4000-a000-000000000003' and addressee_id = 'c3000000-0000-4000-a000-000000000002';
  if not private.are_friends('c3000000-0000-4000-a000-000000000003','c3000000-0000-4000-a000-000000000002') then
    raise exception 'P2b FAILED: accepting a request no longer works';
  end if;
  if private.are_friends('c3000000-0000-4000-a000-000000000004','c3000000-0000-4000-a000-000000000002') then
    raise exception 'P2c FAILED: forged friendship exists';
  end if;
  raise notice 'P2 ok: accepting works; the requester cannot be swapped';
end $$;

-- P3: a sender cannot move a message into another squad or change its author
select pg_temp.as_user('c3000000-0000-4000-a000-000000000001');
do $$ begin
  begin
    update messages set squad_id = '93000000-0000-4000-a000-000000000002' where id = '94000000-0000-4000-a000-000000000001';
    raise exception 'P3a FAILED: message moved to another squad';
  exception when insufficient_privilege then null;
  end;
  begin
    update messages set created_at = now() - interval '1 day' where id = '94000000-0000-4000-a000-000000000001';
    raise exception 'P3b FAILED: message date rewritten';
  exception when insufficient_privilege then null;
  end;
  -- the sender can still edit the text (soft delete is a separate, pre-existing issue: see docs/SECURITY.md)
  update messages set body = 'hello again' where id = '94000000-0000-4000-a000-000000000001';
  raise notice 'P3 ok: a message cannot be moved or re-dated';
end $$;
select pg_temp.as_service();
do $$ begin
  if (select body from messages where id = '94000000-0000-4000-a000-000000000001') <> 'hello again' then
    raise exception 'P3c FAILED: sender can no longer edit their message';
  end if;
  raise notice 'P3c ok: senders still edit their own message text';
end $$;
