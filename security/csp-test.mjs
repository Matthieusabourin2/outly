// Proves the Content-Security-Policy of both websites in real Chrome (pnpm security:csp).
//
// 1. Builds the customer and staff sites (expo export, web) against the LOCAL Supabase,
//    the customer one with Cloudflare Turnstile's public TEST site key.
// 2. Serves each build with a tiny static server that sends the CSP from security/csp.mjs
//    (production policy, with the local API instead of *.supabase.co).
// 3. Drives Chrome (fake camera showing a QR code) and fails on ANY CSP violation:
//      customer: sign-up page + Turnstile widget, sign-up, profile, tabs, log out, log in;
//      staff:    sign-in, Tonight, door scanner with the native BarcodeDetector AND with the
//                WebAssembly fallback (window.BarcodeDetector deleted) — the QR must be read.
// Needs: local Supabase running (pnpm db:start), Google Chrome, playwright-core
// (resolved normally, or from $PLAYWRIGHT_CORE_PATH). Test users are deleted at the end.
// Usage: node security/csp-test.mjs [--no-build] [--out <dir>] [--headed]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ZXING_WASM_URL, buildCsp } from './csp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const OUT = resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : join(tmpdir(), 'outly-csp'));
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'; // Cloudflare's public "always passes" key
const TAG = `csp${Date.now().toString(36)}`;
const PASSWORD = `Csp${Date.now().toString(36)}9pass`;
const FAKE_PASS = 'OUTLY1:00000000-0000-4000-a000-00000000dead:00000000-0000-4000-a000-00000000beef';
const DEMO_VENUE = '00000000-0000-4000-a000-000000000001'; // Harbourlight Rooftop (demo seed)

// ---------- local Supabase (keys stay in memory, never printed) ----------
// `supabase status` exits non-zero when an optional service is stopped, but still prints the JSON.
const statusOut = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).stdout.toString();
if (!statusOut.trim().startsWith('{')) throw new Error('Local Supabase is not running: start it with pnpm db:start.');
const status = JSON.parse(statusOut);
const API = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API)) throw new Error('Refusing: this test only runs against a LOCAL Supabase.');
const PUBLISHABLE = status.PUBLISHABLE_KEY || status.ANON_KEY;
const SERVICE = status.SECRET_KEY || status.SERVICE_ROLE_KEY;

async function admin(path, { method = 'GET', body } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → HTTP ${r.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// ---------- playwright-core ----------
async function loadPlaywright() {
  const tries = [
    () => import('playwright-core'),
    () => process.env.PLAYWRIGHT_CORE_PATH && import(pathToFileURL(join(process.env.PLAYWRIGHT_CORE_PATH, 'index.mjs')).href),
    () => import(pathToFileURL(createRequire(join(ROOT, 'e2e', 'package.json')).resolve('playwright-core')).href),
  ];
  for (const t of tries) {
    try {
      const m = await t();
      if (m?.chromium) return m;
    } catch {
      /* next */
    }
  }
  console.error('playwright-core not found. Install it anywhere (npm i playwright-core) and set PLAYWRIGHT_CORE_PATH=<…/node_modules/playwright-core>.');
  process.exit(2);
}

// ---------- 1. build ----------
function build(app, dir, extraEnv) {
  console.log(`== building ${app} → ${dir}`);
  const env = { ...process.env, EXPO_PUBLIC_SUPABASE_URL: API, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE, EXPO_PUBLIC_TURNSTILE_SITE_KEY: '', ...extraEnv };
  const r = spawnSync('pnpm', ['--filter', app, 'exec', 'expo', 'export', '--platform', 'web', '--clear', '--output-dir', dir], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  if (r.status !== 0) {
    console.error(r.stderr.toString().slice(-3000));
    throw new Error(`build of ${app} failed`);
  }
}
const customerDir = join(OUT, 'customer');
const staffDir = join(OUT, 'staff');
if (!flag('--no-build') || !existsSync(join(customerDir, 'index.html')) || !existsSync(join(staffDir, 'index.html'))) {
  mkdirSync(OUT, { recursive: true });
  build('@outly/customer', customerDir, { EXPO_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY });
  build('@outly/partner', staffDir, {});
}

// ---------- 2. static servers that send the CSP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };
function serve(dir, csp) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html'); // SPA fallback
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` })));
}
// Negative control / tightening experiments: CSP_TEST_DROP="staff:script-src:'wasm-unsafe-eval',customer:img-src:data:"
// removes those sources from the served policy (the test must then FAIL if the source is needed).
function drop(site, csp) {
  const rules = (process.env.CSP_TEST_DROP ?? '').split(',').filter(Boolean).map((r) => r.split(/:(.*)/s)).map(([s, rest]) => [s, ...rest.split(/:(.*)/s)]);
  return csp
    .split('; ')
    .map((d) => {
      const [name, ...sources] = d.split(' ');
      const removed = rules.filter(([s, dir]) => s === site && dir === name).map(([, , src]) => src);
      const kept = sources.filter((s) => !removed.includes(s));
      return `${name} ${kept.length ? kept.join(' ') : "'none'"}`;
    })
    .join('; ');
}
const customerCsp = drop('customer', buildCsp('customer', { supabaseUrl: API }));
const staffCsp = drop('staff', buildCsp('staff', { supabaseUrl: API }));
if (process.env.CSP_TEST_DROP) console.log(`!! negative control: dropped ${process.env.CSP_TEST_DROP}`);
const customer = await serve(customerDir, customerCsp);
const staff = await serve(staffDir, staffCsp);

// ---------- fake camera: a looping video of a QR code (Chrome reads .y4m) ----------
function qrVideo(text, file) {
  const qrcode = createRequire(createRequire(join(ROOT, 'apps/customer/package.json')).resolve('react-native-qrcode-svg/package.json'))('qrcode');
  const { size, data } = qrcode.create(text, { errorCorrectionLevel: 'M' }).modules;
  const W = 640, H = 480, scale = Math.floor(400 / (size + 8)), x0 = (W - size * scale) >> 1, y0 = (H - size * scale) >> 1;
  const y = Buffer.alloc(W * H, 235);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (data[r * size + c]) for (let dy = 0; dy < scale; dy++) y.fill(16, (y0 + r * scale + dy) * W + x0 + c * scale, (y0 + r * scale + dy) * W + x0 + (c + 1) * scale);
  const uv = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), y, uv]);
  writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(frame)]));
}
const video = join(OUT, 'qr.y4m');
qrVideo(FAKE_PASS, video);

// ---------- 3. Chrome ----------
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !flag('--headed'),
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
});

const checks = [];
const violations = [];
function check(ok, what) {
  checks.push({ ok, what });
  console.log(`${ok ? '  ✓' : '  ✗'} ${what}`);
  if (!ok) throw new Error(`check failed: ${what}`);
}

async function newPage(site, origin, { polyfill = false } = {}) {
  const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 420, height: 860 } });
  await context.addInitScript((deleteNative) => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push({ directive: e.effectiveDirective, blocked: e.blockedURI, source: `${e.sourceFile}:${e.lineNumber}`, sample: e.sample }),
    );
    if (deleteNative) delete window.BarcodeDetector;
  }, polyfill);
  const page = await context.newPage();
  lastPage = page;
  const label = `${site}${polyfill ? ' (QR fallback)' : ''}`;
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) {
      const fromUs = (m.location()?.url ?? '').startsWith(origin) || !m.location()?.url;
      if (fromUs) violations.push({ site: label, console: t });
      else console.log(`    (third-party frame, own policy) ${t.slice(0, 160)}`);
    }
  });
  page.on('pageerror', (e) => violations.push({ site: label, pageerror: e.message }));
  return { context, page, label };
}
async function collect(page, label) {
  const found = await page.evaluate(() => window.__csp ?? []);
  for (const v of found) violations.push({ site: label, ...v });
  return found.length;
}

const created = [];
let exitCode = 0;
let lastPage = null; // for diagnostics when a step times out
try {
  // ----- customer -----
  console.log(`\n== customer site ${customer.url}\n   CSP: ${customerCsp}`);
  {
    const { context, page, label } = await newPage('customer', customer.url);
    await page.goto(customer.url);
    const createBtn = page.getByRole('button', { name: 'Create account' });
    await createBtn.waitFor({ timeout: 30_000 });
    check(true, 'sign-up page renders (fonts, styles, bundle)');
    // The widget's iframe lives in a closed shadow root: look for the frame itself.
    let turnstileFrame = null;
    for (let i = 0; i < 60 && !turnstileFrame; i++) {
      turnstileFrame = page.frames().find((f) => f.url().startsWith('https://challenges.cloudflare.com/'));
      if (!turnstileFrame) await page.waitForTimeout(500);
    }
    check(!!turnstileFrame, 'Turnstile widget loads (script + iframe from challenges.cloudflare.com)');
    const email = `${TAG}-guest@example.test`;
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('[role="button"]')].find((x) => x.textContent?.includes('Create account'));
      return b && b.getAttribute('aria-disabled') !== 'true';
    }, null, { timeout: 30_000 });
    check(true, 'Turnstile test key returns a token (Create account enabled)');
    await createBtn.click();
    await page.getByText('Create your profile').waitFor({ timeout: 30_000 });
    const me = await admin(`/auth/v1/admin/users?per_page=1000`).then((r) => r.users.find((u) => u.email === email));
    if (me) created.push(me.id);
    check(!!me, 'sign-up reaches Supabase Auth (account created)');
    await page.getByLabel('First name', { exact: true }).fill('Csp');
    await page.getByLabel('Username', { exact: true }).fill(`${TAG}_g`.slice(0, 24));
    await page.getByLabel('Day', { exact: true }).fill('01');
    await page.getByLabel('Month', { exact: true }).fill('01');
    await page.getByLabel('Year', { exact: true }).fill('1995');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Create your profile').waitFor({ state: 'detached', timeout: 30_000 });
    check(true, 'profile saved through the API, app opens');
    const join = page.getByRole('button', { name: 'Join the Outly list' });
    if (await join.waitFor({ timeout: 15_000 }).then(() => true, () => false)) {
      await join.click();
      await page.getByRole('button', { name: /^Join as / }).click();
      await page.getByText('Show my pass').waitFor({ timeout: 30_000 });
      await page.goto(`${customer.url}/pass`); // deep link: also proves the SPA fallback
      await page.locator('[aria-label="QR code of your Outly pass"] svg path').first().waitFor({ timeout: 30_000 });
      check(true, 'join the guest list, Pass shows the QR code');
    } else console.log('  - no upcoming guest list in the local data: pass QR not exercised');
    for (const tab of ['Pass', 'Profile', 'Night']) {
      await page.getByRole('tab', { name: tab }).first().click().catch(async () => page.getByText(tab, { exact: true }).first().click());
      await page.waitForTimeout(1200);
    }
    check(true, 'Night, Pass and Profile tabs render');
    await page.getByRole('tab', { name: 'Profile' }).first().click().catch(async () => page.getByText('Profile', { exact: true }).first().click());
    await page.getByRole('button', { name: 'Log out' }).first().click();
    await page.getByRole('tab', { name: 'Log in' }).waitFor({ timeout: 30_000 });
    await page.getByRole('tab', { name: 'Log in' }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    const loginBtn = page.getByRole('button', { name: 'Log in', exact: true });
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('[role="button"]')].find((x) => x.textContent?.trim() === 'Log in');
      return b && b.getAttribute('aria-disabled') !== 'true';
    }, null, { timeout: 30_000 });
    await loginBtn.click();
    await page.getByRole('tab', { name: 'Log in' }).waitFor({ state: 'detached', timeout: 30_000 });
    check(true, 'log out, then log in again (fresh Turnstile token)');
    const n = await collect(page, label);
    check(n === 0 && violations.length === 0, `customer: 0 CSP violations (${n} event(s), ${violations.length} total so far)`);
    await context.close();
  }

  // ----- staff -----
  console.log(`\n== staff site ${staff.url}\n   CSP: ${staffCsp}`);
  const staffEmail = `${TAG}-door@example.test`;
  const user = await admin('/auth/v1/admin/users', { method: 'POST', body: { email: staffEmail, password: PASSWORD, email_confirm: true } });
  created.push(user.id);
  await admin('/rest/v1/profiles', { method: 'POST', body: { id: user.id, username: `${TAG}_d`.slice(0, 24), display_name: 'Door', date_of_birth: '1990-01-01' } });
  await admin('/rest/v1/venue_memberships', { method: 'POST', body: { user_id: user.id, venue_id: DEMO_VENUE, role: 'venue_door' } });

  for (const polyfill of [false, true]) {
    const { context, page, label } = await newPage('staff', staff.url, { polyfill });
    let wasm = null;
    page.on('response', async (r) => {
      if (r.url() === ZXING_WASM_URL) wasm = r.status();
      if (r.url().includes('/rest/v1/rpc/scan_pass') && r.status() >= 400) {
        console.log(`    scan_pass HTTP ${r.status()}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
      }
    });
    await page.goto(staff.url);
    await page.getByLabel('Email', { exact: true }).fill(staffEmail);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByText(/^Tonight at /).waitFor({ timeout: 30_000 });
    check(true, `${label}: sign-in, Tonight page`);
    await page.waitForTimeout(1500);
    const native = await page.evaluate(() => 'BarcodeDetector' in window);
    check(native === !polyfill, `${label}: ${native ? 'native BarcodeDetector present' : 'BarcodeDetector removed → WebAssembly fallback'}`);
    await page.getByRole('button', { name: 'Open door scanner' }).click();
    // The shared local database can be reset by other tools mid-run: retry a failed server answer
    // (the QR was read either way; CSP violations are still collected).
    for (let attempt = 1; ; attempt++) {
      const outcome = await Promise.race([
        page.getByText('Invalid pass').waitFor({ timeout: 45_000 }).then(() => 'ok', () => null),
        page.getByText('Something went wrong').waitFor({ timeout: 45_000 }).then(() => 'error', () => null),
      ]);
      if (outcome === 'ok') break;
      if (outcome === null) throw new Error('no scan result after 45 s (QR not read?)');
      if (attempt === 3) throw new Error('scan_pass kept failing (is the local database being reset?)');
      console.log('    server error on scan, scanning again');
      await page.getByRole('button', { name: 'Scan next' }).click();
    }
    check(true, `${label}: fake camera on, QR read, scan_pass answered "Invalid pass"`);
    if (polyfill) check(wasm === 200, `${label}: QR WebAssembly fetched from ${new URL(ZXING_WASM_URL).host} (HTTP ${wasm})`);
    const n = await collect(page, label);
    check(n === 0 && violations.length === 0, `${label}: 0 CSP violations (${n} event(s), ${violations.length} total so far)`);
    await context.close();
  }
} catch (e) {
  exitCode = 1;
  console.error(`\n✗ ${e.message.split('\n')[0]}`);
  const text = await lastPage?.evaluate(() => document.body.innerText).catch(() => null);
  if (text) console.error(`  page text: ${text.replace(/\s+/g, ' ').slice(0, 400)}`);
  if (lastPage && !lastPage.isClosed()) await collect(lastPage, 'failed step').catch(() => {});
} finally {
  for (const id of created) await admin(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
  console.log(`\ncleaned up ${created.length} test account(s)`);
  await browser.close();
  customer.server.close();
  staff.server.close();
}

if (violations.length) {
  exitCode = 1;
  console.error(`\n✗ ${violations.length} CSP violation(s) / page error(s):`);
  for (const v of violations) console.error('  -', JSON.stringify(v));
}
console.log(exitCode ? '\n✗ CSP test FAILED' : `\n✓ CSP test passed: ${checks.length} checks, 0 violations`);
process.exit(exitCode);
