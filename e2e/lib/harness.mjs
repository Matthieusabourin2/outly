// Browser harness for the scenarios: installed Chrome (playwright-core), phone viewport,
// step screenshots and failure screenshots in e2e/.artifacts/, console errors logged.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright-core';
import { ARTIFACTS_DIR, CUSTOMER_URL, PARTNER_URL } from './env.mjs';

const VIEWPORT = { width: 390, height: 844 };
const DEFAULT_TIMEOUT_MS = 20_000;
const SCENARIO_TIMEOUT_MS = 240_000;

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

class Harness {
  constructor(name) {
    this.name = name;
    this.dir = join(ARTIFACTS_DIR, process.env.E2E_RUN_ID ?? 'local', slug(name));
    mkdirSync(this.dir, { recursive: true });
    this.browsers = [];
    this.pages = [];
    this.step = 0;
  }

  log(line) {
    appendFileSync(join(this.dir, 'browser.log'), `${new Date().toISOString()} ${line}\n`);
  }

  /** Installed Chrome, headless. `camera`: path of a .mjpeg file used as the camera. */
  async browser({ camera } = {}) {
    const args = [];
    if (camera) {
      args.push('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${camera}`);
    }
    const browser = await chromium.launch({
      headless: process.env.E2E_HEADED !== '1',
      ...(process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : { channel: 'chrome' }),
      args,
    });
    this.browsers.push(browser);
    return browser;
  }

  /** A fresh phone-sized page (its own cookies/storage) on the customer or staff site. */
  async page(browser, label, { site = 'customer', camera = false } = {}) {
    const origin = site === 'customer' ? CUSTOMER_URL : PARTNER_URL;
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true, locale: 'en-AU', timezoneId: 'Australia/Sydney' });
    if (camera) await context.grantPermissions(['camera'], { origin });
    context.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
    const page = await context.newPage();
    page.on('pageerror', (e) => this.log(`[${label}] pageerror ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') this.log(`[${label}] console.${m.type()} ${m.text()} ${m.location()?.url ?? ''}`);
    });
    this.pages.push({ label, page });
    await page.goto(origin);
    return page;
  }

  /** Screenshot of a key step, numbered in order. */
  async shot(page, name) {
    this.step += 1;
    await page.screenshot({ path: join(this.dir, `${String(this.step).padStart(2, '0')}-${slug(name)}.png`) });
  }

  async failureShots() {
    for (const { label, page } of this.pages) {
      try {
        await page.screenshot({ path: join(this.dir, `FAILED-${slug(label)}.png`), timeout: 5_000 });
      } catch {
        /* page already closed */
      }
    }
  }

  async close() {
    await Promise.allSettled(this.browsers.map((b) => b.close()));
  }
}

/**
 * One independent scenario: its own browsers and data; screenshots of every open page if it fails.
 * `skip`: reason (a known app bug); E2E_RUN_SKIPPED=1 runs it anyway, to check whether the bug is fixed.
 */
export function scenario(name, fn, { skip } = {}) {
  test(name, { timeout: SCENARIO_TIMEOUT_MS, skip: process.env.E2E_RUN_SKIPPED === '1' ? false : skip }, async () => {
    const h = new Harness(name);
    try {
      await fn(h);
    } catch (e) {
      await h.failureShots();
      throw e;
    } finally {
      await h.close();
    }
  });
}

// ---------------------------------------------------------------------------
// UI helpers. React Native Web keeps screens of a stack in the DOM, so every
// lookup is restricted to what is actually visible.
// ---------------------------------------------------------------------------

/** The visible element showing exactly this text (or matching this RegExp). */
export function text(page, value) {
  return page.getByText(value, { exact: typeof value === 'string' }).filter({ visible: true }).first();
}

/** Waits until this text is visible. */
export async function see(page, value, timeout) {
  await text(page, value).waitFor({ state: 'visible', timeout });
}

/** Waits until no element shows this text any more (e.g. a closing sheet). */
export async function gone(page, value, timeout) {
  await page.getByText(value, { exact: typeof value === 'string' }).filter({ visible: true }).first().waitFor({ state: 'hidden', timeout });
}

/** Asserts this text is not visible (after the page has settled on something else first). */
export async function notSee(page, value) {
  const count = await page.getByText(value, { exact: typeof value === 'string' }).filter({ visible: true }).count();
  if (count > 0) throw new Error(`Expected "${value}" not to be visible`);
}

export function button(page, name) {
  return page.getByRole('button', { name, exact: true }).filter({ visible: true }).last();
}

export async function tap(page, name) {
  await button(page, name).click();
}

export async function fill(page, label, value) {
  const field = page.getByLabel(label, { exact: true }).filter({ visible: true }).first();
  await field.fill(value);
}

/** Tab bar entry or segmented tab ("Night", "Door", "Log in"…). Tab bar labels start with an icon glyph. */
export function tab(page, name) {
  return page.getByRole('tab', { name: new RegExp(`(^|\\s)${name}$`) }).filter({ visible: true }).first();
}

/** Log in on the customer site with email + password. */
export async function customerLogin(page, { email, password }) {
  await tab(page, 'Log in').click();
  await fill(page, 'Email', email);
  await fill(page, 'Password', password);
  await page.getByRole('button', { name: 'Log in', exact: true }).filter({ visible: true }).last().click();
}

/** Log in on the staff site. */
export async function staffLogin(page, email, password) {
  await fill(page, 'Email', email);
  await fill(page, 'Password', password);
  await tap(page, 'Log in');
  await see(page, /^Tonight at /);
}

/** Opens the door scanner from Tonight and lets the camera start. */
export async function openDoorScanner(page) {
  await tap(page, 'Open door scanner');
  await allowCameraIfAsked(page);
  await see(page, 'Point at the Outly pass');
}

export async function allowCameraIfAsked(page) {
  const allow = button(page, 'Allow camera');
  if (await allow.isVisible().catch(() => false)) await allow.click();
}

/** The access token of the user signed in on this page (Supabase stores the session in localStorage). */
export async function accessTokenOf(page) {
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token$/.test(key)) return JSON.parse(localStorage.getItem(key) ?? 'null')?.access_token ?? null;
    }
    return null;
  });
  if (!token) throw new Error('No Supabase session in this page');
  return token;
}
