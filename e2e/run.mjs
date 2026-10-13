// `pnpm e2e`: replays the customer and staff journeys in Chrome against the LOCAL Supabase.
//
//   1. checks the local Supabase is running (and is local); the apps' .env.local files are left untouched
//   2. resets the database + demo accounts (pnpm db:reset, pnpm db:seed-users)
//   3. pins the demo launch night around "now" so the suite passes at any hour
//   4. exports both websites (expo export --platform web --clear) into e2e/.dist/
//   5. serves them on 127.0.0.1:8091 (customer) and :8092 (staff), SPA fallback
//   6. runs the scenarios in e2e/tests/ one at a time (node --test), screenshots in e2e/.artifacts/
//
// Options (environment variables):
//   E2E_SKIP_BUILD=1   reuse the last export in e2e/.dist/ (faster when only tests changed)
//   E2E_HEADED=1       show the Chrome windows
//   E2E_CHROME_PATH    use this Chrome binary instead of the installed Google Chrome
//   E2E_RUN_SKIPPED=1  also run the tests skipped because of a known app bug (to check a fix)
// Arguments: optional substrings to pick scenario files, e.g. `pnpm e2e door offline`.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  ARTIFACTS_DIR,
  CUSTOMER_PORT,
  CUSTOMER_URL,
  DEMO_EVENT,
  DEMO_GUEST_LIST,
  DIST_DIR,
  E2E_DIR,
  PARTNER_PORT,
  PARTNER_URL,
  REPO_ROOT,
  VELVET_TRAM,
  adminClient,
  localSupabase,
} from './lib/env.mjs';
import { serveStatic } from './lib/server.mjs';

const started = Date.now();
const isWin = process.platform === 'win32';
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(0)}s`;
const say = (msg) => console.log(`\n[e2e ${elapsed()}] ${msg}`);

function run(cmd, args, { cwd = REPO_ROOT, env = process.env, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    // Windows needs a shell for pnpm(.cmd); quote the command so "C:\\Program Files\\nodejs\\node.exe" survives it.
    const command = isWin && /\s/.test(cmd) ? `"${cmd}"` : cmd;
    const child = spawn(command, args, { cwd, env, shell: isWin, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    child.stderr?.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(' ')} failed (exit ${code})${quiet ? `\n${out.slice(-4000)}` : ''}`)),
    );
  });
}

/** Same rule as sydneyNight() in packages/core and sydney_night() in SQL: before 6am counts as the previous night. */
function sydneyNight(now = new Date()) {
  const shifted = new Date(now.getTime() - 6 * 3600 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(shifted);
}

/**
 * seed_demo.sql dates the demo night with the Sydney CALENDAR date and runs it 9pm–3am. Reset between
 * midnight and 6am, the staff site (which uses the 6am rollover) finds no guest list "tonight", and
 * after 3am the night is already over. Pin the demo launch night around now so every run is the same.
 */
async function pinDemoNight() {
  // The pinned night is only right until the next 6am rollover: a run that starts just before 6am Sydney
  // would cross it mid-way (the sites would then look for the NEXT night). Wait for the rollover instead.
  const msToRollover = (() => {
    const t = Date.now();
    for (let m = 1; m <= 10; m++) if (sydneyNight(new Date(t + m * 60_000)) !== sydneyNight(new Date(t))) return m * 60_000;
    return null;
  })();
  if (msToRollover !== null) {
    console.log(`6am Sydney (the night rollover) is less than 10 minutes away: waiting ${Math.ceil(msToRollover / 60_000)} min so the run doesn't straddle it`);
    await new Promise((r) => setTimeout(r, msToRollover + 5_000));
  }
  const admin = adminClient();
  const night = sydneyNight();
  const now = Date.now();
  const startsAt = new Date(now - 60 * 60 * 1000).toISOString();
  const endsAt = new Date(now + 6 * 60 * 60 * 1000).toISOString();
  const ev = await admin.from('events').update({ starts_at: startsAt, ends_at: endsAt }).eq('id', DEMO_EVENT).select('id');
  if (ev.error || ev.data.length !== 1) throw new Error(`Could not pin the demo event: ${ev.error?.message ?? 'not found'}`);
  const gl = await admin.from('guest_lists').update({ night }).eq('id', DEMO_GUEST_LIST).select('id');
  if (gl.error || gl.data.length !== 1) throw new Error(`Could not pin the demo guest list: ${gl.error?.message ?? 'not found'}`);
  // The seed also gives Velvet Tram a plain 60-spot list on the same night, created in the same
  // transaction (same created_at): the staff site's "first list of tonight" would then be a coin toss.
  // Like Rouge, keep one Velvet Tram list tonight: move the plain one to the night before.
  const yesterday = new Date(Date.parse(`${night}T12:00:00Z`) - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const other = await admin
    .from('guest_lists')
    .update({ night: yesterday })
    .eq('venue_id', VELVET_TRAM)
    .is('event_id', null)
    .neq('id', DEMO_GUEST_LIST);
  if (other.error) throw new Error(`Could not move the plain Velvet Tram list: ${other.error.message}`);
  console.log(`demo launch night pinned: night ${night}, event ${startsAt} → ${endsAt}`);
}

async function exportSite(app, outDir) {
  const { url, publishableKey } = localSupabase();
  // Explicit env: local Supabase, no CAPTCHA, no Google button, whatever the developer's shell has.
  // EXPO_NO_DOTENV: ignore the apps' .env / .env.local files (the build doesn't depend on them, and
  // pnpm e2e never rewrites them, so a developer's own settings there survive a run).
  const env = {
    ...process.env,
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_SUPABASE_URL: url,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    EXPO_PUBLIC_TURNSTILE_SITE_KEY: '',
    EXPO_PUBLIC_GOOGLE_SIGN_IN: '',
    CI: '1',
  };
  rmSync(outDir, { recursive: true, force: true });
  await run('pnpm', ['exec', 'expo', 'export', '--platform', 'web', '--clear', '--output-dir', outDir], {
    cwd: join(REPO_ROOT, 'apps', app),
    env,
    quiet: true,
  });
  if (!existsSync(join(outDir, 'index.html'))) throw new Error(`expo export produced no index.html for ${app}`);
}

async function main() {
  say('Checking the local Supabase');
  const { url } = localSupabase();
  console.log(`local Supabase at ${url}`);
  const health = await fetch(`${url}/auth/v1/health`).catch(() => null);
  if (!health?.ok) throw new Error('Local Supabase does not answer. Start Docker, then `pnpm db:start`.');

  say('Resetting the local database (pnpm db:reset) and demo accounts (pnpm db:seed-users)');
  await run('pnpm', ['run', 'db:reset'], { quiet: true });
  await run('pnpm', ['run', 'db:seed-users'], { quiet: true });
  await pinDemoNight();

  const customerDist = join(DIST_DIR, 'customer');
  const partnerDist = join(DIST_DIR, 'partner');
  if (process.env.E2E_SKIP_BUILD === '1' && existsSync(join(customerDist, 'index.html')) && existsSync(join(partnerDist, 'index.html'))) {
    say('Reusing the last website export (E2E_SKIP_BUILD=1)');
  } else {
    say('Exporting both websites (expo export --platform web --clear)');
    await Promise.all([exportSite('customer', customerDist), exportSite('partner', partnerDist)]);
  }

  say(`Serving the customer site on ${CUSTOMER_URL} and the staff site on ${PARTNER_URL}`);
  const servers = [await serveStatic(customerDist, CUSTOMER_PORT), await serveStatic(partnerDist, PARTNER_PORT)];

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  // Keep the screenshots of the last 5 runs only.
  for (const old of readdirSync(ARTIFACTS_DIR).sort().reverse().slice(4)) rmSync(join(ARTIFACTS_DIR, old), { recursive: true, force: true });
  const filters = process.argv.slice(2);
  const files = readdirSync(join(E2E_DIR, 'tests'))
    .filter((f) => f.endsWith('.test.mjs'))
    .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
    .sort()
    .map((f) => join('tests', f));
  if (files.length === 0) throw new Error(`No scenario matches ${filters.join(', ')}`);

  say(`Running ${files.length} scenario file(s), one at a time (screenshots: e2e/.artifacts/${runId}/)`);
  const testsStarted = Date.now();
  let code = 0;
  try {
    await run(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=spec', ...files], {
      cwd: E2E_DIR,
      env: { ...process.env, E2E_RUN_ID: runId, E2E_CUSTOMER_URL: CUSTOMER_URL, E2E_PARTNER_URL: PARTNER_URL },
    });
  } catch {
    code = 1;
  } finally {
    await Promise.all(
      servers.map((s) => {
        const closed = new Promise((r) => s.close(r));
        s.closeAllConnections();
        return closed;
      }),
    );
  }
  say(`${code === 0 ? 'PASSED' : 'FAILED'} — scenarios ${((Date.now() - testsStarted) / 1000).toFixed(0)}s, total ${elapsed()}`);
  process.exit(code);
}

main().catch((e) => {
  console.error(`\n[e2e] ${e.message}`);
  process.exit(1);
});
