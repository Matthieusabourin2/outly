// PRODUCTION smoke test: one throw-away guest and one throw-away door account go through the real
// journey on deployed sites backed by the HOSTED database, then everything they created is deleted.
//
//   node scripts/prod-env.mjs <ref> -- node e2e/prod-smoke.mjs \
//     --customer https://<preview>.outly-customer.pages.dev --staff https://<preview>.outly-staff.pages.dev \
//     --venue Rouge --night 2026-10-24
//
// Run it on PREVIEW builds made with Cloudflare's always-pass Turnstile test key (publish-sites --branch),
// before the CAPTCHA is enforced in Supabase. Needs Google Chrome. The secret key only lives in this
// process's environment (scripts/prod-env.mjs); it is never printed.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
import { decodeQrPng, writeFakeCameraFile } from './lib/qr.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith('--')) args[process.argv[i].slice(2)] = process.argv[++i];
for (const k of ['customer', 'staff', 'venue', 'night']) if (!args[k]) throw new Error(`--${k} is required`);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url?.startsWith('https://') || !key) throw new Error('Run through scripts/prod-env.mjs (hosted project only).');
for (const site of [args.customer, args.staff]) if (!site.startsWith('https://')) throw new Error(`not an https site: ${site}`);

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = randomBytes(3).toString('hex');
const host = new URL(args.customer).hostname.split('.').slice(-2).join('.');
const guest = { email: `smoke-guest-${tag}@${host}`, password: `Smoke${tag}2026x`, username: `smoke_${tag}`, name: 'Smoke' };
const door = { email: `smoke-door-${tag}@${host}`, password: `Door${tag}2026x` };
const created = [];
const shots = join(tmpdir(), `outly-smoke-${tag}`);
mkdirSync(shots, { recursive: true });
let browser;

const step = (msg) => console.log(`  ✓ ${msg}`);
const see = (page, text, timeout = 30_000) => page.getByText(text).filter({ visible: true }).first().waitFor({ timeout });

try {
  // Venue + list of the night, read with the service key (explicit columns, SPEC A10).
  const { data: venues, error: ve } = await admin.from('venues').select('id, name, is_demo').eq('name', args.venue).eq('is_demo', false);
  if (ve) throw ve;
  assert.equal(venues.length, 1, `exactly one real venue named ${args.venue}`);
  const venue = venues[0];
  const { data: lists } = await admin.from('guest_lists').select('id, capacity, night').eq('venue_id', venue.id).eq('night', args.night);
  assert.equal(lists?.length, 1, `one guest list at ${args.venue} on ${args.night}`);
  step(`${args.venue}: guest list of ${args.night} found (${lists[0].capacity} spots)`);

  // Throw-away door account (confirmed, like rouge:staff).
  const { data: d, error: de } = await admin.auth.admin.createUser({ email: door.email, password: door.password, email_confirm: true });
  if (de) throw de;
  door.id = d.user.id;
  created.push(door.id);
  const { error: pe } = await admin.from('profiles').insert({ id: door.id, username: `smoke_door_${tag}`, display_name: 'Smoke door', date_of_birth: '1990-01-01' });
  if (pe) throw pe;
  const { error: me } = await admin.from('venue_memberships').insert({ user_id: door.id, venue_id: venue.id, role: 'venue_door' });
  if (me) throw me;
  step('throw-away door account created');

  // ---- Customer site: sign up → profile → join → pass ----
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const c = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await c.goto(args.customer);
  await see(c, 'Good times, anytime.', 60_000);
  await c.getByLabel('Email', { exact: true }).fill(guest.email);
  await c.getByLabel('Password', { exact: true }).fill(guest.password);
  await c.getByRole('button', { name: 'Create account' }).waitFor();
  await c.waitForFunction(() => {
    const b = [...document.querySelectorAll('[role=button]')].find((e) => e.textContent?.trim() === 'Create account');
    return b && b.getAttribute('aria-disabled') !== 'true';
  }, null, { timeout: 30_000 }); // Turnstile token
  await c.getByRole('button', { name: 'Create account' }).click();
  await see(c, 'Create your profile');
  const { data: u } = await admin.auth.admin.listUsers({ perPage: 1000 });
  guest.id = u.users.find((x) => x.email === guest.email)?.id;
  if (guest.id) created.push(guest.id);
  step('sign-up on the customer site');
  await c.getByLabel('First name', { exact: true }).fill(guest.name);
  await c.getByLabel('Username', { exact: true }).fill(guest.username);
  await c.getByLabel('Day', { exact: true }).fill('15');
  await c.getByLabel('Month', { exact: true }).fill('6');
  await c.getByLabel('Year', { exact: true }).fill('1998');
  await c.getByRole('button', { name: 'Continue' }).click();
  await see(c, args.venue);
  await see(c, 'On the Outly list');
  await c.screenshot({ path: join(shots, 'night.png') });
  step(`profile saved, the ${args.venue} night shows`);
  await c.getByRole('button', { name: 'Join the Outly list' }).click();
  await see(c, 'How do you want to appear?');
  await c.getByRole('button', { name: /^Join as / }).click();
  await see(c, 'YOUR OUTLY PASS');
  const qr = c.getByRole('img', { name: 'QR code of your Outly pass' }).filter({ visible: true }).first();
  await qr.waitFor();
  await c.screenshot({ path: join(shots, 'pass.png') });
  const code = decodeQrPng(await qr.screenshot());
  assert.match(code ?? '', /^OUTLY1:[0-9A-F-]{36}:[0-9A-F-]{36}$/i, 'the pass QR decodes to an Outly pass code');
  step('joined the list, QR pass shown and readable');

  // ---- Staff site: sign in as door → scan that pass with a fake camera ----
  const camera = writeFakeCameraFile(code, join(shots, 'camera.mjpeg'));
  const staffBrowser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${camera}`],
  });
  try {
    const s = await (await staffBrowser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await s.goto(args.staff);
    await s.getByLabel('Email', { exact: true }).waitFor({ timeout: 60_000 });
    await s.getByLabel('Email', { exact: true }).fill(door.email);
    await s.getByLabel('Password', { exact: true }).fill(door.password);
    await s.waitForFunction(() => {
      const b = [...document.querySelectorAll('[role=button]')].find((e) => e.textContent?.trim() === 'Log in');
      return b && b.getAttribute('aria-disabled') !== 'true';
    }, null, { timeout: 30_000 });
    await s.getByRole('button', { name: 'Log in' }).click();
    await see(s, /^Tonight at /);
    step('door account signed in on the staff site');
    await s.getByRole('button', { name: 'Open door scanner' }).click();
    // Before the night, the server answers "Not for tonight"; on the night, "OK".
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
    const expected = today === args.night ? 'Fast lane OK' : 'Not for tonight';
    await see(s, expected, 45_000);
    await s.screenshot({ path: join(shots, 'scan.png') });
    step(`pass scanned with the camera, server answered "${today === args.night ? 'Fast lane OK' : 'Not for tonight'}" (night ${args.night})`);
  } finally {
    await staffBrowser.close();
  }
  console.log(`\n✓ PRODUCTION SMOKE TEST PASSED (screenshots: ${shots})`);
} catch (e) {
  console.error(`\n✗ PRODUCTION SMOKE TEST FAILED: ${e.message}\n  screenshots: ${shots}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  // Clean up: the door's scans, then both accounts (profile, booking and membership go with them).
  if (door.id) await admin.from('scan_events').delete().eq('scanned_by', door.id);
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`  cleanup: could not delete ${id}: ${error.message}`);
  }
  console.log(`cleaned up ${created.length} test account(s)`);
}
