// Test data helpers: fresh customers, their bookings and pass codes, Mailpit codes.
// Every scenario creates its own uniquely named data and only asserts on that data.
import { randomBytes } from 'node:crypto';
import { DEMO_GUEST_LIST, MAILPIT_URL, adminClient, anonClient } from './env.mjs';

export const CUSTOMER_PASSWORD = 'e2eNight2026';

/** Short unique tag: e2e emails/usernames never collide between scenarios or runs. */
export function uniqueTag() {
  return `${Date.now().toString(36).slice(-5)}${randomBytes(3).toString('hex')}`;
}

/** A fresh, never-used identity (email + username). The email domain is reserved: nothing ever leaves Mailpit. */
export function newIdentity(prefix) {
  const tag = uniqueTag();
  return {
    email: `e2e-${prefix}-${tag}@e2e.outly.test`,
    username: `e2e_${prefix}_${tag}`.slice(0, 24),
    password: CUSTOMER_PASSWORD,
    name: `E2E ${prefix}`,
  };
}

/** Customer created through the Auth admin API, with an adult profile (setup shortcut for scenarios not about sign-up). */
export async function createCustomer(prefix) {
  const id = newIdentity(prefix);
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: id.email, password: id.password, email_confirm: true });
  if (error) throw error;
  const { error: pErr } = await admin
    .from('profiles')
    .insert({ id: data.user.id, username: id.username, display_name: id.name, date_of_birth: '1996-05-20' });
  if (pErr) throw pErr;
  return { ...id, userId: data.user.id };
}

/** A publishable-key client signed in as this person (their own session, RLS applies). */
export async function signedInClient({ email, password }) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

/** Joins the demo launch night as this customer (same RPC as the Join button). Returns the booking. */
export async function joinDemoNight(customer, visibility = 'ghost') {
  const client = await signedInClient(customer);
  const { data, error } = await client.rpc('join_event_list', { p_guest_list_id: DEMO_GUEST_LIST, p_visibility: visibility });
  if (error) throw error;
  return { client, booking: data };
}

/** The customer's pass payload, read with the customer's own session (door staff cannot read bookings, SPEC A10). */
export async function passCodeOf(client) {
  const { data, error } = await client
    .from('bookings')
    .select('id, qr_nonce, status, attendee_visibility')
    .eq('guest_list_id', DEMO_GUEST_LIST)
    .in('status', ['confirmed', 'checked_in'])
    .single();
  if (error) throw error;
  return { booking: data, code: `OUTLY1:${data.id}:${data.qr_nonce}` };
}

export const PASS_CODE = /^OUTLY1:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Waits for the 6-digit sign-in code sent to this address (local Mailpit API). */
export async function waitForEmailCode(email, { timeoutMs = 30_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    if (res.ok) {
      const { messages = [] } = await res.json();
      if (messages.length > 0) {
        const msg = await (await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)).json();
        const code = `${msg.Text ?? ''}\n${msg.HTML ?? ''}`.match(/\b(\d{6})\b/)?.[1];
        if (code) return { code, subject: msg.Subject };
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No sign-in code reached Mailpit for ${email} within ${timeoutMs / 1000}s.`);
}

/** Polls an async check until it returns a truthy value (DB state that the UI changes asynchronously). */
export async function eventually(check, { timeoutMs = 15_000, intervalMs = 300, message = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await check();
    if (last) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${message} (last value: ${JSON.stringify(last)})`);
}
