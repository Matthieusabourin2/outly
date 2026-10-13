// Scenario 4 — the door, with a fake camera showing the guest's pass QR:
// fast lane OK → same pass again → already used; random QR → invalid; the manager sees it all on Tonight.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { DEMO_PASSWORD, STAFF, adminClient } from '../lib/env.mjs';
import { createCustomer, joinDemoNight, passCodeOf, uniqueTag } from '../lib/data.mjs';
import { button, customerLogin, openDoorScanner, scenario, see, staffLogin, tab, text } from '../lib/harness.mjs';
import { writeFakeCameraFile } from '../lib/qr.mjs';

const CAMERA_TIMEOUT_MS = 30_000; // the first frames of a fake camera can take a few seconds

/** Number shown on a Tonight stat tile, e.g. "In via fast lane" → 3. */
async function statValue(page, label) {
  const tile = text(page, label).locator('xpath=..');
  const raw = (await tile.innerText()).replace(label, '').trim();
  return Number(raw.split('/')[0].trim());
}

scenario('staff: door scan with a fake camera (OK, already used, invalid) and manager stats', async (h) => {
  const admin = adminClient();
  const guest = await createCustomer('s4');
  const { client } = await joinDemoNight(guest, 'ghost');
  const { booking, code } = await passCodeOf(client);
  const passCamera = writeFakeCameraFile(code, join(h.dir, 'pass.mjpeg'));
  const junkCamera = writeFakeCameraFile(`not-an-outly-pass-${uniqueTag()}`, join(h.dir, 'junk.mjpeg'));

  // Door staff scans the guest's pass: fast lane OK with the username.
  const passBrowser = await h.browser({ camera: passCamera });
  const door = await h.page(passBrowser, 'door', { site: 'partner', camera: true });
  await staffLogin(door, STAFF.door, DEMO_PASSWORD);
  await h.shot(door, 'door-tonight');
  await openDoorScanner(door);
  await see(door, 'Fast lane OK', CAMERA_TIMEOUT_MS);
  await see(door, `@${guest.username}`);
  await see(door, 'Now check their ticket.');
  await h.shot(door, 'fast-lane-ok');

  const { data: checked } = await admin.from('bookings').select('status, checked_in_by').eq('id', booking.id).single();
  assert.equal(checked.status, 'checked_in');

  // "Scan next" (an accepted pass also resets by itself after a few seconds), same QR again → already used.
  await button(door, 'Scan next').click({ timeout: 3_000 }).catch(() => {});
  await see(door, 'Pass already used', CAMERA_TIMEOUT_MS);
  await see(door, `@${guest.username}`);
  await see(door, 'Send them to the normal line with their ticket.');
  await h.shot(door, 'already-used');

  // The guest's own Pass tab now says they're in.
  const guestPage = await h.page(passBrowser, 'guest');
  await customerLogin(guestPage, guest);
  await see(guestPage, 'On the Outly list');
  await tab(guestPage, 'Pass').click();
  await see(guestPage, "You're in!");
  await h.shot(guestPage, 'guest-checked-in');

  // Another phone shows a QR that isn't an Outly pass → invalid.
  const junkBrowser = await h.browser({ camera: junkCamera });
  const door2 = await h.page(junkBrowser, 'door-2', { site: 'partner', camera: true });
  await staffLogin(door2, STAFF.door, DEMO_PASSWORD);
  await openDoorScanner(door2);
  await see(door2, 'Invalid pass', CAMERA_TIMEOUT_MS);
  await see(door2, 'This is not a valid Outly pass for this venue.');
  await h.shot(door2, 'invalid');

  // The manager's Tonight: live counts and the latest scans with usernames.
  const manager = await h.page(passBrowser, 'manager', { site: 'partner' });
  await staffLogin(manager, STAFF.manager, DEMO_PASSWORD);
  await see(manager, 'OUTLY STAFF · MANAGER');
  await see(manager, 'In via fast lane');
  assert.ok((await statValue(manager, 'In via fast lane')) >= 1, 'at least our guest came in via the fast lane');
  assert.ok((await statValue(manager, 'Refused scans')) >= 2, 'the already-used and invalid scans are counted');
  assert.ok((await statValue(manager, 'On the Outly list')) >= 1);
  await see(manager, 'Latest scans');
  const rows = manager.getByText(`@${guest.username}`, { exact: true }).filter({ visible: true });
  assert.equal(await rows.count(), 2, 'both scans of our guest are listed with the username');
  await see(manager, 'Unknown pass');
  await h.shot(manager, 'manager-tonight');
});
