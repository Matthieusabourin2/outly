// Shared constants + access to the LOCAL Supabase for the e2e suite.
// Keys are read from `supabase status` at runtime and never written to disk or logs.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const E2E_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const REPO_ROOT = dirname(E2E_DIR);
export const DIST_DIR = join(E2E_DIR, '.dist');
export const ARTIFACTS_DIR = join(E2E_DIR, '.artifacts');

export const CUSTOMER_PORT = 8091;
export const PARTNER_PORT = 8092;
export const CUSTOMER_URL = process.env.E2E_CUSTOMER_URL ?? `http://127.0.0.1:${CUSTOMER_PORT}`;
export const PARTNER_URL = process.env.E2E_PARTNER_URL ?? `http://127.0.0.1:${PARTNER_PORT}`;
export const MAILPIT_URL = 'http://127.0.0.1:54324';

// Demo data (supabase/seed_demo.sql + scripts/seed-demo-users.mjs).
export const DEMO_PASSWORD = 'OutlyDemo2026!';
export const VELVET_TRAM = '00000000-0000-4000-a000-000000000002';
export const VELVET_TRAM_NAME = 'Velvet Tram';
export const DEMO_EVENT = '00000000-0000-4000-b000-000000000001';
export const DEMO_GUEST_LIST = '00000000-0000-4000-c000-000000000001';
export const DEMO_OFFER = '00000000-0000-4000-d000-000000000001';
export const STAFF = {
  manager: 'manager@demo.outly',
  door: 'door@demo.outly',
  bar: 'bar@demo.outly',
};

const LOCAL_URL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;

export function supabaseBin() {
  return join(REPO_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
}

let cached;
/** API URL + keys of the running local Supabase. Throws a readable error if it isn't running or isn't local. */
export function localSupabase() {
  if (cached) return cached;
  let status;
  try {
    status = JSON.parse(
      execFileSync(supabaseBin(), ['status', '-o', 'json'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        shell: process.platform === 'win32',
      }),
    );
  } catch {
    throw new Error('Local Supabase is not running. Start Docker, then run `pnpm db:start` (see docs/SETUP.md).');
  }
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !LOCAL_URL.test(url)) throw new Error(`Refusing to run e2e tests: ${url ?? 'no URL'} is not a local Supabase.`);
  if (!publishableKey || !serviceKey) throw new Error('Could not read the local Supabase keys from `supabase status`.');
  cached = { url, publishableKey, serviceKey };
  return cached;
}

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: test setup and assertions only (never in an app). */
export function adminClient() {
  const { url, serviceKey } = localSupabase();
  return createClient(url, serviceKey, NO_SESSION);
}

/** Publishable-key client acting as a user, from an access token (e.g. read from the customer's browser). */
export function userClient(accessToken) {
  const { url, publishableKey } = localSupabase();
  return createClient(url, publishableKey, {
    ...NO_SESSION,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Publishable-key client with its own (in-memory) session. */
export function anonClient() {
  const { url, publishableKey } = localSupabase();
  return createClient(url, publishableKey, NO_SESSION);
}
