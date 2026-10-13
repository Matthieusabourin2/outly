-- =====================================================================
-- Outly — migration 0004: columns people must not change on their own rows
-- (independent security review, 2026-10-14). Each hole was reproduced through the
-- local Supabase API with a normal signed-in account before this fix.
--   P1. profiles: policy profiles_self_update lets a user update EVERY column of their
--       own row. A suspended account could lift its own suspension (suspended_at), which
--       is what keeps a harasser off the guest list and out of the fast lane (scan_pass
--       answers 'forbidden'); anyone could also mark themselves ID-verified or change
--       their tier / no-show count / referral data.
--   P2. friendships: the addressee of a request could rewrite requester_id while
--       accepting it, creating an accepted friendship with anyone, without their consent.
--   P3. messages: a sender could re-date their message (created_at) or move it into
--       another of their squads (squad_id). (Moving it into a squad they are not in, or
--       changing its author, was already refused by RLS.)
--   Review fix: on INSERT a user could also set referred_by to anyone (which blocked
--   that person's account deletion), pick their referral_code and back-date created_at.
-- Append-only: 0001–0003 are untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- P1. profiles: moderation and system columns are read-only for the user.
-- A trigger (not column privileges) because Outly support must still be able to
-- suspend through the API (policy profiles_staff_update), as must the service role
-- and SQL jobs (no signed-in user, e.g. the no-show cron job).
-- ---------------------------------------------------------------------
create or replace function private.profiles_protect_columns() returns trigger
language plpgsql set search_path = public, private as $$
begin
  if auth.uid() is null or is_outly(array['outly_support']::outly_role[]) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- referred_by: pointing it at someone used to block THEIR account deletion
    -- (profiles_referred_by_fkey, see 0005) and would fake a referral.
    if new.suspended_at is not null or new.id_verified_at is not null
       or new.no_show_count <> 0 or new.tier <> 'bronze' or new.referred_by is not null then
      raise exception 'OUTLY_FORBIDDEN_COLUMN';
    end if;
    -- A trigger cannot tell a default from a value the client sent: always use the defaults.
    new.created_at    := now();
    new.referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  elsif new.suspended_at   is distinct from old.suspended_at
     or new.id_verified_at is distinct from old.id_verified_at
     or new.no_show_count  is distinct from old.no_show_count
     or new.tier           is distinct from old.tier
     or new.referral_code  is distinct from old.referral_code
     or new.referred_by    is distinct from old.referred_by
     or new.created_at     is distinct from old.created_at then
    raise exception 'OUTLY_FORBIDDEN_COLUMN';
  end if;
  return new;
end $$;
revoke execute on function private.profiles_protect_columns() from public, anon, authenticated;

create trigger profiles_protect before insert or update on public.profiles
  for each row execute function private.profiles_protect_columns();

-- ---------------------------------------------------------------------
-- P2. friendships: accepting a request may only change its status.
-- (Squads / friends are not in V1's interface, but the API is live.)
-- ---------------------------------------------------------------------
revoke update on public.friendships from anon, authenticated;
grant update (status, accepted_at) on public.friendships to authenticated;

-- ---------------------------------------------------------------------
-- P3. messages: a sender may soft-delete (or edit the text of) their own message,
-- nothing else.
-- ---------------------------------------------------------------------
revoke update on public.messages from anon, authenticated;
grant update (body, deleted_at) on public.messages to authenticated;
