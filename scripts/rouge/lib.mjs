// Shared helpers for the Rouge set-up scripts (setup-night.mjs, staff.mjs).
// Safety model (docs/DEPLOY.md § Scripts Rouge):
//  - DRY-RUN by default: the plan is printed, nothing is written. --apply writes.
//  - --target local|prod is required.
//  - local: URL and service key come from `supabase status` (like seed-demo-users.mjs);
//    anything that is not 127.0.0.1 / localhost is refused.
//  - prod: needs --target prod AND --apply AND --confirm-prod, and reads SUPABASE_URL and
//    SUPABASE_SERVICE_ROLE_KEY from the shell environment only (never from a file).
// Keys are never printed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

export const LOCAL_URL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
export const SYDNEY = 'Australia/Sydney';

export class Refusal extends Error {}

/** Minimal flag parser: `--name value` for options listed in `valued`, `--flag` for the others. */
export function parseArgs(argv, { valued, flags }) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue; // `pnpm run x -- --flag` passes a literal "--"
    if (!arg.startsWith('--')) throw new Refusal(`Unexpected argument: ${arg}`);
    const name = arg.slice(2);
    if (valued.includes(name)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Refusal(`--${name} needs a value`);
      out[name] = value;
    } else if (flags.includes(name)) {
      out[name] = true;
    } else {
      throw new Refusal(`Unknown option: ${arg}`);
    }
  }
  return out;
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Refusal(`Cannot read ${path}: ${e.message}`);
  }
}

/** Validates the target flags and returns a service-role client. Throws Refusal when unsafe. */
export function connect(args) {
  const target = args.target;
  if (target !== 'local' && target !== 'prod') throw new Refusal('--target local|prod is required.');

  if (target === 'local') {
    let status;
    try {
      status = JSON.parse(
        execFileSync('supabase', ['status', '-o', 'json'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: process.platform === 'win32',
        }),
      );
    } catch {
      throw new Refusal('Could not read `supabase status`. Is the local Supabase running (pnpm db:start)?');
    }
    const url = status.API_URL;
    const key = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
    if (!url || !LOCAL_URL.test(url)) throw new Refusal(`Refusing: ${url ?? 'no URL'} is not a local Supabase.`);
    if (!key) throw new Refusal('No service key in `supabase status`.');
    return { target, url, client: makeClient(url, key) };
  }

  // Production: every gate must be explicit.
  if (!args.apply || !args['confirm-prod']) {
    throw new Refusal(
      'Refusing to touch PRODUCTION: --target prod needs BOTH --apply and --confirm-prod.\n' +
        'Check the plan first with a dry-run against the local Supabase (--target local).',
    );
  }
  if (process.execArgv.some((a) => a.includes('env-file'))) {
    throw new Refusal('Refusing: production keys must come from the shell environment, not from an env file.');
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Refusal('Refusing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this terminal session (see docs/DEPLOY.md).');
  }
  let host;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') throw new Error('not https');
    host = u.host;
  } catch {
    throw new Refusal('Refusing: SUPABASE_URL must be the https:// URL of the hosted project.');
  }
  if (/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) throw new Refusal('Refusing: SUPABASE_URL points to this computer, not production.');
  return { target, url, client: makeClient(url, key) };
}

function makeClient(url, key) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Throws a Refusal if any string in the content still contains PLACEHOLDER (production only). */
export function assertNoPlaceholder(value, path = 'content') {
  if (typeof value === 'string' && /placeholder/i.test(value)) {
    throw new Refusal(`Refusing to write placeholder content to production (${path}: "${value}").`);
  }
  if (Array.isArray(value)) value.forEach((v, i) => assertNoPlaceholder(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!k.startsWith('_')) assertNoPlaceholder(v, `${path}.${k}`);
  }
}

// ---------------------------------------------------------------------------
// Sydney wall-clock time → UTC instant (handles daylight saving through Intl).
// ---------------------------------------------------------------------------
function zoneOffsetMs(utcMs, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(utcMs))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - utcMs;
}

/** "2026-10-24" + "21:00" (Sydney) → Date. */
export function sydneyDateTime(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let ts = wall;
  for (let i = 0; i < 3; i++) ts = wall - zoneOffsetMs(ts, SYDNEY);
  return new Date(ts);
}

export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * A time on "the night of <date>": 12:00–23:59 is that evening, 00:00–11:59 is the morning after
 * (an end at 03:00 belongs to the next calendar day).
 */
export function nightTime(night, time) {
  const hour = Number(time.split(':')[0]);
  return sydneyDateTime(hour < 12 ? addDays(night, 1) : night, time);
}

export function formatSydney(date) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: SYDNEY,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(date);
}

export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Runs main(), turning refusals into exit code 2 and other errors into exit code 1. */
export async function run(main) {
  try {
    await main();
  } catch (e) {
    if (e instanceof Refusal) {
      console.error(`\n✋ ${e.message}`);
      process.exit(2);
    }
    console.error(`\n✗ ${e?.message ?? e}`);
    process.exit(1);
  }
}
