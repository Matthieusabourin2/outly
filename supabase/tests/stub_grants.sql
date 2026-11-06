-- Runs after the migrations. Table/sequence privileges now come from the default
-- privileges set in supabase_stub.sql (like Supabase), so a migration's REVOKE is not
-- silently undone here. Only schema usage is (re)asserted.
grant usage on schema public to anon, authenticated;
